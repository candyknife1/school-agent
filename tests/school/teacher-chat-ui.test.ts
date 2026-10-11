// @vitest-environment jsdom
import { act, createElement, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ api: vi.fn(), fetch: vi.fn() }));
vi.mock('@/components/school/types', () => ({
  schoolApi: mocks.api,
  fieldClass: '',
  primaryClass: '',
  secondaryClass: '',
}));
vi.mock('@/components/prompt-optimizer', () => ({ PromptOptimizer: () => null }));
import { TeacherChat } from '@/components/school/teacher-chat';
import { CommunityBoard } from '@/components/school/community-board';
let host: HTMLDivElement, root: Root;
function Harness() {
  const [skillId, setSkillId] = useState('lesson-design');
  const [message, setMessage] = useState('分析这份试卷');
  return createElement(TeacherChat, {
    skillId,
    setSkillId,
    message,
    setMessage,
    resources: [],
    resourceIds: [],
    setResourceIds: vi.fn(),
  });
}
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  mocks.api.mockReset();
  mocks.fetch.mockReset();
  mocks.api.mockImplementation(async (path: string) =>
    path === 'threads'
      ? { threads: [] }
      : { posts: [], replies: [], admin: false, answer: '草稿', citations: [] },
  );
  vi.stubGlobal('fetch', mocks.fetch);
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});
async function file(name: string, value: string) {
  const input = host.querySelector('input[type="file"]')!;
  Object.defineProperty(input, 'files', { configurable: true, value: [new File([value], name)] });
  await act(async () => input.dispatchEvent(new Event('change', { bubbles: true })));
}
describe('teacher chat skill and attachment UI', () => {
  it('places the skill selection ahead of history and context rather than buried in the sidebar', async () => {
    await act(async () => root.render(createElement(Harness)));
    const selects = host.querySelectorAll('select');
    expect(selects[0].getAttribute('aria-label')).toBe('本次技能');
    expect(host.textContent).toContain('本次技能 · 备课设计');
    expect(host.textContent).toContain('完整 Skill');
  });
  it('previews uploaded text and submits attachment IDs with chat requests', async () => {
    await act(async () => root.render(createElement(Harness)));
    mocks.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        attachment: { id: 'file-a', title: '成绩.csv', characters: 20, preview: '题号,得分' },
      }),
    });
    await file('成绩.csv', '题号,得分');
    expect(host.textContent).toContain('成绩.csv');
    expect(host.textContent).toContain('预览解析文本');
    await act(async () =>
      host
        .querySelector('form')!
        .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })),
    );
    const call = mocks.api.mock.calls.find(([path]) => path === 'chat')!;
    expect(JSON.parse(call[1].body).attachmentIds).toEqual(['file-a']);
  });
  it('blocks cloud-bound photos without consent before making any upload request', async () => {
    await act(async () => root.render(createElement(Harness)));
    await file('试卷.png', 'fake');
    expect(mocks.fetch).not.toHaveBeenCalled();
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('先勾选同意');
  });
  it('disables sending oversized extracted text instead of silently truncating student data', async () => {
    await act(async () => root.render(createElement(Harness)));
    mocks.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        attachment: { id: 'file-a', title: '成绩.csv', characters: 30001, preview: '大表' },
      }),
    });
    await file('成绩.csv', '大表');
    expect((host.querySelector('button[type="submit"]') as HTMLButtonElement).disabled).toBe(true);
    expect(host.textContent).toContain('不会静默截断表格');
  });
});
describe('unverified community notice rendering', () => {
  it('renders notice strip across tabs, labels all authors unverified and escapes posted HTML', async () => {
    mocks.api.mockResolvedValue({
      posts: [
        {
          id: 'p',
          parent_id: null,
          kind: 'notice',
          author: '校长',
          title: '测试通知',
          content: '<script>alert(1)</script>',
          created_at: '2026-10-11T00:00:00Z',
          is_owner: false,
        },
      ],
      replies: [],
      admin: false,
    });
    await act(async () => root.render(createElement(CommunityBoard, { active: false })));
    expect(host.querySelector('[aria-label="试用通知栏"]')).not.toBeNull();
    expect(host.textContent).toContain('未认证');
    expect(host.querySelector('script')).toBeNull();
    expect(host.querySelector('div[hidden]')).not.toBeNull();
    expect(host.querySelector('button[aria-label="删除交流内容"]')).toBeNull();
  });
});
