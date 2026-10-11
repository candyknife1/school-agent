'use client';
import { useCallback, useEffect, useState } from 'react';
import { MessageSquare, Megaphone, RefreshCw, Trash2 } from 'lucide-react';
import { schoolApi, fieldClass, primaryClass, secondaryClass } from './types';
interface Post {
  id: string;
  parent_id: string | null;
  kind: string;
  author: string;
  title: string;
  content: string;
  created_at: string;
  is_owner: boolean;
}
export function CommunityBoard({ active }: { active: boolean }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [replies, setReplies] = useState<Post[]>([]);
  const [admin, setAdmin] = useState(false);
  const [kind, setKind] = useState('discussion');
  const [author, setAuthor] = useState('教师访客');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => {
    try {
      const data = await schoolApi<{ posts: Post[]; replies: Post[]; admin: boolean }>('community');
      setPosts(data.posts);
      setReplies(data.replies);
      setAdmin(data.admin);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : '交流区加载失败');
    }
  }, []);
  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => {
      if (!document.hidden) void refresh();
    }, 60000);
    return () => window.clearInterval(timer);
  }, [refresh]);
  const publish = async (parentId: string | null = null) => {
    setBusy(true);
    setError('');
    try {
      await schoolApi('community', {
        method: 'POST',
        body: JSON.stringify({
          kind,
          author,
          title,
          content: parentId ? reply : content,
          parentId,
        }),
      });
      if (parentId) {
        setReply('');
        setReplyTo(null);
      } else {
        setTitle('');
        setContent('');
      }
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : '发布失败');
    } finally {
      setBusy(false);
    }
  };
  const remove = async (post: Post) => {
    if (!window.confirm(post.parent_id ? '删除这条回复？' : '删除这条内容及其所有回复？')) return;
    setBusy(true);
    try {
      await schoolApi(`community?id=${post.id}`, { method: 'DELETE' });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : '删除失败');
    } finally {
      setBusy(false);
    }
  };
  const notices = posts.filter((p) => p.kind === 'notice').slice(0, 5);
  return (
    <>
      {notices.length > 0 && (
        <section
          aria-label="试用通知栏"
          className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950 p-4"
        >
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-800 dark:text-amber-200">
            <Megaphone size={17} />
            通知速览 <span className="text-xs font-normal">未认证 · 本地试用</span>
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {notices.map((n) => (
              <article
                key={n.id}
                className="min-w-64 max-w-sm shrink-0 rounded-xl border border-amber-100 dark:border-amber-900 bg-white p-3"
              >
                <h3 className="text-sm font-semibold">{n.title}</h3>
                <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-6 text-slate-600">
                  {n.content.slice(0, 150)}
                  {n.content.length > 150 ? '…（完整内容见教师交流）' : ''}
                </p>
              </article>
            ))}
          </div>
        </section>
      )}
      <div hidden={!active}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">教师交流</h2>
            <p className="mt-1 text-sm text-slate-500">
              分享技能用法、备课心得和改进建议，也可以发布试用通知。
            </p>
          </div>
          <button className={secondaryClass} onClick={() => void refresh()} disabled={busy}>
            <RefreshCw size={16} />
            刷新
          </button>
        </div>
        <p className="mb-5 rounded-xl bg-indigo-50 p-3 text-xs leading-6 text-indigo-700">
          当前没有账号认证。昵称可自填，通知不代表正式学校公告；同一浏览器可删除自己发布的内容。所有访客可见，请勿发布学生姓名、成绩明细、联系方式或其他隐私。最新50条主题，每分钟刷新。
        </p>
        {error && (
          <p
            role="alert"
            className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:text-amber-200"
          >
            {error}
          </p>
        )}
        <form
          className="mb-6 space-y-3 rounded-2xl border border-slate-200 bg-white p-5"
          onSubmit={(e) => {
            e.preventDefault();
            void publish();
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <select
              aria-label="发布类型"
              className={fieldClass}
              value={kind}
              onChange={(e) => setKind(e.target.value)}
              disabled={busy}
            >
              <option value="discussion">使用心得 / 讨论</option>
              <option value="notice">试用通知（未认证）</option>
            </select>
            <input
              aria-label="交流昵称"
              className={fieldClass}
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              maxLength={30}
              disabled={busy}
              placeholder="显示昵称（未认证）"
              required
            />
          </div>
          <input
            aria-label="交流标题"
            className={fieldClass}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
            disabled={busy}
            placeholder="一个清楚的标题"
            required
          />
          <textarea
            aria-label="交流正文"
            className={`${fieldClass} min-h-28`}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={3000}
            disabled={busy}
            placeholder="分享你的使用心得，或者发布一条试用通知……"
            required
          />
          <button
            className={primaryClass}
            disabled={busy || !content.trim() || !title.trim() || !author.trim()}
          >
            {busy ? '处理中…' : kind === 'notice' ? '发布试用通知' : '发布心得'}
          </button>
        </form>
        <div className="space-y-4">
          {posts.length === 0 && (
            <p className="rounded-2xl border border-dashed border-slate-200 p-10 text-center text-sm text-slate-500">
              还没有交流内容，分享第一个使用心得吧。
            </p>
          )}
          {posts.map((post) => (
            <article key={post.id} className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="mb-2 text-xs text-indigo-600">
                    {post.kind === 'notice' ? '未认证试用通知' : '使用心得'}
                  </p>
                  <h3 className="font-semibold break-words">{post.title}</h3>
                  <p className="mt-2 text-xs text-slate-400">
                    {post.author} · 未认证 · {new Date(post.created_at).toLocaleString('zh-CN')}
                  </p>
                </div>
                {(post.is_owner || admin) && (
                  <button
                    aria-label="删除交流内容"
                    className={secondaryClass}
                    onClick={() => void remove(post)}
                    disabled={busy}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-7">
                {post.content}
              </p>
              <div className="mt-4 space-y-3">
                {replies
                  .filter((r) => r.parent_id === post.id)
                  .map((r) => (
                    <div key={r.id} className="rounded-xl bg-slate-50 p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-slate-500">
                          {r.author} · 未认证 · {new Date(r.created_at).toLocaleString('zh-CN')}
                        </p>
                        {(r.is_owner || admin) && (
                          <button
                            aria-label="删除回复"
                            onClick={() => void remove(r)}
                            disabled={busy}
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6">
                        {r.content}
                      </p>
                    </div>
                  ))}
              </div>
              <button
                className={`${secondaryClass} mt-4`}
                onClick={() => {
                  setReplyTo(replyTo === post.id ? null : post.id);
                  setReply('');
                }}
                disabled={busy}
              >
                <MessageSquare size={14} />
                回复讨论
              </button>
              {replyTo === post.id && (
                <form
                  className="mt-3 space-y-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void publish(post.id);
                  }}
                >
                  <textarea
                    aria-label="讨论回复"
                    className={fieldClass}
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    maxLength={3000}
                    disabled={busy}
                    required
                  />
                  <p className="text-xs text-slate-500">使用昵称：{author || '请先填写上方昵称'}</p>
                  <button
                    className={primaryClass}
                    disabled={busy || !reply.trim() || !author.trim()}
                  >
                    发送回复
                  </button>
                </form>
              )}
            </article>
          ))}
        </div>
      </div>
    </>
  );
}
