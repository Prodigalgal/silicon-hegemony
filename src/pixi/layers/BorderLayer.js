/* src/pixi/layers/BorderLayer.js */
import { Graphics } from 'pixi.js';
import { BaseLayer } from './BaseLayer';
import { extractFrontlines } from '../../game/topologyUtils';

export class BorderLayer extends BaseLayer {
    constructor(app, rootContainer) {
        super(app, rootContainer);
        this.graphics = new Graphics();
        this.container.addChild(this.graphics);
        this.geometry = null;
        this.isInteracting = false;
    }

    setGeometry(geometryData) {
        this.geometry = geometryData?.territories || null;
        this.isInteracting = Boolean(geometryData?.meta?.isInteracting);
    }

    update(gameState, mapMode) {
        const g = this.graphics;
        g.clear();

        if (!this.geometry || this.isInteracting) return;

        const isCyber = mapMode === 'CYBER';
        if (mapMode !== 'ECONOMIC' && mapMode !== 'SUPPLY') {
            const { frontlines, neutralBorders } = extractFrontlines(this.geometry, gameState.territories);

            if (neutralBorders.length > 0) {
                g.beginPath();
                neutralBorders.forEach(([p1, p2]) => g.moveTo(p1.x, p1.y).lineTo(p2.x, p2.y));
                g.stroke({
                    width: 1.8,
                    color: 0xb8c6d8,
                    alpha: isCyber ? 0.35 : 0.42,
                    cap: 'round',
                    join: 'round',
                });
            }

            if (frontlines.length > 0) {
                g.beginPath();
                frontlines.forEach(([p1, p2]) => g.moveTo(p1.x, p1.y).lineTo(p2.x, p2.y));
                const frontColor = isCyber ? 0xFF0055 : 0xD50000;

                g.stroke({
                    width: isCyber ? 2.4 : 2.8,
                    color: frontColor,
                    alpha: isCyber ? 0.9 : 0.8,
                    cap: 'round',
                    join: 'round',
                });
            }
        }
    }
}
