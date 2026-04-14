---
allowed-tools: Bash(pnpm audit:*), Bash(pnpm update:*), Bash(pnpm install:*), Read, Edit, Write, Glob, Grep
description: 安全审计技能，用于检查和修复依赖安全问题
---

## 上下文

- 当前依赖审计报告: !`pnpm audit --audit-level moderate 2>&1`
- package.json 内容: (将在步骤中读取)

## 你的任务

根据 `pnpm audit --audit-level moderate` 的输出，对有风险的依赖进行审计和修复：

### 第一步：分析漏洞

1. 解析审计报告，识别所有漏洞，记录每个漏洞的：
   - **包名** (package name)
   - **严重级别** (critical / high / moderate)
   - **当前版本** (vulnerable version)
   - **修补版本** (patched version)
   - **漏洞类型** (如 prototype pollution、ReDoS、SSRF 等)
   - **是否为直接依赖**（出现在 `package.json` 的 dependencies/devDependencies 中则为直接依赖）

2. 读取 `package.json`，确认哪些是直接依赖、哪些是间接依赖

### 第二步：分类处理

对每个漏洞按以下策略分类处理：

#### A. 直接依赖漏洞

- 使用 `pnpm update <pkg>` 升级到安全版本
- 如果最新版仍有问题或升级会导致兼容性问题，记录并告知用户

#### B. 间接依赖漏洞

- 在 `package.json` 的 `pnpm.overrides` 中添加覆盖规则，强制使用安全版本
- override 格式遵循项目现有模式：`"<包名>": ">=<安全最低版本>"`
- 注意：如果该包已有 override 规则但版本不够高，更新现有规则

#### C. 无法自动修复的情况

如果遇到以下情况，向用户说明并给出建议：
- 没有可用的修补版本
- 升级会破坏现有功能（如 API 变更）
- 需要更复杂的重构才能解决

### 第三步：验证修复

1. 运行 `pnpm install` 确保依赖安装正常
2. 再次运行 `pnpm audit --audit-level moderate` 确认漏洞已修复
3. 如果仍有残留漏洞，重复上述流程直到无法进一步自动修复

### 第四步：输出总结

以清晰的格式输出审计报告：

```
## 依赖审计总结

- 审计时间: <时间>
- 发现漏洞总数: <数量>
  - critical: <n>
  - high: <n>
  - moderate: <n>

### 处理结果

| 包名 | 严重级别 | 处理方式 | 状态 |
|------|----------|----------|------|
| xxx | high | pnpm update | ✅ 已修复 |
| yyy | moderate | overrides | ✅ 已修复 |
| zzz | low | 需人工处理 | ⚠️ 待处理 |

### 最终状态

- 剩余未修复漏洞: <数量>
- 修改文件: package.json (如有变更)
```

## 注意事项

1. **不要盲目升级**: 升级前确认目标版本确实修复了对应漏洞（参考 audit 输出中的 patched version）
2. **保持 overrides 整洁**: 合并同一包的多条规则，删除不再需要的旧规则
3. **优先使用 >= 范围**: override 版本约束使用 `>=` 以兼容后续补丁版本
4. **间接依赖优先用 overrides**: 不要尝试直接 `pnpm update` 间接依赖，应通过 overrides 解决
5. **如果没有任何漏洞**: 输出 "✅ 未发现 moderate 及以上级别的漏洞，依赖状态健康"
