# lesson.json Schema Reference

加载时机：仅在编写 `lesson.json` 且不确定 block types 或字段结构时读取。已有 `example_lesson.json` 时通常不需要加载本文件。

## 顶层结构

```yaml
shared:
  grade, subject, duration, standard_code, standard_text    (required identity)
  curriculum?, prerequisite_standard?, smps[]?
  <any key>: string | block | block[] | {teacher: …, student: …, stimulus?: block[]}
documents[]:
  {id, audience: teacher|student, eyebrow, title, meta?, theme?,
   sections[]: {heading, color?, blocks[]}}
```

## Block types

| Type | Format | Use |
|------|--------|-----|
| `from_shared` | `{type: from_shared, key}` | 引用 shared 内容 |
| `paragraph` | `{type: paragraph, text}` | 纯段落 |
| `labeled` | `{type: labeled, label, text}` | 带标签文本 |
| `callout` | `{type: callout, kind: special\|student-task\|teacher-note\|student-note, label, text}` | 突出块 |
| `h2`/`h3` | `{type: h2\|h3, text}` | 子标题 |
| `list` | `{type: list, label?, ordered?, items[]}` | 列表 |
| `phase_header` | `{type: phase_header, name, minutes}` | 课时阶段头 |
| `cards` | `{type: cards, items[{title, text}]}` | 2-4 项卡片 |
| `table`/`data_table` | `{type: table\|data_table, headers[]?, rows[[]]}` | 数据表 |
| `fill_table` | `{type: fill_table, headers[], blank_rows, row_height_pt?}` | 填空表 |
| `number_line` | `{type: number_line, min, max, ticks?, marks[]?}` | 数轴 |
| `source_card` | `{type: source_card, title, author?, date?, origin?, excerpt}` | 来源卡片 |
| `answer_box` | `{type: answer_box, height_pt?, ruled?}` | 书写空间 |
| `page_break` | `{type: page_break}` | 分页符 |
| `group` | `{type: group, blocks[]}` | 组合块 |
| `columns` | `{type: columns, left[], right[]}` | 两栏 |

## 规则

- 绝不在 `text` 字段中使用 Markdown 管道表
- 数轴使用 `number_line` 块，不用数字字符串
- 渲染器无法画图片——展示用的图像列在 Materials 和阶段脚本中
- K-5 的 `answer_box` 默认画横线（数学除外）
- `shared` 中的 key 通过 `from_shared` 被任意文档引用
