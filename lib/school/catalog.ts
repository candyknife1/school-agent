/** UI summaries only. Runtime uses full pinned upstream skill bundles, not these steps. */
export const SUBJECTS = ['语文', '美术', '音乐', '信息科技', '跨学科'] as const;
export const CATEGORIES = [
  '备课设计',
  '项目学习',
  '阅读教学',
  '评价反馈',
  '教学复盘',
  '家校沟通',
  '其他',
] as const;
export type Subject = (typeof SUBJECTS)[number];
export type Category = (typeof CATEGORIES)[number];
export interface TeachingSkill {
  id: string;
  name: string;
  category: Category;
  description: string;
  steps: string[];
  example: string;
  keywords: string[];
}
export const TEACHING_SKILLS: TeachingSkill[] = [
  {
    id: 'lesson-design',
    name: '备课设计',
    category: '备课设计',
    description: '从学习目标出发，设计活动、任务单与观察点。',
    steps: [
      '确认年级、主题、课时与已有经验',
      '把目标转换为可观察的学生表现',
      '安排体验、提问、实践与表达活动',
      '设计基础与拓展任务及课堂观察点',
      '交付可修改的教案，列出待教师确认项',
    ],
    example: '为三年级语文“观察校园里的树”设计一节40分钟的互动课。',
    keywords: ['备课', '教案', '课时方案', '教学设计'],
  },
  {
    id: 'project-learning',
    name: '项目式学习',
    category: '项目学习',
    description: '围绕真实问题，规划合作探究与作品迭代。',
    steps: [
      '确定贴近儿童生活的驱动问题',
      '明确作品、材料和安全边界',
      '拆分探究任务与小组分工',
      '安排草稿、反馈、修改和展示',
      '提供过程记录表与作品评价维度',
    ],
    example: '设计一个结合美术和信息科技的“校园导览卡”小项目。',
    keywords: ['项目式', 'PBL', '跨学科项目', '项目学习'],
  },
  {
    id: 'reading-guide',
    name: '阅读引导',
    category: '阅读教学',
    description: '用文本证据和递进问题支持学生表达，而非直接给答案。',
    steps: [
      '确认文本、年级和阅读难点',
      '设计读前预测和经验连接',
      '围绕文本证据提出递进问题',
      '提供表达支架与不同难度追问',
      '安排阅读后表达和理解检查',
    ],
    example: '根据我引用的课文，为四年级学生设计三组递进阅读问题。',
    keywords: ['阅读', '课文', '整本书', '读后感'],
  },
  {
    id: 'assessment-rubric',
    name: '评价量规',
    category: '评价反馈',
    description: '给作品建立清晰标准，提出具体可操作的修改建议。',
    steps: [
      '确认任务目标和已有作品证据',
      '建立3至4个儿童可理解的评价维度',
      '为每个维度描述可观察的表现',
      '区分已做到、可改进和下一步动作',
      '加入学生自评、同伴反馈与教师复核',
    ],
    example: '为五年级节奏创编任务设计一份易懂的评价量规。',
    keywords: ['量规', '批改', '评价', '反馈', '评分'],
  },
  {
    id: 'teaching-reflection',
    name: '教学复盘',
    category: '教学复盘',
    description: '区分课堂事实与推测，形成下次课可验证的调整。',
    steps: [
      '整理目标、活动和课堂观察事实',
      '识别有效环节及其证据',
      '分析目标与实际表现之间的差距',
      '提出2至3项可执行的调整',
      '列出下次课需要收集的验证证据',
    ],
    example: '信息科技课中学生会照着做但不能解释步骤，请帮我复盘。',
    keywords: ['复盘', '反思', '课后总结', '磨课'],
  },
  {
    id: 'family-notice',
    name: '家校通知',
    category: '家校沟通',
    description: '把安排整理为清楚、友善、可执行的家校沟通草稿。',
    steps: [
      '确认收件人、目的与事实',
      '核对时间、地点、准备事项和回复方式',
      '使用尊重、简洁、非标签化的表达',
      '提醒必要的安全与隐私事项',
      '生成通知草稿并标记缺失信息',
    ],
    example: '写一份美术课收集废旧纸盒的家长通知，不要求购买材料。',
    keywords: ['通知', '家长', '家校', '沟通话术'],
  },
];
export function resolveSkill(message: string, selectedId?: string): TeachingSkill | undefined {
  if (selectedId) return TEACHING_SKILLS.find((skill) => skill.id === selectedId);
  const lower = message.toLowerCase();
  // An explicit name always wins over incidental keywords from another workflow.
  return (
    TEACHING_SKILLS.find(
      (skill) => lower.includes(`@${skill.name}`) || lower.includes(`使用${skill.name}`),
    ) ??
    TEACHING_SKILLS.find((skill) =>
      skill.keywords.some((word) => lower.includes(word.toLowerCase())),
    )
  );
}
export function classifyQuestion(message: string, skill?: TeachingSkill): Category {
  return skill?.category ?? resolveSkill(message)?.category ?? '其他';
}
