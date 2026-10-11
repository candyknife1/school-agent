import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import type { OwnerPrincipal } from '@/lib/server/identity/types';
const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  connect: vi.fn(),
  release: vi.fn(),
  principal: {
    ownerId: 'teacher-a',
    kind: 'user',
    assurance: 'verified',
    roles: new Set<string>(),
  },
}));
vi.mock('@/lib/persistence/server-provider', () => ({ getServerPersistenceProvider: vi.fn() }));
vi.mock('@/lib/server/identity/with-owner', () => ({
  withRequestOwner: (_req: unknown, fn: (p: OwnerPrincipal, h: Headers) => unknown) =>
    fn(mocks.principal as OwnerPrincipal, new Headers()),
}));
vi.mock('@/lib/school/store', async (original) => ({
  ...(await original<typeof import('@/lib/school/store')>()),
  schoolDb: async () => ({ query: mocks.query, connect: mocks.connect }),
}));
import { isSchoolAdmin, accessibleResources } from '@/lib/school/store';
import { readJson } from '@/lib/school/http';
import { GET as dashboard, PATCH as feedback } from '@/app/api/school/dashboard/route';
import { POST as addKnowledge } from '@/app/api/school/knowledge/route';
import { GET as readKnowledge, PATCH as review } from '@/app/api/school/knowledge/[id]/route';
import { GET as readThread } from '@/app/api/school/threads/[id]/route';
const id = '353f9633-cd88-40d8-87ee-8a5a21a4ef41';
const req = (path: string, method = 'GET', body?: unknown, origin?: string) =>
  new NextRequest(`http://localhost:3000/api/school/${path}`, {
    method,
    headers: origin ? { origin } : {},
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
beforeEach(() => {
  mocks.query.mockReset();
  mocks.connect.mockReset();
  mocks.release.mockReset();
  mocks.principal.assurance = 'verified';
  mocks.principal.roles = new Set();
  mocks.query.mockResolvedValue({ rows: [], rowCount: 0 });
  mocks.connect.mockResolvedValue({ query: mocks.query, release: mocks.release });
});
describe('school authorization boundaries', () => {
  it('requires verified admin, not a forged anonymous role', () => {
    const p = mocks.principal as OwnerPrincipal;
    expect(isSchoolAdmin(p)).toBe(false);
    mocks.principal.roles.add('admin');
    expect(isSchoolAdmin(p)).toBe(true);
    mocks.principal.assurance = 'unverified-legacy';
    expect(isSchoolAdmin(p)).toBe(false);
  });
  it('rejects school-wide reporting for non-admin before querying stats', async () => {
    const r = await dashboard(req('dashboard?scope=school'));
    expect(r.status).toBe(403);
    expect(mocks.query).not.toHaveBeenCalled();
  });
  it('rejects knowledge review by non-admin', async () => {
    expect(
      (
        await review(req(`knowledge/${id}`, 'PATCH', { action: 'approve' }), {
          params: Promise.resolve({ id }),
        })
      ).status,
    ).toBe(403);
  });
  it('returns identical missing/foreign responses for private knowledge', async () => {
    const r = await readKnowledge(req(`knowledge/${id}`), { params: Promise.resolve({ id }) });
    expect(r.status).toBe(404);
    expect(mocks.query.mock.calls[0][1]).toEqual([id, 'teacher-a', false]);
  });
  it('scopes conversation reads to request owner', async () => {
    expect(
      (await readThread(req(`threads/${id}`), { params: Promise.resolve({ id }) })).status,
    ).toBe(404);
    expect(mocks.query.mock.calls[0][1]).toEqual(['teacher-a', id]);
  });
  it('refuses inaccessible reference IDs rather than silently dropping them', async () => {
    await expect(
      accessibleResources({ query: mocks.query } as never, mocks.principal as OwnerPrincipal, [id]),
    ).rejects.toThrow('无权访问');
  });
  it('cannot rate another owner request', async () => {
    expect((await feedback(req('dashboard', 'PATCH', { requestId: id, rating: 1 }))).status).toBe(
      404,
    );
    expect(mocks.query.mock.calls[0][1]).toEqual([1, 'teacher-a', id]);
  });
  it('refuses cross-origin write requests', async () => {
    expect(
      (
        await feedback(
          req('dashboard', 'PATCH', { requestId: id, rating: 1 }, 'https://evil.example'),
        )
      ).status,
    ).toBe(403);
    expect(mocks.query).not.toHaveBeenCalled();
  });
});
describe('school error and reporting contracts', () => {
  it('does not leak database error details', async () => {
    mocks.query.mockRejectedValue(new Error('password=do-not-leak'));
    const r = await dashboard(req('dashboard'));
    expect(r.status).toBe(503);
    expect(await r.text()).not.toContain('do-not-leak');
  });
  it('does not report deployment-wide stats to a personal viewer', async () => {
    const r = await dashboard(req('dashboard?days=7'));
    expect(r.status).toBe(200);
    expect(
      mocks.query.mock.calls.every(
        ([, args]) => JSON.stringify(args) === JSON.stringify(['teacher-a', false, 7]),
      ),
    ).toBe(true);
    expect(r.headers.get('cache-control')).toBe('no-store');
  });
  it('bounds reporting periods and rejects forged ratings', async () => {
    expect((await dashboard(req('dashboard?days=999'))).status).toBe(400);
    expect((await feedback(req('dashboard', 'PATCH', { requestId: id, rating: 5 }))).status).toBe(
      400,
    );
  });
  it('prevents normal uploads from becoming shared without review', async () => {
    const r = await addKnowledge(
      req('knowledge', 'POST', {
        title: 'x',
        category: 'x',
        subject: '语文',
        content: 'x',
        visibility: 'school',
      }),
    );
    expect(r.status).toBe(400);
    expect(mocks.connect).not.toHaveBeenCalled();
  });
  it('rejects oversized chunked bodies without relying on Content-Length', async () => {
    await expect(readJson(req('test', 'POST', { value: 'x'.repeat(1000) }), 100)).rejects.toThrow(
      '过大',
    );
  });
});

describe('full skill source preview', () => {
  it('returns fixed upstream files without querying personal data', async () => {
    const { GET } = await import('@/app/api/school/skills/[id]/route');
    const response = await GET(req('skills/project-learning'), {
      params: Promise.resolve({ id: 'project-learning' }),
    });
    const source = await response.json();
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(source.documents[0].path).toBe('SKILL.md');
    expect(source.documents[0].content).toContain('一问一答、可追问');
    expect(mocks.query).not.toHaveBeenCalled();
  });
  it('returns 404 for unknown skills and object prototype keys', async () => {
    const { GET } = await import('@/app/api/school/skills/[id]/route');
    for (const id of ['unknown', '__proto__', 'constructor']) {
      const response = await GET(req('skills/' + id), { params: Promise.resolve({ id }) });
      expect(response.status).toBe(404);
    }
  });
});
