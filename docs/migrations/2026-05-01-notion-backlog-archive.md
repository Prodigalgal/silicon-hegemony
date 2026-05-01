# Notion Backlog 本地归档

## 归档说明

- 归档日期：2026-05-01
- 来源：Notion `需求池 Backlog`
- Data Source：`collection://565d5a40-fe53-47a1-96ba-54afc97d34aa`
- 所属文档中心：https://app.notion.com/p/33b79afa479080e7866cc9533046e98a

## 支持主流 AI 厂商接口配置，并提供模型连通性测试

- URL：https://app.notion.com/p/33d79afa479081e78316cdd1965e4b06
- 优先级：P1
- 状态：进行中
- 类型：Feature
- 模块：AI、UI、Networking
- 目标版本：OpenAI-compatible 接入稳定性
- 来源：Linear X-63。当前项目已收敛到 OpenAI API / OpenAI-compatible 路径，需要结合 Next.js 架构继续清理旧逻辑并确认连通性测试与正式生成链路完整闭环。
- 验收标准：UI 中不再出现 Gemini 等非 OpenAI API 体系配置项；底层服务仅保留 OpenAI API / OpenAI-compatible 逻辑；测试连接可工作；正式生成链路默认优先流式并在必要时提供兜底；错误信息保持可理解。
- 备注：本次继续推进时，同时确认 X-64 对应的 CORS 问题已因 Next.js 代理架构不再成立，可直接关闭。

### 内容

当前 `silicon-hegemony` 已改造成 Next.js 架构，AI 请求通过本地 `/api/llm/openai` 代理转发，不再是浏览器直接跨域访问上游接口。项目范围已收敛到 `OpenAI API` 与 `OpenAI-compatible` 两类接入，旧的 Gemini 等原生厂商 SDK 逻辑不应继续保留在 UI、配置流或服务实现中。

目标包括：UI 仅暴露 `OpenAI` 与 `自定义 OpenAI-Compatible` 配置；底层服务只保留 OpenAI 体系调用逻辑；测试连接请求可工作；正式生成阶段默认优先流式，且在可恢复错误场景下具备合理兜底。

排查结论：UI 与实际运行链路已经基本收口到 `OpenAI` / `自定义 OpenAI-Compatible` 两类 provider；仓库内未发现 Gemini 原生 SDK、Gemini UI 配置项或 Gemini 实际调用逻辑残留；仅剩的 `Google Gemini` / `Anthropic Claude` 字样位于旧配置兼容映射。

实现结果：`src/services/llmService.js` 中正式生成链路改为“流式优先，必要时自动回退非流式”；生成请求不再主动设置 `max_tokens`；连接测试继续保留 `max_tokens=8`，并将测试 system prompt 收紧为只输出 `OK`；配置 UI 文案调整为 `OpenAI / Compatible 配置`。

验证：`npm run lint` 通过；本地 mock 验证确认生成请求先发流式、必要时补发非流式、生成请求不再携带 `max_tokens`、连接测试仍返回 `OK`。

## 收敛为 OpenAI-compatible 配置并升级为球形地球地图

- URL：https://app.notion.com/p/33e79afa4790812689eec24970b5e3af
- 优先级：P1
- 状态：完成
- 类型：Feature
- 模块：AI、Map/Pixi、Docs
- 来源：用户直接需求（2026-04-10） + Linear X-102
- 验收标准：AI 配置仅保留 OpenAI-compatible；地图改为可查看完整世界的球型地球，并较精确显示全球国家 / 地区边界；README 顶部增加 Notion 文档入口。

内容摘要：AI 配置收敛为单一 OpenAI-compatible 模式；地图视觉升级为球型完整地球底图；`README.md` 顶部增加 Notion 文档中心入口。本轮不做全球国家级玩法重构，继续保留当时的州级规则。

## 交互层粗细分级渲染

- URL：https://app.notion.com/p/33e79afa479081b0a9c0d9faa9f89a60
- 优先级：P0
- 状态：完成
- 类型：Refactor
- 模块：Map/Pixi、UI、Docs
- 来源：用户继续推进项目（2026-04-10）
- 验收标准：交互期粗几何、静止后精细几何；旋转更流畅；test/lint/build/playwright smoke 通过。
- 备注：已实现拖拽中粗几何、静止后精细几何，并在拖拽中禁用领土交互与更多附带开销。验证：test、lint、build、playwright smoke 全部通过。

