# Pre-Publish Checklist

## Positioning

- [ ] `display_name`、`short_description`、`default_prompt` 与 Skill 定位一致
- [ ] `metadata.yaml`、`manifest.json`、`PUBLISH_INFO.md` 的名称与版本一致
- [ ] 默认输出逻辑仍为“温和提醒型 + 简短高效型 + 注意事项清单”

## Content Safety

- [ ] 风格库未出现命令式、恐吓式、越权发布式表达
- [ ] 安全素材库未出现“严重后果自负”等高压措辞
- [ ] 未要求或默认保存学生姓名、电话、住址等隐私信息
- [ ] 信息卡只保留格式化相关字段

## UX and Token Efficiency

- [ ] 单风格请求只输出单风格
- [ ] 多版本输出不超过 3 种风格
- [ ] 简短高效型目标长度保持在 80-120 字
- [ ] 安全提醒补充目标长度保持在 80-120 字
- [ ] 注意事项清单控制在 5 条以内

## Packaging

- [ ] `python3 scripts/validate_skill.py` 通过
- [ ] `python3 scripts/package_skill.py` 通过
- [ ] `python3 scripts/validate_release_package.py dist/home-school-notice-optimizer.skill` 通过
- [ ] `dist/home-school-notice-optimizer.skill` 可作为主上传文件
- [ ] `dist/home-school-notice-optimizer.zip` 可作为备用上传文件
