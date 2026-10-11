// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WorkspaceHeader, WorkspaceSwitcher } from '@/components/school/workspace-header';
import { TeacherPortal } from '@/components/school/teacher-portal';
import { TEACHING_SKILLS } from '@/lib/school/catalog';

const state = vi.hoisted(() => ({ pathname: '/', reducedMotion: false }));
vi.mock('next/navigation', () => ({ usePathname: () => state.pathname }));
vi.mock('next/link', () => ({
  default: ({
    children,
    prefetch: _prefetch,
    ...props
  }: React.PropsWithChildren<{ prefetch?: boolean }>) => createElement('a', props, children),
}));
vi.mock('motion/react', () => ({
  useReducedMotion: () => state.reducedMotion,
  motion: {
    span: ({
      layoutId: _layoutId,
      transition,
      ...props
    }: React.HTMLAttributes<HTMLSpanElement> & {
      layoutId: string;
      transition: { duration: number };
    }) => createElement('span', { ...props, 'data-duration': transition.duration }),
  },
}));
vi.mock('@/lib/hooks/use-theme', () => ({
  useTheme: () => ({ theme: 'light', setTheme: vi.fn() }),
}));
vi.mock('@/components/language-switcher', () => ({
  LanguageSwitcher: () => createElement('button', null, '中文'),
}));
vi.mock('@/components/settings', () => ({
  SettingsDialog: ({ open }: { open: boolean }) =>
    open ? createElement('div', { role: 'dialog' }, '共享模型设置') : null,
}));
vi.mock('@/components/school/types', () => ({
  schoolApi: vi.fn(async () => ({ resources: [], admin: false })),
}));
vi.mock('@/components/school/teacher-chat', () => ({
  TeacherChat: () =>
    createElement('textarea', { 'aria-label': '教师草稿', defaultValue: '保留的草稿' }),
}));
vi.mock('@/components/school/knowledge-plaza', () => ({
  KnowledgePlaza: () => createElement('div', null, '知识库内容'),
}));
vi.mock('@/components/school/community-board', () => ({
  CommunityBoard: () => null,
}));
vi.mock('@/components/school/usage-dashboard', () => ({
  UsageDashboard: () => createElement('div', null, '数据内容'),
}));

let host: HTMLDivElement;
let root: Root;
beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  state.pathname = '/';
  state.reducedMotion = false;
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe('peer workspace navigation', () => {
  it('exposes equal route links and moves the active indicator to the selected workspace', () => {
    act(() => root.render(createElement(WorkspaceSwitcher, { pathname: '/' })));
    const links = host.querySelectorAll('a');
    expect([...links].map((link) => [link.textContent, link.getAttribute('href')])).toEqual([
      ['课程空间', '/'],
      ['教师工作台', '/teacher'],
    ]);
    expect(links[0].getAttribute('aria-current')).toBe('page');
    act(() => root.render(createElement(WorkspaceSwitcher, { pathname: '/teacher' })));
    expect(host.querySelector('[aria-current="page"]')?.textContent).toBe('教师工作台');
    expect(host.querySelectorAll('[data-duration]')).toHaveLength(1);
  });
  it('respects reduced motion', () => {
    state.reducedMotion = true;
    act(() => root.render(createElement(WorkspaceSwitcher, { pathname: '/' })));
    expect(host.querySelector('[data-duration]')?.getAttribute('data-duration')).toBe('0');
  });
  it('shares brand and settings on both routes without touching the existing classroom shell', () => {
    for (const pathname of ['/', '/teacher']) {
      state.pathname = pathname;
      act(() => root.render(createElement(WorkspaceHeader)));
      expect(host.textContent).toContain('school-agent');
      expect(host.querySelector('nav[aria-label="切换工作区"]')).not.toBeNull();
      act(() => (host.querySelector('button[aria-label="模型设置"]') as HTMLButtonElement).click());
      expect(host.querySelector('[role="dialog"]')).not.toBeNull();
      act(() => root.render(null));
    }
    state.pathname = '/classroom/test';
    act(() => root.render(createElement(WorkspaceHeader)));
    expect(host.textContent).toBe('');
  });
  it('shows short skill cards, keeps the chat mounted through teacher tabs, and retains the full skill selection entry', async () => {
    await act(async () => root.render(createElement(TeacherPortal)));
    expect(host.querySelectorAll('article')).toHaveLength(TEACHING_SKILLS.length);
    expect(host.querySelector('details')).toBeNull();
    expect(host.textContent).not.toContain('查看完整原始 Skill');
    expect(host.textContent).not.toContain('原版课程');
    const draft = host.querySelector('textarea');
    const useSkill = [...host.querySelectorAll('button')].find((button) =>
      button.textContent?.includes('使用此技能'),
    )!;
    act(() => useSkill.click());
    expect(host.querySelector('textarea')).toBe(draft);
    expect(draft?.closest('[hidden]')).toBeNull();
    const skills = [...host.querySelectorAll('button')].find(
      (button) => button.textContent === '技能广场',
    )!;
    await act(async () => skills.click());
    expect(host.querySelector('textarea')).toBe(draft);
    expect(draft?.closest('[hidden]')).not.toBeNull();
  });
});
