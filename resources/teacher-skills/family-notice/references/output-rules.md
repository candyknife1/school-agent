# Output Rules

## Default output

If the user does not specify a style, output:

1. 温和提醒型
2. 简短高效型
3. 注意事项清单

If safety education is involved, add:

4. 郑重安全型安全提醒补充

## Style count limits

- one user-selected style: output only that style
- multi-version request: output no more than 3 styles
- do not add extra variants for display value alone

## Length control

- 简短高效型: 80 to 120 Chinese characters
- 安全提醒补充: 80 to 120 Chinese characters
- 注意事项清单: 5 items or fewer

## Missing information

If the request is incomplete:

- generate first
- do not ask repeated follow-up questions
- end with `可补充信息`
- list no more than 3 items
