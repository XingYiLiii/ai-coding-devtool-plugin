# Project Context

## 项目名称

ai-coding-devtool-plugin


## 项目定位

一个 VS Code AI Developer Tool。

目标：
将 LLM 能力嵌入真实开发流程。


## 产品目标

证明：
- AI Coding Workflow理解
- Context Engineering
- Prompt Engineering
- LLM应用工程能力


## 技术路线

Frontend:
TypeScript
VS Code Extension

Backend:
Python
FastAPI

AI:
OpenAI SDK
Structured Output
Prompt Registry


## MVP功能

必须：

1. Explain Code
2. Generate Commit Message
3. Generate Development Plan
4. Git Diff Review


暂不实现：

- 自动修改代码
- 自动提交
- GitHub Bot
- RAG
- LangGraph
- 多Agent


## 开发原则

- Local first
- Human in the loop
- 不执行模型生成命令
- 不保存源码
- 不上传敏感文件


## 当前开发阶段

Phase 0:
项目初始化


## Commit策略

小步提交。

每个commit:
- 单一目标
- 可解释
- 保持项目可运行


## 后续Agent说明

Sol:
负责架构设计和方案评审。

Terra:
负责代码实现和工程落地。

用户:
负责需求确认、验收和项目理解。