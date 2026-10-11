'use client';
import { useEffect, useState } from 'react';
import { Activity, CheckCircle2, FileText, ThumbsUp, RefreshCw } from 'lucide-react';
import { TEACHING_SKILLS } from '@/lib/school/catalog';
import { schoolApi, fieldClass, secondaryClass } from './types';
interface Bucket {
  key: string;
  count: number;
  succeeded?: number;
}
interface Dashboard {
  totals: {
    requests: number;
    succeeded: number;
    failed: number;
    running: number;
    interrupted: number;
    active_owners: number;
    resource_references: number;
    tokens: string;
    avg_latency_ms: number;
    rated: number;
    useful: number;
  };
  skills: Bucket[];
  categories: Bucket[];
  subjects: Bucket[];
  trend: { day: string; count: number; succeeded: number }[];
  admin: boolean;
}
function Ranking({ title, rows }: { title: string; rows: Bucket[] }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <h3 className="mb-5 font-semibold text-slate-800">{title}</h3>
      {!rows.length && <p className="text-sm text-slate-400">暂无记录</p>}
      <div className="space-y-4">
        {rows.map((r) => (
          <div key={r.key}>
            <div className="mb-1.5 flex justify-between text-sm">
              <span className="text-slate-600">
                {TEACHING_SKILLS.find((s) => s.id === r.key)?.name ??
                  (r.key === 'general' ? '通用对话' : r.key)}
              </span>
              <span className="font-semibold text-slate-800">{r.count}次</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-indigo-500"
                style={{ width: `${(r.count / max) * 100}%` }}
              />
            </div>
            {r.succeeded !== undefined && (
              <p className="mt-1 text-[11px] text-slate-400">
                成功 {r.succeeded} 次 · 包含失败的总请求 {r.count} 次
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
export function UsageDashboard() {
  const [days, setDays] = useState(30);
  const [scope, setScope] = useState('personal');
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    schoolApi<Dashboard>(`dashboard?days=${days}&scope=${scope}`)
      .then((value) => {
        if (!cancelled) {
          setData(value);
          setError('');
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : '看板读取失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [days, scope, refresh]);
  const totals = data?.totals;
  const cards = [
    {
      title: '教学请求',
      value: totals?.requests ?? 0,
      detail: `成功 ${totals?.succeeded ?? 0} · 失败 ${totals?.failed ?? 0} · 中断 ${totals?.interrupted ?? 0}`,
      icon: Activity,
    },
    {
      title: '完成率',
      value: totals?.requests ? `${Math.round((totals.succeeded / totals.requests) * 100)}%` : '—',
      detail: `生成中 ${totals?.running ?? 0} 次；按全部请求计算`,
      icon: CheckCircle2,
    },
    {
      title: '资料引用',
      value: totals?.resource_references ?? 0,
      detail: '成功回复中的资料引用次数（非去重文件数）',
      icon: FileText,
    },
    {
      title: '教师认可',
      value: totals?.rated ? `${Math.round((totals.useful / totals.rated) * 100)}%` : '—',
      detail: `有帮助 ${totals?.useful ?? 0} / 已反馈 ${totals?.rated ?? 0}`,
      icon: ThumbsUp,
    },
  ];
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">让教学使用留下可解释的数据</h2>
          <p className="mt-2 text-sm text-slate-500">
            只统计本教师工作台的真实请求，不包含原版课堂和其他入口。
          </p>
        </div>
        <div className="flex gap-2">
          <select
            aria-label="统计时间"
            className={`${fieldClass} !w-auto`}
            value={days}
            onChange={(e) => {
              setLoading(true);
              setDays(Number(e.target.value));
            }}
          >
            {[7, 30, 90].map((d) => (
              <option key={d} value={d}>
                近{d}天
              </option>
            ))}
          </select>
          {data?.admin && (
            <select
              aria-label="统计范围"
              className={`${fieldClass} !w-auto`}
              value={scope}
              onChange={(e) => {
                setLoading(true);
                setScope(e.target.value);
              }}
            >
              <option value="personal">个人数据</option>
              <option value="school">校级数据</option>
            </select>
          )}
          <button
            aria-label="刷新看板"
            className={secondaryClass}
            onClick={() => {
              setLoading(true);
              setRefresh((r) => r + 1);
            }}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>
      {error && (
        <p role="alert" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
          {error}（不展示过期数据）
        </p>
      )}
      {!error && (
        <>
          <p className="rounded-xl bg-indigo-50 p-3 text-xs leading-6 text-indigo-700">
            {scope === 'school'
              ? '校级聚合视图，不提供其他用户对话正文。'
              : '当前为个人统计，校级汇总需要已验证管理员身份。'}{' '}
            问题类别按所用技能和关键词匹配，不代表模型语义分析；活跃身份数不等于实名教师人数。
          </p>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map(({ title, value, detail, icon: Icon }) => (
              <section key={title} className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex items-center justify-between text-sm text-slate-500">
                  {title}
                  <Icon size={18} className="text-indigo-500" />
                </div>
                <p className="mt-3 text-3xl font-semibold text-slate-900">
                  {loading ? '…' : value}
                </p>
                <p className="mt-3 text-[11px] leading-5 text-slate-400">{detail}</p>
              </section>
            ))}
          </div>
          {totals && totals.requests === 0 && (
            <p className="rounded-xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500">
              还没有调用数据。到教师对话发送一个问题后，这里才会产生真实统计；打开技能卡片不计为调用。
            </p>
          )}
          <div className="grid gap-5 lg:grid-cols-3">
            <Ranking title="技能使用热度" rows={data?.skills ?? []} />
            <Ranking title="常见问题类别" rows={data?.categories ?? []} />
            <Ranking title="学科使用分布" rows={data?.subjects ?? []} />
          </div>
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="mb-4 font-semibold text-slate-800">每日使用趋势</h3>
            <div className="max-h-64 overflow-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-slate-400">
                  <tr>
                    <th className="py-2">日期（北京时间）</th>
                    <th>请求</th>
                    <th>成功</th>
                    <th>趋势</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.trend.map((day) => (
                    <tr key={day.day} className="border-t border-slate-100 text-slate-600">
                      <td className="py-3">{day.day}</td>
                      <td>{day.count}</td>
                      <td>{day.succeeded}</td>
                      <td className="w-1/3">
                        <div className="h-2 rounded-full bg-indigo-100">
                          <div
                            className="h-full rounded-full bg-indigo-500"
                            style={{
                              width: `${(day.count / Math.max(1, ...data.trend.map((d) => d.count))) * 100}%`,
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-xs text-slate-400">
              仅列有请求的日期。活跃身份 {totals?.active_owners ?? 0} · Token{' '}
              {Number(totals?.tokens ?? 0).toLocaleString()} · 成功请求平均耗时{' '}
              {((totals?.avg_latency_ms ?? 0) / 1000).toFixed(1)} 秒
            </p>
          </section>
          <p className="text-xs leading-6 text-slate-400">
            统计保存技能、类别、学科、状态和反馈，不保存原始问题文本；对话正文另行私有保存。失败请求也进入热度统计，重复请求编号不会重复计数。此版不估算教学成效或虚构费用。
          </p>
        </>
      )}
    </div>
  );
}
