/* src/pixi/layers/WeatherLayer.js */
import { Graphics } from 'pixi.js';
import { BaseLayer } from './BaseLayer';

export class WeatherLayer extends BaseLayer {
    constructor(app, stage) {
        // 注意：WeatherLayer 直接挂在 stage 而非 rootContainer，因为它不随地图缩放
        super(app, stage);
        this.graphics = new Graphics();
        this.container.addChild(this.graphics);
        this.particles = [];
    }

    update(gameState) {
        this.currentSeason = gameState.turn?.season;
    }

    tick(_now) {
        const season = this.currentSeason;
        const isSnow = (season === 3);
        const isRain = (season === 0 || season === 2);
        const wg = this.graphics;
        wg.clear();

        if (isSnow || isRain) {
            const w = this.app.screen.width;
            const h = this.app.screen.height;
            const targetCount = isSnow ? 150 : 80;

            while(this.particles.length < targetCount) {
                this.particles.push({
                    x: Math.random() * w,
                    y: Math.random() * h,
                    vx: (Math.random() - 0.5) * (isSnow?1:0),
                    vy: isSnow ? (0.5+Math.random()) : (5+Math.random()*5),
                    size: isSnow ? (1+Math.random()*2) : 1,
                    alpha: Math.random()
                });
            }

            this.particles.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;
                if (p.y > h) { p.y = -10; p.x = Math.random() * w; }

                if(isSnow) {
                    wg.circle(p.x, p.y, p.size).fill({ color: 0xffffff, alpha: p.alpha * 0.6 });
                } else {
                    wg.moveTo(p.x, p.y).lineTo(p.x, p.y+5).stroke({ width: 1, color: 0xaaaaff, alpha: p.alpha * 0.4 });
                }
            });
        } else {
            this.particles = [];
        }
    }
}
