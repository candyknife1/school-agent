import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  release: vi.fn(),
  extract: vi.fn(),
  service: vi.fn(),
  principal: { ownerId: 'teacher-a', assurance: 'anonymous', roles: new Set() },
}));
vi.mock('@/lib/server/identity/with-owner', () => ({
  withRequestOwner: (_: unknown, fn: (p: unknown, h: Headers) => unknown) =>
    fn(mocks.principal, new Headers()),
}));
vi.mock('@/lib/school/store', () => ({
  schoolDb: async () => ({
    query: mocks.query,
    connect: async () => ({ query: mocks.query, release: mocks.release }),
  }),
  isSchoolAdmin: () => false,
}));
vi.mock('@/lib/document', () => ({
  getDocumentExtractorProvider: () => ({
    id: 'test',
    supportedMimeTypes: ['application/pdf'],
    extract: mocks.extract,
  }),
}));
vi.mock('@/lib/server/material-extraction/services', () => ({
  resolveExtractionServices: mocks.service,
  extractorConfigFor: () => ({ providerId: 'test' }),
}));
import { GET, POST, DELETE } from '@/app/api/school/community/route';
import {
  POST as upload,
  DELETE as removeFile,
  GET as files,
} from '@/app/api/school/attachments/route';
const id = '353f9633-cd88-40d8-87ee-8a5a21a4ef41';
const request = (
  path: string,
  method: string,
  body?: string,
  headers: Record<string, string> = {},
) => new NextRequest(`http://localhost:3000/api/school/${path}`, { method, body, headers });
beforeEach(() => {
  vi.resetAllMocks();
  mocks.query.mockImplementation(async (sql: string) => ({
    rows: sql.includes('count(*)') ? [{ count: 0, hourly: 0, files: 0 }] : [],
    rowCount: 1,
  }));
  mocks.service.mockResolvedValue({ document: null });
});
describe('community trial boundaries', () => {
  it('allows explicitly unverified trial notices, never granting administrator identity', async () => {
    const r = await POST(
      request(
        'community',
        'POST',
        JSON.stringify({ kind: 'notice', author: '校长', title: '试用', content: '公开内容' }),
      ),
    );
    expect(r.status).toBe(200);
    expect(
      mocks.query.mock.calls.some(([sql]) => sql.includes('INSERT INTO school_community_events')),
    ).toBe(true);
    const r2 = await GET(request('community', 'GET'));
    expect((await r2.json()).admin).toBe(false);
  });
  it('rejects cross-origin writes and too-long content', async () => {
    expect(
      (await POST(request('community', 'POST', '{}', { origin: 'https://evil.test' }))).status,
    ).toBe(403);
    expect(
      (
        await POST(
          request(
            'community',
            'POST',
            JSON.stringify({
              kind: 'discussion',
              author: 'a',
              title: 'a',
              content: 'x'.repeat(3001),
            }),
          ),
        )
      ).status,
    ).toBe(400);
  });
  it('refuses missing reply parents and rate limited publishing', async () => {
    expect(
      (
        await POST(
          request(
            'community',
            'POST',
            JSON.stringify({ parentId: id, author: 'a', content: 'reply' }),
          ),
        )
      ).status,
    ).toBe(404);
    mocks.query.mockImplementation(async (sql: string) => ({
      rows: sql.includes('count(*)') ? [{ count: 20 }] : [],
      rowCount: 1,
    }));
    expect(
      (
        await POST(
          request(
            'community',
            'POST',
            JSON.stringify({ kind: 'notice', author: 'a', title: 'a', content: 'a' }),
          ),
        )
      ).status,
    ).toBe(429);
  });
  it('scopes deletion to the owner and keeps unauthorized deletion indistinguishable from missing posts', async () => {
    mocks.query.mockResolvedValue({ rows: [], rowCount: 0 });
    expect((await DELETE(request(`community?id=${id}`, 'DELETE'))).status).toBe(404);
    expect(mocks.query.mock.calls[0][1]).toEqual([id, 'teacher-a', false]);
  });
});
describe('private attachment routes', () => {
  it('stores parsed CSV text and returns a bounded preview, not raw bytes', async () => {
    const r = await upload(
      request(`attachments?threadId=${id}&name=score.csv`, 'POST', '题号,得分\n1,8'),
    );
    expect(r.status).toBe(200);
    expect((await r.json()).attachment.preview).toContain('题号,得分');
    const insert = mocks.query.mock.calls.find(([sql]) =>
      sql.includes('INSERT INTO school_chat_attachments'),
    )!;
    expect(insert[1].slice(1, 3)).toEqual(['teacher-a', id]);
  });
  it('requires explicit consent and configured service for PDF', async () => {
    expect(
      (await upload(request(`attachments?threadId=${id}&name=paper.pdf`, 'POST', '%PDF'))).status,
    ).toBe(400);
    expect(
      (
        await upload(
          request(`attachments?threadId=${id}&name=paper.pdf`, 'POST', '%PDF', {
            'x-extraction-consent': 'yes',
          }),
        )
      ).status,
    ).toBe(503);
    expect(mocks.extract).not.toHaveBeenCalled();
  });
  it('uses only the owner document slot for consented PDF extraction', async () => {
    mocks.service.mockResolvedValue({ document: { providerId: 'test' } });
    mocks.extract.mockResolvedValue({ blocks: [{ text: '试卷内容' }] });
    const r = await upload(
      request(`attachments?threadId=${id}&name=paper.pdf`, 'POST', '%PDF', {
        'x-extraction-consent': 'yes',
      }),
    );
    expect(r.status).toBe(200);
    expect(mocks.service).toHaveBeenCalledWith('teacher-a');
    expect((await r.json()).attachment.preview).toBe('试卷内容');
  });
  it('bounds upload counts and file sizes even without parsing', async () => {
    expect(
      (
        await upload(
          request(`attachments?threadId=${id}&name=a.csv`, 'POST', 'x', {
            'content-length': String(9 * 1024 * 1024),
          }),
        )
      ).status,
    ).toBe(413);
    mocks.query.mockImplementation(async (sql: string) => ({
      rows: sql.includes('count(*)') ? [{ hourly: 30, files: 0 }] : [],
      rowCount: 1,
    }));
    expect(
      (await upload(request(`attachments?threadId=${id}&name=a.csv`, 'POST', 'x'))).status,
    ).toBe(429);
  });
  it('tombstones removed attachments so deletion cannot reset upload quotas', async () => {
    expect((await removeFile(request(`attachments?id=${id}`, 'DELETE'))).status).toBe(200);
    expect(mocks.query.mock.calls[0][0]).toContain("status='removed',content=''");
    expect(mocks.query.mock.calls[0][1]).toEqual([id, 'teacher-a']);
    await files(request(`attachments?threadId=${id}`, 'GET'));
    expect(mocks.query.mock.calls[1][0]).toContain('owner_id=$1 AND thread_id=$2');
  });
});
