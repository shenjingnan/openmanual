# Changelog

## [0.16.1](https://github.com/shenjingnan/openmanual/compare/v0.16.0...v0.16.1) (2026-04-23)

### Bug Fixes

* **sidebar:** 修复侧边栏中搜索框显示在 logo 上方的问题 ([#134](https://github.com/shenjingnan/openmanual/issues/134)) ([c62af11](https://github.com/shenjingnan/openmanual/commit/c62af118f889c136387e7d4d75455992046d8a75))

## [0.16.0](https://github.com/shenjingnan/openmanual/compare/v0.15.3...v0.16.0) (2026-04-23)

### Features

* **config:** 将 logo 提升为一级配置并支持 position 字段 ([#132](https://github.com/shenjingnan/openmanual/issues/132)) ([9d65da4](https://github.com/shenjingnan/openmanual/commit/9d65da477bc2cb82369e288ed1d229774abb9f9f)), closes [#nd-sidebar](https://github.com/shenjingnan/openmanual/issues/nd-sidebar)

### Bug Fixes

* **security:** 升级 pnpm overrides 修复 6 个依赖安全漏洞 ([#133](https://github.com/shenjingnan/openmanual/issues/133)) ([3a1e9c6](https://github.com/shenjingnan/openmanual/commit/3a1e9c6fd5353ee35a22ef1aef19d20240d61ab4))

## [0.15.3](https://github.com/shenjingnan/openmanual/compare/v0.15.2...v0.15.3) (2026-04-23)

### Bug Fixes

* 修复根路径 / 静态导出时返回 404 的问题 ([#131](https://github.com/shenjingnan/openmanual/issues/131)) ([d209563](https://github.com/shenjingnan/openmanual/commit/d209563c7fd2fbd181d2e89441f5c1257c0b57f9))

## [0.15.2](https://github.com/shenjingnan/openmanual/compare/v0.15.1...v0.15.2) (2026-04-22)

### Bug Fixes

* **build:** 添加 turbopack.resolveAlias 修复 collections/server 模块解析失败 ([#130](https://github.com/shenjingnan/openmanual/issues/130)) ([55758c9](https://github.com/shenjingnan/openmanual/commit/55758c9b955a809554eef61cbea6580163e2d9d9))

## [0.15.1](https://github.com/shenjingnan/openmanual/compare/v0.15.0...v0.15.1) (2026-04-22)

### Bug Fixes

* **build:** 迁移 fumadocs 导入路径 .source/server → collections/server ([#129](https://github.com/shenjingnan/openmanual/issues/129)) ([ac2a2f5](https://github.com/shenjingnan/openmanual/commit/ac2a2f5e6f2fc3e9ee9616ac5bf0c760fd439c23))

## [0.15.0](https://github.com/shenjingnan/openmanual/compare/v0.14.1...v0.15.0) (2026-04-22)

### Features

* 默认隐藏侧边栏顶部导航区域 ([#128](https://github.com/shenjingnan/openmanual/issues/128)) ([090beff](https://github.com/shenjingnan/openmanual/commit/090befff10384430dcf3ff7fa327b954e10739a5)), closes [#nd-sidebar](https://github.com/shenjingnan/openmanual/issues/nd-sidebar) [#nd-sidebar](https://github.com/shenjingnan/openmanual/issues/nd-sidebar)

### Documentation

* remove root field from all locale meta.json files ([#127](https://github.com/shenjingnan/openmanual/issues/127)) ([330e5e3](https://github.com/shenjingnan/openmanual/commit/330e5e31fb7b94d0cd9bd9b46b0afc17bcdb44cb))

## [0.14.1](https://github.com/shenjingnan/openmanual/compare/v0.14.0...v0.14.1) (2026-04-22)

### Bug Fixes

* **search:** search.position=header 时隐藏侧边栏搜索框 ([#126](https://github.com/shenjingnan/openmanual/issues/126)) ([02a58be](https://github.com/shenjingnan/openmanual/commit/02a58bea862851463e287c164b611176205150c2))

## [0.14.0](https://github.com/shenjingnan/openmanual/compare/v0.13.0...v0.14.0) (2026-04-21)

### Features

* **header:** 支持 header.links 使用自定义图片图标（PNG/SVG） ([#119](https://github.com/shenjingnan/openmanual/issues/119)) ([545bc68](https://github.com/shenjingnan/openmanual/commit/545bc6862881e5fe345b2d6efed1b0449de99ad1))
* **header:** 支持 header.links 图标（icon）字段 ([#117](https://github.com/shenjingnan/openmanual/issues/117)) ([a4834ef](https://github.com/shenjingnan/openmanual/commit/a4834efbe615415b0bd557703eee0f9094da1a2e))
* **header:** 支持自定义顶部横条（TopBar）区域 ([#107](https://github.com/shenjingnan/openmanual/issues/107)) ([823fc01](https://github.com/shenjingnan/openmanual/commit/823fc016f0001e50b719babd5a36a65e3e425b11))
* **nav-links:** 增大导航链接图标尺寸（size-4 → size-5） ([#121](https://github.com/shenjingnan/openmanual/issues/121)) ([f200646](https://github.com/shenjingnan/openmanual/commit/f200646b557da32ce876446222f6b831809a2fd9))
* **openapi:** 支持 API 文档混合导航到文档树中 ([#106](https://github.com/shenjingnan/openmanual/issues/106)) ([c13c9ee](https://github.com/shenjingnan/openmanual/commit/c13c9ee646cdb6ca5148dc28840e50a411172ad7))
* **openapi:** 集成 OpenAPI 接口文档渲染支持 ([#105](https://github.com/shenjingnan/openmanual/issues/105)) ([4b1cd07](https://github.com/shenjingnan/openmanual/commit/4b1cd076640d61dcd26deeb1c9edb4006171693c))
* **search:** 重构搜索配置为「配置即启用」语义，支持 position 定位 ([#124](https://github.com/shenjingnan/openmanual/issues/124)) ([be85e7d](https://github.com/shenjingnan/openmanual/commit/be85e7da4c5ab0d257486e4bf8e2c69debd08624))
* **skills:** 添加 Playwright CLI 浏览器自动化技能 ([#109](https://github.com/shenjingnan/openmanual/issues/109)) ([cf1a2de](https://github.com/shenjingnan/openmanual/commit/cf1a2deaaa0417754944ed169556c3a8d0e4dc50))

### Bug Fixes

* **css:** 修复 header hover 样式不生效问题 ([#125](https://github.com/shenjingnan/openmanual/issues/125)) ([bc59cfd](https://github.com/shenjingnan/openmanual/commit/bc59cfd6c0c6a0574558d5d00dac937203bb10d4))
* **generator:** 修复 sidebar dropdown 切换后页面无法展示 ([#104](https://github.com/shenjingnan/openmanual/issues/104)) ([ef7659e](https://github.com/shenjingnan/openmanual/commit/ef7659ec056bf5d2e23d34f150045e04eb814187))
* **header:** 移除 header logo 对 navbar.logo 的回退，避免双 logo 问题 ([#122](https://github.com/shenjingnan/openmanual/issues/122)) ([6e92324](https://github.com/shenjingnan/openmanual/commit/6e92324a549c1b1c40e45d899eefcac534ffe92b))
* **top-bar:** 移除顶部横条超大屏幕额外内边距 ([#111](https://github.com/shenjingnan/openmanual/issues/111)) ([9059a43](https://github.com/shenjingnan/openmanual/commit/9059a4312ba8cffd9703b6dcdde99bcbec862a88))

### Code Refactoring

* **agents:** 将 commit 归属配置从 settings 迁移至命令文档 ([#101](https://github.com/shenjingnan/openmanual/issues/101)) ([f876217](https://github.com/shenjingnan/openmanual/commit/f87621792d59a87f5072bb994a0e2e221b1851f6))
* **components:** 统一 cn() 工具函数，基于 clsx + tailwind-merge ([#120](https://github.com/shenjingnan/openmanual/issues/120)) ([d6f0cc3](https://github.com/shenjingnan/openmanual/commit/d6f0cc3a8471629263d98b74222d8a546ffe38ca))
* **generator:** 移除 sidebar 配置依赖，改用文件系统 + meta.json 驱动生成 ([#103](https://github.com/shenjingnan/openmanual/issues/103)) ([3fdb5d3](https://github.com/shenjingnan/openmanual/commit/3fdb5d3e9ee2007ebf889b1ab008dd101325b666))
* **header:** 移除冗余的 header.enabled 字段，改为「配置即启用」语义 ([#123](https://github.com/shenjingnan/openmanual/issues/123)) ([e733ef0](https://github.com/shenjingnan/openmanual/commit/e733ef0402c074f98408f7ab152d661e3fb8a453))
* **top-bar:** 提取 NavLinks 组件并共享 Logo 解析逻辑 ([#118](https://github.com/shenjingnan/openmanual/issues/118)) ([e86314b](https://github.com/shenjingnan/openmanual/commit/e86314b118774ab259f0e9cb006288274c1e8900))

### Documentation

* 更新顶部横条链接为 GitHub 仓库地址 ([#110](https://github.com/shenjingnan/openmanual/issues/110)) ([4cd643b](https://github.com/shenjingnan/openmanual/commit/4cd643b157ee0a547b6ad158c443394823d68a50))
* 添加 npm 下载量 badge 到 README ([#100](https://github.com/shenjingnan/openmanual/issues/100)) ([f08e423](https://github.com/shenjingnan/openmanual/commit/f08e423eb2091e61226b77188e892ac50c817307))

## [0.13.0](https://github.com/shenjingnan/openmanual/compare/v0.12.0...v0.13.0) (2026-04-14)

### Features

* **generator:** 迁移 sidebar 配置至 Fumadocs 原生 meta.json + frontmatter ([#99](https://github.com/shenjingnan/openmanual/issues/99)) ([919251a](https://github.com/shenjingnan/openmanual/commit/919251ab729bb6ad64dadfc78dfbd1125273bd9a))
* **i18n:** 侧边栏和描述支持多语言显示 ([#97](https://github.com/shenjingnan/openmanual/issues/97)) ([bdfe2c7](https://github.com/shenjingnan/openmanual/commit/bdfe2c780969f9ce5ebecac7e82e200d2c17ed9a))

### Bug Fixes

* **generator:** 移除 i18n dir parser 模式下冗余的根级别 meta 目录 ([#98](https://github.com/shenjingnan/openmanual/issues/98)) ([94c3959](https://github.com/shenjingnan/openmanual/commit/94c3959cf55daa9a7d8d00664b88399ab8c45063))

### Documentation

* 更新站点 URL 并移除 PNG favicon ([#96](https://github.com/shenjingnan/openmanual/issues/96)) ([ef1c1af](https://github.com/shenjingnan/openmanual/commit/ef1c1af01957cc3bfac8d96db691000469f52b5f))

## [0.12.0](https://github.com/shenjingnan/openmanual/compare/v0.11.0...v0.12.0) (2026-04-14)

### Features

* **generator:** 添加 @orama/orama 依赖到生成的 package.json ([#95](https://github.com/shenjingnan/openmanual/issues/95)) ([5a72902](https://github.com/shenjingnan/openmanual/commit/5a72902e99449d062668302a74556769ed9b7ffe))

## [0.11.0](https://github.com/shenjingnan/openmanual/compare/v0.10.2...v0.11.0) (2026-04-14)

### Features

* **agents:** 新增 fix-audit 安全审计命令 ([#93](https://github.com/shenjingnan/openmanual/issues/93)) ([27cd034](https://github.com/shenjingnan/openmanual/commit/27cd03474a4e3b3376de6d875495e130fae40828))
* **agents:** 新增 fix-vercel-deploy 自定义命令 ([#80](https://github.com/shenjingnan/openmanual/issues/80)) ([6b30604](https://github.com/shenjingnan/openmanual/commit/6b30604d25e62cc3d6dd65d65422555cb630d74e))
* **i18n:** 新增 i18n-translate 翻译技能、日语支持及多语言首页生成修复 ([#91](https://github.com/shenjingnan/openmanual/issues/91)) ([8acc56a](https://github.com/shenjingnan/openmanual/commit/8acc56a118ce32737cb7eceecc82d22b68a282cc))
* **i18n:** 新增多语言支持 (dir parser + 修复嵌套 HTML / logo) ([#78](https://github.com/shenjingnan/openmanual/issues/78)) ([36daf95](https://github.com/shenjingnan/openmanual/commit/36daf95a695c2095d1253e63ae7d95b51e6a8b77))
* **i18n:** 新增韩语（ko）翻译支持 ([#92](https://github.com/shenjingnan/openmanual/issues/92)) ([62deb84](https://github.com/shenjingnan/openmanual/commit/62deb8440ac1b518da6cf81ac8c0df2a6616814e))

### Bug Fixes

* **deploy:** 修复 Vercel 部署后显示原始 Markdown 而非渲染页面 ([#82](https://github.com/shenjingnan/openmanual/issues/82)) ([9a31324](https://github.com/shenjingnan/openmanual/commit/9a31324650ff1f35536e0788719521a0a1b466c2))
* **deps:** 添加 pnpm.overrides 修复 12 个依赖安全漏洞 ([#94](https://github.com/shenjingnan/openmanual/issues/94)) ([7e6d381](https://github.com/shenjingnan/openmanual/commit/7e6d3812c6ea4e904ee48643d56070a75d1eba9c))
* **i18n:** 修复 i18n 模式下构建类型错误及根路径无法访问问题 ([#81](https://github.com/shenjingnan/openmanual/issues/81)) ([02e0ea5](https://github.com/shenjingnan/openmanual/commit/02e0ea55213321b5f58cc48c49bbb6577f1c9983))
* **search:** 修复 i18n 模式下 Orama 不支持中文导致搜索功能完全失效 ([#83](https://github.com/shenjingnan/openmanual/issues/83)) ([db929f7](https://github.com/shenjingnan/openmanual/commit/db929f7e0068f4b77b1d19c9d5f27ac675484d09))

### Code Refactoring

* 将临时目录 .openmanual 重命名为 .cache，输出目录 docs-dist 重命名为 dist ([#90](https://github.com/shenjingnan/openmanual/issues/90)) ([7f777d7](https://github.com/shenjingnan/openmanual/commit/7f777d777d512cc15c340530e194227f2f4afe28))

## [0.10.2](https://github.com/shenjingnan/openmanual/compare/v0.10.0...v0.10.2) (2026-04-12)

### Bug Fixes

* **search:** 修复 pnpm file: 协议下 SearchDialog 多实例导致 Missing <SearchDialog /> 报错 ([#77](https://github.com/shenjingnan/openmanual/issues/77)) ([48ebc75](https://github.com/shenjingnan/openmanual/commit/48ebc752ce04548249c2d02a2dde5ea2dba96d76))

## [0.10.0](https://github.com/shenjingnan/openmanual/compare/v0.9.0...v0.10.0) (2026-04-10)

### Features

* **agents:** 新增 increase-coverage 自定义命令 ([#76](https://github.com/shenjingnan/openmanual/issues/76)) ([29e8e1e](https://github.com/shenjingnan/openmanual/commit/29e8e1e8bd3c5fb24001d89fffb59088dc39c24e))
* **config, search:** 新增 favicon 配置支持与安全搜索对话框 ([#75](https://github.com/shenjingnan/openmanual/issues/75)) ([a145315](https://github.com/shenjingnan/openmanual/commit/a145315b3720c05597e7731c3f56e8d527f0a7fc))

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
