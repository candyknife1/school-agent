import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { TEACHING_SKILLS } from '@/lib/school/catalog';
import { getSkillSource, sourceSkillInstructions } from '@/lib/school/skill-source';
import { teachingSystemPrompt } from '@/lib/school/context';

const sha = '4dab66e37625d4b32cec4c89721182e530948538';
describe('complete upstream skill packages', () => {
  it.each(TEACHING_SKILLS)(
    'preserves all original files and injects full documents: $name',
    (skill) => {
      const source = getSkillSource(skill.id)!;
      expect(source.commit).toBe(sha);
      expect(source.repository).toBe('https://github.com/Wenmao-AI-Lab/primary-teacher-skill');
      expect(source.documents[0].path).toBe('SKILL.md');
      const prompt = teachingSystemPrompt(skill, '语文', '三年级', []);
      for (const file of source.preservedFiles) {
        const bytes = readFileSync(resolve('resources/teacher-skills', skill.id, file.path));
        expect(bytes.length).toBe(file.bytes);
        expect(createHash('sha256').update(bytes).digest('hex')).toBe(file.sha256);
      }
      for (const doc of source.documents) {
        expect(createHash('sha256').update(doc.content).digest('hex')).toBe(doc.sha256);
        expect(prompt).toContain(`文件：${doc.path}`);
        expect(prompt).toContain(doc.content);
        expect(doc.path).not.toMatch(/^scripts\//);
      }
      expect(prompt).toContain('不能执行原包 Python/Shell 脚本');
      expect(prompt).toContain('相关工具尚未接入');
    },
  );
  it('keeps PBL interaction discipline and student handbook, not a five-step rewrite', () => {
    const prompt = sourceSkillInstructions('project-learning');
    expect(prompt).toContain('一问一答、可追问');
    expect(prompt).toContain('assets/student-handbook-template.md');
    expect(prompt).toContain('references/common-failure-cases.md');
    expect(prompt.length).toBeGreaterThan(40000);
  });
  it('rejects prototype keys, arbitrary paths and unknown packages', () => {
    for (const id of ['constructor', '__proto__', '../lesson-design', 'unknown']) {
      expect(getSkillSource(id)).toBeUndefined();
      expect(() => sourceSkillInstructions(id)).toThrow();
    }
  });
  it('does not load any skill instructions when no skill was selected or matched', () => {
    expect(teachingSystemPrompt(undefined, '美术', '一年级', [])).not.toContain('===== 文件：');
  });
});
