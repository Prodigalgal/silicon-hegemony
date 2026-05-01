# GPU 球体地图边界渲染需求记录

## 状态

- 当前状态：第二阶段基础能力已实现，后续图层迁移待推进
- 创建日期：2026-05-01
- 关联任务：`tasks/in-progress/2026-05-01-gpu-globe-boundary-renderer.md`
- 关联决策：`docs/decisions/2026-05-01-adopt-gpu-globe-renderer.md`
- 关联调研：`docs/reports/2026-05-01-map-boundary-rendering-performance-research.md`

## 背景

当前地图使用 `10m admin_1 GeoJSON + d3-geo 投影 + Pixi Graphics` 渲染行政区边界。该方案能提供较细边界，但在拖拽旋转时需要在 JS 主线程反复对大量经纬度点做投影并重绘复杂 `Graphics`，导致加载和交互卡顿。

用户明确选择长期方向：采用 GPU 球体方案，同时保留高精度边界和优秀流畅的渲染体验。

## 目标

1. 将地图边界长期演进方向确认为 GPU 球体渲染。
2. 新增一个可运行的 GPU globe 渲染路径，用于验证经纬边界点预转换为球面顶点后的交互流畅度。
3. 在第一阶段尽量复用现有 `territoryCatalog` 和游戏状态，不重写核心玩法规则。
4. 保留当前 Pixi 2D 地图作为可回退路径，降低迁移风险。
5. 为后续 LOD、PMTiles/MVT、自定义二进制边界和 GPU picking 打好模块边界。

## 范围

- 新增 React-hosted Three.js / React Three Fiber 地图组件。
- 新增球面边界几何构建工具，将行政区经纬点转换成球面线段。
- 在游戏地图入口接入 GPU globe 渲染路径。
- 支持基础拖拽旋转、滚轮缩放、领土 hover / click 的第一版能力。
- 记录当前阶段限制、验证结果与后续实施计划。

## 非目标

- 本阶段不一次性删除 Pixi 地图。
- 本阶段不实现完整 PMTiles/MVT 数据管线。
- 本阶段不实现最终版 GPU polygon fill、前线、天气、动画、图标全部迁移。
- 本阶段不重写规则层、AI、联机或游戏状态结构。

## 技术方案

第一阶段采用 `three` + `@react-three/fiber`：

- React 继续负责 UI、Redux 状态、Popover 和游戏交互。
- GPU globe 组件负责三维球体、边界线、基础交互。
- 从 `territoryCatalog.featuresById` 读取行政区 GeoJSON。
- 将经纬度点转换为球面坐标后生成 `BufferGeometry`。
- 地球拖拽时旋转 group/camera，避免每帧重投影全部经纬点。
- 领土中心点也转换为球面坐标，用于后续图标、链接和 picking。

## 风险

- 当前 Pixi 图层中已有前线、链接、图标、天气、动画等系统，迁移到 GPU globe 需要分阶段处理。
- 行政区填充如果直接做球面 polygon triangulation，复杂度高，第一阶段可先渲染球体底色与边界线。
- 仅使用 line boundary 时，hover/click 命中需要额外机制，第一阶段可先采用中心点近似 picking 或 raycast 后最近中心点匹配。
- `src/context/TerritoryGeometryContext.jsx` 当前已有未提交改动，后续改动必须谨慎合并，不覆盖用户工作。

## 验收标准

- 本地需求、决策、任务文档齐备并互相关联。
- 依赖安装和代码接入完成后，项目能够构建。
- 游戏地图能显示 GPU 球体与行政区边界线。
- 拖拽地球时不再触发 d3 全量重投影作为主要交互路径。
- 当前 Pixi 地图仍可作为回退方案保留。
- 文档回写实现结果、验证情况、遗留问题和下一步计划。

## 进展记录

- 2026-05-01：创建需求记录，确认长期采用 GPU 球体地图方案。
- 2026-05-01：已新增 `three` 与 `@react-three/fiber` 依赖。
- 2026-05-01：已新增球面边界几何构建工具 `src/three/globeGeometry.js`。
- 2026-05-01：已新增 GPU globe 地图组件 `src/components/GpuGlobeMap.jsx`。
- 2026-05-01：已在 `GameMap` 默认接入 GPU globe，同时保留 Pixi fallback。
- 2026-05-01：已让 `TerritoryGeometryContext` 支持按需开启旧 2D 投影，避免 GPU 模式拖拽时继续触发 d3 全量重投影。
- 2026-05-01：已新增行政区球面面填充，并基于 `faceIndex -> territoryId` 实现更准确的 hover/click 命中。

## 第一阶段实现结果

- 地图默认渲染路径已切换到 GPU globe。
- 行政区边界从经纬度转换为球面 `BufferGeometry` 线段，由 Three/WebGL 渲染。
- 地球拖拽改为旋转三维 group，不再把 d3 2D 投影作为 GPU 模式主交互路径。
- 已加入行政区中心点 `Points`，并按地图模式/势力状态着色，作为第一阶段可视状态表达。
- 已加入基础 hover/click：通过球面 raycast 位置匹配最近行政区中心点，作为后续 GPU picking 前的过渡方案。
- Pixi 路径仍保留；当 PixiMap 挂载时会主动开启旧 2D projected geometry。

## 验证情况

- `npm run lint`：通过。
- `npm run build`：通过。
- `npm run test`：通过，10 个测试全部通过。
- `npm run playwright:smoke`：通过，`Canvas count: 1`。
- Playwright 视觉验证：
  - 桌面视口 `1440x900`：canvas 非空，拖拽后画面像素变化 `dragDiff=0.0458`。
  - 移动视口 `390x844`：canvas 非空，无遮挡顶部区域拖拽后画面像素变化 `dragDiff=0.0059`。

## 当前限制

- 已迁移 globe、边界线、中心点、行政区面填充和基础交互。
- 行政区面填充当前使用三角扇近似方案，还不是最终版球面 polygon triangulation。
- 前线、补给线、图标、天气、行动动画仍未迁移到 GPU globe。
- 当前 hover/click 优先使用面片命中，中心点只作为 fallback；最终仍建议升级为离屏 color picking 或空间索引。

## 后续建议

1. 增加离屏 color picking 或空间索引，继续提高 hover/click 命中精度。
2. 将 frontlines/link/icon/weather/animation 分层迁移到 GPU globe。
3. 建立构建期 LOD 或 PMTiles/MVT 数据管线，降低初始 GeoJSON 解析压力。
4. 将边界和填充顶点数据改为二进制静态资源，进一步压缩首屏加载。
5. 对复杂行政区补更严谨的球面 polygon triangulation。
