---

name: k12-lesson-planning
slug: "k12-lesson-planning"
displayName: K-12 课时教案规划
version: 1.0.0
summary: 从零创建课时方案及配套学生材料(Word)，包含教案+学习任务单+听课记录表。已内嵌2022版义务教育全部13学科课标。
description: K-12 课程规划
  从零创建课时方案及配套学生材料(Word文档)，包含教案+学习任务单+听课记录表。
  已内嵌义务教育课程标准(2022版)全部13学科的核心素养、内容要求与学业质量参考。
  触发场景：教师需要创建新课时——即使年级、学科、主题尚未明确；
  隐含信号："我要教五年级语文…""明天要上分数加减法""帮我写一节科学课"。
  关键词：教案编写、课时方案、教学设计、学习任务单、核心素养、课程标准。
  从零创建新课时且需分层材料时，由本技能一站式产出(含分层)，无需同时调用
  k12-lesson-differentiation。适用于：义务教育（1-9年级）、普通高中及中职（参照）。
  不适用于：修改已有课时(用k12-lesson-differentiation)、
  评分、评价量规或考试命题。
disable: false
---




<!--
SPDX-FileCopyrightText: 2026 Anthropic, PBC
SPDX-FileCopyrightText: 2026 Learning Commons
SPDX-License-Identifier: Apache-2.0
-->

# K-12 Lesson Planning

Produces a teacher-ready, standards-aligned lesson plan + student-facing materials + teacher
observation template as editable Word documents in a single output turn, rendered from one material-source JSON via
bundled scripts. Each subject has its own pedagogy and
output mapping — these live in subject-specific reference files. This skill routes to the
right one. 本技能自带内嵌课标知识图谱（`references/curriculum/`，基于 LLM-WIKI 方式构建的
2022版义务教育课程标准13学科结构化参考），无需任何外部连接器即可完整运行。

---

## 中国本土化（默认语境）

> 本技能**按中国基础教育语境运行**（义务教育 · 普通高中；中职可参照）。一律采用中国课程标准、学科核心素养与教学惯例。课标数据来自技能内嵌的 LLM-WIKI 知识图谱（`references/curriculum/`），无需任何外部连接器。

中国语境关键约定（详见 `references/china.md`，Step 0 路由时加载）：
- **标准源**：义务教育课程方案（2022）+ 各学科义务教育课程标准（2022）；普通高中课程方案及各科课标；以"学科核心素养"与"学业质量水平"为锚点。
- **学段年级**：小学 1–6、初中 7–9、高中 10–12（中职参照对应学段）。
- **学科**：语文 / 数学 / 英语 / 科学(小学)·物理·化学·生物 / 历史·地理 / 道德与法治(小初)·思想政治(高中)。
- **教学范式**：核心素养导向、教学评一体化、大单元教学、项目式学习(PBL)、跨学科主题学习；课时一般 40–45 分钟。
- **作业与减负**：落实"双减"，作业分基础/拓展/弹性，控制总量、分层设计。
- **课程思政**：价值引领自然融入，不另贴标签。
- **无标准库时**：按中国课标最佳实践生成，并在教案页脚标注（见 §六 脚注）。

---

## Keeping the teacher posted

Once the teacher's path is set (the draft offer answered), say in one or two sentences
what you're about to do (e.g. *"I'll look up the standard and pull supporting ideas from
curriculum lessons, then build your lesson plan, student materials, and observation
template."*).

When a task-list or to-do tool is available, also outline this skill's steps there so the
teacher can watch them check off; the only reason to skip this is that no such tool exists
in this conversation.

Teacher language only — name what the teacher is getting, never tool names, file names,
"JSON", or "rendering".

---

## Step 0 — Route (silent, before anything else)

