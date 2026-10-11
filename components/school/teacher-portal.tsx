'use client';
import { useCallback, useEffect, useState } from 'react';
import { BookOpen, Sparkles, MessageSquare, BarChart3, ArrowRight } from 'lucide-react';
import { TEACHING_SKILLS, SUBJECTS } from '@/lib/school/catalog';
import { TeacherChat } from './teacher-chat';
import { KnowledgePlaza } from './knowledge-plaza';
import { CommunityBoard } from './community-board';
import { UsageDashboard } from './usage-dashboard';
import { schoolApi, type Resource } from './types';
type Tab = 'skills' | 'chat' | 'knowledge' | 'dashboard' | 'community';
const tabs = [
  { id: 'skills' as const, label: '技能广场', icon: Sparkles },
  { id: 'chat' as const, label: '教师对话', icon: MessageSquare },
  { id: 'knowledge' as const, label: '知识库', icon: BookOpen },
  { id: 'community' as const, label: '教师交流', icon: MessageSquare },
  { id: 'dashboard' as const, label: '数据看板', icon: BarChart3 },
];
export function TeacherPortal() {
  const [tab, setTab] = useState<Tab>('skills');
  const [skillId, setSkillId] = useState('');
  const [message, setMessage] = useState('');
  const [resources, setResources] = useState<Resource[]>([]);
  const [resourceIds, setResourceIds] = useState<string[]>([]);
  const [admin, setAdmin] = useState(false);
  const [error, setError] = useState('');
  const refresh = useCallback(async () => {
    try {
      const data = await schoolApi<{ resources: Resource[]; admin: boolean }>('knowledge');
      setResources(data.resources);
      setAdmin(data.admin);
      setError('');
      setResourceIds((old) => old.filter((id) => data.resources.some((r) => r.id === id)));
    } catch (e) {
      setError(e instanceof Error ? e.message : '资料加载失败');
    }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    schoolApi<{ resources: Resource[]; admin: boolean }>('knowledge', { signal: controller.signal })
      .then((data) => {
        setResources(data.resources);
        setAdmin(data.admin);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e instanceof Error ? e.message : '资料加载失败');
      });
    return () => controller.abort();
  }, []);
  return (
    <main className="school-teacher-workspace min-h-[calc(100dvh-76px)] bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 font-sans text-slate-800">
      <div className="school-workspace-enter mx-auto max-w-7xl px-5 py-7">
        <div className="mb-5">
          <h1 className="text-xl font-semibold">教师工作台</h1>
          <p className="mt-1 text-sm text-slate-500">
            备课、对话、资料与反馈，在同一个工作区完成。
          </p>
        </div>
        <nav aria-label="教师功能" className="mb-7 flex flex-wrap gap-2">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => {
                setTab(id);
                void refresh();
              }}
              aria-current={tab === id ? 'page' : undefined}
              className={`flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-medium transition ${tab === id ? 'bg-indigo-100 text-indigo-700 shadow-sm ring-1 ring-indigo-200' : 'bg-white text-slate-500 hover:bg-indigo-50 hover:text-indigo-600'}`}
            >
              <Icon size={17} />
              {label}
            </button>
          ))}
        </nav>
        {error && (
          <p role="alert" className="mb-5 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
            {error}
            <button className="ml-3 underline" onClick={() => void refresh()}>
              重试
            </button>
          </p>
        )}
        <CommunityBoard active={tab === 'community'} />
        {tab === 'skills' && (
          <div className="space-y-6">
            <section className="relative overflow-hidden rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-sky-50 p-7 text-slate-800 md:p-10">
              <div className="absolute -right-10 -top-14 h-64 w-64 rounded-full bg-sky-200/40 blur-3xl" />
              <p className="mb-3 text-xs font-medium tracking-widest text-indigo-600">
                为小学教师的真实任务而设计
              </p>
              <h2 className="relative text-2xl font-semibold leading-relaxed md:text-3xl">
                不是多一个聊天窗口，
                <br />
                而是少一点重复的备课工作。
              </h2>
              <p className="relative mt-4 max-w-2xl text-sm leading-7 text-slate-600">
                选择教学工作流，带上自己的资料，把需求变成可修改的教学草稿。技能支持点击调用，也支持在教师对话中输入“使用技能名”。
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {SUBJECTS.map((s) => (
                  <span
                    key={s}
                    className="rounded-full border border-indigo-100 bg-white/80 px-3 py-1 text-xs text-indigo-700"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </section>
            <div className="flex items-end justify-between">
              <div>
                <h3 className="text-xl font-semibold">六个起步工作流</h3>
                <p className="mt-2 text-sm text-slate-500">
                  选择一个技能开始，完整教学工作流会在对话中生效。
                </p>
              </div>
              <span className="text-xs text-slate-400">6 个教学技能</span>
            </div>
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {TEACHING_SKILLS.map((skill, index) => (
                <article
                  key={skill.id}
                  className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6"
                >
                  <div className="flex items-center justify-between">
                    <span className="rounded-xl bg-indigo-50 p-3 text-indigo-600">
                      <Sparkles size={21} />
                    </span>
                    <span className="text-xs font-medium text-slate-400">
                      WORKFLOW {String(index + 1).padStart(2, '0')}
                    </span>
                  </div>
                  <h4 className="mt-5 text-lg font-semibold">{skill.name}</h4>
                  <p className="mt-2 min-h-12 text-sm leading-6 text-slate-500">
                    {skill.description}
                  </p>
                  <button
                    className="mt-5 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-700"
                    onClick={() => {
                      setSkillId(skill.id);
                      setMessage(skill.example);
                      setTab('chat');
                    }}
                  >
                    使用此技能
                    <ArrowRight size={16} />
                  </button>
                </article>
              ))}
            </div>
            <p className="text-xs leading-6 text-slate-400">
              已接入完整教学 Skill 与配套资料，生成内容请由教师复核。
            </p>
          </div>
        )}
        <div hidden={tab !== 'chat'}>
          <TeacherChat
            skillId={skillId}
            setSkillId={setSkillId}
            message={message}
            setMessage={setMessage}
            resources={resources}
            resourceIds={resourceIds}
            setResourceIds={setResourceIds}
          />
        </div>
        {tab === 'knowledge' && (
          <KnowledgePlaza
            resources={resources}
            admin={admin}
            refresh={refresh}
            onReference={(id) => {
              if (resourceIds.includes(id)) {
                setTab('chat');
                return;
              }
              if (resourceIds.length >= 5) {
                setError('每次最多引用5份资料，请先在对话中取消一份。');
                return;
              }
              setResourceIds([...resourceIds, id]);
              setTab('chat');
            }}
          />
        )}
        {tab === 'dashboard' && <UsageDashboard />}
      </div>
    </main>
  );
}
