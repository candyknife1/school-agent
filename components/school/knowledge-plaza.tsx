'use client';
import { useState } from 'react';
import { FileText, Upload, Plus, Trash2, BookOpen, X, Loader2 } from 'lucide-react';
import { SUBJECTS } from '@/lib/school/catalog';
import { schoolApi, fieldClass, primaryClass, secondaryClass, type Resource } from './types';
interface Props {
  resources: Resource[];
  admin: boolean;
  refresh: () => Promise<void>;
  onReference: (id: string) => void;
}
const visibilityNames = { private: '仅自己', submitted: '待管理员审核', school: '校级共享' };
export function KnowledgePlaza({ resources, admin, refresh, onReference }: Props) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('全部');
  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('教学资料');
  const [subject, setSubject] = useState('语文');
  const [content, setContent] = useState('');
  const [submitForReview, setSubmitForReview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<{ id: string; title: string; content: string } | null>(
    null,
  );
  const visible = resources.filter(
    (r) =>
      (filter === '全部' || r.subject === filter) &&
      `${r.title} ${r.category}`.toLowerCase().includes(query.toLowerCase()),
  );
  const importFile = async (file?: File) => {
    if (!file) return;
    try {
      if (!/\.(txt|md)$/i.test(file.name))
        throw new Error('本版支持 UTF-8 TXT / Markdown；PDF、Word 和扫描件解析将在后续接入。');
      if (file.size > 300000) throw new Error('文本文件不得超过300KB');
      const bytes = await file.arrayBuffer();
      const value = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      if (value.length > 100000 || value.includes('\0'))
        throw new Error('文件正文不得超过10万字，且必须是纯文本');
      setContent(value);
      setTitle(file.name.replace(/\.(txt|md)$/i, ''));
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : '文件读取失败');
    }
  };
  const save = async () => {
    setBusy(true);
    setError('');
    try {
      await schoolApi('knowledge', {
        method: 'POST',
        body: JSON.stringify({
          title,
          category,
          subject,
          content,
          visibility: submitForReview ? 'submitted' : 'private',
        }),
      });
      setFormOpen(false);
      setTitle('');
      setContent('');
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败');
    } finally {
      setBusy(false);
    }
  };
  const remove = async (id: string) => {
    if (!window.confirm('确定删除这份资料？已保存的对话引用节选不会随之删除。')) return;
    setBusy(true);
    try {
      await schoolApi(`knowledge/${id}`, { method: 'DELETE' });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : '删除失败');
    } finally {
      setBusy(false);
    }
  };
  const review = async (id: string, action: string) => {
    if (
      !window.confirm(
        action === 'approve'
          ? '审核通过后，该资料将向所有访问者共享。请确认已脱敏并有权分享。'
          : '确定撤回共享或退回为私有资料？',
      )
    )
      return;
    setBusy(true);
    try {
      await schoolApi(`knowledge/${id}`, { method: 'PATCH', body: JSON.stringify({ action }) });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : '审核失败');
    } finally {
      setBusy(false);
    }
  };
  const read = async (id: string) => {
    try {
      setPreview(await schoolApi(`knowledge/${id}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : '读取失败');
    }
  };
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">把教学资料变成对话依据</h2>
          <p className="mt-2 text-sm text-slate-500">
            按学科和分类整理，引用时展示实际送入模型的资料节选。
          </p>
        </div>
        <button
          className={primaryClass}
          onClick={() => {
            setFormOpen(true);
            setError('');
          }}
        >
          <Plus size={16} />
          添加资料
        </button>
      </div>
      <p className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs leading-6 text-amber-800">
        资料默认仅自己可见；提交共享后须经已验证管理员审核。当前匿名浏览器身份不是实名教师账号，清除身份
        Cookie 会失去资料入口。请勿上传含学生个人信息或无权分享的资料。
      </p>
      {error && (
        <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <input
          aria-label="搜索资料"
          className={`${fieldClass} max-w-sm`}
          placeholder="搜索资料名称或分类"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          aria-label="筛选学科"
          className={`${fieldClass} max-w-40`}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          {['全部', ...SUBJECTS].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>
      {formOpen && (
        <form
          className="rounded-2xl border border-indigo-200 bg-white p-5 shadow-sm"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold">添加知识库资料</h3>
            <button
              type="button"
              aria-label="关闭添加资料"
              disabled={busy}
              onClick={() => setFormOpen(false)}
            >
              <X size={18} />
            </button>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <label className="text-xs text-slate-500">
              资料名称
              <input
                className={`${fieldClass} mt-1`}
                value={title}
                required
                maxLength={120}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
            <label className="text-xs text-slate-500">
              分类
              <input
                className={`${fieldClass} mt-1`}
                value={category}
                required
                maxLength={40}
                placeholder="例如：课程标准、教案、作品评价"
                onChange={(e) => setCategory(e.target.value)}
              />
            </label>
            <label className="text-xs text-slate-500">
              学科
              <select
                className={`${fieldClass} mt-1`}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              >
                {SUBJECTS.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="mt-4 inline-flex cursor-pointer items-center gap-2 text-sm text-indigo-600">
            <Upload size={16} />从 TXT / Markdown 文件读取
            <input
              className="sr-only"
              type="file"
              accept=".txt,.md,text/plain,text/markdown"
              onChange={(e) => {
                void importFile(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </label>
          <label className="mt-3 block text-xs text-slate-500">
            资料正文（最多10万字）
            <textarea
              className={`${fieldClass} mt-1 min-h-48`}
              required
              maxLength={100000}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="粘贴教材片段、课程标准、校本教学材料……"
            />
          </label>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={submitForReview}
                onChange={(e) => setSubmitForReview(e.target.checked)}
              />
              提交为校级共享资料（需管理员审核）
            </label>
            <button
              className={primaryClass}
              disabled={busy || !title.trim() || !category.trim() || !content.trim()}
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : <BookOpen size={16} />}
              保存资料
            </button>
          </div>
        </form>
      )}
      {!visible.length ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center">
          <BookOpen className="mx-auto mb-3 text-slate-400" size={32} />
          <h3 className="font-medium text-slate-700">还没有匹配的资料</h3>
          <p className="mt-2 text-sm text-slate-500">
            先添加一份课程标准或教案片段，再到教师对话中引用。
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((r) => (
            <article key={r.id} className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <FileText className="text-indigo-500" size={24} />
                <span
                  className={`rounded-full px-2 py-1 text-[11px] ${r.visibility === 'school' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}
                >
                  {visibilityNames[r.visibility]}
                </span>
              </div>
              <h3 className="mt-4 break-words font-semibold text-slate-800">{r.title}</h3>
              <p className="mt-2 text-xs text-slate-500">
                {r.subject} · {r.category} · {r.characters.toLocaleString()}字
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button className={secondaryClass} onClick={() => void read(r.id)}>
                  查看
                </button>
                <button className={secondaryClass} onClick={() => onReference(r.id)}>
                  引用到对话
                </button>
                {(r.is_owner || (admin && r.visibility !== 'private')) && (
                  <button
                    aria-label={`删除${r.title}`}
                    className={secondaryClass}
                    disabled={busy}
                    onClick={() => void remove(r.id)}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              {admin && r.visibility === 'submitted' && (
                <div className="mt-3 flex gap-2">
                  <button
                    className={primaryClass}
                    disabled={busy}
                    onClick={() => void review(r.id, 'approve')}
                  >
                    审核共享
                  </button>
                  <button
                    className={secondaryClass}
                    disabled={busy}
                    onClick={() => void review(r.id, 'reject')}
                  >
                    退回
                  </button>
                </div>
              )}
              {admin && r.visibility === 'school' && (
                <button
                  className={`${secondaryClass} mt-3`}
                  disabled={busy}
                  onClick={() => void review(r.id, 'unpublish')}
                >
                  撤回共享
                </button>
              )}
            </article>
          ))}
        </div>
      )}
      <p className="text-xs text-slate-400">
        当前列表最多显示200份可访问资料。此版采用显式选择和文本节选，不是向量检索；不支持扫描件、PDF或Word解析。
      </p>
      {preview && (
        <section className="rounded-2xl border border-indigo-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">{preview.title}</h3>
            <button aria-label="关闭资料预览" onClick={() => setPreview(null)}>
              <X size={18} />
            </button>
          </div>
          <pre className="mt-4 max-h-96 overflow-auto whitespace-pre-wrap break-words font-sans text-sm leading-7 text-slate-600">
            {preview.content}
          </pre>
        </section>
      )}
    </div>
  );
}
