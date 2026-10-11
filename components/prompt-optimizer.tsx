'use client';
import { useEffect, useState } from 'react';
import { Sparkles, Undo2 } from 'lucide-react';
import {
  canUndoPrompt,
  optimizePrompt,
  type PromptContext,
  type PromptSnapshot,
} from '@/lib/prompt-optimization';

export function PromptOptimizer({
  value,
  onChange,
  disabled = false,
  context,
  maxLength = 16000,
  className = '',
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  context: PromptContext;
  maxLength?: number;
  className?: string;
}) {
  const [snapshots, setSnapshots] = useState<PromptSnapshot[]>([]);
  const [notice, setNotice] = useState('');
  const [composing, setComposing] = useState(false);
  // Do not replace text while any active input is composing (including Chinese IME).
  useEffect(() => {
    const start = () => setComposing(true);
    const end = () => setComposing(false);
    document.addEventListener('compositionstart', start, true);
    document.addEventListener('compositionend', end, true);
    return () => {
      document.removeEventListener('compositionstart', start, true);
      document.removeEventListener('compositionend', end, true);
    };
  }, []);
  const snapshot = snapshots.at(-1);
  const safeUndo = canUndoPrompt(value, snapshot);
  const locked = disabled || composing;
  const buttonClass =
    'inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-indigo-600 hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-indigo-950/40 disabled:cursor-not-allowed disabled:opacity-40';
  function optimize() {
    if (locked || !value.trim()) return;
    try {
      const next = optimizePrompt(value, context, maxLength);
      if (next === value) {
        setNotice('当前已是结构化提示词，无需重复优化。');
        return;
      }
      setSnapshots((history) => [...history.slice(-9), { before: value, after: next }]);
      onChange(next);
      setNotice('已本地结构化整理，未调用模型、未发送；可撤销。');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '优化失败，原文未更改。');
    }
  }
  function undo() {
    if (locked || !safeUndo || !snapshot) return;
    onChange(snapshot.before);
    setSnapshots((history) => history.slice(0, -1));
    setNotice('已恢复优化前的原文，未发送。');
  }
  return (
    <div className={`flex flex-wrap items-center gap-x-2 gap-y-1 ${className}`}>
      <button
        type="button"
        className={buttonClass}
        disabled={locked || !value.trim()}
        onClick={optimize}
        title="本地结构化整理：保留原文，补充回答要求；不调用模型、不自动发送"
      >
        <Sparkles size={13} />
        优化提示词
      </button>
      <button
        type="button"
        className={buttonClass}
        disabled={locked || !safeUndo}
        onClick={undo}
        title={
          snapshot && !safeUndo
            ? '草稿已手动修改，为避免丢失新内容，不能直接撤销'
            : '恢复优化前的完整原文'
        }
      >
        <Undo2 size={13} />
        撤销优化
      </button>
      {(notice || (snapshot && !safeUndo)) && (
        <span role="status" className="basis-full text-[11px] leading-5 text-muted-foreground">
          {snapshot && !safeUndo ? '草稿已改动，直接撤销已禁用，避免覆盖新内容。' : notice}
        </span>
      )}
    </div>
  );
}
