# DevPilot - VS Code AI Developer Tool

> **AI-assisted developer workflow for VS Code**

DevPilot 是一个 **Local-first** 的 VS Code AI Developer Tool。它通过 LLM 能力辅助开发者理解代码、规划修改、生成 Commit Message，以及 Review Git 变更。

项目采用 TypeScript VS Code Extension + Python/FastAPI 本地后端的组合，重点展示 AI Coding Workflow、Context Engineering、Prompt Engineering、Structured Output 和开发者工具工程化能力。所有结果都是建议，最终决策始终由开发者掌控。

## 项目定位 Project Overview

DevPilot 面向真实开发流程，而不是单一聊天 Demo。它将四类高频开发任务收敛为可验证的 AI Workflow：输入边界明确、输出结构固定、错误可识别、测试不依赖真实付费模型。

| 层级 | 职责 |
| --- | --- |
| VS Code Extension | Command Palette 交互、选中代码/暂存 Git 上下文收集、状态栏与结果展示 |
| Local FastAPI Backend | 请求校验、Workflow 编排、Prompt 管理、错误映射与结构化响应 |
| LLM Provider | 通过 Provider 抽象隔离 OpenAI SDK；测试使用 Fake Provider 或 Mock |

## 核心能力 Core Features

### 1. Explain Code

- **中文说明：** 解释当前编辑器中选中的代码，返回摘要、详细说明、关键点与风险。
- **使用场景：** 阅读陌生代码、理解遗留逻辑、在 Code Review 前快速建立上下文。
- **技术特点：** 仅发送当前 selection 与语言信息；通过 Prompt Registry 加载版本化 Prompt，并用 Structured Output 校验结果。

### 2. Generate Development Plan

- **中文说明：** 将需求描述和可选摘要转化为结构化开发计划。
- **使用场景：** 开始编码前拆解实现步骤、测试步骤、风险和不在本次范围内的事项。
- **技术特点：** 输出 requirement understanding、assumptions、affected files、implementation steps、validation steps、risks 与 out of scope，避免把模型建议直接当作执行命令。

### 3. Generate Commit Message

- **中文说明：** 根据已暂存的变更上下文生成 Conventional Commits 风格的 Commit Message 建议。
- **使用场景：** 提交前快速整理准确、统一的 subject、body 和 commit type。
- **技术特点：** 只使用 staged text changes；敏感文件和二进制 diff 会被过滤；插件不会执行 `git commit`。

### 4. Review Changes

- **中文说明：** 对已暂存的文本 diff 生成面向证据的变更审查结果和测试建议。
- **使用场景：** 提交前进行一次轻量 Review，检查是否存在可从 diff 或显式 context 支撑的问题。
- **技术特点：** finding 包含 severity、file、line、problem、evidence 与 suggestion；没有明确证据时允许 `findings: []`，避免无依据误报。

## 架构 Architecture

```text
VS Code Extension
  - 用户交互、选中代码与 staged Git context 收集
          ↓ HTTP
Local FastAPI Backend
  - Prompt Registry、Workflow 编排、LLM 调度、Structured Output 校验
          ↓ Provider abstraction
LLM Provider
  - OpenAI Provider（本地使用）/ Fake Provider（测试）
```

- **VS Code Extension** 负责用户交互、局部上下文收集和结果展示，不承担 LLM 业务逻辑。
- **Local FastAPI Backend** 负责 Prompt 管理、LLM 调度、输入校验、结构化输出和安全错误映射。
- 模型调用通过 **LLM Provider** 抽象隔离，因此真实 Provider 与测试替身可以共享同一 Workflow 边界。

更详细的实现边界见 [架构说明](docs/architecture.md)。

## AI Engineering Highlights

DevPilot 的重点不是“调用 GPT 实现功能”，而是围绕 AI 应用工程可靠性建立清晰边界。

- **Context Engineering：** 提供 typed context models、确定性 budget、优先级排序和安全过滤。当前 MVP 不扫描整个 workspace；Explain Code 只使用 selection，Git Workflow 只使用 staged changes。
- **Prompt Versioning / Prompt Registry：** Prompt 使用版本化 YAML 管理，按 `prompt_id` 与版本加载，并在调用前校验必填变量，而非将 Prompt 硬编码在 Python 字符串中。
- **Structured Output：** 每个 Workflow 使用 Pydantic Schema 解析和校验 LLM 输出；无效 JSON、缺失字段或 schema 不匹配会转换为安全错误。
- **LLM Evaluation：** [evals/](evals/README.md) 提供匿名固定样例和质量 Rubric；CI 只使用 Fake Provider 和 Mock，不调用真实付费模型。
- **Security Boundary / Human-in-the-loop：** AI 输出是建议而非自动化操作；DevPilot 不修改代码、不执行模型生成命令、不自动 commit、push 或创建 PR。

## 安全与隐私 Security & Privacy