## 修复 OpenAI-compatible 流式响应聚合后为空的误判

- URL：https://app.notion.com/p/33d79afa479081be8be2f34c727494d1
- 优先级：P1
- 状态：进行中
- 类型：Bug
- 模块：AI、Networking
- 来源：2026-04-09 用户反馈：侧边栏提示“AI决策系统故障: 与 自定义 OpenAI-Compatible 通信失败: OpenAI-compatible 流式响应聚合后为空。”，但浏览器 Network 已确认接口返回 200 且持续输出 SSE 数据。
- 验收标准：当 OpenAI-compatible 接口返回合法 SSE 流，且内容出现在 reasoning_content、content 或其他兼容字段中时，前端不再误判为空；游戏侧边栏不再显示通信失败；至少完成一次本地验证并记录结果。

### 内容

排查结论：实际 SSE 样例中，增量数据主要落在 `choices[0].delta.reasoning_content`，旧实现只读取 `delta.content / message.content / choice.text`，因此把“有流但字段不匹配”误判成“聚合后为空”。上层 `getAIActions` 会把所有异常统一包装成通信失败，导致响应解析失败也被错误描述成链路失败。

实现结果：在 `src/services/llmService.js` 中补充对 `reasoning_content / reasoning` 的兼容读取；将错误分为“通信失败”和“已返回响应但结果不可用”；当接口只返回 reasoning 且没有最终答案内容时，提示更准确原因；生成请求不再主动设置 `max_tokens`；对可恢复错误增加有限自动重试。

验证：`npm run lint` 通过；本地 mock SSE 覆盖标准 `delta.content` JSON 流、首次 reasoning-only 且第二次合法 JSON 的自动重试、连接测试仍保留 `max_tokens=8` 并返回 `OK`。

## 全球国家玩法重构 + 项目内 Playwright 验证

- URL：https://app.notion.com/p/33e79afa4790819594f7d97fdb88bdab
- 优先级：P0
- 状态：完成
- 类型：Feature
- 模块：Gameplay、Map/Pixi、AI、Docs
- 来源：用户新增需求（2026-04-10） + Linear X-106
- 验收标准：玩法切换为全球国家；邻接/初始化不再依赖美国州常量；地图交互与国家级 geometry 对齐；lint/build 通过；项目内可运行 Playwright 基础验证。

内容摘要：将玩法从美国州切换为全球国家，统一地图 geometry、邻接、初始数据、交互和 AI 上下文，在项目内安装 Playwright 并完成基础验证。

## 地图显示精度提升

- URL：https://app.notion.com/p/33f79afa47908160b926e2a9491a9bc7
- 优先级：P0
- 状态：完成
- 类型：Refactor
- 模块：Map/Pixi、UI、Docs
- 来源：用户视觉质量反馈（2026-04-11）
- 验收标准：静止态地图更精细；交互性能策略不回退；test/lint/build/playwright smoke 通过。
- 备注：已统一切换到 Natural Earth Admin-1 10m 数据源；地图与目录全部按 10m 设计；test、lint、build、playwright smoke 全部通过。

## 核心规则自动化测试第一批

- URL：https://app.notion.com/p/33e79afa4790814eae32e2acdbbb3aec
- 优先级：P0
- 状态：完成
- 类型：Feature
- 模块：Gameplay、Docs
- 来源：用户要求持续推进项目（2026-04-10）
- 验收标准：建立测试脚本；覆盖核心规则；npm run test/lint/build 通过。
- 备注：已建立 `npm run test`，并新增第一批核心规则测试（mapUtils/utils/GameEngine/turnProcessor）。验证：test、lint、build 全部通过。

## 补齐联机协议与后端依赖说明

- URL：https://app.notion.com/p/33b79afa479081f4b79ceaf5fadb3478
- 优先级：P1
- 状态：未开始
- 类型：Docs
- 模块：Networking、Docs
- 来源：当前项目文档梳理
- 验收标准：明确客户端与服务端职责、主要消息流、运行依赖与本地联调方式。
- 备注：当前仓库仅能看到前端联机客户端，文档需补边界。

## 建立版本规划与发布记录规范

