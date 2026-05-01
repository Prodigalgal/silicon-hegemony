# 地图边界渲染性能优化调研

## 状态

- 创建日期：2026-05-01
- 当前状态：调研完成，待确认实施路径
- 关联需求：`docs/requirements/2026-05-01-online-docs-migration-map-render-optimization.md`
- 关联任务：`tasks/in-progress/2026-05-01-online-docs-migration-map-render-optimization.md`

## 结论摘要

当前卡顿的主因不只是“SVG 慢”，而是高精度地理数据在主线程里被整体加载、整体解析、整体投影、整体重绘。当前代码已经不是典型 SVG DOM 地图，而是 `10m admin_1 GeoJSON + d3-geo 投影 + Pixi Graphics 重绘`。一旦使用 Natural Earth 10m 行政区数据，行政区数量和点数都很大，每次旋转都重新投影全部 feature，再逐个 `Graphics.clear()` / `poly()` / `fill()` / `stroke()`，主线程压力会非常高。

推荐路线：保留 10m 细节作为最终静止态质量，但不要把 10m 全量数据作为每次交互的实时输入。应改成“构建期预处理 + 分级细节 + 按需加载 + Worker 投影 + Pixi/WebGL 缓存渲染”。如果允许较大架构调整，进一步建议把底图边界转为 MVT/PMTiles 矢量瓦片，或者把球体边界转为 GPU 3D 球面几何，避免每次拖拽都在 JS 主线程重投影所有经纬度点。

## 当前实现观察

### 数据加载

`src/context/TerritoryGeometryContext.jsx` 当前直接从 GitHub 拉取：

```js
https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_1_states_provinces.geojson
```

风险：

- 首屏依赖外网与 GitHub raw 可用性。
- 浏览器需要一次性下载、解析全量 10m GeoJSON。
- 数据未经过项目定制裁剪、字段剥离、压缩、分片或 LOD 处理。

### 几何生成

当前 `buildProjectedGeometry` 会：

- 创建 `geoOrthographic` 投影。
- 遍历 `territoryCatalog.featuresById` 的所有行政区。
- 对每个 feature 调用 `projectFeatureToPolygons`。
- 每个 ring 按 `samplingStep` 抽样，然后用 `projection(coord)` 投影到屏幕坐标。
- 静止态 `samplingStep=1`，即尽量使用全量点。
- 拖拽中虽然降采样，但仍然遍历所有 feature。

这意味着旋转交互的瓶颈主要是 CPU 投影与数组重建。

### Pixi 绘制

`TerritoryLayer.update` 对每个 territory 执行：

```js
g.clear();
g.beginPath();
geo.polygons.forEach(poly => g.poly(poly));
g.fill(...);
g.stroke(...);
```

Pixi 官方性能建议强调，`Graphics` 在不频繁修改时最快；如果大量复杂 Graphics 被持续修改，应该考虑 texture / sprite 等缓存路径。当前每次 geometry 更新都高频修改大量复杂 `Graphics`，正踩中性能风险点。

### 边界和前线

`BorderLayer.update` 会在非交互期调用 `extractFrontlines(this.geometry, gameState.territories)`，这个函数遍历所有 polygon 的所有边，构建边 key 与 owner set。虽然交互期已跳过，但静止态重算仍然偏重，且可以进一步缓存。

## 外部资料要点

