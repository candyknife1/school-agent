export type PromptContext = 'course' | 'teacher' | 'workbench' | 'classroom' | 'project';
const PREFIX = '【原始需求（保留原文）】\n';
const GUIDANCE: Record<PromptContext, string> = {
  course: '请将需求落实为学习目标、互动活动、材料准备与学习检查；明确各环节安排，区分基础与拓展。',
  teacher:
    '请提供可由教师审核和修改的教学草稿，明确目标、活动、学生思考支架与评价依据；按我选定的技能工作流逐步推进。',
  workbench:
    '请明确需要完成的任务、涉及的内容和预期结果；修改时保持未要求改动的内容不变，并说明关键调整。',
  classroom:
    '请针对我的问题解释关键概念和理由，必要时用例子与递进问题帮助理解；不要把没有提供的学生表现当成事实。',
  project:
    '请结合当前项目和任务解释问题，提供可操作的下一步与验证方法；支持我自己思考和完善作品，不代替我完成整个项目。',
};
/** Local, deterministic prompt structuring. No model, network, persistence or submission. */
export function optimizePrompt(value: string, context: PromptContext, maxLength = 16000): string {
  if (!value.trim()) throw new Error('请先在输入框填写需求。');
  if (value.startsWith(PREFIX)) return value;
  const result = `${PREFIX}${value}\n\n【回答要求】\n${GUIDANCE[context]}\n保留原始意图、事实、引用和技能标记，不添加未提供的年级、时间、数据或资料来源。缺少关键条件时先提出最多三个具体澄清问题；需要假设时明确标注。\n请使用清晰的小标题或步骤组织回复，区分已知信息、建议和待确认事项。`;
  if (result.length > maxLength)
    throw new Error('优化后会超过输入长度上限，请先精简原文；当前内容未更改。');
  return result;
}
export interface PromptSnapshot {
  before: string;
  after: string;
}
export function canUndoPrompt(value: string, snapshot?: PromptSnapshot): boolean {
  return !!snapshot && value === snapshot.after;
}
