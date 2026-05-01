# 在线文档回迁与地图边界渲染优化需求记录

## 状态

- 当前状态：已完成本地回迁与调研，在线删除待确认/待工具支持
- 创建日期：2026-05-01
- 关联任务：`tasks/in-progress/2026-05-01-online-docs-migration-map-render-optimization.md`

## 需求背景

当前项目需要将在线文档全部回迁到本地仓库，并在确认本地归档完整后删除在线文档。同时，系统当前通过加载 SVG 渲染地图边界，地图边界细节越高，浏览器解析、布局和绘制压力越大，导致地图加载与交互卡顿。

## 目标

1. 识别项目相关在线文档来源、清单和内容。
2. 将在线文档内容迁移为仓库内 Markdown 文档，并保留来源、迁移时间和必要元数据。
3. 在用户确认迁移清单无误后，删除或归档对应在线文档。
4. 调研并形成地图边界渲染优化方案，在保留高细节边界的同时提升加载和交互流畅度。

## 范围

- 本地文档目录优先使用：
  - `docs/requirements/`
  - `docs/reports/`
  - `docs/decisions/`
  - `docs/migrations/`
- 本地任务目录优先使用：
  - `tasks/in-progress/`
  - `tasks/done/`
- 地图渲染优化调研覆盖：
  - 当前数据加载链路
  - SVG/GeoJSON/TopoJSON/矢量瓦片/Canvas/WebGL 的取舍
  - 数据预处理、分级细节、缓存和渐进加载策略
  - 与现有 React、d3-geo、Pixi 架构的兼容性

## 非目标

- 未经用户确认，不直接执行在线文档删除。
- 本阶段先做迁移和方案调研，不默认重写地图渲染实现。
- 不引入与地图渲染无关的大范围重构。

## 初步方案

1. 先扫描仓库，建立本地需求文档和任务文件。
2. 定位在线文档来源；若在线文档来自 Notion、Linear 或其他 SaaS，导出内容并写入 `docs/migrations/`。
3. 建立迁移索引，记录在线文档标题、来源、迁移目标文件、迁移状态和删除状态。
4. 调研当前地图边界加载和渲染代码，确认卡顿主因。
5. 输出技术建议，优先考虑：
   - 用 TopoJSON 或 FlatGeobuf/PMTiles/矢量瓦片替代直接 SVG 加载。
   - 构建多级细节数据：低缩放/交互中使用简化边界，静止或高缩放时切换高精度边界。
   - 将投影、路径解析、几何裁剪和三角化预处理移到构建期或 Web Worker。
   - 用 Pixi/WebGL 渲染缓存后的边界网格或线段，避免大量 SVG DOM 节点。

## 风险

- 在线文档来源尚未完全确认，可能存在多个平台或私有权限限制。
- 在线文档删除不可逆，必须先完成本地可核对归档。
- 高精度边界数据体积大，若直接进入主线程仍会造成卡顿。
- 过度简化会损失边界细节，需要按缩放级别和交互状态分别控制。
- 用户已有未提交改动位于 `src/context/TerritoryGeometryContext.jsx`，后续若涉及该文件需避免覆盖用户工作。

## 验收标准

- 本地存在完整迁移索引，能追溯每个在线文档的来源与本地文件。
- 所有已迁移文档为 Markdown，内容可在仓库内离线阅读。
- 在线文档删除或归档前有明确待删除清单。
- 地图渲染优化报告包含当前问题定位、候选方案比较、推荐方案、实施步骤、风险和验收指标。
- 若进入代码实现阶段，需补充验证结果，包括加载时间、交互帧率或主线程阻塞改善情况。

## 进展记录

- 2026-05-01：创建本地需求记录，准备执行在线文档定位与地图渲染性能调研。
- 2026-05-01：已定位 Notion `silicon-hegemony` 文档中心、基础页面、实现记录和 `需求池 Backlog` 条目，并完成本地归档。
- 2026-05-01：Linear 检索未发现 document 类型在线文档；仅发现 issue 类型事项，因此未纳入在线文档迁移删除范围。
- 2026-05-01：已新增迁移索引 `docs/migrations/2026-05-01-online-docs-migration-index.md`。
- 2026-05-01：已新增 Notion 页面归档 `docs/migrations/2026-05-01-notion-pages-archive.md`。
- 2026-05-01：已新增 Notion Backlog 归档 `docs/migrations/2026-05-01-notion-backlog-archive.md`。
- 2026-05-01：已完成地图边界渲染性能调研，报告见 `docs/reports/2026-05-01-map-boundary-rendering-performance-research.md`。

## 本轮实现结果

- 已完成在线文档本地回迁：
  - Notion 文档中心 1 个。
  - 基础文档 7 个。
  - 实现/优化记录 10 个。
  - Notion Backlog 条目 17 个。
- 已完成地图渲染性能调研，结论是卡顿主因并非单一 SVG，而是高精度 10m 地理数据全量加载、主线程整体投影和 Pixi 复杂 Graphics 高频重绘。
- 推荐短期路线：本地 10m 源数据、构建期 LOD、Web Worker 投影、Pixi 缓存层、hover/selected 单独图层。
- 推荐中期路线：PMTiles/MVT 矢量瓦片化，按视野与缩放级别加载。
- 推荐长期路线：GPU 球体边界/3D mesh，避免每次拖拽在 JS 主线程重投影所有经纬点。

## 删除处理说明

- 本轮未删除 Notion 在线页面。
- 原因：当前可用 Notion 连接器没有页面删除/归档接口；删除前也应按 `docs/migrations/2026-05-01-online-docs-migration-index.md` 做最终核对。
- 可选后续动作：
  - 通过 Notion UI 按索引逐页删除或归档。
  - 若连接器后续提供 archive/delete page 能力，再按索引批量处理。
  - 若暂不直接删除，可先把在线文档中心替换为“已迁移到本地仓库”的指向页。

## 验证情况

- 已通过 Notion 连接器 fetch/search 对所有迁移条目建立来源 URL 和本地归档对应关系。
- 已用仓库源码确认当前地图链路涉及 `TerritoryGeometryContext`、`TerritoryLayer`、`BorderLayer`、`topologyUtils` 和 `GameRenderer`。
- 本轮未修改业务代码，因此未运行 `npm run test` / `npm run build`。

## 遗留问题与后续建议

- 在线 Notion 页面仍需用户确认删除清单后再删除或归档。
- 若进入代码实现阶段，应先新增或更新本地任务，建议从 P0 的“本地数据 + LOD + Worker 投影”开始。
- 当前工作区已有用户未提交改动：`src/context/TerritoryGeometryContext.jsx`，后续代码实现需谨慎合并，避免覆盖。