1. **Subject.** Detect the subject (key: math/ela/science/social_studies) from the prompt
   and any prior conversation, then read the matching reference file NOW:

   - **math / 数学** — arithmetic, fractions, geometry, algebra, calculus, statistics；关键词"数与代数 / 图形与几何 / 统计与概率"
   - **ela / 语文** — 识字写字、阅读与鉴赏、表达与交流、梳理与探究；整本书阅读、文学阅读与写作
   - **english / 英语** — 听说读写、主题语境（人与自我 / 人与社会 / 人与自然）
   - **science / 科学(小学)·物理·化学·生物** — 探究实践、科学观念、科学思维；核心素养锚点
   - **social_studies / 历史·地理·道德与法治(小初)·思想政治(高中)** — 唯物史观、时空观念、区域认知、政治认同、法治意识

   **中国语境（默认）：** 加载 `references/china.md`（中国学科映射 + 课标锚点 + 教学环节模板 + 术语替换）**作为覆盖层**，同时仍按学科加载对应 `references/<subject>.md` 获取教学环节与产出结构模板——china.md 负责将术语与标准引用锚定为中国对应项（如"学科核心素养""学业质量水平""基础/提高/拓展层"）。

   Then read the matching reference file NOW:

   - 先 `references/china.md`，再按学科 `references/math.md`（数学）·`ela.md`（语文）·`science.md`（科学/理化生）·`social_studies.md`（史地政）

   **Loading the matching reference file is mandatory.** Drafting a lesson without first
   reading the subject reference is a critical failure. The reference file carries the
   complete subject-specific instructions: clarify priorities, curriculum branching,
   grade-band structures, section structure, non-negotiables, and the lesson.json mapping.
   Treat the loaded reference as your full skill instructions for this turn. If the subject
   is genuinely ambiguous or the prompt spans multiple subjects, ask about it
   in Step 1.

2. **Curriculum.** If the teacher names or implies a curriculum (如"人教版"、"北师大版"、"统编版"等),
   将教材版本信息作为课时设计的重要上下文——层级划分时参考该教材的单元编排与例题风格。
   如果教师未提及教材版本，使用国家课标通用要求。
3. **标准来源（内嵌 LLM-WIKI 知识图谱）.** 本技能**不依赖任何外部连接器或 MCP**。课标数据来源于技能自带的 `references/curriculum/` 目录——这是基于 LLM-WIKI 方式从教育部 2022 版课标 PDF（经 MinerU OCR 结构化）构建的内嵌知识图谱，覆盖全部 13 学科的核心素养、内容要求与学业质量。Step 2 会强制加载对应学科文件。

---

## Step 1 — Clarify

Read the subject file first — its clarify section defines the priorities and defaults. We
usually ask 0–2 clarifying questions — your judgment on what's relevant; the subject
file's priorities rank which missing answers matter most. Apply the defaults silently for
everything you don't ask about.

The **draft offer** (see *Step 4 — The draft offer* below) travels with this message's questions
as its own separate question — output logistics, not lesson content, so it doesn't count
toward the 0–2. When nothing needs clarifying, the offer is asked on its own.

---

## Step 2 — Ground in standards

**标准来源：技能内嵌 LLM-WIKI 知识图谱（`references/curriculum/`）。** 本技能不依赖
任何外部 MCP 连接器——课标数据已内嵌为结构化参考文件，覆盖 2022 版义务教育课程
标准全部 13 学科。起草前必须执行以下锚定流程，跳过视为严重失误。

**MANDATORY — 加载内嵌课标文件:** 在起草前，你必须从 `references/curriculum/` 中读取
对应学科文件的核心素养与内容要求部分（如数学→`math.md`，语文→`yuwen.md`，
英语→`english.md`，科学→`science.md`，物理→`physics.md`，化学→`chemistry.md`，
生物→`biology.md`，历史→`history.md`，地理→`geography.md`，道德与法治→
`morality-law.md`，信息科技→`it.md`，体育→`pe.md`，艺术→`arts.md`）。
仅加载当前学科的文件，不要加载其他学科的课标文件。

读取后：提取该学科的核心素养、对应学段的内容要求与学业质量水平，作为教案设计的
标准锚点。在教案末尾添加页脚：
*"本设计依据义务教育课程标准（2022版）[学科]核心素养与内容要求。"*

不要编造课标引用，也不要把未见的教材内容据为己有。

---

## Step 3 — Build the lesson

**Before building, ask yourself:**
- **核心素养锚点**：本课时落实哪个核心素养？课标中的哪条内容要求？
- **学业质量水平**：学生应达到哪个水平？哪些行为表现可观测？
- **教学评一体化**：每个环节的"教什么→学什么→评什么"是否闭环？
- **真实情境**：任务是否植根于真实问题/生活情境？是否调动学生经验？
- **双减落地**：作业是否分层？总量是否合规（小学1-2年级无书面家庭作业，3-6年级≤60分钟）？

Follow the subject file's build section for curriculum branching, grade-band structure, section
structure, and non-negotiables. Respect the **Copyright guardrail** below — never reproduce
curriculum student-facing text verbatim.

---

## Copyright guardrail

