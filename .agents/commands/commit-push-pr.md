---
allowed-tools: Bash(git checkout --branch:*), Bash(git add:*), Bash(git status:*), Bash(git push:*), Bash(git commit:*), Bash(gh pr create:*)
description: 提交、推送并创建 PR
---

## 上下文

- 当前 git 状态: !`git status`
- 当前 git diff（已暂存和未暂存的变更）: !`git diff HEAD`
- 当前分支: !`git branch --show-current`

## 你的任务

根据上述变更：

1. 如果当前在 main 分支，则创建一个新分支
2. 创建一个包含合适提交信息的 commit（**必须**在 commit message 末尾包含当前使用的模型信息）
3. 将分支推送到 origin
4. 使用 `gh pr create` 创建 Pull Request
5. 你可以在单次响应中调用多个工具。你必须在单条消息中完成上述所有操作。不要使用任何其他工具或执行任何其他操作。除了工具调用之外，不要发送任何其他文本或消息。

## Commit Message 格式要求

Commit message **必须**以以下格式结尾：

```
<commit subject 和 body>

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: <模型名称> <noreply@<对应主域名>>
```

### 模型与域名映射

根据当前会话实际使用的模型，选择对应的 `noreply` 邮箱域名：

| 模型系列 | 域名示例 |
|----------|---------|
| GLM (智谱) | `noreply@bigmodel.cn` |
| Claude (Anthropic) | `noreply@anthropic.com` |
| GPT (OpenAI) | `noreply@openai.com` |
| Gemini (Google) | `noreply@google.com` |
| DeepSeek | `noreply@deepseek.com` |
| Qwen (通义) | `noreply@alibabacloud.com` |

**如何确定当前模型**: 从系统提示 "You are powered by the model XXX" 中获取当前模型名称和系列，然后选择对应的域名。

### 示例

如果当前使用的是 GLM-5V-Turbo：
```
feat: add new feature

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: GLM-5V-Turbo <noreply@bigmodel.cn>
```

如果当前使用的是 Claude Sonnet 4.6：
```
feat: add new feature

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude-Sonnet-4-6 <noreply@anthropic.com>
```
