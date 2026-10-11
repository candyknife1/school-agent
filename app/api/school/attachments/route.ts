import { randomUUID } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { schoolRoute } from '@/lib/school/http';
import { schoolDb } from '@/lib/school/store';
import { SchoolError, text, uuid } from '@/lib/school/contracts';
import {
  attachmentFormat,
  extractLocalAttachment,
  MAX_ATTACHMENT_BYTES,
  MAX_ATTACHMENT_TEXT,
} from '@/lib/school/attachments';
import { getDocumentExtractorProvider } from '@/lib/document';
import {
  resolveExtractionServices,
  extractorConfigFor,
} from '@/lib/server/material-extraction/services';
export const runtime = 'nodejs';
export const maxDuration = 90;
export function GET(req: NextRequest) {
  return schoolRoute(req, async (principal) => {
    const pool = await schoolDb();
    const result = await pool.query(
      `SELECT id,title,length(content)::int AS characters,content AS preview FROM school_chat_attachments
       WHERE owner_id=$1 AND thread_id=$2 AND status='ready' AND created_at>now()-interval '24 hours' ORDER BY created_at`,
      [principal.ownerId, uuid(req.nextUrl.searchParams.get('threadId'))],
    );
    return {
      attachments: result.rows.map((row) => ({ ...row, preview: row.preview.slice(0, 2000) })),
    };
  });
}
export function DELETE(req: NextRequest) {
  return schoolRoute(req, async (principal) => {
    const result = await (
      await schoolDb()
    ).query(
      "UPDATE school_chat_attachments SET status='removed',content='' WHERE id=$1 AND owner_id=$2 AND status<>'removed' RETURNING id",
      [uuid(req.nextUrl.searchParams.get('id')), principal.ownerId],
    );
    if (!result.rowCount) throw new SchoolError(404, '附件不存在或无权访问');
    return { deleted: true };
  });
}
export function POST(req: NextRequest) {
  return schoolRoute(req, async (principal) => {
    const threadId = uuid(req.nextUrl.searchParams.get('threadId'));
    const name = text(req.nextUrl.searchParams.get('name'), '文件名', 180);
    const format = attachmentFormat(name);
    if (format.cloud && req.headers.get('x-extraction-consent') !== 'yes')
      throw new SchoolError(400, 'PDF/照片需同意发送到已配置的文档解析服务');
    if (Number(req.headers.get('content-length')) > MAX_ATTACHMENT_BYTES)
      throw new SchoolError(413, '每份附件最多8MB');
    const pool = await schoolDb();
    const id = randomUUID();
    const tx = await pool.connect();
    try {
      await tx.query('BEGIN');
      await tx.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
        `school-attachment:${principal.ownerId}`,
      ]);
      // Keep failed attempts for one day so invalid files cannot bypass the upload quota.
      await tx.query(
        "DELETE FROM school_chat_attachments WHERE created_at<now()-interval '24 hours'",
      );
      const count = await tx.query(
        `SELECT count(*) FILTER (WHERE created_at>now()-interval '1 hour')::int AS hourly,
        count(*) FILTER (WHERE thread_id=$2 AND status IN ('ready','parsing'))::int AS files
        FROM school_chat_attachments WHERE owner_id=$1`,
        [principal.ownerId, threadId],
      );
      if (count.rows[0].hourly >= 30) throw new SchoolError(429, '每小时最多上传30次附件');
      if (count.rows[0].files >= 3) throw new SchoolError(400, '一个对话最多3份附件，请先移除一份');
      await tx.query(
        'INSERT INTO school_chat_attachments(id,owner_id,thread_id,title) VALUES($1,$2,$3,$4)',
        [id, principal.ownerId, threadId, name],
      );
      await tx.query('COMMIT');
    } catch (e) {
      await tx.query('ROLLBACK');
      throw e;
    } finally {
      tx.release();
    }
    try {
      const reader = req.body?.getReader();
      if (!reader) throw new SchoolError(400, '缺少文件内容');
      const chunks: Uint8Array[] = [];
      let size = 0;
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        size += chunk.value.byteLength;
        if (size > MAX_ATTACHMENT_BYTES) {
          await reader.cancel();
          throw new SchoolError(413, '每份附件最多8MB');
        }
        chunks.push(chunk.value);
      }
      const bytes = Buffer.concat(chunks);
      if (!bytes.length) throw new SchoolError(400, '不能上传空文件');
      let content: string;
      if (format.cloud) {
        const services = await resolveExtractionServices(principal.ownerId);
        const provider =
          services.document && getDocumentExtractorProvider(services.document.providerId);
        if (!provider || !provider.supportedMimeTypes.includes(format.mime!))
          throw new SchoolError(
            503,
            '请在模型设置中配置支持此格式的文档解析服务（PDF/照片需要解析或 OCR），或先转为 DOCX/CSV/文本',
          );
        const artifact = await provider.extract({
          buffer: bytes,
          fileName: name,
          fileSize: size,
          mimeType: format.mime!,
          config: {
            ...extractorConfigFor(provider.id, services),
            textOnly: true,
            signal: AbortSignal.any([req.signal, AbortSignal.timeout(60000)]),
          },
        });
        content = artifact.blocks
          .map((block) => block.text ?? '')
          .filter(Boolean)
          .join('\n\n');
      } else content = await extractLocalAttachment(bytes, name);
      if (!content.trim()) throw new SchoolError(422, '未解析到文本，请核对文件或配置 OCR');
      if (content.length > MAX_ATTACHMENT_TEXT)
        throw new SchoolError(413, '解析内容超过10万字，请拆分');
      const saved = await pool.query(
        "UPDATE school_chat_attachments SET content=$1,status='ready' WHERE id=$2 AND owner_id=$3 AND status='parsing' RETURNING id",
        [content, id, principal.ownerId],
      );
      if (!saved.rowCount) throw new SchoolError(409, '附件已被移除');
      return {
        attachment: {
          id,
          title: name,
          characters: content.length,
          preview: content.slice(0, 2000),
        },
      };
    } catch (e) {
      await pool.query("UPDATE school_chat_attachments SET status='failed' WHERE id=$1", [id]);
      if (e instanceof SchoolError) throw e;
      throw new SchoolError(
        422,
        '附件解析失败，请核对文件格式、文档解析配置，或另存为 UTF-8 CSV/文本后重试',
      );
    }
  });
}
