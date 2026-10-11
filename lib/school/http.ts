import type { NextRequest } from 'next/server';
import { withRequestOwner } from '@/lib/server/identity/with-owner';
import type { OwnerPrincipal } from '@/lib/server/identity/types';
import { SchoolError } from './contracts';
export async function readJson(req: NextRequest, limit = 120000) {
  const claimed = Number(req.headers.get('content-length') ?? 0);
  if (claimed > limit * 4) throw new SchoolError(413, '提交内容过大');
  // Bound the stream even when Content-Length is absent or forged.
  const reader = req.body?.getReader();
  if (!reader) throw new SchoolError(400, '缺少请求内容');
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    size += chunk.value.byteLength;
    if (size > limit * 4) {
      await reader.cancel();
      throw new SchoolError(413, '提交内容过大');
    }
    chunks.push(chunk.value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const c of chunks) {
    bytes.set(c, offset);
    offset += c.length;
  }
  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)) as unknown;
  } catch {
    throw new SchoolError(400, '请求必须是有效的 JSON');
  }
}
export function schoolRoute(
  req: NextRequest,
  work: (principal: OwnerPrincipal) => Promise<unknown>,
) {
  return withRequestOwner(req, async (principal, headers) => {
    headers.set('Cache-Control', 'no-store');
    if (!['GET', 'HEAD'].includes(req.method)) {
      const origin = req.headers.get('origin');
      if (origin && origin !== req.nextUrl.origin)
        return Response.json({ error: '不允许跨站提交' }, { status: 403, headers });
    }
    try {
      return Response.json(await work(principal), { headers });
    } catch (error) {
      // Never return provider messages, connection strings, SQL or credentials to a client.
      const status = error instanceof SchoolError ? error.status : 503;
      const message = error instanceof SchoolError ? error.message : '服务暂时不可用，请稍后重试';
      return Response.json({ error: message }, { status, headers });
    }
  });
}
