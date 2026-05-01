# 在线文档回迁与地图边界渲染优化任务

## 状态

- 当前状态：本地迁移与调研已完成，在线删除待确认/待工具支持
- 创建日期：2026-05-01
- 关联需求：`docs/requirements/2026-05-01-online-docs-migration-map-render-optimization.md`

## 任务目标

将项目相关在线文档回迁至本地仓库，并完成地图边界渲染优化调研，给出兼顾高细节边界和流畅加载的可实施方案。

## 待办清单

- [x] 创建本地需求文档与任务文件。
- [x] 扫描仓库现有文档、任务和地图渲染相关代码。
- [x] 定位在线文档来源与清单。
- [x] 将在线文档迁移到本地 Markdown。
- [x] 建立在线文档迁移索引。
- [ ] 在确认迁移完整后处理在线文档删除或归档。
- [x] 调研当前地图 SVG/GeoJSON/Pixi 渲染卡顿原因。
- [x] 输出地图边界渲染优化报告。
- [x] 回写实现结果、验证情况、遗留问题和后续建议。

## 执行约束

- 删除在线文档前必须有可核对清单。
- 不覆盖用户已有未提交改动。
- 若后续进入代码修改阶段，需先同步更新本任务和关联需求文档。

## 进展记录

- 2026-05-01：任务启动，已建立本地记录。
- 2026-05-01：已完成仓库扫描；确认当前地图主要链路为 `10m admin_1 GeoJSON -> d3-geo 投影 -> Pixi Graphics 绘制`。
- 2026-05-01：已完成 Notion 文档中心与 Backlog 本地归档，详见 `docs/migrations/2026-05-01-online-docs-migration-index.md`。
- 2026-05-01：已完成地图边界渲染优化调研，详见 `docs/reports/2026-05-01-map-boundary-rendering-performance-research.md`。
- 2026-05-01：在线删除暂未执行，原因是当前 Notion 连接器未提供页面删除/归档接口，且删除前需要按索引做最终确认。

## 实现结果

- 新增本地迁移索引：
  - `docs/migrations/2026-05-01-online-docs-migration-index.md`
- 新增 Notion 页面归档：
  - `docs/migrations/2026-05-01-notion-pages-archive.md`
- 新增 Notion Backlog 归档：
  - `docs/migrations/2026-05-01-notion-backlog-archive.md`
- 新增地图性能调研报告：
  - `docs/reports/2026-05-01-map-boundary-rendering-performance-research.md`

## 验证情况

- 已使用 Notion 搜索与 fetch 获取页面和 Backlog 条目来源。
- 已使用 Linear 搜索确认没有 document 类型在线文档返回。
- 已读取当前地图相关代码并形成性能瓶颈判断。
- 未运行自动化测试，因为本轮只新增文档和调研报告，未修改业务代码。

## 遗留问题

- Notion 在线页面尚未删除或归档。
- 后续代码实现仍需单独建立或更新本地任务，并避免覆盖 `src/context/TerritoryGeometryContext.jsx` 中已有未提交改动。
