import { CATEGORIES, SUBJECTS, TEACHING_SKILLS, type Category, type Subject } from './catalog';
export class SchoolError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}
export const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function uuid(value: unknown): string {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value))
    throw new SchoolError(400, '无效的记录编号');
  return value;
}
export function text(value: unknown, label: string, max: number): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max || value.includes('\0'))
    throw new SchoolError(400, `${label}不能为空，且不能超过${max}字`);
  return value.trim();
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new SchoolError(400, '请求格式错误');
  return value as Record<string, unknown>;
}
export function parseKnowledge(value: unknown) {
  const body = object(value);
  const title = text(body.title, '资料名称', 120);
  const content = text(body.content, '资料正文', 100000);
  const category = text(body.category, '分类', 40);
  const subject = body.subject as Subject;
  if (!SUBJECTS.includes(subject)) throw new SchoolError(400, '请选择有效学科');
  if (!['private', 'submitted'].includes(String(body.visibility)))
    throw new SchoolError(400, '新资料只能私有保存或提交审核');
  return {
    title,
    content,
    category,
    subject,
    visibility: body.visibility as 'private' | 'submitted',
  };
}
export function parseChat(value: unknown) {
  const body = object(value);
  const requestId = uuid(body.requestId);
  const threadId = uuid(body.threadId);
  const message = text(body.message, '问题', 4000);
  const subject = body.subject as Subject;
  if (!SUBJECTS.includes(subject)) throw new SchoolError(400, '请选择有效学科');
  const grade = text(body.grade, '年级', 20);
  if (!['一年级', '二年级', '三年级', '四年级', '五年级', '六年级'].includes(grade))
    throw new SchoolError(400, '请选择小学年级');
  const skillId = body.skillId ? text(body.skillId, '技能', 60) : undefined;
  if (skillId && !TEACHING_SKILLS.some((s) => s.id === skillId))
    throw new SchoolError(400, '技能不存在');
  if (!Array.isArray(body.resourceIds) || body.resourceIds.length > 5)
    throw new SchoolError(400, '每次最多引用5份资料');
  const resourceIds = [...new Set(body.resourceIds.map(uuid))];
  const attachmentIds = body.attachmentIds ?? [];
  if (!Array.isArray(attachmentIds) || attachmentIds.length > 3)
    throw new SchoolError(400, '每次最多引用3份附件');
  return {
    requestId,
    threadId,
    message,
    subject,
    grade,
    skillId,
    resourceIds,
    attachmentIds: [...new Set(attachmentIds.map(uuid))],
  };
}
export function parseDays(value: string | null): number {
  const days = value === null ? 30 : Number(value);
  if (![7, 30, 90].includes(days)) throw new SchoolError(400, '统计范围仅支持7、30或90天');
  return days;
}
export function isCategory(value: string): value is Category {
  return CATEGORIES.includes(value as Category);
}

export function parseCommunity(value: unknown) {
  const body = object(value);
  const parentId = body.parentId ? uuid(body.parentId) : null;
  const kind = parentId ? 'reply' : body.kind;
  if (!['reply', 'discussion', 'notice'].includes(String(kind)))
    throw new SchoolError(400, '请选择心得或试用通知');
  return {
    parentId,
    kind: kind as 'reply' | 'discussion' | 'notice',
    author: text(body.author, '显示昵称', 30),
    title: parentId ? '' : text(body.title, '标题', 100),
    content: text(body.content, '正文', 3000),
  };
}
