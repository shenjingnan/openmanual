# Changelog

## [0.9.0](https://github.com/shenjingnan/openmanual/compare/v0.8.2...v0.9.0) (2026-04-10)

### Features

* **callout:** 重构 Callout 类型系统，新增 7 种类型及专属配色 ([#70](https://github.com/shenjingnan/openmanual/issues/70)) ([f737a94](https://github.com/shenjingnan/openmanual/commit/f737a948a74b75532ff4172b996bdef6395a678b))
* **generator:** 新增 Callout 组件支持 ([#68](https://github.com/shenjingnan/openmanual/issues/68)) ([6056a63](https://github.com/shenjingnan/openmanual/commit/6056a63eb1d351a215ba6fee5be982d619decf22))
* **mermaid:** 新增全屏预览对话框，支持缩放和平移操作 ([#72](https://github.com/shenjingnan/openmanual/issues/72)) ([9c004c0](https://github.com/shenjingnan/openmanual/commit/9c004c0e0145d925c9450d6b5b45db77d028a13a))

### Bug Fixes

* **search:** 修复搜索路由路径缺少 app/ 前缀导致 404 问题 ([#74](https://github.com/shenjingnan/openmanual/issues/74)) ([4fe5f1c](https://github.com/shenjingnan/openmanual/commit/4fe5f1c56b22e49ef037f7904b5e3831ea2067ce))
* **sidebar:** 修复侧边栏 icon 不显示问题 ([#71](https://github.com/shenjingnan/openmanual/issues/71)) ([d64985e](https://github.com/shenjingnan/openmanual/commit/d64985ed5be3dd5674b1fa0e0637db980c04f7e2))

### Code Refactoring

* **cli:** dev 命令自动推导 openmanual 包根目录 ([#69](https://github.com/shenjingnan/openmanual/issues/69)) ([389b602](https://github.com/shenjingnan/openmanual/commit/389b6022fec15c99fe45302ace972b622ac7280d))
* **scripts:** 简化 dev 脚本，新增 agent command ([#67](https://github.com/shenjingnan/openmanual/issues/67)) ([03b4401](https://github.com/shenjingnan/openmanual/commit/03b44015737194992de2610edfb32360aaf8f2bb))

## [0.8.2](https://github.com/shenjingnan/openmanual/compare/v0.8.1...v0.8.2) (2026-04-08)

### Bug Fixes

* **generator:** 去除代码块 shadow 样式和 max-height 限制 ([#66](https://github.com/shenjingnan/openmanual/issues/66)) ([83931dc](https://github.com/shenjingnan/openmanual/commit/83931dcc836a9b762b7d4164bedba9f00e7ab55e))

### Code Refactoring

* **build:** 迁移构建工具从 tsup 到 tsdown，统一 dev/build 管线 ([#63](https://github.com/shenjingnan/openmanual/issues/63)) ([fbadbe9](https://github.com/shenjingnan/openmanual/commit/fbadbe988416945942a24a9cc9acc0232033313c))
* **generator:** 提取 provider、app-layout、nav-layout 为独立组件 ([#64](https://github.com/shenjingnan/openmanual/issues/64)) ([fb72f75](https://github.com/shenjingnan/openmanual/commit/fb72f7576e2bbcdcd3c29f1338e784cce6b82c83))
* **generator:** 提取 restructureTree 为共享工具，消除重复代码 ([#65](https://github.com/shenjingnan/openmanual/issues/65)) ([5131d52](https://github.com/shenjingnan/openmanual/commit/5131d52f5b8280c9f31f7eb6f9c86b0696f334e7))

## [0.8.1](https://github.com/shenjingnan/openmanual/compare/v0.8.0...v0.8.1) (2026-04-06)

### Bug Fixes

* **generator:** 简化 defaultOpen 逻辑并添加 React 类型依赖 ([#61](https://github.com/shenjingnan/openmanual/issues/61)) ([7e7ba39](https://github.com/shenjingnan/openmanual/commit/7e7ba39b177a49daf13fac79d9cec6cd916a152c))

## [0.8.0](https://github.com/shenjingnan/openmanual/compare/v0.7.2...v0.8.0) (2026-04-06)

### Features

* 添加页面操作组件及开发模式原始 Markdown 查看支持 ([#57](https://github.com/shenjingnan/openmanual/issues/57)) ([20bcdd7](https://github.com/shenjingnan/openmanual/commit/20bcdd7b3ec3175e33cb794406c6ba7edfa2bdd3))

## [0.7.2](https://github.com/shenjingnan/openmanual/compare/v0.7.1...v0.7.2) (2026-04-06)

### Bug Fixes

* **generator:** 添加 zod 为临时 app 的直接依赖 ([#56](https://github.com/shenjingnan/openmanual/issues/56)) ([6a3c8e6](https://github.com/shenjingnan/openmanual/commit/6a3c8e6bfc1d9084a73f3b9b20147d2d20abd66b))

## [0.7.1](https://github.com/shenjingnan/openmanual/compare/v0.7.0...v0.7.1) (2026-04-06)

### Bug Fixes

* **install:** pnpm workspace 项目中依赖安装失败的问题 ([#55](https://github.com/shenjingnan/openmanual/issues/55)) ([17d371a](https://github.com/shenjingnan/openmanual/commit/17d371a4d6d3040d32ed32b1915b2fc593f83188))

## [0.7.0](https://github.com/shenjingnan/openmanual/compare/v0.6.1...v0.7.0) (2026-04-06)

### Features

* **generator:** 集成 Mermaid 图表渲染支持 ([#54](https://github.com/shenjingnan/openmanual/issues/54)) ([0f59a42](https://github.com/shenjingnan/openmanual/commit/0f59a429467be4c4c68bf5081e6c979c6492eae7))

## [0.6.1](https://github.com/shenjingnan/openmanual/compare/v0.6.0...v0.6.1) (2026-04-05)

## [0.6.0](https://github.com/shenjingnan/openmanual/compare/v0.5.0...v0.6.0) (2026-04-05)

### Features

* **components:** 新增 MDX 组件支持及组件文档 ([#47](https://github.com/shenjingnan/openmanual/issues/47)) ([e0b46c4](https://github.com/shenjingnan/openmanual/commit/e0b46c465350a93c42a1e9a858dea0451c877727))

### Bug Fixes

* **sidebar:** 侧边栏分组名称显示中文而非英文目录名 ([#48](https://github.com/shenjingnan/openmanual/issues/48)) ([5608b0a](https://github.com/shenjingnan/openmanual/commit/5608b0ab782a03502d2be53cdf7b12cb72676bf4))
* **sidebar:** 侧边栏分组默认折叠 ([#50](https://github.com/shenjingnan/openmanual/issues/50)) ([0ae677f](https://github.com/shenjingnan/openmanual/commit/0ae677f03dc57f05346f40ebb1264f2579992f61))
* **sidebar:** 根级页面 sidebar 分组不生效 ([#49](https://github.com/shenjingnan/openmanual/issues/49)) ([76244dc](https://github.com/shenjingnan/openmanual/commit/76244dc2c58e12ba539f8fba4febe211318b1c92))

## [0.5.0](https://github.com/shenjingnan/openmanual/compare/v0.4.0...v0.5.0) (2026-04-04)

### Features

* **content-policy:** 新增 contentPolicy 配置项，支持严格内容过滤 ([#46](https://github.com/shenjingnan/openmanual/issues/46)) ([14b3362](https://github.com/shenjingnan/openmanual/commit/14b3362994976db7a660e0acc74d3dfb978c47eb))

### Bug Fixes

* **mdx:** 代码块语言容错，不认识的语言自动降级为 text ([#44](https://github.com/shenjingnan/openmanual/issues/44)) ([cbf751f](https://github.com/shenjingnan/openmanual/commit/cbf751f0892b56823e11eecddf4fb5db30bd2f83))
* **source-config:** 修复 titleMap 查表失败，兼容运行时绝对路径 ([#45](https://github.com/shenjingnan/openmanual/issues/45)) ([7672fbf](https://github.com/shenjingnan/openmanual/commit/7672fbfe0044890da9047cbaf833ffdb88433e15))

## [0.4.0](https://github.com/shenjingnan/openmanual/compare/v0.3.2...v0.4.0) (2026-04-04)

### Features

* **theme:** 支持 light/dark 双 Logo 切换，修复暗色模式 CSS 特异性问题 ([#43](https://github.com/shenjingnan/openmanual/issues/43)) ([7b98e7f](https://github.com/shenjingnan/openmanual/commit/7b98e7f159a77fd4b797bd88713742223f9d24a7))
* **theme:** 添加暖色暗色主题，消除亮暗模式视觉断层 ([#42](https://github.com/shenjingnan/openmanual/issues/42)) ([7deb5d0](https://github.com/shenjingnan/openmanual/commit/7deb5d050c3bffb372d8a4b031175ce6af0f2cd4))

### Bug Fixes

* **deploy:** 添加 vercel.json 覆盖框架检测，修复部署失败 ([#41](https://github.com/shenjingnan/openmanual/issues/41)) ([86e870f](https://github.com/shenjingnan/openmanual/commit/86e870fa9010eca3a8694b413f8074aa8166ea4d))
* **docs:** 添加 siteUrl 启用静态导出，修复 Vercel 部署失败 ([#40](https://github.com/shenjingnan/openmanual/issues/40)) ([4e2b72e](https://github.com/shenjingnan/openmanual/commit/4e2b72ea4013d755a1f7037ae9da4239d90c5d7b))

## [0.3.2](https://github.com/shenjingnan/openmanual/compare/v0.3.1...v0.3.2) (2026-04-03)

### Bug Fixes

* **deps:** 升级 zod 到 v4，解决 peer dependency 警告 ([#39](https://github.com/shenjingnan/openmanual/issues/39)) ([d02b3aa](https://github.com/shenjingnan/openmanual/commit/d02b3aaee2df197f232025f728bd127cea7393a7))

## [0.3.1](https://github.com/shenjingnan/openmanual/compare/v0.3.0...v0.3.1) (2026-04-03)

### Bug Fixes

* **cli:** 修复 dev 模式下 __VERSION__ 未定义导致的 ReferenceError ([#38](https://github.com/shenjingnan/openmanual/issues/38)) ([d0bf28d](https://github.com/shenjingnan/openmanual/commit/d0bf28d1df2a350e88a1b849ee34ff8bb08b1ef4))
* **cli:** 支持 `om -v` 小写短选项查看版本号 ([#33](https://github.com/shenjingnan/openmanual/issues/33)) ([ae3467a](https://github.com/shenjingnan/openmanual/commit/ae3467a1d5cd15307bc0beec469ca8a76cbcc6d6))
* **cli:** 隐藏 _regenerate 内部命令 ([#36](https://github.com/shenjingnan/openmanual/issues/36)) ([6c585ca](https://github.com/shenjingnan/openmanual/commit/6c585ca459804c7eb06cf554a44e1ec5ae37795f))

### Code Refactoring

* **cli:** 使用构建时注入版本号替代运行时读取 package.json ([#35](https://github.com/shenjingnan/openmanual/issues/35)) ([5cf3227](https://github.com/shenjingnan/openmanual/commit/5cf32272ebe418979c0e7f492a59773365362547))

### Documentation

* 完善部署文档，补充各平台详细配置说明 ([#37](https://github.com/shenjingnan/openmanual/issues/37)) ([d438aca](https://github.com/shenjingnan/openmanual/commit/d438aca2addd48e43a25e5c8aabe7f73a70665fd))

## [0.3.0](https://github.com/shenjingnan/openmanual/compare/v0.2.1...v0.3.0) (2026-04-03)

### Features

* **cli:** 支持双 CLI 命令名 `om` + `openmanual` ([#32](https://github.com/shenjingnan/openmanual/issues/32)) ([37cb4f3](https://github.com/shenjingnan/openmanual/commit/37cb4f3b38bf0c26b8605afc6eccfdbfb08f8324))

## [0.2.1](https://github.com/shenjingnan/openmanual/compare/v0.2.0...v0.2.1) (2026-04-03)

### Documentation

* 添加 Codecov 覆盖率徽标并居中展示所有徽标 ([#31](https://github.com/shenjingnan/openmanual/issues/31)) ([1a0c629](https://github.com/shenjingnan/openmanual/commit/1a0c6295473e4756936dcfc6189f6d6dd260e8c4))
* 调整 README 中 Logo 图片尺寸 ([#29](https://github.com/shenjingnan/openmanual/issues/29)) ([3bae996](https://github.com/shenjingnan/openmanual/commit/3bae9964e07ab99f7c1fec49aeafd4d12caa01db))
* 调整 README 中 Logo 图片尺寸和间距 ([#30](https://github.com/shenjingnan/openmanual/issues/30)) ([9d13df0](https://github.com/shenjingnan/openmanual/commit/9d13df015cc133c8fe79a55af61bbecc2d544c5a))

## [0.2.0](https://github.com/shenjingnan/openmanual/compare/v0.2.0-beta.7...v0.2.0) (2026-04-03)

## [0.2.0-beta.7](https://github.com/shenjingnan/openmanual/compare/v0.2.0-beta.6...v0.2.0-beta.7) (2026-04-03)

### Bug Fixes

* **ci:** pnpm publish 添加 --no-git-checks 参数 ([#27](https://github.com/shenjingnan/openmanual/issues/27)) ([5343337](https://github.com/shenjingnan/openmanual/commit/5343337f0da00ee07aa23ee4a8b9b18e87698e39))

## [0.2.0-beta.6](https://github.com/shenjingnan/openmanual/compare/v0.2.0-beta.5...v0.2.0-beta.6) (2026-04-03)

### Bug Fixes

* **ci:** 统一使用 pnpm publish 替代 npm publish ([#25](https://github.com/shenjingnan/openmanual/issues/25)) ([6fc9bee](https://github.com/shenjingnan/openmanual/commit/6fc9beefc2bc60e8a2b94e9f8954cde4eb882bb6))

## [0.2.0-beta.5](https://github.com/shenjingnan/openmanual/compare/v0.2.0-beta.4...v0.2.0-beta.5) (2026-04-03)

### Bug Fixes

* **ci:** 修复预发布版本 npm publish 缺少 --tag 参数 ([#24](https://github.com/shenjingnan/openmanual/issues/24)) ([8614330](https://github.com/shenjingnan/openmanual/commit/8614330df758fdf2840fe2b3e85fa0ed965ad2c2))

## [0.2.0-beta.4](https://github.com/shenjingnan/openmanual/compare/v0.2.0-beta.3...v0.2.0-beta.4) (2026-04-03)

### Bug Fixes

* **ci:** 修复 release workflow 并统一 Node.js 版本到 24 ([#23](https://github.com/shenjingnan/openmanual/issues/23)) ([386df34](https://github.com/shenjingnan/openmanual/commit/386df34bae89cdfc0aa9b59341f897f5fd176045))

## [0.2.0-beta.3](https://github.com/shenjingnan/openmanual/compare/v0.2.0-beta.2...v0.2.0-beta.3) (2026-04-03)

### Bug Fixes

* **ci:** 修复 release workflow 以支持 npm Trusted Publisher (OIDC) ([#22](https://github.com/shenjingnan/openmanual/issues/22)) ([c3f59f4](https://github.com/shenjingnan/openmanual/commit/c3f59f478de13b68500fcb02140e8cadcba25ea8))

## [0.2.0-beta.2](https://github.com/shenjingnan/openmanual/compare/v0.2.0-beta.1...v0.2.0-beta.2) (2026-04-03)

### Bug Fixes

* **ci:** 修复 release workflow 中 pnpm publish 因 detached HEAD 失败的问题 ([#21](https://github.com/shenjingnan/openmanual/issues/21)) ([7f9b8cb](https://github.com/shenjingnan/openmanual/commit/7f9b8cb372dfa9c19bd1d3be4f7a1343b4b4aae9))

## [0.2.0-beta.1](https://github.com/shenjingnan/openmanual/compare/v0.2.0-beta.0...v0.2.0-beta.1) (2026-04-03)

### Bug Fixes

* **ci:** 锁定 pnpm 版本为 10.30.3 ([#20](https://github.com/shenjingnan/openmanual/issues/20)) ([ec2acdb](https://github.com/shenjingnan/openmanual/commit/ec2acdb6c50ea1158321f7b7bda80ec905f04f69))

## 0.2.0-beta.0 (2026-04-03)

### Features

* **dev:** 添加 watch 模式、logo 图片支持及默认主题色调整 ([#14](https://github.com/shenjingnan/openmanual/issues/14)) ([0c447a1](https://github.com/shenjingnan/openmanual/commit/0c447a19d13a11b0a48de4b579212b785c3f15ba))
* **theme:** 调整 Light 模式默认背景色为护眼暖色 ([#12](https://github.com/shenjingnan/openmanual/issues/12)) ([7faaf9f](https://github.com/shenjingnan/openmanual/commit/7faaf9fcb20131242b0d9c91f972d95ace6a10fd))
* 初始化 openmanual 文档系统框架 ([#5](https://github.com/shenjingnan/openmanual/issues/5)) ([2c1912b](https://github.com/shenjingnan/openmanual/commit/2c1912b1a3c04c6c544b6303d98839de62cdd1ab))

### Bug Fixes

* **ci:** 统一 GitHub Actions 工作流命名为英文 ([#8](https://github.com/shenjingnan/openmanual/issues/8)) ([16b3cb8](https://github.com/shenjingnan/openmanual/commit/16b3cb816e17d51175b5c7aff54fb7859574a02d))
* **generator:** 避免无条件覆盖用户自定义 logo.svg ([#15](https://github.com/shenjingnan/openmanual/issues/15)) ([d7e4faa](https://github.com/shenjingnan/openmanual/commit/d7e4faac2e2fae5a7b79d89d8bd574af775e8817))

### Code Refactoring

* **docs:** 将 docs/ 重构为独立的 OpenManual 示例项目 ([#9](https://github.com/shenjingnan/openmanual/issues/9)) ([5e41fb3](https://github.com/shenjingnan/openmanual/commit/5e41fb39da495d7261e597be083e62600062b0ae))

### Documentation

* 使用 SVG logo 替换纯文本标题并更新 npm 发布文件列表 ([#17](https://github.com/shenjingnan/openmanual/issues/17)) ([c8691d6](https://github.com/shenjingnan/openmanual/commit/c8691d68e4a0950be115f2c35b89e16729555485))
* 更新 README 为 OpenManual 文档系统框架说明 ([#7](https://github.com/shenjingnan/openmanual/issues/7)) ([213d389](https://github.com/shenjingnan/openmanual/commit/213d389445164cb7c8f4c45459db920c43b5e2d5))

## 0.2.0 (2026-03-29)

### Features

* 初始化 AI 原生 TypeScript 启动模板 ([#1](https://github.com/shenjingnan/ai-typescript-starter/issues/1)) ([94e0755](https://github.com/shenjingnan/ai-typescript-starter/commit/94e075567cf188f9421b5c7327e49917668ef570))

### Documentation

* 将 GitHub Actions 工作流名称翻译为中文 ([#14](https://github.com/shenjingnan/ai-typescript-starter/issues/14)) ([41f20af](https://github.com/shenjingnan/ai-typescript-starter/commit/41f20af0c2fcc088d1b3e45d2bb39a30fc20792b))
* 将 GitHub Copilot 指南翻译为中文 ([#15](https://github.com/shenjingnan/ai-typescript-starter/issues/15)) ([557c4c6](https://github.com/shenjingnan/ai-typescript-starter/commit/557c4c6e61e79ee45a8571a89c5cbb51cf325a26))
* 将 GitHub Issue 模板翻译为中文 ([#13](https://github.com/shenjingnan/ai-typescript-starter/issues/13)) ([2549c70](https://github.com/shenjingnan/ai-typescript-starter/commit/2549c70d3c78af2bf8ab23ecbd7f39d58b7bd361))

### CI/CD

* **deps:** Bump actions/checkout from 4 to 6 ([#4](https://github.com/shenjingnan/ai-typescript-starter/issues/4)) ([a78628e](https://github.com/shenjingnan/ai-typescript-starter/commit/a78628ea133281a9fb4b086cc97a0b5c7bfafbc7))
* **deps:** Bump actions/setup-node from 4 to 6 ([#3](https://github.com/shenjingnan/ai-typescript-starter/issues/3)) ([53dfd3b](https://github.com/shenjingnan/ai-typescript-starter/commit/53dfd3b8f874fa96905c58005c876b447317c621))
* **deps:** Bump codecov/codecov-action from 4 to 6 ([#5](https://github.com/shenjingnan/ai-typescript-starter/issues/5)) ([94b3e22](https://github.com/shenjingnan/ai-typescript-starter/commit/94b3e22324ad632c02768c06316a66856ca2189e))
* **deps:** Bump pnpm/action-setup from 4 to 5 ([#2](https://github.com/shenjingnan/ai-typescript-starter/issues/2)) ([c2000b7](https://github.com/shenjingnan/ai-typescript-starter/commit/c2000b7ca8cc5129b57b15174a40d9701900d311))

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Initial project setup
- TypeScript 5.x configuration
- Vitest testing framework
- Biome linter and formatter
- cspell spell checker
- tsup build configuration
- release-it for version management
- Husky git hooks
- lint-staged configuration
- GitHub Actions CI/CD workflows
- Issue templates (bug report, feature request)
- Dependabot configuration
- GitHub Copilot instructions
- Claude Code integration (.claude directory)
- Documentation (architecture, API, contributing)

## [0.1.0] - 2026-03-26

### Added

- Initial release
- Basic TypeScript project structure
- Build, test, and lint scripts
- CI/CD pipeline
- Documentation

[Unreleased]: https://github.com/shenjingnan/ai-typescript-starter/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/shenjingnan/ai-typescript-starter/releases/tag/v0.1.0