- **Local-first：** Extension 默认连接本机 `http://127.0.0.1:8000`，也可通过 `devpilot.backendUrl` 配置本地后端地址。
- **敏感文件过滤：** `.env*`、`*.key`、`*.pem`、`credentials`、`secrets`、二进制内容/二进制 diff，以及 `node_modules`、`dist`、`build` 等目录会被排除。
- **不保存完整源码：** Backend 不持久化 Workflow 请求内容或源代码；Development Plan 不会扫描 workspace。
- **不自动修改代码：** 所有计划、Commit Message 和 Review 结果均需开发者自行确认和执行。
- **API Key 安全管理：** `OPENAI_API_KEY` 和 `OPENAI_MODEL` 仅从运行环境读取；API Key 不应写入仓库、数据库或日志。

完整边界与操作建议见 [安全说明](docs/security.md)。

## 快速开始 Quick Start

### 前置条件

- Python 3.12+ 与 [uv](https://docs.astral.sh/uv/)
- Node.js 24+ 与 npm
- VS Code 1.95+
- 用于真实 AI Workflow 的 OpenAI API Key 和 model name

### 1. 启动 Backend

进入 FastAPI 后端目录，安装依赖、设置环境变量并启动本地服务：

```powershell
cd apps/api
uv sync --all-groups
$env:OPENAI_API_KEY = "your-api-key"
$env:OPENAI_MODEL = "your-model-name"
uv run uvicorn devtool_api.main:app --reload
```

健康检查地址为 `http://127.0.0.1:8000/health`。Extension 成功连接后，状态栏显示 `DevPilot: Ready`。

### 2. 安装 VS Code Extension

在 Extension 目录执行依赖安装和 VSIX 打包：

```powershell
cd apps/extension
npm ci
npm run package
```

随后可使用命令安装：

```powershell
code --install-extension dist/devpilot.vsix
```

也可以在 VS Code 中执行 **Extensions: Install from VSIX...**，选择 `apps/extension/dist/devpilot.vsix`。如后端地址不同，请在 VS Code Settings 中配置 `devpilot.backendUrl`。

## 测试 Testing

所有自动化测试均不需要真实 OpenAI API Key，也不会调用付费模型。

### Backend: 64 passed

覆盖 API、四个 Workflow、Provider 错误映射、Prompt Registry、Structured Output、Context 模型/安全过滤/budget 以及 Evaluation 质量边界。

```powershell
cd apps/api
uv run pytest
uv run ruff check .
uv run ruff format --check .
```

### Extension: 25 tests passed

覆盖 Backend client、健康状态、Explain Code / Generate Plan 命令、staged Git context、Commit Message / Review Changes 命令、错误提示与 Output Channel 格式。

```powershell
cd apps/extension
npm ci
npm run compile
npm test
npm run lint
npm run format:check
```

GitHub Actions 会在 push 与 pull request 时运行这些质量检查。`v*` tag 触发的 workflow 仅负责打包 `.vsix` 并上传 artifact，不会发布到 VS Code Marketplace。

## 3 分钟演示 Demo Scenario

使用一个不包含敏感信息的小型示例项目，并准备一处 staged 文本变更。

1. **Explain Code（0:00-0:40）**：选中一个短函数，运行 **DevPilot: Explain Selected Code**，展示 summary、explanation、key points 与 risks，强调只采集 selection。
2. **Generate Plan（0:40-1:20）**：运行 **DevPilot: Generate Development Plan**，输入小型需求，展示 implementation steps、validation steps、risks 与 out of scope，强调它不会自动修改代码。
3. **Review Changes（1:20-2:10）**：运行 **DevPilot: Review Staged Changes**，展示 evidence-backed findings 和 testing recommendations；若没有足够证据，`findings: []` 是正确结果。
4. **Generate Commit Message（2:10-2:45）**：运行 **DevPilot: Generate Commit Message**，展示 Conventional Commit 建议，强调只读取 staged changes 且不会执行 commit。
5. **总结（2:45-3:00）**：说明 Local-first、敏感文件过滤、Structured Output、Fake Provider 测试、LLM Evaluation 与 Human-in-the-loop 边界。

完整演示脚本见 [Demo Guide](docs/demo-guide.md)。

## 相关文档 Documentation

- [架构说明 Architecture](docs/architecture.md)
- [演示指南 Demo Guide](docs/demo-guide.md)
- [安全与隐私 Security and Privacy](docs/security.md)
- [Evaluation Fixtures and Rubrics](evals/README.md)
- [v0.1.0 Release Notes](CHANGELOG.md)

## Roadmap

以下均为未来能力，当前版本尚未实现：

- 使用专用 VS Code Webview 展示更丰富的结果界面。
- 在明确用户授权前提下，提供更精细的 workspace context 选择能力。
- 在 Extension UI 中提供可配置的 Prompt/version 选择和 model settings。
- VS Code Marketplace 发布与签名 release distribution。

## License

[MIT](LICENSE)
