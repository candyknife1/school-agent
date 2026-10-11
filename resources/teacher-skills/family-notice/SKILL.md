---

name: home-school-notice-optimizer
description: 从零散输入为教师生成精致的家校通知，支持可选样式、安全提醒、班级档案复用，并针对家长群、学生群与班级群消息默认低 token 输出。
---




# Home-School Notice Optimizer

## Purpose

Use this skill to turn a teacher's rough notice points into clear, group-ready messages for parents, students, or both. The skill is optimized for daily class communication, activity reminders, safety education reminders, materials preparation notices, and parent meeting announcements.

Default behavior should be low-token, fast, and copy-friendly. Output polished notice text directly. Do not explain the writing process unless the user explicitly asks.

## When to use this skill

Use this skill when the user needs one or more of the following:

- a class notice for parents, students, or both
- an activity notice, parent meeting notice, or materials reminder
- a safety education reminder that must stay accurate and calm
- the same notice in a selected style or a few alternate styles
- a reusable class information card for repeated notice writing
- a concise group-ready message with minimal back-and-forth

This skill is especially suitable for:

- elementary school homeroom teachers
- middle school homeroom teachers
- high school homeroom teachers
- subject teachers
- moral education, activity, and safety-related teachers

## When not to use this skill

Do not use this skill for:

- issuing policies, punishment decisions, or fee decisions that the teacher is not authorized to announce
- publishing private student information in a group notice
- creating fear-based warnings, threats, or panic language
- inventing exact time, location, or school arrangements that the user did not provide
- legal, disciplinary, or crisis-response statements that require confirmed school authority language

If the user includes sensitive personal information such as student names, phone numbers, home addresses, or ID numbers, avoid repeating those details in the public-facing output and remind the user to desensitize them before group sending.

## Supported inputs

The skill supports both structured templates and natural-language fragments.

Minimum useful fields:

- notice topic
- audience: parents / students / parents and students
- stage: elementary lower / elementary upper / junior high / senior high
- time
- location
- required preparations or reminders
- style choice

Optional fields:

- whether safety education is involved
- safety topic
- whether a checklist is needed
- whether multiple styles are needed
- character limit
- class profile information

If the input is incomplete, do not ask many follow-up questions by default. Generate the best useful draft from available information, then end with `可补充信息` and list at most 3 missing items.

## First-use class profile card

If the user seems to be using the skill for the first time and no stable class context is available, offer this lightweight profile card once. Do not block generation if the user does not fill it in.

See [templates/info-card-template.md](templates/info-card-template.md).

Use the profile card only for formatting and tone consistency. Never request or store student names, parent phone numbers, or home addresses.

## Core workflow

1. Identify the task type.
   Decide whether the request is a regular notice, activity reminder, safety reminder, parent meeting notice, or mixed case.
2. Extract the minimum fields.
   Pull out topic, audience, stage, time, location, preparations, safety status, and style preference.
3. Resolve reusable class context.
   Prefer current-turn input, then conversation memory, then `user_profile.yaml` or `user_profile.example.yaml` style defaults if the runtime supports file-based defaults.
4. Detect privacy risk.
   If obvious personal data appears, avoid echoing it into the notice body and add a brief desensitization reminder.
5. Route style output.
   If the user specifies one style, output only that style.
   If the user asks for multiple styles, output no more than 3 styles.
   If the user gives no style, output the default set.
6. Generate the notice body.
   Keep the message direct, appropriate, and easy to copy into chat groups.
7. Add structured extras only when needed.
   Include a checklist when useful or requested.
   Include a safety supplement only when safety education is involved.
8. End efficiently.
   Do not explain the generation logic. Only add `可补充信息` when the input is materially incomplete.

## Style selector

Read [style_presets.yaml](style_presets.yaml) for the canonical style constraints.

Supported styles:

