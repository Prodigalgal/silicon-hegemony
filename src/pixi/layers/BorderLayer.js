/* src/pixi/layers/BorderLayer.js */
import { Graphics } from 'pixi.js';
import { BaseLayer } from './BaseLayer';
import { extractTopology, extractFrontlines } from '../../game/topologyUtils';
import { COLORS } from '../visualConstants';

export class BorderLayer extends BaseLayer {
    constructor(app, rootContainer) {
        super(app, rootContainer);
        this.graphics = new Graphics();
        this.container.addChild(this.graphics);
        this.staticTopology = null;
    }

    setGeometry(geometryData) {
        this.geometry = geometryData;
        // 1. 预计算静态拓扑（海岸线和所有州界）
        // 这些是基础层，永远存在
        this.staticTopology = extractTopology(geometryData);
    }

    update(gameState, mapMode) {
        if (!this.staticTopology || !this.geometry) return;

        const g = this.graphics;
        g.clear();

        const { coastlines, borders } = this.staticTopology;
        const isCyber = mapMode === 'CYBER';

        // --- 1. 绘制基础层 (Base Layer) ---
        // 所有的内部边界先画一层淡的，作为底色
        g.beginPath();
        borders.forEach(([p1, p2]) => g.moveTo(p1.x, p1.y).lineTo(p2.x, p2.y));
        g.stroke({
            width: 1,
            color: 0xffffff,
            alpha: isCyber ? 0.1 : 0.15
        });

        // 海岸线
        const coastColor = isCyber ? 0x00E5FF : 0xFFFFFF;
        g.beginPath();
        coastlines.forEach(([p1, p2]) => g.moveTo(p1.x, p1.y).lineTo(p2.x, p2.y));
        g.stroke({
            width: 1.5,
            color: coastColor,
            alpha: isCyber ? 0.7 : 0.6
        });

        // --- 2. 绘制动态前线 (Dynamic Frontlines) ---
        // 只有在 POLITICAL 或 MILITARY 或 CYBER 模式下才显示前线
        if (mapMode !== 'ECONOMIC' && mapMode !== 'SUPPLY') {
            const { frontlines, neutralBorders } = extractFrontlines(this.geometry, gameState.territories);

            // 2.1 势力与中立区的边界 (扩张前线)
            // 用虚线或者稍微亮一点的白色表示
            if (neutralBorders.length > 0) {
                g.beginPath();
                neutralBorders.forEach(([p1, p2]) => g.moveTo(p1.x, p1.y).lineTo(p2.x, p2.y));
                g.stroke({
                    width: 1.5,
                    color: 0xAAAAAA, // 银灰色
                    alpha: 0.5
                });
            }

            // 2.2 敌对势力边界 (War Front)
            // 醒目的红色/橙色，代表冲突
            if (frontlines.length > 0) {
                g.beginPath();
                frontlines.forEach(([p1, p2]) => g.moveTo(p1.x, p1.y).lineTo(p2.x, p2.y));

                // 在 Cyber 模式下用发光的红色
                // 在 Political 模式下用深红实线
                const frontColor = isCyber ? 0xFF0055 : 0xD50000;

                g.stroke({
                    width: isCyber ? 2.5 : 3, // 加粗
                    color: frontColor,
                    alpha: isCyber ? 0.9 : 0.8,
                    cap: 'round', // 圆头看起来更平滑
                    join: 'round'
                });
            }
        }
    }
}