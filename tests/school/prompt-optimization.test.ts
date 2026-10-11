import { describe, expect, it } from 'vitest';
import { optimizePrompt, canUndoPrompt, type PromptContext } from '@/lib/prompt-optimization';

describe('local prompt optimization', () => {
  it.each(['course', 'teacher', 'workbench', 'classroom', 'project'] as PromptContext[])(
    'preserves original text and handles in %s',
    (context) => {
      const value = ' /lesson @资料1\n给三年级做40分钟活动，保留“观察校园”。\n代码：<div />  ';
      const result = optimizePrompt(value, context);
      expect(result).toContain(value);
      expect(result).toContain('【回答要求】');
      expect(optimizePrompt(result, context)).toBe(result);
      expect(canUndoPrompt(result, { before: value, after: result })).toBe(true);
      expect(canUndoPrompt(result + '新修改', { before: value, after: result })).toBe(false);
    },
  );
  it('rejects empty text and expansion beyond the limit without truncating original', () => {
    expect(() => optimizePrompt('  ', 'teacher')).toThrow('请先');
    expect(() => optimizePrompt('a'.repeat(4000), 'teacher', 4000)).toThrow('未更改');
    expect(canUndoPrompt('text')).toBe(false);
  });
});