- `formal` -> 正式规范型
- `warm` -> 温和提醒型
- `brief` -> 简短高效型
- `encouraging` -> 亲切鼓励型
- `safety` -> 郑重安全型
- `low_interrupt` -> 低打扰型

Routing rules:

- If the user explicitly names one style, output only that style.
- If the user asks for `多版本`, output at most 3 styles.
- If the user gives no style, default to:
  - 温和提醒型
  - 简短高效型
  - 注意事项清单
- If safety education is involved, append a `郑重安全型安全提醒补充`.

Do not output extra styles just because they are available.

## Output logic

Default output headings should match the selected styles. Typical headings:

- `【正式规范型】`
- `【温和提醒型】`
- `【简短高效型】`
- `【亲切鼓励型】`
- `【郑重安全型】`
- `【低打扰型】`
- `【注意事项清单】`
- `【郑重安全型安全提醒补充】`

Checklist rules:

- keep to 5 items or fewer
- use numbered items
- only include action-worthy items

Safety supplement rules:

- keep to 80 to 120 Chinese characters
- accurate, calm, and practical
- no panic language
- no `严重后果自负` style wording

## Safety topic routing

Read [safety_snippets.yaml](safety_snippets.yaml) for the built-in topic snippets.

Supported topics:

- 防溺水
- 防火防灾
- 交通安全
- 食品安全
- 网络安全
- 心理健康
- 校园活动安全

Stage rules:

- elementary versions should be more concrete and may remind guardians to supervise
- junior high versions should stress rules awareness and self-protection
- senior high versions should stress self-management, risk judgment, and responsibility

If the user selects `其他`, write a calm and practical reminder based on the provided scenario without pretending to quote an official policy.

## Memory and profile rules

If the runtime supports conversation memory:

- remember the class profile card in the current conversation
- automatically reuse it in later notices
- let the latest user update override older values

If the runtime supports persistent configuration:

- prefer reading `user_profile.yaml`
- if `user_profile.yaml` is unavailable, use `user_profile.example.yaml` as the field reference
- only store school name, class label, address terms, signature habit, default tone, common location, time wording habit, and non-sensitive special notes

If the runtime does not support persistence:

- generate a reusable `班级信息卡文本`
- keep it compact so the user can paste it into the next conversation

Never store sensitive personal data by default.

## Privacy and authority safeguards

Read [references/privacy-and-safety-rules.md](references/privacy-and-safety-rules.md) when the request is sensitive.

Hard constraints:

- do not require student names, phone numbers, or home addresses
- do not present unconfirmed policies as settled school decisions
- do not add punishment language without explicit authorized wording from the user
- do not reveal private student situations in public-group text
- do not use fear, blame, or accusation as the main communication style

## Token efficiency protocol

Prioritize direct, usable notice text over explanations.

Default efficiency rules:

- do not explain generation steps
- do not output more than 3 styles by default
- keep `brief` notices within 80 to 120 Chinese characters
- keep checklist items to 5 or fewer
- keep safety supplements within 80 to 120 Chinese characters
- avoid repeating the user's original wording line by line
- avoid long background paragraphs unless the user explicitly asks
- if information is incomplete, list at most 3 `可补充信息` items

## References and templates

- Output rules: [references/output-rules.md](references/output-rules.md)
- Privacy and safety rules: [references/privacy-and-safety-rules.md](references/privacy-and-safety-rules.md)
- Memory strategy: [references/memory-strategy.md](references/memory-strategy.md)
- Input template: [templates/input-template.md](templates/input-template.md)
- Info card template: [templates/info-card-template.md](templates/info-card-template.md)
- Output template: [templates/output-template.md](templates/output-template.md)

## Examples

See:

- [examples/example-activity-notice.md](examples/example-activity-notice.md)
- [examples/example-anti-drowning-reminder.md](examples/example-anti-drowning-reminder.md)
- [examples/example-parent-meeting-notice.md](examples/example-parent-meeting-notice.md)
- [examples/example-style-selector.md](examples/example-style-selector.md)
