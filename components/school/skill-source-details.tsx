'use client';
import { useState } from 'react';
interface Source {
  upstreamName: string;
  repository: string;
  commit: string;
  archive: string;
  documents: { path: string; content: string; sha256: string }[];
  preservedFiles: { path: string; sha256: string; bytes: number }[];
}
/** Load large original skill files on demand, never into the initial client bundle. */
export function SkillSourceDetails({ skillId }: { skillId: string }) {
  const [source, setSource] = useState<Source>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function load() {
    if (source || busy) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`/api/school/skills/${encodeURIComponent(skillId)}`);
      if (!response.ok) throw new Error('读取失败');
      setSource(await response.json());
    } catch {
      setError('技能原文暂时无法读取，请重试。');
    } finally {
      setBusy(false);
    }
  }
  return (
    <details
      className="mt-4 text-xs text-slate-600"
      onToggle={(event) => {
        if (event.currentTarget.open) void load();
      }}
    >
      <summary className="cursor-pointer font-medium text-indigo-600">
        查看完整原始 Skill 与配套资料
      </summary>
      {busy && (
        <p className="mt-3" role="status">
          正在读取完整技能包…
        </p>
      )}
      {error && (
        <p className="mt-3" role="alert">
          {error}{' '}
          <button type="button" className="underline" onClick={() => void load()}>
            重试
          </button>
        </p>
      )}
      {source && (
        <div className="mt-3 space-y-3">
          <p className="break-all leading-6">
            原技能：{source.upstreamName}
            <br />
            版本：{source.commit.slice(0, 12)}
            <br />
            底层使用 {source.documents.length} 份完整教学文件，保留原包{' '}
            {source.preservedFiles.length} 份文件。摘要不替代底层原文。
          </p>
          <a
            className="text-indigo-600 underline"
            href={`${source.repository}/tree/${source.commit}`}
            target="_blank"
            rel="noreferrer"
          >
            查看来源仓库与固定版本
          </a>
          <p className="leading-6">
            脚本仅留存，未执行；Word/Excel
            导出、批量评分等工具能力尚未接入。完整资料较长，模型需支持相应上下文长度。授权声明随原文件保留，未声明的部分需在对外发布前核实。
          </p>
          {source.documents.map((file) => (
            <details
              key={file.path}
              open={file.path === 'SKILL.md'}
              className="rounded-lg border border-slate-200 bg-slate-50 p-3"
            >
              <summary className="cursor-pointer break-all font-medium">
                {file.path} · {file.content.length.toLocaleString()} 字符
              </summary>
              <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap break-words font-sans text-xs leading-6">
                {file.content}
              </pre>
            </details>
          ))}
        </div>
      )}
    </details>
  );
}
