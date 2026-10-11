[English](README.en.md) | 中文

# 家校通知优化 Skill

`home-school-notice-optimizer` 是一个面向中小学教师、班主任、科任老师的低 Token 通知生成 Skill。它用于把零散输入整理成适合家长群、学生群、班级群直接发送的规范通知，并支持风格选择器、班级信息卡和安全提醒补充。

## 1. Skill 简介

这个 Skill 适合处理以下任务：

- 班级活动通知
- 家长会通知
- 材料提交提醒
- 安全教育提醒
- 学生展示与活动动员
- 面向家长、学生或家长与学生的群发通知

核心特点：

- 支持 6 种通知风格自由选择
- 默认低 Token 输出，不解释过程
- 支持首次使用信息卡
- 支持对话内记忆和配置文件式默认资料
- 安全类通知有单独的补充提醒逻辑

## 2. 适用场景

- 小学班主任日常群通知
- 初中班级活动准备提醒
- 高中家长会通知
- 综合实践活动展示通知
- 防溺水、防火防灾、交通安全等安全提醒
- 不想频繁打扰家长的常规简短提醒

## 3. 风格选择器

Skill 内置以下 6 种风格，配置见 [style_presets.yaml](/Volumes/AlfredLi-1T/CodeX_Skill_Maker/skills/home-school-notice-optimizer/style_presets.yaml)：

- `正式规范型`
- `温和提醒型`
- `简短高效型`
- `亲切鼓励型`
- `郑重安全型`
- `低打扰型`

输出规则：

- 如果用户指定一种风格，只输出该风格
- 如果用户要求多版本，最多输出 3 种风格
- 如果用户没有指定风格，默认输出：
  - 温和提醒型
  - 简短高效型
  - 注意事项清单
- 如果涉及安全教育，额外输出 `郑重安全型安全提醒补充`

## 4. 输入模板

输入模板见 [templates/input-template.md](/Volumes/AlfredLi-1T/CodeX_Skill_Maker/skills/home-school-notice-optimizer/templates/input-template.md)。

最小模板如下：

```text
【通知事项】
【面向对象】家长 / 学生 / 家长与学生
【学段】小学低段 / 小学高段 / 初中 / 高中
【时间】
【地点】
【需要准备或注意事项】
【通知风格】正式规范型 / 温和提醒型 / 简短高效型 / 亲切鼓励型 / 郑重安全型 / 低打扰型
```

用户也可以直接发送自然语言碎片，例如：

```text
明天下午两点在多功能厅做综合实践展示，请家长提前10分钟到场，学生穿校服，帮我发个温和一点的通知。
```

## 5. 教师/班级信息卡

首次使用时，如果缺少稳定的班级上下文，可提示填写 [templates/info-card-template.md](/Volumes/AlfredLi-1T/CodeX_Skill_Maker/skills/home-school-notice-optimizer/templates/info-card-template.md)。

信息卡字段包括：

- 学校名称
- 年级班级
- 学生称呼
- 家长称呼
- 常用落款
- 是否需要落款
- 班级群默认语气
- 常用活动地点
- 常用时间表达习惯
- 特殊注意事项

这些字段只用于通知格式化，不用于保存敏感个人信息。

## 6. 输出逻辑

默认只输出成稿，不解释写作思路。

默认输出：

- `【温和提醒型】`
- `【简短高效型】`
- `【注意事项清单】`

安全类事项额外输出：

- `【郑重安全型安全提醒补充】`

如果用户明确要求单风格或多版本，按用户要求执行，但默认不超过 3 个版本。

## 7. 安全主题

内置安全素材库见 [safety_snippets.yaml](/Volumes/AlfredLi-1T/CodeX_Skill_Maker/skills/home-school-notice-optimizer/safety_snippets.yaml)。

支持主题：

- 防溺水
- 防火防灾
- 交通安全
- 食品安全
- 网络安全
- 心理健康
- 校园活动安全

表达原则：

- 小学版更具体，可提醒家长看护
- 初中版强调规则意识和自我保护
- 高中版强调自主管理、风险判断和责任意识
- 不使用恐吓和制造焦虑的表述

## 8. 记忆与配置

如果运行环境支持对话内记忆，Skill 会在当前对话中沿用班级信息卡。

如果运行环境支持持久化配置，可使用：

- [user_profile.example.yaml](/Volumes/AlfredLi-1T/CodeX_Skill_Maker/skills/home-school-notice-optimizer/user_profile.example.yaml)

建议运行时复制为 `user_profile.yaml` 后再填入默认资料。

如果运行环境不支持持久化，Skill 应生成一段可复制保存的 `班级信息卡文本`，供下次粘贴恢复上下文。

## 9. 隐私与安全要求

- 不要求填写学生姓名、家长手机号、家庭住址
- 不主动保存敏感个人信息
- 学校和班级信息只用于通知格式化
- 如果用户输入了个人隐私，输出前提醒其注意脱敏
- 不代表学校发布未经确认的政策、处罚或收费决定

## 10. 文件结构

```text
home-school-notice-optimizer/
├── agents/
│   └── openai.yaml
├── SKILL.md
├── README.md
├── README.en.md
├── CHANGELOG.md
├── PUBLISH_INFO.md
├── .skillignore
├── metadata.yaml
├── manifest.json
├── style_presets.yaml
├── safety_snippets.yaml
├── user_profile.example.yaml
├── references/
├── templates/
├── examples/
├── tests/
├── scripts/
└── dist/
```

## 11. 示例

可直接查看以下示例：

- [examples/example-activity-notice.md](/Volumes/AlfredLi-1T/CodeX_Skill_Maker/skills/home-school-notice-optimizer/examples/example-activity-notice.md)
- [examples/example-anti-drowning-reminder.md](/Volumes/AlfredLi-1T/CodeX_Skill_Maker/skills/home-school-notice-optimizer/examples/example-anti-drowning-reminder.md)
- [examples/example-parent-meeting-notice.md](/Volumes/AlfredLi-1T/CodeX_Skill_Maker/skills/home-school-notice-optimizer/examples/example-parent-meeting-notice.md)
- [examples/example-style-selector.md](/Volumes/AlfredLi-1T/CodeX_Skill_Maker/skills/home-school-notice-optimizer/examples/example-style-selector.md)

## 12. 发布说明

正式发布前，建议先对照：

- [tests/pre_publish_checklist.md](/Volumes/AlfredLi-1T/CodeX_Skill_Maker/skills/home-school-notice-optimizer/tests/pre_publish_checklist.md)

发布前建议在 Skill 根目录运行：

```bash
python3 scripts/validate_skill.py
python3 scripts/package_skill.py
python3 scripts/validate_release_package.py dist/home-school-notice-optimizer.skill
```