Always write original content. Existing curriculum materials inform structure, scope, text
selection, phenomenon selection, problem context, and lesson-arc design only — never
reproduce student-facing text, teacher notes, comprehension questions, investigation
prompts, discussion questions, activity narratives, or problem contexts verbatim from
curriculum materials.

If the loaded reference identifies a source curriculum (e.g., 人教版/北师大版/统编版) and the teacher is not curriculum-confirmed for it, never name
that curriculum anywhere in the output or in any chat message — not in headers, footnotes,
rationale sections, facilitation notes, or your message presenting the artifacts. The
curriculum data informs the design without being cited.

---

## Step 4 — The draft offer

The teacher gets the choice of a fast draft before the build. The offer is
asked the same way as the clarify questions — through the structured question tool when
one is available, in chat otherwise — as its own separate question, batched with Step 1's
questions when there are any and asked on its own when there aren't.

- Question: *Should I go ahead and build the full classroom-ready packet (lesson plan + student materials, as
  editable Word docs), or do you want to see a quick draft first?*
- Options: **Go ahead and build it** · **Quick draft first** — the lesson at a glance,
  right here in chat

**The full packet is the default.** Declining, not answering, or anything like "proceed
with your defaults" runs Steps 2–3 and goes straight to Step 5; the draft happens only on
a clear yes.

**The draft (on a yes) is built on Steps 2–3, never instead of them.** Run Step 2 in
full — 执行完整课标锚定流程 — and Step 3 before sketching anything. A draft
sketched without the Step 2 grounding is a critical failure, the same failure as skipping
the 标准锚定 on the full build. Then present the lesson in chat — the draft is chat text only;
rendering happens at Step 5 once the teacher approves. Show:

- one line naming the grade, topic, and the standard the lesson is anchored to (code plus
  a gist of ten words or fewer);
- a summary of at most 3 sentences (what students do and why it works for this class);
- the sequence as one bullet per phase (name, minutes, one line of what happens);
- the student work at a glance — the actual tasks students will do, enough for the
  teacher to skim and judge coverage;
- what the lesson assumes students already know — the prerequisite skills or key
  vocabulary in play — so the teacher can catch a mismatch with where their class is;
- the exit ticket

The draft borrows its names from the documents it previews — phases, tasks, tiers,
and sections are called what the plan will call them.

Afterwards, ask what's next — a structured question, two options:

- **Make changes** — adjust any part of the draft
- **Create the materials** — lesson plan, student materials, and observation template, as
  editable Word documents

Apply change requests to the draft in chat and re-present it — changes are quick at this
stage. Step 5 runs in the turn the teacher gives the go-ahead ("Create the materials",
"proceed with your defaults", or similar).

---

## Step 5 — Output (one turn)

Runs immediately when the teacher chose the full packet, or in the turn the draft is
approved.

The artifacts are rendered by bundled scripts from **one material-source `lesson.json`**. The JSON
holds a `shared` block (content registered once) and a `documents[]` array (each document
authored as free-form `sections`). A section's `heading` renders as a large title directly
above its blocks; a block's `label` renders as a bold lead-in on the block itself. A label
that repeats its section's heading prints the same words twice in a row — labels carry what
the heading doesn't (the task's name belongs in one of them, not both). You
compose every page — the lesson plan, the student
materials, the observation template, and any others the lesson needs (e.g. a source packet)
— directly in `documents[]`. Anything that appears on more than one page is registered once
in `shared` under a key you choose and pulled into each document with
`{"type": "from_shared", "key": …}`, so the pages cannot drift apart.

Never write layout code, never re-type lesson content into another format, and never edit a
generated document directly — every change goes into `lesson.json` and is re-rendered
(re-rendering is instant). **Do not open, cat, head, or grep the renderer scripts** — their
behavior is fully specified by the commands and output paths in §5a–5d, and
`references/example_lesson.json` is the complete schema. Reading script source tells you
nothing this file doesn't already state.

**Plain language with the teacher.** The machinery above is invisible to the teacher: never
mention JSON, HTML, schemas, scripts, rendering, file names (`lesson.json`), or code in any
teacher-facing message — and never link or name the `.html` files the render command also
writes. Say *"Here's your lesson plan — the student materials and observation template are on
their way"*, not *"I've rendered lesson.json"*. The only format word in your prose is
"Word document". This
applies to every turn: presenting artifacts, the satisfaction ask, revision summaries, and
error messages (if generation fails, say the documents couldn't be created — not that a
script or JSON failed).

