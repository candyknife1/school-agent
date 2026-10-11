import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { NextRequest } from 'next/server';
const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  connect: vi.fn(),
  release: vi.fn(),
  resolve: vi.fn(),
  llm: vi.fn(),
  resources: vi.fn(),
}));
vi.mock('@/lib/server/identity/with-owner', () => ({
  withRequestOwner: (_req: unknown, fn: (principal: unknown, headers: Headers) => unknown) =>
    fn({ ownerId: 'teacher-a', assurance: 'verified', roles: new Set() }, new Headers()),
}));
vi.mock('@/lib/school/store', () => ({
  schoolDb: async () => ({ query: mocks.query, connect: mocks.connect }),
  accessibleResources: mocks.resources,
}));
vi.mock('@/lib/server/resolve-model', () => ({ resolveModel: mocks.resolve }));
vi.mock('@/lib/ai/llm', () => ({ callLLM: mocks.llm }));
import { POST } from '@/app/api/school/chat/route';
import { parseChat, SchoolError } from '@/lib/school/contracts';
const body = {
  requestId: '353f9633-cd88-40d8-87ee-8a5a21a4ef41',
  threadId: '453f9633-cd88-40d8-87ee-8a5a21a4ef41',
  message: '请设计一节备课活动',
  subject: '语文',
  grade: '三年级',
  resourceIds: [],
};
const send = () =>
  POST(
    new NextRequest('http://localhost:3000/api/school/chat', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  );
beforeEach(() => {
  vi.resetAllMocks();
  mocks.query.mockImplementation(async (sql: string) => ({
    rows: sql.includes('count(*)') ? [{ count: 0 }] : [],
    rowCount: 1,
  }));
  mocks.connect.mockResolvedValue({ query: mocks.query, release: mocks.release });
  mocks.resources.mockResolvedValue([]);
  mocks.resolve.mockResolvedValue({ model: { provider: 'mock' }, serverManaged: true });
  mocks.llm.mockResolvedValue({ text: '教学草稿', usage: { inputTokens: 30, outputTokens: 20 } });
});
describe('teacher chat model lifecycle', () => {
  it('saves successful response and measured token usage', async () => {
    const r = await send();
    expect(r.status).toBe(200);
    expect((await r.json()).answer).toBe('教学草稿');
    expect(mocks.resolve).toHaveBeenCalledWith({ stage: 'chat-adapter', workspaceId: 'teacher-a' });
    expect(
      mocks.query.mock.calls
        .find(([sql]) => sql.startsWith("UPDATE school_teacher_usage SET status='succeeded'"))?.[1]
        .slice(1),
    ).toEqual([30, 20, 'teacher-a', body.requestId]);
    expect(mocks.release).toHaveBeenCalledTimes(2);
  });
  it('replays succeeded requests without charging a second model call', async () => {
    const fingerprint = createHash('sha256')
      .update(JSON.stringify(parseChat(body)))
      .digest('hex');
    mocks.query.mockImplementation(async (sql: string) => ({
      rows: sql.includes('SELECT status,fingerprint')
        ? [{ status: 'succeeded', fingerprint }]
        : sql.includes('SELECT answer,citations')
          ? [{ answer: '旧回复', citations: [] }]
          : [],
      rowCount: 1,
    }));
    const r = await send();
    expect((await r.json()).replay).toBe(true);
    expect(mocks.llm).not.toHaveBeenCalled();
  });
  it('reports missing configuration and records a failed request', async () => {
    mocks.resolve.mockRejectedValue(new Error('secret-key'));
    const r = await send();
    expect(r.status).toBe(503);
    expect(await r.text()).not.toContain('secret-key');
    expect(mocks.query.mock.calls.some(([sql]) => sql.includes("status='failed'"))).toBe(true);
  });
  it('sanitizes provider failures', async () => {
    mocks.llm.mockRejectedValue(new Error('authorization: secret-token'));
    const r = await send();
    expect(r.status).toBe(502);
    expect(await r.text()).not.toContain('secret-token');
  });
  it('does not call the model with an inaccessible knowledge reference', async () => {
    mocks.resources.mockRejectedValue(new SchoolError(404, '引用资料不存在或无权访问'));
    expect((await send()).status).toBe(404);
    expect(mocks.llm).not.toHaveBeenCalled();
  });
  it('includes complete owner-scoped attachment text in the model prompt and citations', async () => {
    const id = '553f9633-cd88-40d8-87ee-8a5a21a4ef41';
    mocks.query.mockImplementation(async (sql: string) => ({
      rows: sql.includes('FROM school_chat_attachments')
        ? [{ id, title: '成绩.csv', content: '题号,得分\n1,8' }]
        : sql.includes('count(*)')
          ? [{ count: 0 }]
          : [],
      rowCount: 1,
    }));
    const r = await POST(
      new NextRequest('http://localhost:3000/api/school/chat', {
        method: 'POST',
        body: JSON.stringify({ ...body, attachmentIds: [id] }),
      }),
    );
    expect(r.status).toBe(200);
    expect((await r.json()).citations[0].label).toBe('附件1');
    expect(mocks.llm.mock.calls[0][0].system).toContain('题号,得分');
    const query = mocks.query.mock.calls.find(([sql]) =>
      sql.includes('FROM school_chat_attachments'),
    )!;
    expect(query[0]).toContain('owner_id=$2 AND thread_id=$3');
    expect(query[1]).toEqual([[id], 'teacher-a', body.threadId]);
  });
  it('rejects expired or foreign attachments before calling the model', async () => {
    const r = await POST(
      new NextRequest('http://localhost:3000/api/school/chat', {
        method: 'POST',
        body: JSON.stringify({ ...body, attachmentIds: ['553f9633-cd88-40d8-87ee-8a5a21a4ef41'] }),
      }),
    );
    expect(r.status).toBe(404);
    expect(mocks.llm).not.toHaveBeenCalled();
  });
  it('refuses oversized attachment context instead of silently dropping rows', async () => {
    const id = '553f9633-cd88-40d8-87ee-8a5a21a4ef41';
    mocks.query.mockImplementation(async (sql: string) => ({
      rows: sql.includes('FROM school_chat_attachments')
        ? [{ id, title: '成绩.csv', content: 'x'.repeat(30001) }]
        : sql.includes('count(*)')
          ? [{ count: 0 }]
          : [],
      rowCount: 1,
    }));
    const r = await POST(
      new NextRequest('http://localhost:3000/api/school/chat', {
        method: 'POST',
        body: JSON.stringify({ ...body, attachmentIds: [id] }),
      }),
    );
    expect(r.status).toBe(413);
    expect(mocks.llm).not.toHaveBeenCalled();
  });
  it('rejects reusing request IDs for different content', async () => {
    mocks.query.mockResolvedValue({
      rows: [{ status: 'succeeded', fingerprint: 'different' }],
      rowCount: 1,
    });
    expect((await send()).status).toBe(409);
    expect(mocks.llm).not.toHaveBeenCalled();
  });
  it('enforces the hourly request limit before starting a model call', async () => {
    mocks.query.mockImplementation(async (sql: string) => ({
      rows: sql.includes('count(*)') ? [{ count: 60 }] : [],
      rowCount: 1,
    }));
    expect((await send()).status).toBe(429);
    expect(mocks.llm).not.toHaveBeenCalled();
  });
  it('rejects concurrent requests in the same conversation', async () => {
    mocks.query.mockImplementation(async (sql: string) => ({
      rows: sql.includes('count(*)')
        ? [{ count: 0 }]
        : sql.includes('SELECT 1 FROM school_teacher_usage')
          ? [{ exists: 1 }]
          : [],
      rowCount: 1,
    }));
    expect((await send()).status).toBe(409);
    expect(mocks.llm).not.toHaveBeenCalled();
  });
});
