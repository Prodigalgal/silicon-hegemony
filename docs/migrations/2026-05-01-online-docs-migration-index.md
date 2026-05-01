# 在线文档回迁索引

## 状态

- 迁移日期：2026-05-01
- 来源平台：Notion、Linear 检索结果
- 本地需求记录：`docs/requirements/2026-05-01-online-docs-migration-map-render-optimization.md`
- 本地任务记录：`tasks/in-progress/2026-05-01-online-docs-migration-map-render-optimization.md`
- 页面归档：`docs/migrations/2026-05-01-notion-pages-archive.md`
- Backlog 归档：`docs/migrations/2026-05-01-notion-backlog-archive.md`

## 迁移结论

- Notion 中定位到 `silicon-hegemony` 文档中心 1 个。
- 文档中心下定位到基础说明页 7 个。
- 文档中心下定位到实现/优化记录页 10 个。
- Notion `需求池 Backlog` 定位到需求条目 17 个。
- Linear 中未找到 document 类型在线文档；检索到的是 issue，不纳入“在线文档删除”范围。

## 删除状态

- 当前删除状态：未删除。
- 原因：本轮已完成本地归档和索引，但当前可用 Notion 连接器未提供页面删除/归档工具；删除前也需要按清单做最终核对。
- 建议处理方式：确认本索引无误后，通过 Notion UI 或具备 `archive page` / `delete page` 能力的工具处理删除；若只希望禁用在线入口，可先将主页面内容替换为“已迁移至本地仓库”的指向页。

## Notion 文档中心与页面清单

| 类型 | 标题 | Notion URL | 本地归档 | 迁移状态 | 删除状态 |
|---|---|---|---|---|---|
| 文档中心 | silicon-hegemony | https://app.notion.com/p/33b79afa479080e7866cc9533046e98a | `docs/migrations/2026-05-01-notion-pages-archive.md` | 已迁移 | 未删除 |
| 基础文档 | 01｜产品与项目总览 | https://app.notion.com/p/33b79afa47908193b433c4264a27a4c0 | `docs/migrations/2026-05-01-notion-pages-archive.md` | 已迁移 | 未删除 |
| 基础文档 | 02｜系统架构与运行流程 | https://app.notion.com/p/33b79afa479081adaae1deb07fe648dd | `docs/migrations/2026-05-01-notion-pages-archive.md` | 已迁移 | 未删除 |
| 基础文档 | 03｜功能模块与现状清单 | https://app.notion.com/p/33b79afa47908116ae79df38c49220af | `docs/migrations/2026-05-01-notion-pages-archive.md` | 已迁移 | 未删除 |
| 基础文档 | 04｜持续开发指南 | https://app.notion.com/p/33b79afa479081f6bce0c60330d325cd | `docs/migrations/2026-05-01-notion-pages-archive.md` | 已迁移 | 未删除 |
| 基础文档 | 05｜规则手册（当前实现版） | https://app.notion.com/p/33b79afa479081f2ac3cf24e3d935166 | `docs/migrations/2026-05-01-notion-pages-archive.md` | 已迁移 | 未删除 |
| 基础文档 | 06｜联机协议与运行依赖 | https://app.notion.com/p/33b79afa4790811b95b6e906529c04b0 | `docs/migrations/2026-05-01-notion-pages-archive.md` | 已迁移 | 未删除 |
| 基础文档 | 07｜测试与回归策略 | https://app.notion.com/p/33b79afa479081c28dc5e453f504d18a | `docs/migrations/2026-05-01-notion-pages-archive.md` | 已迁移 | 未删除 |
| 实现记录 | 需求实现｜OpenAI-Compatible 收敛 + 球形地球地图 + 首页文档置顶（2026-04-10） | https://app.notion.com/p/33e79afa47908137ba46e48720893432 | `docs/migrations/2026-05-01-notion-pages-archive.md` | 已迁移 | 未删除 |
| 实现记录 | 需求实现｜全球国家玩法重构（2026-04-10） | https://app.notion.com/p/33e79afa479081489a19dfd9b1feebc9 | `docs/migrations/2026-05-01-notion-pages-archive.md` | 已迁移 | 未删除 |
| 实现记录 | 优化实现｜删除模型下拉框 + 地球拖拽性能优化（2026-04-10） | https://app.notion.com/p/33e79afa479081dc9526d3af3afa1133 | `docs/migrations/2026-05-01-notion-pages-archive.md` | 已迁移 | 未删除 |
| 实现记录 | 需求实现｜核心规则自动化测试第一批（2026-04-10） | https://app.notion.com/p/33e79afa479081b29c5ae8c000408422 | `docs/migrations/2026-05-01-notion-pages-archive.md` | 已迁移 | 未删除 |
| 实现记录 | 优化实现｜地图边界增强 + 地球旋转性能继续优化（2026-04-10） | https://app.notion.com/p/33e79afa479081bc9a6ae098030cec17 | `docs/migrations/2026-05-01-notion-pages-archive.md` | 已迁移 | 未删除 |
| 实现记录 | 优化实现｜globe 背景改成 Canvas/Texture 方案（2026-04-10） | https://app.notion.com/p/33e79afa479081b1a13ee59cc8fe2b6e | `docs/migrations/2026-05-01-notion-pages-archive.md` | 已迁移 | 未删除 |
| 实现记录 | 优化实现｜交互层粗细分级渲染（2026-04-10） | https://app.notion.com/p/33e79afa479081f39d90d7e88faacdf9 | `docs/migrations/2026-05-01-notion-pages-archive.md` | 已迁移 | 未删除 |
| 实现记录 | 需求实现｜行政区细分 + 继续优化绘制性能（2026-04-10） | https://app.notion.com/p/33e79afa47908175acf7c90e894aafcd | `docs/migrations/2026-05-01-notion-pages-archive.md` | 已迁移 | 未删除 |
| 实现记录 | Bug修复｜gateway client key 缺失导致 AI Unauthorized（2026-04-10） | https://app.notion.com/p/33e79afa479081dab05eda5c3e1d711c | `docs/migrations/2026-05-01-notion-pages-archive.md` | 已迁移 | 未删除 |
| 实现记录 | 优化实现｜地图显示精度提升（2026-04-11） | https://app.notion.com/p/33f79afa479081e78825c1aa34c05f15 | `docs/migrations/2026-05-01-notion-pages-archive.md` | 已迁移 | 未删除 |

