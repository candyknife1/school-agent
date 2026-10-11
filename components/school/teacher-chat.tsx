'use client';

import { PromptOptimizer } from '@/components/prompt-optimizer';
import { useCallback, useEffect, useState } from 'react';
import {
  Send,
  Plus,
  Trash2,
  ThumbsUp,
  ThumbsDown,
  FileText,
  Sparkles,
  Loader2,
  Paperclip,
} from 'lucide-react';
import { SUBJECTS, TEACHING_SKILLS, resolveSkill } from '@/lib/school/catalog';
import type { Citation } from '@/lib/school/context';
import {
  schoolApi,
  fieldClass,
  primaryClass,
  secondaryClass,
  type Resource,
  type Turn,
} from './types';
interface Attachment {
  id: string;
  title: string;
  characters: number;
  preview: string;
}
interface Props {
  skillId: string;
  setSkillId: (id: string) => void;
  message: string;
  setMessage: (value: string) => void;
  resources: Resource[];
  resourceIds: string[];
  setResourceIds: (ids: string[]) => void;
}
export function TeacherChat({
  skillId,
  setSkillId,
  message,
  setMessage,
  resources,
  resourceIds,
  setResourceIds,
}: Props) {
  const [threadId, setThreadId] = useState(() => crypto.randomUUID());
  const [threads, setThreads] = useState<{ thread_id: string; title: string }[]>([]);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [subject, setSubject] = useState('语文');
  const [grade, setGrade] = useState('三年级');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const attachmentCharacters = attachments.reduce((sum, file) => sum + file.characters, 0);
  const [uploading, setUploading] = useState(false);
  const [cloudConsent, setCloudConsent] = useState(false);
  const selectedSkill = resolveSkill(message, skillId || undefined);
  const upload = async (file: File) => {
    if (file.size > 8 * 1024 * 1024) {
      setError('每份附件最多8MB');
      return;
    }
    if (attachments.length >= 3) {
      setError('一个对话最多3份附件');
      return;
    }
    if (/\.(pdf|png|jpe?g)$/i.test(file.name) && !cloudConsent) {
      setError('PDF/照片需先勾选同意发送到已配置的文档解析服务');
      return;
    }
    setUploading(true);
    setError('');
    try {
      const response = await fetch(
        `/api/school/attachments?threadId=${threadId}&name=${encodeURIComponent(file.name)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/octet-stream',
            'X-Extraction-Consent': cloudConsent ? 'yes' : 'no',
          },
          body: file,
        },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '附件解析失败');
      setAttachments((old) => [...old, data.attachment]);
    } catch (e) {
      setError(e instanceof Error ? e.message : '附件解析失败');
    } finally {
      setUploading(false);
    }
  };
  const removeAttachment = async (id: string) => {
    setUploading(true);
    try {
      await schoolApi(`attachments?id=${id}`, { method: 'DELETE' });
      setAttachments((old) => old.filter((f) => f.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : '移除失败');
    } finally {
      setUploading(false);
    }
  };
  const refreshThreads = useCallback(async () => {
    try {
      const data = await schoolApi<{ threads: typeof threads }>('threads');
      setThreads(data.threads);
    } catch (e) {
      setError(e instanceof Error ? e.message : '对话加载失败');
    }
  }, []);
  useEffect(() => {
    void refreshThreads();
  }, [refreshThreads]);
  const loadThread = async (id: string) => {
    if (busy || uploading) return;
    setError('');
    setBusy(true);
    try {
      const [data, files] = await Promise.all([
        schoolApi<{ turns: Turn[] }>(`threads/${id}`),
        schoolApi<{ attachments: Attachment[] }>(`attachments?threadId=${id}`),
      ]);
      setAttachments(files.attachments);
      setTurns(data.turns);
      setThreadId(id);
      setMessage('');
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
    } finally {
      setBusy(false);
    }
  };
  const send = async () => {
    if (!message.trim() || busy || uploading || attachmentCharacters > 30000) return;
    setBusy(true);
    setError('');
    const question = message.trim();
    const requestId = crypto.randomUUID();
    setTurns((old) => [
      ...old,
      { request_id: requestId, message: question, answer: null, citations: [], status: 'running' },
    ]);
    setMessage('');
    try {
      const data = await schoolApi<{ answer: string; citations: Citation[]; skillId?: string }>(
        'chat',
        {
          method: 'POST',
          body: JSON.stringify({
            requestId,
            threadId,
            message: question,
            subject,
            grade,
            skillId: skillId || undefined,
            resourceIds,
            attachmentIds: attachments.map((f) => f.id),
          }),
        },
      );
      setTurns((old) =>
        old.map((turn) =>
          turn.request_id === requestId
            ? {
                ...turn,
                answer: data.answer,
                citations: data.citations,
                skill_id: data.skillId,
                status: 'succeeded',
              }
            : turn,
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : '发送失败');
      setTurns((old) =>
        old.map((turn) => (turn.request_id === requestId ? { ...turn, status: 'failed' } : turn)),
      );
      setMessage(question);
    } finally {
      setBusy(false);
      void refreshThreads();
    }
  };
  const rate = async (turn: Turn, rating: number) => {
    try {
      await schoolApi('dashboard', {
        method: 'PATCH',
        body: JSON.stringify({ requestId: turn.request_id, rating }),
      });
      setTurns((old) => old.map((t) => (t.request_id === turn.request_id ? { ...t, rating } : t)));
    } catch (e) {
      setError(e instanceof Error ? e.message : '反馈保存失败');
    }
  };
  const deleteThread = async () => {
    if (!window.confirm('删除当前对话正文？匿名聚合使用记录会保留用于统计。')) return;
    setBusy(true);
    try {
      await schoolApi(`threads/${threadId}`, { method: 'DELETE' });
      setTurns([]);
      setThreadId(crypto.randomUUID());
      setAttachments([]);
      void refreshThreads();
    } catch (e) {
      setError(e instanceof Error ? e.message : '删除失败');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_280px]">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-indigo-100 bg-gradient-to-r from-indigo-50 to-sky-50 dark:from-indigo-950 dark:to-sky-950 p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-indigo-700">
            <Sparkles size={19} />
            本次技能 · {selectedSkill?.name ?? '通用教学对话'}
          </div>
          <select
            aria-label="本次技能"
            className={`${fieldClass} font-medium`}
            value={skillId}
            disabled={busy || uploading}
            onChange={(e) => setSkillId(e.target.value)}
          >
            <option value="">自动识别 / 通用对话</option>
            {TEACHING_SKILLS.map((s) => (
              <option value={s.id} key={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs leading-6 text-slate-600">
            {selectedSkill?.description ??
              '选择技能，或在问题中输入技能名称；未匹配时使用通用教学对话。'}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {skillId
              ? '手动选择优先 · 发送时载入完整 Skill 与配套教学资料'
              : '自动模式按名称和关键词匹配，以上为当前草稿匹配结果'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-4">
          <select
            aria-label="历史对话"
            className={`${fieldClass} max-w-72`}
            value={threads.some((t) => t.thread_id === threadId) ? threadId : ''}
            disabled={busy || uploading}
            onChange={(e) => {
              if (e.target.value) void loadThread(e.target.value);
            }}
          >
            <option value="">新对话 · 历史记录</option>
            {threads.map((t) => (
              <option key={t.thread_id} value={t.thread_id}>
                {t.title}
              </option>
            ))}
          </select>
          <button
            className={secondaryClass}
            disabled={busy || uploading}
            onClick={() => {
              setThreadId(crypto.randomUUID());
              setAttachments([]);
              setTurns([]);
              setMessage('');
              setError('');
            }}
          >
            <Plus size={16} />
            新对话
          </button>
          <button
            aria-label="删除当前对话"
            className={secondaryClass}
            disabled={busy || uploading || !turns.length}
            onClick={() => void deleteThread()}
          >
            <Trash2 size={16} />
          </button>
        </div>
        <div className="max-h-[580px] min-h-[300px] space-y-6 overflow-auto p-5" aria-live="polite">
          {!turns.length && (
            <div className="mx-auto max-w-lg py-12 text-center">
              <Sparkles className="mx-auto mb-4 text-indigo-500" size={32} />
              <h2 className="text-xl font-semibold text-slate-800">从一个真实教学问题开始</h2>
              <p className="mt-3 text-sm leading-7 text-slate-500">
                选择技能，或输入“使用阅读引导……”；勾选资料后，助手会依据资料节选提供建议。你始终是教学内容的最终审核者。
              </p>
            </div>
          )}
          {turns.map((turn) => (
            <article key={turn.request_id} className="space-y-3">
              <div className="ml-8 whitespace-pre-wrap rounded-2xl bg-indigo-50 p-4 text-sm leading-7 text-slate-800">
                <span className="mb-1 block text-xs font-semibold text-indigo-600">你的问题</span>
                {turn.message}
              </div>
              <div className="mr-4 rounded-2xl border border-slate-100 p-4 text-sm leading-7 text-slate-700">
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-indigo-600">
                  <Sparkles size={14} />
                  {TEACHING_SKILLS.find((s) => s.id === turn.skill_id)?.name ?? '教学助手'}
                  <span className="font-normal text-slate-400">· 教师复核后使用</span>
                </div>
                {turn.answer ? (
                  <div className="whitespace-pre-wrap">{turn.answer}</div>
                ) : (
                  <p className="text-slate-500">
                    {turn.status === 'running'
                      ? '正在准备教学建议……'
                      : '本次未完成，请检查设置后重新发送。'}
                  </p>
                )}
                {turn.citations.length > 0 && (
                  <details className="mt-3 rounded-xl bg-slate-50 p-3">
                    <summary className="cursor-pointer text-xs text-slate-600">
                      查看本次引用的资料节选（{turn.citations.length}份）
                    </summary>
                    {turn.citations.map((c) => (
                      <div key={c.id} className="mt-3">
                        <strong className="text-xs">
                          [{c.label}] {c.title}
                        </strong>
                        <p className="max-h-40 overflow-auto whitespace-pre-wrap text-xs leading-6">
                          {c.excerpt}
                        </p>
                      </div>
                    ))}
                  </details>
                )}
                {turn.answer && (
                  <div className="mt-3 flex gap-2">
                    <button
                      className={`${secondaryClass} ${turn.rating === 1 ? 'border-indigo-400 text-indigo-600' : ''}`}
                      aria-pressed={turn.rating === 1}
                      onClick={() => void rate(turn, 1)}
                    >
                      <ThumbsUp size={14} />
                      有帮助
                    </button>
                    <button
                      className={`${secondaryClass} ${turn.rating === -1 ? 'border-amber-400' : ''}`}
                      aria-pressed={turn.rating === -1}
                      onClick={() => void rate(turn, -1)}
                    >
                      <ThumbsDown size={14} />
                      待改进
                    </button>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
        <form
          className="border-t border-slate-100 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          {error && (
            <p role="alert" className="mb-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
              {error}
            </p>
          )}
          <div className="mb-3 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <label
                className={`${secondaryClass} relative ${busy || uploading ? 'opacity-50' : 'cursor-pointer'}`}
              >
                {uploading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Paperclip size={16} />
                )}{' '}
                {uploading ? '解析附件中…' : '上传试卷 / 表格'}
                <input
                  aria-label="上传对话附件"
                  type="file"
                  accept=".xlsx,.docx,.csv,.txt,.md,.pdf,.png,.jpg,.jpeg"
                  className="absolute inset-0 w-full cursor-pointer opacity-0"
                  disabled={busy || uploading || attachments.length >= 3}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    if (file) void upload(file);
                  }}
                />
              </label>
              <span className="text-xs text-slate-500">
                最多3份 · 每份8MB · 本次解析文本合计不超过3万字
              </span>
            </div>
            <p className="text-xs leading-5 text-slate-500">
              XLSX / DOCX / UTF-8 CSV / TXT / MD 本地解析；PDF、PNG、JPG 需要文档解析服务。Excel
              不执行公式，日期及合并单元格请核对预览。
            </p>
            <label className="flex items-start gap-2 text-xs leading-5 text-slate-500">
              <input
                type="checkbox"
                checked={cloudConsent}
                disabled={busy || uploading}
                onChange={(e) => setCloudConsent(e.target.checked)}
                className="mt-1"
              />
              我已脱敏，并同意 PDF / 照片发送到模型设置中配置的文档解析服务
            </label>
            {attachments.map((file) => (
              <div key={file.id} className="rounded-xl border border-indigo-100 bg-indigo-50 p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="min-w-0 break-words text-sm font-medium text-indigo-700">
                    {file.title} · {file.characters.toLocaleString()}字
                  </span>
                  <button
                    type="button"
                    aria-label={`移除附件 ${file.title}`}
                    className={secondaryClass}
                    disabled={busy || uploading}
                    onClick={() => void removeAttachment(file.id)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <details className="mt-2 text-xs text-slate-600">
                  <summary className="cursor-pointer">预览解析文本（前2000字）</summary>
                  <pre className="mt-2 max-h-52 overflow-auto whitespace-pre-wrap break-words font-sans leading-6">
                    {file.preview}
                  </pre>
                </details>
              </div>
            ))}
            {attachmentCharacters > 30000 && (
              <p role="alert" className="text-sm text-amber-800">
                附件合计 {attachmentCharacters.toLocaleString()}{' '}
                字，超过3万字。请移除或拆分后再发送，不会静默截断表格。
              </p>
            )}
            {attachments.length > 0 && (
              <p className="text-xs text-slate-500">
                附件在此对话后续发送时继续引用，24小时后过期；仅存解析文本，不存原文件。已发送的引用文本仍随对话保存，清理请删除对话。
              </p>
            )}
          </div>
          <textarea
            aria-label="教学问题"
            className={`${fieldClass} min-h-28 resize-y`}
            value={message}
            maxLength={4000}
            disabled={busy || uploading}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="例如：使用备课设计，为三年级设计一节观察与表达课……"
          />
          <PromptOptimizer
            key={threadId}
            className="mt-2"
            value={message}
            onChange={setMessage}
            context="teacher"
            maxLength={4000}
            disabled={busy || uploading}
          />
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-xs leading-5 text-slate-400">
              对话正文私有保存，可删除。引用节选会发给所配置的模型；请勿输入学生身份信息。
            </p>
            <button
              type="submit"
              className={`${primaryClass} shrink-0`}
              disabled={busy || uploading || attachmentCharacters > 30000 || !message.trim()}
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}发送
            </button>
          </div>
        </form>
      </section>
      <aside className="space-y-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="mb-4 font-semibold text-slate-800">教学上下文</h3>
          <label className="mb-3 block text-xs text-slate-500">
            学科
            <select
              className={`${fieldClass} mt-1`}
              value={subject}
              disabled={busy || uploading}
              onChange={(e) => setSubject(e.target.value)}
            >
              {SUBJECTS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="mb-3 block text-xs text-slate-500">
            年级
            <select
              className={`${fieldClass} mt-1`}
              value={grade}
              disabled={busy || uploading}
              onChange={(e) => setGrade(e.target.value)}
            >
              {['一', '二', '三', '四', '五', '六'].map((g) => (
                <option key={g}>{g}年级</option>
              ))}
            </select>
          </label>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="mb-3 flex items-center gap-2 font-semibold text-slate-800">
            <FileText size={16} />
            引用知识库{' '}
            <span className="text-xs font-normal text-slate-400">{resourceIds.length}/5</span>
          </h3>
          {!resources.length && (
            <p className="text-xs leading-6 text-slate-500">先到知识库添加资料，再回来选择引用。</p>
          )}
          <div className="max-h-64 space-y-2 overflow-auto">
            {resources.map((r) => (
              <label
                key={r.id}
                className="flex cursor-pointer items-start gap-2 rounded-lg p-2 text-xs hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  className="mt-1"
                  disabled={busy || (!resourceIds.includes(r.id) && resourceIds.length >= 5)}
                  checked={resourceIds.includes(r.id)}
                  onChange={(e) =>
                    setResourceIds(
                      e.target.checked
                        ? [...resourceIds, r.id]
                        : resourceIds.filter((id) => id !== r.id),
                    )
                  }
                />
                <span>
                  {r.title}
                  <small className="mt-1 block text-slate-400">
                    {r.subject} · {r.category}
                  </small>
                </span>
              </label>
            ))}
          </div>
        </section>
      </aside>
    </div>
  );
}
