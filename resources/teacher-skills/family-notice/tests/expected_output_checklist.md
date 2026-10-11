# Expected Output Checklist

- [ ] Can generate from structured template input
- [ ] Can generate from natural-language fragment input
- [ ] Outputs only one style when the user specifies one style
- [ ] Limits multi-style output to 3 styles or fewer
- [ ] Defaults to 温和提醒型 + 简短高效型 + 注意事项清单 when no style is specified
- [ ] Adds 郑重安全型安全提醒补充 for safety-related cases
- [ ] Keeps 简短高效型 within 80 to 120 Chinese characters
- [ ] Keeps checklist length to 5 items or fewer
- [ ] Avoids panic language in safety cases
- [ ] Avoids storing or requesting sensitive personal data
- [ ] Can reuse teacher/class profile defaults
