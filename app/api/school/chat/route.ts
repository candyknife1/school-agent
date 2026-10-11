import { createHash } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { callLLM } from '@/lib/ai/llm';
import { resolveModel } from '@/lib/server/resolve-model';
import { parseChat, SchoolError } from '@/lib/school/contracts';
import { classifyQuestion, resolveSkill } from '@/lib/school/catalog';
import { selectExcerpts, teachingSystemPrompt } from '@/lib/school/context';
import { readJson, schoolRoute } from '@/lib/school/http';
import { accessibleResources, schoolDb } from '@/lib/school/store';
export const runtime = 'nodejs';
export const maxDuration = 90;
export function POST(req: NextRequest) {
  return schoolRoute(req, async (principal) => {
    const data = parseChat(await readJson(req, 10000));
    const pool = await schoolDb();
    const skill = resolveSkill(data.message, data.skillId);
    const category = classifyQuestion(data.message, skill);
    const fingerprint = createHash('sha256').update(JSON.stringify(data)).digest('hex');
    const tx = await pool.connect();
    let replay: { answer: string; citations: unknown } | undefined;
    try {
      await tx.query('BEGIN');
      // Rate limiting, duplicate request prevention and thread ordering are atomic across processes.
      await tx.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
        `school-chat:${principal.ownerId}`,
      ]);
      const prior = await tx.query(
        'SELECT status,fingerprint FROM school_teacher_usage WHERE owner_id=$1 AND request_id=$2',
        [principal.ownerId, data.requestId],
      );
      if (prior.rows.length) {
        if (prior.rows[0].fingerprint !== fingerprint)
          throw new SchoolError(409, '请求编号已用于其他内容');
        if (prior.rows[0].status !== 'succeeded')
          throw new SchoolError(409, '该请求已提交，请查看记录或重新发送');
        const turn = await tx.query(
          'SELECT answer,citations FROM school_teacher_turns WHERE owner_id=$1 AND request_id=$2',
          [principal.ownerId, data.requestId],
        );
        if (!turn.rows.length) throw new SchoolError(410, '对话记录已删除');
        replay = turn.rows[0];
      } else {
        const count = await tx.query(
          "SELECT count(*)::int AS count FROM school_teacher_usage WHERE owner_id=$1 AND created_at>now()-interval '1 hour'",
          [principal.ownerId],
        );
        if (count.rows[0].count >= 60) throw new SchoolError(429, '每小时最多60次请求，请稍后继续');
        const running = await tx.query(
          "SELECT 1 FROM school_teacher_usage WHERE owner_id=$1 AND thread_id=$2 AND status='running' AND created_at>now()-interval '2 minutes'",
          [principal.ownerId, data.threadId],
        );
        if (running.rows.length) throw new SchoolError(409, '当前对话正在生成，请等待完成');
        await tx.query(
          `INSERT INTO school_teacher_usage(owner_id,request_id,thread_id,fingerprint,skill_id,category,subject,status,resource_ids)
          VALUES($1,$2,$3,$4,$5,$6,$7,'running',$8)`,
          [
            principal.ownerId,
            data.requestId,
            data.threadId,
            fingerprint,
            skill?.id ?? null,
            category,
            data.subject,
            data.resourceIds,
          ],
        );
        await tx.query(
          'INSERT INTO school_teacher_turns(owner_id,request_id,thread_id,message) VALUES($1,$2,$3,$4)',
          [principal.ownerId, data.requestId, data.threadId, data.message],
        );
      }
      await tx.query('COMMIT');
    } catch (error) {
      await tx.query('ROLLBACK');
      throw error;
    } finally {
      tx.release();
    }
    if (replay) return { ...replay, requestId: data.requestId, skillId: skill?.id, replay: true };
    const started = Date.now();
    try {
      const citations = selectExcerpts(
        await accessibleResources(pool, principal, data.resourceIds),
        data.message,
      );
      if (data.attachmentIds.length) {
        const files = await pool.query<{ id: string; title: string; content: string }>(
          `SELECT id,title,content FROM school_chat_attachments WHERE id=ANY($1::uuid[])
           AND owner_id=$2 AND thread_id=$3 AND status='ready' AND created_at>now()-interval '24 hours'`,
          [data.attachmentIds, principal.ownerId, data.threadId],
        );
        if (files.rows.length !== data.attachmentIds.length)
          throw new SchoolError(404, '附件已过期、不属于此对话或无权访问，请重新上传');
        if (files.rows.reduce((n, f) => n + f.content.length, 0) > 30000)
          throw new SchoolError(
            413,
            '本次附件解析文本合计超过3万字，请拆分附件再分析，避免遗漏数据',
          );
        for (const id of data.attachmentIds) {
          const file = files.rows.find((f) => f.id === id)!;
          citations.push({
            id,
            title: file.title,
            label: `附件${citations.filter((c) => c.label.startsWith('附件')).length + 1}`,
            excerpt: file.content,
          });
        }
      }
      const history = await pool.query<{ message: string; answer: string }>(
        `SELECT t.message,t.answer FROM school_teacher_turns t
        JOIN school_teacher_usage u USING(owner_id,request_id)
        WHERE t.owner_id=$1 AND t.thread_id=$2 AND u.status='succeeded' AND t.request_id<>$3
        ORDER BY t.created_at DESC LIMIT 4`,
        [principal.ownerId, data.threadId, data.requestId],
      );
      let resolved: Awaited<ReturnType<typeof resolveModel>>;
      try {
        resolved = await resolveModel({ stage: 'chat-adapter', workspaceId: principal.ownerId });
      } catch {
        throw new SchoolError(
          503,
          '尚无可用的对话模型，请在“模型设置”中配置 Provider 和对话模型后重试',
        );
      }
      const result = await callLLM(
        {
          model: resolved.model,
          system: teachingSystemPrompt(skill, data.subject, data.grade, citations),
          messages: [
            ...history.rows.reverse().flatMap((turn) => [
              { role: 'user' as const, content: turn.message },
              { role: 'assistant' as const, content: turn.answer.slice(0, 4000) },
            ]),
            { role: 'user' as const, content: data.message },
          ],
          maxOutputTokens: 3000,
          abortSignal: AbortSignal.any([req.signal, AbortSignal.timeout(60000)]),
        },
        'chat-adapter',
        undefined,
        resolved.thinkingConfig,
        { serverManaged: resolved.serverManaged },
      );
      const answer = result.text.trim().slice(0, 16000);
      if (!answer) throw new SchoolError(502, '模型返回了空内容，请重新尝试');
      const save = await pool.connect();
      try {
        await save.query('BEGIN');
        const present = await save.query(
          'UPDATE school_teacher_turns SET answer=$1,citations=$2::jsonb WHERE owner_id=$3 AND request_id=$4 RETURNING request_id',
          [answer, JSON.stringify(citations), principal.ownerId, data.requestId],
        );
        if (!present.rowCount) throw new SchoolError(409, '对话记录已删除，未保存本次回复');
        await save.query(
          "UPDATE school_teacher_usage SET status='succeeded',latency_ms=$1,input_tokens=$2,output_tokens=$3 WHERE owner_id=$4 AND request_id=$5",
          [
            Date.now() - started,
            result.usage.inputTokens ?? 0,
            result.usage.outputTokens ?? 0,
            principal.ownerId,
            data.requestId,
          ],
        );
        await save.query('COMMIT');
      } catch (error) {
        await save.query('ROLLBACK');
        throw error;
      } finally {
        save.release();
      }
      return { answer, citations, skillId: skill?.id, requestId: data.requestId };
    } catch (error) {
      await pool.query(
        "UPDATE school_teacher_usage SET status='failed',latency_ms=$1 WHERE owner_id=$2 AND request_id=$3",
        [Date.now() - started, principal.ownerId, data.requestId],
      );
      if (error instanceof SchoolError) throw error;
      throw new SchoolError(502, '模型调用失败或超时，请检查模型配置后重试');
    }
  });
}
