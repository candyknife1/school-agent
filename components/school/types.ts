import type { Citation } from '@/lib/school/context';
export interface Resource {
  id: string;
  title: string;
  category: string;
  subject: string;
  visibility: 'private' | 'submitted' | 'school';
  is_owner: boolean;
  characters: number;
  created_at: string;
}
export interface Turn {
  request_id: string;
  message: string;
  answer: string | null;
  citations: Citation[];
  skill_id?: string;
  rating?: number;
  status: string;
}
export async function schoolApi<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/school/${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    cache: 'no-store',
  });
  const data = await response.json();
  if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : '操作失败');
  return data as T;
}
export const fieldClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100';
export const primaryClass =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50';
export const secondaryClass =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50';