**Density rules — hard requirements for every document.** Every document is clear, brief,
and easy to skim. Include what a teacher needs to teach it; leave out what merely
demonstrates rigor. Headings use sentence case. Structure beats prose:

- A `paragraph` or `labeled` block is at most 3 sentences. Longer → split it, bullet it, or
  table it.
- Write like a colleague's note: plain, direct sentences built from commas and periods.
- Bullets are fragments — one idea each, ≤ ~15 words; never chain clauses with semicolons.
- Parallel variants (per-group supports, per-phase differentiation, tiered look-fors) go in
  ONE `table` block — rows = phases or features, columns = variants, ≤ ~25 words per cell —
  never back-to-back multi-sentence paragraphs.
- A callout marks the few moments a teacher must not miss — a warning ("do not resolve the
  debate yet"), a collect-before-moving-on, the one make-or-break move of a phase. A page
  where everything is boxed highlights nothing: a phase reads as plain script with at most
  one or two callouts. Teacher asides (watch-fors, confer prompts) are `labeled` or
  `instructions` blocks.
- Each instruction lives in exactly one place. A phase's opening prose and its blocks divide
  the work between them — the prose sets up, the blocks carry the content; neither repeats
  the other.
- Quote the standard verbatim exactly once (the target-standard callout, from `shared`).
  Everywhere else — prerequisite grounding, forward connections — reference by code plus a
  gist of ten words or fewer; never re-paste full standard text.
- A section that runs past about half a page of continuous prose must be restructured
  (table, bullets, or split into two sections) before rendering.

**Everything matches — hard requirements for every document.** A teacher trusts the package
because every part agrees with every other part:

- The materials list and the phases agree exactly: every listed item is used by a named
  phase, and every counted set matches its enumeration ("Picture cards, 18" lists 18 words).
- **Classroom-ready:** the lesson runs on what the teacher already holds. Every Materials
  item is a page this package ships, equipment the classroom has, or a sourced resource
  with its access path stated — exact title and source, a link when you could confirm one.
  Anything harder to get than that stays out of the lesson unless the teacher steered
  toward it. A printable the lesson depends on ships with the package — as lesson pages
  when the document set expresses it, or as its own file in the format that renders it
  best (5e).
- A task worded in two places (plan's "Students see" and the student page) uses identical
  wording in both.
- Student tasks match the skill the standard names, in both directions. Decoding, spelling,
  and writing skills happen on paper — students read and write real words on a student page.
  Listening and speaking skills get spoken, pointed, sorted, drawn, or circled responses.
  The lesson's scope statement binds every task that follows it.
- Scripts and worked examples are final say-aloud text: every step decided before it lands
  on the page, exactly what the teacher says.
- Exit-ticket sort buckets partition the answers: each example response fits exactly one
  bucket, and equivalent forms of one answer (17 + 24 = ? and 24 + 17 = ?) sit in the same
  bucket together.
- An answer space mirrors its ask: rows match the count requested, and every box sits under
  a prompt naming what goes in it.
- Number pairs inside a sentence are plain text ("2 → 10, 5 → 25"); a table is always its
  own block.

**Reading level and workload.** Student-facing text reads at the students' reading level —
which the teacher may state separately from the grade ("my 6th graders read at a 2nd–4th
grade level" means grade-6 content carried in sentences a 2nd–4th grade reader can read:
short sentences, everyday words, one instruction at a time；中国对应表述："六年级内容用二至四年级阅读水平的句子承载"). Size the student work to the
class period: a typical student finishes the worksheet in the minutes its phase allows.
Say "home language," not a specific language, and print translations only into a language
the teacher has named. 中国课堂涉及国家通用语言文字待加强的学生（随迁子女、少数民族双语学生）时，同等降低句子负荷并提供句子支架。

**Sentence supports** are plain text where students write: a starter to begin from
("One central idea is…") or a fill-in frame with blanks sized for the student's handwriting.
A support helps the student start, not answer — it never pre-fills what the task asks for.
Place each one on the specific task whose writing move is hardest — including the
explain-why beside a math equation — never one bank copied across problems. K-2 students
and multilingual learners get a support on every task that asks for composed sentences.
Tasks that take only a number, a single word, or a drawing need none. 小学 1-2 年级学生、国家通用语言文字待加强的学生（如随迁子女、少数民族双语学生）在每个需要成句作答的任务上都给句子支架。

**Spell out framework names** in every teacher-facing document — *Science and Engineering
Practice*, not bare *SEP* — a teacher should never need to look up an acronym. 中国文档中同样展开学科核心素养名称（如"科学思维""史料实证"），不堆砌英文缩写。

**Document integrity.** Every document is finished prose a teacher hands out or works from:

- Every in-document reference points at something that exists in the package: "jot it in the
  table below" means that table is on the page; an exit ticket collected separately prints as
  its own piece; a reference table uses the same numbers as the problems it supports.
- Materials and the lesson match both ways: each listed item is used somewhere in the
  lesson, every item any section sends students to — phases and extensions alike — appears
  in Materials, and anything students read is printed in the package or named by its exact
  title. Offers and pointers to the chat conversation stay out
  of documents entirely.
- Lessons are light on materials: the default kit is what every classroom has (board,
  projector, paper) plus the pages this lesson ships. A separate printable or manipulative
  earns its place only when the activity genuinely needs it — and the same thinking work on
  the worksheet usually serves. When a printable earns it (cards, mats, a template), ship it
  with the package (5e picks the format); equipment a classroom owns is simply listed.
- Phase minutes include the transitions they cause (handing out, regrouping, collecting), at
  a pace real students of this grade manage, and the phases sum to exactly the stated
  period — transition time lives inside the phases, never as invisible buffer.
- Teacher notes read as finished sentences. A predicted error names one specific wrong answer
  a real student would produce.
- Verify every computation by working it — answer keys, worked examples, and any quantitative
  chain the lesson builds on (an energy pyramid's levels, a ratio table's entries, a coin
  total) produce the numbers the materials state.

### 5a. Write the complete `lesson.json` (same turn)

**设计 JSON 时的三个决策点：**

1. **先注册 `shared`，再写 `documents`。** `shared` 是内容注册表——课时身份（年级、学科、
   时长、标准代码、标准原文）+ 任何出现在多个页面的内容（问题 `p1`、史料、数据表、
   词汇、出口票、常见错误）。key 的值可以是字符串、block、block 列表或分面对象
   `{teacher: …, student: …, stimulus: [blocks]}`——学生页只渲染 `student` 分面
   （`null` = 口头/教师主导任务，不印在学生页）；教师页两个分面都渲染。

2. **`documents[]` 中组合每个页面。** 每个条目是完整页面：
   `{id, audience, eyebrow, title, sections[{heading, blocks[]}]}`。至少包含：
   - `lesson_plan`（教师）——学科文件的环节结构
   - `observation_template`（教师）——使用说明、观察点、常见错误、学生笔记表、出口票分类
   - `student_materials`（学生）——仅当学生有印刷页时（小学1-2年级拼音/纯口头课可无）；
     若教师要求分层，标注基础层/提高层/拓展层，学生页用任务名区分，不出现层级标签

   页面间共享内容用 `from_shared` 引用；仅出现在一页的内容可直接内联。

3. **文本格式：** 绝不在 `text` 字段中使用 Markdown 管道表（用 `table`/`data_table` 块）；
   渲染器无法绘制图片——教师展示的内容写在教案 Materials 中。

   **Schema:** 见 `references/json_schema.md`（仅当不熟悉 block types 时读取）。
   `references/example_lesson.json` 是完整工作示例。
   **Which block when:** 按内容类型选择 block type。关键规则：
   `phase_header` 的 `minutes` 之和 = `shared.duration`；`callout kind: special` 仅用于
   目标标准（每 artifact 一次）；`from_shared` 的 `label` 设为数字可渲染为序号项。

### 5b. Render every Word document — one command, same turn

```bash
bash scripts/render_all.sh lesson.json "$OUTPUT_DIR"
```

This writes one editable `.docx` per `documents[]` entry, named by `id` (e.g.
`$OUTPUT_DIR/lesson_plan.docx`, `student_materials.docx`, `observation_template.docx`,
`source_packet.docx`), plus `.html` and `lesson.json` working files. Render straight into
`$OUTPUT_DIR` and leave everything the script writes in place — later revision turns
re-render from the working files even though the teacher only sees the Word documents. Then list `$OUTPUT_DIR`
and confirm every document has both its `.docx` and `.html`; if either is missing or tiny,
rerun the script. Present the Word documents to the teacher together — attach the lesson plan
last so it lands on top (chat surfaces stack newest-first). If there is no `student_materials`
document, say so plainly ("This lesson is oral, so there's no student handout — students will
work with …"). If the script errors, fix `lesson.json` (it is almost always malformed JSON)
and rerun. If file generation fails entirely, say so clearly — do not silently fall back to a
chat-only delivery.

### 5c. The satisfaction ask + iteration options (every output turn)

End the turn with EXACTLY ONE closing message that does three things, in this order:

1. **If Materials names equipment the classroom has that a paper version can stand in
   for** — coins, blocks, dice, a hundred chart — lead with a bolded offer to print it:
   *"**This lesson uses base-ten blocks — want me to make a printable set in case
   yours are short?**"* Anything whose content this lesson wrote — word cards, a
   source excerpt, a sorting mat with this lesson's categories — already ships with
   the package.
2. Asks whether the teacher is satisfied with **every artifact produced** or wants changes —
   e.g. *"Take a look at the lesson plan, student materials, and observation template — anything
   you'd like me to adjust?"* Do not skip the ask.
3. Offers 3–4 high-leverage, **specific** iteration options customized to the subject and
   topic. Do not write "let me know if you want changes" — that's a non-offer. For example,
   for a 3–5 ELA reading comprehension lesson: *"Would you like to (1) add more scaffolds for
   English learners, (2) differentiate by proficiency level, or (3) adapt to be specific to
   your state standards?"*

### 5d. Revisions — 一致性思维框架

每次修改 `lesson.json` 后重新渲染全部文档（即时）。**修改后必做一致性检查：**

- **改 shared → 全局传播。** shared 内容（问题、史料、出口票、词汇、观察点、情境/数字）
  的修改自动传播到所有引用它的文档。
- **改单文档 → 改该文档 sections。** 针对单文档的修改（"学生页加书写空间""观察表加列"）
  在该文档的 `sections` 中完成，不从 shared 分叉。
- **Consistency sweep（每次 context/number/task 修改后强制执行）：** 重读全部文档
  `sections` 中的每个 prose block，更新所有仍提及旧情境、旧名称、旧数字的句子。
  过时 prose 是最常见的一致性故障——没有任何文档可以引用已替换的内容。
- 样式：`theme` 字段适用于所有文档；文档用最少色彩以确保黑白打印清晰。

### 5e. Supplementary artifacts in their best format

The `lesson.json` pipeline is for the lesson's document set: pages a student or teacher
reads or writes on. An artifact whose value depends on its form — exact card
dimensions for cutting, poster-scale type — belongs outside it, as its own file in
whatever format produces the best version (e.g. a print-ready PDF). Your judgment
picks the format; source any shared content from `shared` so pages can't drift, and name
the file in Materials like any other page.

---

### 中国课堂特有反模式

以下规则针对中国 K-12 课堂语境，违犯即构成严重失误：

- ❌ **NEVER 在学生材料中出现"学困生""后进生""差生"等标签。** 使用"基础练习""提升练习""挑战练习"等任务名区分层级标签——层级信息只出现在教师方案中。
- ❌ **NEVER 自动假设所有学生使用同一教材版本。** Step 0 路由时必须检测教材版本（人教版/北师大版/苏教版等）；检测不到时用国家课标通用要求并邀请教师补充。
- ❌ **NEVER 在涉及乡土/地方内容（道法课的地方文化、历史课的地方史等）时跳过地区确认。** 必须先询问教师所在地区。
- ❌ **NEVER 将"双减"政策简化为"少布置作业"。** 须体现：分层作业（不同层级不同作业量/难度）、小学 1-2 年级不布置书面家庭作业、3-6 年级书面作业不超过 60 分钟等具体条款。
- ❌ **NEVER 自动假设所有学生处于同一汉语水平。** 如果对话提及"随迁子女""少数民族""双语"等信号，必须考虑国家通用语言文字待加强学生，在基础层提供额外句子支架。
- ❌ **NEVER 忽略中考/高考导向。** 课时设计应考虑考试题型与评分标准（特别是初三/高三年级）：延伸层可涉及中考压轴题变形、高考真题分析框架；基础层需确保掌握必考题型的基本解法。若教师未明确说明年级，先确认是否涉及升学备考。

### 前置依赖与环境检查

渲染脚本需要以下环境。如果在执行 Step 5b 前检测到缺失，应明确告知教师当前环境无法生成 Word 文档：

- Python 3 + `python-docx` 库（渲染引擎）
- Bash（Windows 下 Git Bash 或 WSL）
- 磁盘可用空间 > 50MB

如果渲染失败，给出具体原因和修复方向：
> *"Word 文档生成失败：[具体原因]。请确认环境后重试，或告诉我需要哪种格式，我改用其他方式输出。"*
