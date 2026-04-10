/* src/pixi/layers/GridLayer.js */
import { Graphics } from 'pixi.js';
import { BaseLayer } from './BaseLayer';
import { COLORS } from '../visualConstants';

export class GridLayer extends BaseLayer {
    constructor(app, rootContainer) {
        super(app, rootContainer);
        this.graphics = new Graphics();
        this.container.addChild(this.graphics);
    }

    update(gameState, mapMode) {
        const g = this.graphics;
        g.clear();

        if (mapMode === 'CYBER') {
            const w = 2000;
            const h = 1500;
            const step = 50;
            g.rect(-w, -h, w*2, h*2).fill({ color: COLORS.CYBER_BG });
            g.beginPath();
            for (let x = -w; x < w; x += step) g.moveTo(x, -h).lineTo(x, h);
            for (let y = -h; y < h; y += step) g.moveTo(-w, y).lineTo(w, y);
            g.stroke({ width: 1, color: COLORS.CYBER_GRID, alpha: 0.15 });
        } else {
            g.rect(-5000, -5000, 10000, 10000).fill({ color: COLORS.BACKGROUND });
        }
    }
}