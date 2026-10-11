# Memory Strategy

## Priority order

1. current user message
2. current conversation class profile card
3. persistent `user_profile.yaml` if supported

## Rememberable fields

- school name
- grade and class
- student addressing
- parent addressing
- signature text
- include signature
- default tone
- common locations
- time wording habit
- non-sensitive special notes

## Update rules

- newest user value overrides old value
- missing fields should not erase already known defaults
- sensitive data should not be persisted by default

## No persistence fallback

If persistence is unavailable, generate a compact `班级信息卡文本` for the user to save and paste next time.
