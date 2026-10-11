'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, useReducedMotion } from 'motion/react';
import { BookOpen, GraduationCap, PanelsTopLeft, Settings } from 'lucide-react';
import { LanguageSwitcher } from '@/components/language-switcher';
import { SettingsDialog } from '@/components/settings';
import { useTheme } from '@/lib/hooks/use-theme';

const workspaces = [
  { href: '/', label: '课程空间', icon: BookOpen },
  { href: '/teacher', label: '教师工作台', icon: PanelsTopLeft },
];

export function WorkspaceSwitcher({ pathname }: { pathname: string }) {
  const reducedMotion = useReducedMotion();
  return (
    <nav aria-label="切换工作区" className="flex rounded-2xl bg-slate-100 p-1 dark:bg-slate-800">
      {workspaces.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            prefetch
            aria-current={active ? 'page' : undefined}
            className={`relative flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 ${active ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}`}
          >
            {active && (
              <motion.span
                layoutId="school-workspace-active"
                transition={{ duration: reducedMotion ? 0 : 0.22, ease: 'easeOut' }}
                className="absolute inset-0 rounded-xl bg-white shadow-sm dark:bg-slate-700"
              />
            )}
            <Icon size={16} className="relative" aria-hidden="true" />
            <span className="relative">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

/** Root-layout shell stays mounted when moving between the two peer workspaces. */
export function WorkspaceHeader() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [settingsOpen, setSettingsOpen] = useState(false);
  if (pathname !== '/' && pathname !== '/teacher') return null;
  return (
    <>
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/90">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-6">
          <Link href="/" aria-label="school-agent 课程空间" className="flex items-center gap-2.5">
            <span className="rounded-xl bg-indigo-600 p-2 text-white">
              <GraduationCap size={23} aria-hidden="true" />
            </span>
            <span>
              <span className="block text-base font-semibold tracking-tight text-slate-900 dark:text-white">
                school-agent
              </span>
              <span className="hidden text-xs text-slate-500 sm:block">
                小学教学 · 课程与教师协作
              </span>
            </span>
          </Link>
          <div className="order-last w-full sm:order-none sm:w-auto">
            <WorkspaceSwitcher pathname={pathname} />
          </div>
          <div className="flex items-center gap-1">
            <LanguageSwitcher />
            <select
              aria-label="外观主题"
              value={theme}
              onChange={(event) => setTheme(event.target.value as 'light' | 'dark' | 'system')}
              className="max-w-20 rounded-lg bg-transparent px-1 py-2 text-xs text-slate-500 focus-visible:outline-indigo-500 dark:text-slate-400"
            >
              <option value="light">浅色</option>
              <option value="dark">深色</option>
              <option value="system">跟随系统</option>
            </select>
            <button
              type="button"
              aria-label="模型设置"
              title="模型设置"
              onClick={() => setSettingsOpen(true)}
              className="rounded-xl p-2 text-slate-500 transition hover:bg-indigo-50 hover:text-indigo-600 focus-visible:outline-indigo-500 dark:hover:bg-slate-800"
            >
              <Settings size={18} />
            </button>
          </div>
        </div>
      </header>
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
}
