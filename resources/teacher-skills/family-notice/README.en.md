[中文](README.md) | English

# Home-School Notice Optimizer

`home-school-notice-optimizer` is a low-token teacher workflow skill for turning rough notice points into polished group-ready messages for parents, students, or both. It adds a style selector, a reusable class profile card, and calm safety supplements for daily school communication.

## 1. Overview

This skill is suitable for:

- class activity notices
- parent meeting notices
- submission reminders
- safety education reminders
- student showcase and event mobilization
- group-ready messages for parents, students, or both

Core strengths:

- 6 selectable notice styles
- low-token output by default
- first-use class profile card
- conversation memory and file-based defaults
- extra safety supplement logic for safety-related notices

## 2. Use Cases

- daily elementary homeroom group notices
- junior high activity preparation reminders
- high school parent meeting notices
- showcase notices for integrated practice activities
- anti-drowning, fire, traffic, and other safety reminders
- low-interruption routine reminders for busy parent groups

## 3. Style Selector

The canonical style config is stored in [style_presets.yaml](/Volumes/AlfredLi-1T/CodeX_Skill_Maker/skills/home-school-notice-optimizer/style_presets.yaml).

Supported styles:

- `正式规范型`
- `温和提醒型`
- `简短高效型`
- `亲切鼓励型`
- `郑重安全型`
- `低打扰型`

Output rules:

- if the user specifies one style, output only that style
- if the user asks for multiple versions, output no more than 3 styles
- if no style is specified, default to:
  - 温和提醒型
  - 简短高效型
  - 注意事项清单
- if safety education is involved, add `郑重安全型安全提醒补充`

## 4. Input Template

See [templates/input-template.md](/Volumes/AlfredLi-1T/CodeX_Skill_Maker/skills/home-school-notice-optimizer/templates/input-template.md).

Minimum template:

```text
【通知事项】
【面向对象】家长 / 学生 / 家长与学生
【学段】小学低段 / 小学高段 / 初中 / 高中
【时间】
【地点】
【需要准备或注意事项】
【通知风格】正式规范型 / 温和提醒型 / 简短高效型 / 亲切鼓励型 / 郑重安全型 / 低打扰型
```

Natural-language input is also supported.

## 5. Teacher/Class Profile Card

If the user has no stable class context yet, the skill can offer [templates/info-card-template.md](/Volumes/AlfredLi-1T/CodeX_Skill_Maker/skills/home-school-notice-optimizer/templates/info-card-template.md).

It includes:

- school name
- grade and class
- student address term
- parent address term
- common signature
- whether to include a signature
- default tone
- common activity location
- usual time wording habit
- special notes

These fields are for formatting only and must not be used to store sensitive personal data.

## 6. Output Logic

The skill outputs polished notice text directly and does not explain its reasoning by default.

Default output:

- `【温和提醒型】`
- `【简短高效型】`
- `【注意事项清单】`

Extra output for safety-related cases:

- `【郑重安全型安全提醒补充】`

If the user explicitly asks for one style or multiple styles, follow that instruction while keeping the total to 3 styles or fewer by default.

## 7. Safety Topics

Built-in snippets are stored in [safety_snippets.yaml](/Volumes/AlfredLi-1T/CodeX_Skill_Maker/skills/home-school-notice-optimizer/safety_snippets.yaml).

Supported topics:

- anti-drowning
- fire and disaster prevention
- traffic safety
- food safety
- online safety
- mental wellbeing
- campus activity safety

Guidance:

- elementary wording should be more concrete and may remind guardians to supervise
- junior high wording should stress rules awareness and self-protection
- senior high wording should stress self-management, judgment, and responsibility
- avoid fear-based or anxiety-inducing phrasing

## 8. Memory and Configuration

If the runtime supports conversation memory, the skill should reuse the class profile card within the current thread.

If file-based persistence is supported, use:

- [user_profile.example.yaml](/Volumes/AlfredLi-1T/CodeX_Skill_Maker/skills/home-school-notice-optimizer/user_profile.example.yaml)

Copy it to `user_profile.yaml` in environments that support persistent defaults.

If persistence is unavailable, the skill should generate a reusable `班级信息卡文本` that the user can paste into the next session.

## 9. Privacy and Safety

- do not ask for student names, parent phone numbers, or home addresses
- do not proactively store sensitive personal data
- school and class fields are for notice formatting only
- if the user provides sensitive data, remind them to desensitize it
- do not announce unconfirmed policies, punishments, or fees as official school decisions

## 10. File Structure

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

## 11. Examples

- [examples/example-activity-notice.md](/Volumes/AlfredLi-1T/CodeX_Skill_Maker/skills/home-school-notice-optimizer/examples/example-activity-notice.md)
- [examples/example-anti-drowning-reminder.md](/Volumes/AlfredLi-1T/CodeX_Skill_Maker/skills/home-school-notice-optimizer/examples/example-anti-drowning-reminder.md)
- [examples/example-parent-meeting-notice.md](/Volumes/AlfredLi-1T/CodeX_Skill_Maker/skills/home-school-notice-optimizer/examples/example-parent-meeting-notice.md)
- [examples/example-style-selector.md](/Volumes/AlfredLi-1T/CodeX_Skill_Maker/skills/home-school-notice-optimizer/examples/example-style-selector.md)

## 12. Release Notes

Before publishing, also review:

- [tests/pre_publish_checklist.md](/Volumes/AlfredLi-1T/CodeX_Skill_Maker/skills/home-school-notice-optimizer/tests/pre_publish_checklist.md)

Before publishing, run:

```bash
python3 scripts/validate_skill.py
python3 scripts/package_skill.py
python3 scripts/validate_release_package.py dist/home-school-notice-optimizer.skill
```