- URL：https://app.notion.com/p/33b79afa479081de9060f734ab7a2421
- 优先级：P2
- 状态：未开始
- 类型：Docs
- 模块：Docs
- 来源：当前项目文档梳理
- 验收标准：形成版本编号规则、里程碑说明、发布记录位置与更新责任。
- 备注：为持续开发做基础治理。

## 为核心结算与行动系统补基础测试

- URL：https://app.notion.com/p/33b79afa479081f19031e0b6b7908df8
- 优先级：P1
- 状态：未开始
- 类型：Refactor
- 模块：Gameplay、State
- 来源：当前项目文档梳理
- 验收标准：至少覆盖核心回合结算、补给短缺、行动合法性与回合推进主路径。
- 备注：优先覆盖最容易回归的规则逻辑。

## 优化 AI 配置体验并引入模板化方案

- URL：https://app.notion.com/p/33b79afa479081e199b4dd478b074b3c
- 优先级：P2
- 状态：未开始
- 类型：Feature
- 模块：AI、UI
- 来源：当前项目文档梳理
- 验收标准：支持更清晰的模型配置、原型模板复用、输入校验与错误提示。
- 备注：优先改善 SetupScreen 的长期可维护性。

## 为地图模式补充图例与信息提示

- URL：https://app.notion.com/p/33b79afa479081abb20ec6d928df34eb
- 优先级：P2
- 状态：未开始
- 类型：Feature
- 模块：UI、Map/Pixi
- 来源：当前项目文档梳理
- 验收标准：政治、补给、经济、军事、赛博视图均有明确图例或说明入口。
- 备注：有助于降低观察门槛。

## globe 背景改成 Canvas/texture 方案

- URL：https://app.notion.com/p/33e79afa479081fe8c4af99928d37b67
- 优先级：P0
- 状态：完成
- 类型：Refactor
- 模块：Map/Pixi、UI、Docs
- 来源：用户继续推进项目（2026-04-10）
- 验收标准：Globe 背景改为 Canvas/texture；旋转更流畅；test/lint/build/playwright smoke 通过。
- 备注：已将 GlobeLayer 切换为 Canvas/texture/sprite 路径，并在旋转中隐藏高开销图层。验证：test、lint、build、playwright smoke 全部通过。

## 删除模型下拉框 + 地球拖拽性能优化

- URL：https://app.notion.com/p/33e79afa479081f1b34fd636a91ff7f7
- 优先级：P1
- 状态：完成
- 类型：Refactor
- 模块：UI、Map/Pixi、Docs
- 来源：用户后续优化需求（2026-04-10）
- 验收标准：配置界面移除模型快速选择下拉框；拖拽优化后 lint/build/playwright smoke 通过。

## 修复 gateway client key 缺失导致 AI Unauthorized

- URL：https://app.notion.com/p/33e79afa4790813c9f22de4ba1d4486d
- 优先级：P0
- 状态：完成
- 类型：Bug
- 模块：AI、UI、Docs
- 来源：用户 bug 反馈（2026-04-10）
- 验收标准：AI 请求恢复；不再出现 missing gateway client key；test/lint/build/playwright smoke 通过。
- 备注：已收口为模型/URL/API Key 三个输入框；gateway client token 统一走 API Key 字段。

## 行政区细分 + 继续优化绘制性能

- URL：https://app.notion.com/p/33e79afa47908109b17ce1c9e6238446
- 优先级：P0
- 状态：完成
- 类型：Feature
- 模块：Gameplay、Map/Pixi、UI、Docs
- 来源：用户继续推进项目（2026-04-10）
- 验收标准：地图升级到行政区域级；继续优化绘制性能；test/lint/build/playwright smoke 通过。
- 备注：已切换为行政区域级地图与玩法单元，采用 Natural Earth Admin-1 50m 数据源。

## 地图边界增强 + 地球旋转性能继续优化

- URL：https://app.notion.com/p/33e79afa479081fa9df7f92c73d762f1
- 优先级：P0
- 状态：完成
- 类型：Refactor
- 模块：Map/Pixi、UI、Docs
- 来源：用户继续推进项目（2026-04-10）
- 验收标准：边界更清晰；旋转更流畅；lint/build/playwright smoke 通过。
- 备注：已增强国家边界描边，并加入拖拽中降采样+暂停边界重算的性能优化。

