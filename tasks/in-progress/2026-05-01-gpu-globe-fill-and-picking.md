# GPU 球体行政区面填充与精确命中任务

## 状态

- 当前状态：已完成
- 创建日期：2026-05-01
- 关联需求：`docs/requirements/2026-05-01-gpu-globe-boundary-renderer.md`
- 关联决策：`docs/decisions/2026-05-01-adopt-gpu-globe-renderer.md`
- 前置任务：`tasks/in-progress/2026-05-01-gpu-globe-boundary-renderer.md`

## 背景

上一阶段已接入 GPU globe，支持球体、行政区边界线、中心点、拖拽旋转和基础 hover/click。但当前 hover/click 仍使用“最近中心点”近似匹配，行政区面填充也尚未迁移。这会导致狭长区域、小岛区域和密集行政区的交互精度不足，也无法完整替代 Pixi 的区域填色能力。

## 任务目标

1. 为 GPU globe 新增行政区球面面填充。
2. 基于填充面片的 `faceIndex -> territoryId` 映射实现更准确的 hover/click。
3. 支持政治、补给、经济、军事、赛博地图模式的基础填色。
4. 保留边界线作为高精度轮廓层。
5. 保留 Pixi fallback，不删除旧链路。

## 本轮范围

- 修改 `src/three/globeGeometry.js`，新增 fill mesh 构建和颜色 buffer 构建。
- 修改 `src/components/GpuGlobeMap.jsx`，新增 fill mesh 渲染与面片 picking。
- 更新本地文档记录实现结果、验证情况和后续遗漏项。

## 非目标

- 不在本轮实现最终的 PMTiles/MVT 数据管线。
- 不在本轮迁移前线、补给线、天气、行动动画和图标层。
- 不在本轮做复杂球面多边形布尔/洞处理的最终版算法。

## 方案

- 构建期仍使用现有 GeoJSON feature。
- 对每个行政区 outer ring 做球面三角扇近似填充：
  - 使用 ring 的平均球面方向作为扇心。
  - 以相邻边界点构建三角形。
  - 为每个三角面记录所属 `territoryId`。
- R3F pointer 事件命中 fill mesh 后，使用 `event.faceIndex` 反查 `territoryId`。
- 地图模式变化时只更新颜色 attribute，不重建几何。

## 风险

- 三角扇是第一阶段近似方案，极大区域或跨日期变更线区域可能存在轻微填充瑕疵。
- 洞和内环暂不填充裁剪，后续需要更严谨的球面 triangulation。
- 单一大 mesh 的颜色更新需要谨慎控制 attribute 更新频率。

## 验收标准

- GPU globe 显示行政区基础面填充，而不仅是边界线。
- hover/click 使用面片命中，不再优先依赖最近中心点。
- 地图模式切换后填充色可更新。
- `npm run lint`、`npm run build`、`npm run test` 通过。
- Playwright smoke 和 canvas 像素验证通过。

## 待办清单

- [x] 创建本地任务文件。
- [x] 新增 fill geometry 构建。
- [x] 新增 fill color buffer 构建。
- [x] 接入 fill mesh 渲染。
- [x] 改用 faceIndex 命中 territory。
- [x] 运行验证。
- [x] 回写任务与需求文档。

## 遗漏事项跟踪

- [ ] GPU 前线/边界态势层。
- [ ] GPU 补给线/外交链接层。
- [ ] GPU 图标层。
- [ ] GPU 天气层。
- [ ] GPU 行动动画层。
- [ ] 构建期 LOD / 本地地图数据管线。
- [ ] 更严谨的球面 polygon triangulation。
- [ ] 音效增强长期需求，见 `tasks/backlog/2026-05-01-enhance-game-audio.md`。
- [ ] 特效动画增强长期需求，见 `tasks/backlog/2026-05-01-enhance-vfx-animation.md`。

## 实现结果

- `src/three/globeGeometry.js` 新增行政区球面 fill mesh 构建：
  - 以 GeoJSON outer ring 生成球面三角扇。
  - 为每个三角面记录 `territoryId`。
  - 新增 `fillPositions`、`fillTerritoryIdsByFace`、`buildFillColorBuffer`、`getTerritoryIdFromFace`。
- `src/components/GpuGlobeMap.jsx` 新增行政区填充 mesh：
  - 使用 `meshBasicMaterial` + `vertexColors` 渲染地图模式颜色。
  - 通过 `event.faceIndex` 反查行政区，实现比中心点近似更准确的 hover/click。
  - 保留边界线和中心点，边界负责高精度轮廓，填充负责区域色和命中。

## 验证情况

- `npm run lint`：通过。
- `npm run build`：通过。
- `npm run test`：通过，10 个测试全部通过。
- `npm run playwright:smoke`：通过。
- GPU fill canvas 验证：
  - `canvas=1440x900`
  - `brightRatio=0.3125`
  - `chromaRatio=0.2357`
  - `dragDiff=0.1675`

## 遗留问题

- 当前 fill triangulation 是三角扇近似方案，复杂多边形、洞、跨日期变更线区域后续需要更严谨算法。
- 前线、补给线、图标、天气、行动动画尚未迁移到 GPU globe。
- 地图数据仍在运行时加载 10m GeoJSON，后续需要本地化、LOD、二进制化或 PMTiles/MVT。