- D3 `geoPath` 可以生成 SVG path，也可以在传入 Canvas context 时直接渲染到 Canvas；这说明现有 d3-geo 不必绑定 SVG 字符串路径，可作为投影/路径生成工具继续使用。来源：[D3 geoPath 文档](https://d3js.org/d3-geo/path)
- Pixi 官方性能建议指出，复杂 `Graphics` 频繁修改会慢，数百个复杂图形应考虑转 texture / sprite。来源：[PixiJS Performance Tips](https://pixijs.com/7.x/guides/production/performance-tips)
- Mapbox Vector Tile 使用 Protobuf 编码，几何在 tile 内部以网格坐标存储；规范本身不定义切片、裁剪、简化策略，这些应由生成工具处理。来源：[Mapbox Vector Tile Specification](https://mapbox.github.io/vector-tile-spec/)
- Tippecanoe 会在每个缩放级别对线和多边形执行 Douglas-Peucker 简化，并支持 minzoom/maxzoom 控制。来源：[Tippecanoe README](https://github.com/mapbox/tippecanoe)
- PMTiles 是单文件瓦片归档，可放在静态存储上，无需专门瓦片服务器；适合把项目自有矢量瓦片作为静态资源分发。来源：[PMTiles](https://github.com/protomaps/PMTiles)
- MapLibre GL JS 是 WebGL 加速的矢量瓦片地图渲染库，支持 globe 和 vector tile 渲染；若接受地图引擎替换，它是成熟路线。来源：[MapLibre GL JS](https://maplibre.org/projects/gl-js/)

## 候选方案比较

| 方案 | 细节质量 | 流畅度 | 改造成本 | 适配当前游戏 | 结论 |
|---|---:|---:|---:|---:|---|
| 继续直接加载 10m GeoJSON 并主线程投影 | 高 | 低 | 低 | 已在用 | 不建议继续堆优化 |
| GeoJSON 改 TopoJSON + gzip/brotli + 本地托管 | 高 | 中低 | 低中 | 好 | 只能缓解下载和体积，不能根治交互重投影 |
| 构建多级 LOD GeoJSON/TopoJSON | 中高 | 中 | 中 | 好 | 短期务实，必须做 |
| Web Worker 投影 + 主线程只渲染结果 | 高 | 中高 | 中 | 好 | 短期核心优化 |
| MVT/PMTiles 矢量瓦片 | 高 | 高 | 中高 | 较好 | 中期推荐，解决按需加载 |
| MapLibre GL JS 替换底图 | 高 | 高 | 高 | 中 | 适合愿意换地图引擎 |
| GPU 球体几何/3D 边界渲染 | 很高 | 很高 | 高 | 中高 | 长期最优，但工程量最大 |

## 推荐架构

### 第一阶段：不换引擎，先止血

目标：在保留当前 Pixi 架构下，让 10m 数据可用但不再拖垮主线程。

1. 数据本地化
   - 将 Natural Earth `admin_1 10m` 放入项目构建流程，不再运行时访问 GitHub raw。
   - 构建期剥离不需要的属性，只保留 `name`、`admin`、`adm1_code`、`iso_3166_2` 等必要字段。
   - 输出压缩后的静态资源，例如 `public/maps/admin1-10m.topojson.br` 或由构建/服务器自动 gzip/brotli。

2. 生成 LOD
   - 仍以 10m 原始数据为最高质量源。
   - 构建期生成至少 3 档：
     - `lod0`：拖拽中，低点数，保轮廓和可见大区域。
     - `lod1`：普通静止态，保留主要边界细节。
     - `lod2`：高缩放或选中区域，使用完整 10m。
   - 不再在运行时用 `samplingStep` 临时粗暴抽样代替真正简化；运行时抽样会破坏拓扑一致性，也无法减少初始解析压力。

3. Worker 化
   - 将 `buildProjectedGeometry`、`projectFeatureToPolygons`、bounds/centroid 计算移到 Web Worker。
   - 主线程只接收结构化后的 `Float32Array` 或可转移对象。
   - 使用 `AbortController` 或 request id 丢弃过期旋转结果，避免拖拽中排队计算。

4. 缓存和节流
   - 旋转角度按网格量化，例如经纬每 `0.5°` 或 `1°` 缓存一次投影结果。
   - 拖拽中只请求 `lod0`，停下 `150-250ms` 后再请求 `lod1/lod2`。
   - `BorderLayer` 的拓扑/前线边段不要每次从 polygon 重建，可缓存基础共享边，再只按 owner 计算颜色分类。

5. Pixi 渲染缓存
   - 静态边界层用 `RenderTexture` 或等价 texture 缓存。
   - 拖拽中显示低细节 layer 或上一帧静止纹理，不重新绘制所有复杂 polygon。
   - hover/selected 单独一层绘制，不为了 hover 重绘所有领土。

### 第二阶段：矢量瓦片化

目标：从“一次加载全球所有行政区”改为“按视野和级别加载需要的边界”。

推荐产物：

- `admin1.pmtiles`：单文件 PMTiles，内部为 MVT。
- layer 示例：
  - `admin1-fill`
  - `admin1-boundary`
  - `admin1-centroid`
  - `admin1-adjacency` 或单独 JSON 图数据

构建工具路线：

```bash
tippecanoe ^
  -o public/maps/admin1.pmtiles ^
  -zg ^
  -Z0 ^
  -l admin1 ^
  --drop-densest-as-needed ^
  --extend-zooms-if-still-dropping ^
  --coalesce ^
  -x scalerank -x featurecla -x name_alt ^
  data/admin1-10m.cleaned.geojson
```

说明：

- `-Z0` / `-zg` 让工具生成多 zoom 层级。
- `--coalesce` 可合并同类型同属性几何，降低冗余。
- `-x` 去掉不参与玩法和渲染的属性，减少瓦片体积。
- 具体参数需要用真实数据迭代，不能一次定死。

运行时策略：

- 地图旋转或缩放时，根据当前投影可见半球和屏幕分辨率请求瓦片。
- Worker 解码 MVT，投影可见 tile 内的几何。
- Pixi 主线程绘制当前可见 tile 的边界和填充。
- 缓存 tile 解码结果与投影结果，拖拽中优先复用上一帧或低 zoom tile。

### 第三阶段：GPU 球体边界

如果长期目标是“超细边界 + 持续 60fps 旋转”，最根本的做法是把地图从 2D 正交投影重算改成 3D 球体几何：

- 构建期把经纬度转成单位球面 `Float32Array` 顶点。
- 行政区边界作为球面 polyline mesh，填充区域通过三角化 mesh。
- 拖拽时旋转 camera 或 globe container，GPU 完成顶点变换。
- CPU 不再每帧投影全部经纬点。
- 交互点击可用 color picking / spatial index / 粗略 bounding volume + 精确命中。

这条路线工程量最大，但它和“球形地球 + 高细节边界 + 流畅旋转”最匹配。

## 建议实施顺序

### P0：立刻做

1. 停止运行时从 GitHub raw 加载 10m GeoJSON，改成本地构建产物。
2. 构建期剥离字段并生成 LOD。
3. `buildProjectedGeometry` 移入 Web Worker。
4. 拖拽中只使用低 LOD，静止后异步切高 LOD。
5. `BorderLayer` 共享边缓存化，hover/selected 单独图层化。

### P1：随后做

1. 引入 PMTiles/MVT 原型，先只渲染 admin1 boundary。
2. 对比首屏加载、拖拽帧率、内存、选中/hover 准确率。
3. 如果效果明显，逐步把 fill、boundary、centroid 都迁移到瓦片化。

### P2：长期优化

1. 评估 Three.js 或自定义 WebGL 球面边界渲染。
2. 将行政区边界变为 GPU mesh。
3. 采用 GPU picking 或离屏颜色 picking 处理交互。

## 验收指标

建议用以下硬指标判断优化是否有效：

- 首屏地图可交互时间：目标小于 `2s`，较弱机器不超过 `4s`。
- 拖拽期间主线程长任务：单次不超过 `50ms`。
- 拖拽帧率：桌面目标接近 `60fps`，低配设备至少稳定 `30fps`。
- 静止后高精度恢复时间：目标小于 `500ms`。
- 地图数据首次下载体积：通过压缩与裁剪控制在可接受范围；若超过数十 MB，应转瓦片化。
- hover / click 命中：行政区选择准确，不因 LOD 产生明显错选。

## 当前项目的最小落地方案

在不大改架构的前提下，下一步可以新增：

- `scripts/build-map-assets.mjs`
- `public/maps/admin1-10m.lod0.json`
- `public/maps/admin1-10m.lod1.json`
- `public/maps/admin1-10m.lod2.json`
- `src/workers/territoryProjection.worker.js`
- `src/context/TerritoryGeometryContext.jsx` 改为从 Worker 请求 geometry
- `src/pixi/layers/TerritoryHighlightLayer.js` 单独处理 hover/selected

这能在保留 10m 静止态细节的同时，把拖拽和加载压力从“全量主线程同步处理”降到“按状态异步处理”。

## 风险

- 只做 TopoJSON 压缩不能解决旋转重投影；它只是缩小传输和解析体积。
- 运行时抽样不是严格拓扑简化，可能让边界断裂或小岛消失。
- Worker 会改善主线程卡顿，但如果每次仍处理全量 10m，整体延迟仍然高。
- 瓦片化会改变数据组织方式，需要重新设计 hover/click 命中和 territory id 映射。
- GPU 球体路线最流畅，但对当前 Pixi 2D 渲染架构冲击最大。

## 最终建议

短期采用“本地 10m 源数据 + 构建期 LOD + Worker 投影 + Pixi 缓存层”。中期改成 PMTiles/MVT 按需加载。长期如果项目核心体验就是旋转球体地图，考虑升级为 GPU 球面边界渲染。这样才能同时满足“非常细节的地图边界”和“流畅地图加载/交互”。

