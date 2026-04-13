---
allowed-tools: Read, Glob, Grep, Edit, Write, Bash(pnpm run build:*), Bash(pnpm run docs:build:*), Bash(pnpm run check:*), Bash(pnpm run typecheck:*), Bash(pnpm run lint:*), Bash(cat:*), Bash(ls:*), Bash(node -e:*), Bash(npx next build:*), Bash(npx vercel --version), WebSearch
description: 分析并修复 Vercel 部署报错
---

## 上下文

- 项目根目录 vercel.json 配置:
```json
!`cat vercel.json`
```
- 项目 package.json (构建相关脚本):
```json
!`cat package.json | grep -A 20 '"scripts"'`
```

## 你的任务

用户会提供 Vercel 部署时的报错信息，你需要：

1. **仔细分析报错信息**：识别错误类型（构建失败、运行时错误、配置问题、依赖问题等）
2. **定位问题根源**：
   - 如果是 **构建错误**：检查源代码、TypeScript 类型、导入路径、Next.js 配置等
   - 如果是 **运行时错误**：检查 SSR/SSG 逻辑、环境变量、API 路由、中间件等
   - 如果是 **配置错误**：检查 `vercel.json`、`next.config.*`、框架版本兼容性
   - 如果是 **依赖错误**：检查 `package.json`、lockfile、peer dependencies 冲突
3. **阅读相关源码**：根据报错堆栈或文件路径，读取对应的源文件理解上下文
4. **制定修复方案**：
   - 明确说明问题原因
   - 给出具体的修复代码或配置变更
   - 如有多种修复方式，说明各自的利弊并推荐最佳方案
5. **实施修复**：直接修改代码或配置文件
6. **本地验证**（如可能）：
   - 运行 `pnpm run build` 或 `pnpm run docs:build` 验证构建是否通过
   - 运行 `pnpm run typecheck` 确认类型无误
   - 运行 `pnpm run lint` 确认代码规范
7. **输出总结**：说明修复了什么问题、改了哪些文件、建议用户重新部署验证

### 常见 Vercel 部署错误类型参考

| 错误类型 | 常见原因 | 排查方向 |
|---------|---------|---------|
| Build Error | TypeScript 编译错误、模块找不到、语法错误 | 源代码、tsconfig、imports |
| Runtime Error | SSR 渲染失败、API 路由异常、缺少环境变量 | 页面组件、API routes、env |
| Memory Limit | 构建内存超限、大文件处理 | 优化构建、拆分代码 |
| Timeout | 构建/部署超时 | 减少构建产物、优化依赖安装 |
| Dependency Error | peer dependency 冲突、锁文件不一致 | package.json、lockfile |
| Framework Error | Next.js 版本不兼容、配置冲突 | next.config、framework 版本 |

### 注意事项

- 修改前先读取目标文件的完整内容，确保理解现有逻辑
- 优先做最小改动修复问题，避免引入不必要的变更
- 如果需要搜索最新的 Vercel/Next.js 文档来确认 API 或配置，使用 WebSearch 工具
- 修复后务必在本地尽可能复现和验证
