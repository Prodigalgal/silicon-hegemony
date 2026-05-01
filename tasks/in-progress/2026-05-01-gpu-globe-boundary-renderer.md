# GPU 球体地图边界渲染任务

## 状态

- 当前状态：第一阶段已完成
- 创建日期：2026-05-01
- 关联需求：`docs/requirements/2026-05-01-gpu-globe-boundary-renderer.md`
- 关联决策：`docs/decisions/2026-05-01-adopt-gpu-globe-renderer.md`

## 任务目标

在现有游戏中接入 GPU 球体地图渲染第一阶段，实现高精度行政区边界的球面线段渲染，并为后续完整迁移建立模块边界。

## 待办清单

- [x] 创建本地需求文档。
- [x] 创建本地决策记录。
- [x] 创建本地任务文件。
- [x] 安装 Three.js / React Three Fiber 相关依赖。
- [x] 新增球面边界几何构建工具。
- [x] 新增 GPU globe React 组件。
- [x] 在地图入口接入 GPU globe 渲染路径并保留 Pixi fallback。
- [x] 完成构建/静态检查。
- [x] 回写实现结果、验证情况、遗留问题和后续建议。

## 执行约束

- 不删除 Pixi 地图路径。
- 不覆盖用户已有未提交改动。
- 第一阶段优先验证 GPU 球体边界和交互流畅性，不追求一次迁移所有游戏图层。

## 进展记录

- 2026-05-01：任务启动，已建立本地记录。
- 2026-05-01：已安装 `three` 与 `@react-three/fiber`。
- 2026-05-01：已新增 `src/three/globeGeometry.js`，用于构建球面边界线段和中心点缓冲区。
- 2026-05-01：已新增 `src/components/GpuGlobeMap.jsx`，提供 GPU globe、拖拽旋转、滚轮缩放、基础 hover/click。
- 2026-05-01：已修改 `src/components/GameMap.jsx` 默认使用 GPU globe，PixiMap 保留为 fallback。
- 2026-05-01：已修改 `src/context/TerritoryGeometryContext.jsx`，让旧 2D 投影只在 PixiMap 挂载时按需开启。

## 实现结果

- 新增依赖：
  - `three`
  - `@react-three/fiber`
- 新增文件：
  - `src/three/globeGeometry.js`
  - `src/components/GpuGlobeMap.jsx`
- 修改文件：
  - `src/context/TerritoryGeometryContext.jsx`
  - `src/components/PixiMap.jsx`
  - `src/components/GameMap.jsx`
  - `package.json`
  - `package-lock.json`

## 验证情况

- `npm run lint`：通过。
- `npm run build`：通过。
- `npm run test`：通过，10 个测试全部通过。
- `npm run playwright:smoke`：通过。
- 桌面 Playwright 视觉验证：canvas 非空，拖拽后像素变化正常。
- 移动 Playwright 视觉验证：canvas 非空，在无遮挡区域拖拽后像素变化正常。

## 遗留问题

- 仍需迁移行政区面填充、前线、链接、图标、天气和动画层。
- 当前 hover/click 使用最近中心点匹配，只是 GPU picking 前的过渡方案。
- 地图数据仍在运行时拉取 10m GeoJSON，后续需要构建期本地化、LOD 和二进制化。

## 后续建议

- 下一任务优先做“GPU globe 精确 picking + 行政区面填充”。
- 再下一步做“前线/补给线/图标层迁移”。
- 数据管线单独开任务，避免和渲染组件继续耦合。