## Notion Backlog 清单

| 标题 | Notion URL | 状态 | 本地归档 |
|---|---|---|---|
| 支持主流 AI 厂商接口配置，并提供模型连通性测试 | https://app.notion.com/p/33d79afa479081e78316cdd1965e4b06 | 进行中 | `docs/migrations/2026-05-01-notion-backlog-archive.md` |
| 收敛为 OpenAI-compatible 配置并升级为球形地球地图 | https://app.notion.com/p/33e79afa4790812689eec24970b5e3af | 完成 | `docs/migrations/2026-05-01-notion-backlog-archive.md` |
| 交互层粗细分级渲染 | https://app.notion.com/p/33e79afa479081b0a9c0d9faa9f89a60 | 完成 | `docs/migrations/2026-05-01-notion-backlog-archive.md` |
| 修复 OpenAI-compatible 流式响应聚合后为空的误判 | https://app.notion.com/p/33d79afa479081be8be2f34c727494d1 | 进行中 | `docs/migrations/2026-05-01-notion-backlog-archive.md` |
| 全球国家玩法重构 + 项目内 Playwright 验证 | https://app.notion.com/p/33e79afa4790819594f7d97fdb88bdab | 完成 | `docs/migrations/2026-05-01-notion-backlog-archive.md` |
| 地图显示精度提升 | https://app.notion.com/p/33f79afa47908160b926e2a9491a9bc7 | 完成 | `docs/migrations/2026-05-01-notion-backlog-archive.md` |
| 核心规则自动化测试第一批 | https://app.notion.com/p/33e79afa4790814eae32e2acdbbb3aec | 完成 | `docs/migrations/2026-05-01-notion-backlog-archive.md` |
| 补齐联机协议与后端依赖说明 | https://app.notion.com/p/33b79afa479081f4b79ceaf5fadb3478 | 未开始 | `docs/migrations/2026-05-01-notion-backlog-archive.md` |
| 建立版本规划与发布记录规范 | https://app.notion.com/p/33b79afa479081de9060f734ab7a2421 | 未开始 | `docs/migrations/2026-05-01-notion-backlog-archive.md` |
| 为核心结算与行动系统补基础测试 | https://app.notion.com/p/33b79afa479081f19031e0b6b7908df8 | 未开始 | `docs/migrations/2026-05-01-notion-backlog-archive.md` |
| 优化 AI 配置体验并引入模板化方案 | https://app.notion.com/p/33b79afa479081e199b4dd478b074b3c | 未开始 | `docs/migrations/2026-05-01-notion-backlog-archive.md` |
| 为地图模式补充图例与信息提示 | https://app.notion.com/p/33b79afa479081abb20ec6d928df34eb | 未开始 | `docs/migrations/2026-05-01-notion-backlog-archive.md` |
| globe 背景改成 Canvas/texture 方案 | https://app.notion.com/p/33e79afa479081fe8c4af99928d37b67 | 完成 | `docs/migrations/2026-05-01-notion-backlog-archive.md` |
| 删除模型下拉框 + 地球拖拽性能优化 | https://app.notion.com/p/33e79afa479081f1b34fd636a91ff7f7 | 完成 | `docs/migrations/2026-05-01-notion-backlog-archive.md` |
| 修复 gateway client key 缺失导致 AI Unauthorized | https://app.notion.com/p/33e79afa4790813c9f22de4ba1d4486d | 完成 | `docs/migrations/2026-05-01-notion-backlog-archive.md` |
| 行政区细分 + 继续优化绘制性能 | https://app.notion.com/p/33e79afa47908109b17ce1c9e6238446 | 完成 | `docs/migrations/2026-05-01-notion-backlog-archive.md` |
| 地图边界增强 + 地球旋转性能继续优化 | https://app.notion.com/p/33e79afa479081fa9df7f92c73d762f1 | 完成 | `docs/migrations/2026-05-01-notion-backlog-archive.md` |

## Linear 检索结果

Linear 搜索 `Silicon Hegemony` 返回 issue 类型结果，包括 `X-149`、`X-123`、`X-121`、`X-120`、`X-102` 等地图性能相关事项；`list_documents` 未返回 document 类型在线文档。因此本次“在线文档回迁”以 Notion 文档和 Notion Backlog 为准。

