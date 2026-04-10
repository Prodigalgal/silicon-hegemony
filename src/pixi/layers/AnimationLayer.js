/* src/pixi/layers/AnimationLayer.js */
import { Graphics } from 'pixi.js';
import { BaseLayer } from './BaseLayer';
import { getQuadraticBezierPoint, getQuadraticBezierAngle, getControlPoint } from '../mathUtils';

const ANIMATION_DURATION = 1500; // 毫秒
const FADE_DURATION = 500; // 到达后淡出时间

export class AnimationLayer extends BaseLayer {
    constructor(app, rootContainer, onComplete) {
        super(app, rootContainer);
        this.onComplete = onComplete;
        this.activeAnimations = [];
        this.graphics = new Graphics();
        this.container.addChild(this.graphics);

        // [Feature 2] 历史记录锁：防止动画重复播放
        // 即使 Redux 状态中的队列尚未清理，这里也会拦截
        this.completedKeys = new Set();
    }

    update(gameState) {
        const { animationQueue } = gameState;

        // 1. 筛选出真正的新动画：
        //    - 不在当前活跃列表中
        //    - 不在已完成历史记录中
        const newAnims = animationQueue.filter(q =>
            !this.activeAnimations.some(a => a.key === q.key) &&
            !this.completedKeys.has(q.key)
        );

        newAnims.forEach(anim => {
            let start = null, end = null;
            if (anim.from && this.geometry[anim.from]) start = this.geometry[anim.from].center;
            if (anim.to && this.geometry[anim.to]) end = this.geometry[anim.to].center;

            // 对于原地动画
            if (anim.target && this.geometry[anim.target]) {
                start = this.geometry[anim.target].center;
                end = start;
            }

            if (start && end) {
                const curveIntensity = anim.type === 'ATTACK' ? 0.25 : 0.15;
                const controlPoint = getControlPoint(start, end, curveIntensity);

                this.activeAnimations.push({
                    ...anim,
                    startTime: Date.now(),
                    totalDuration: ANIMATION_DURATION + FADE_DURATION,
                    p0: start,
                    p1: controlPoint,
                    p2: end,
                    color: anim.type === 'ATTACK' ? 0xFF1744 : 0x00E5FF,
                    isStatic: (start === end)
                });
            } else {
                // [防御性编程] 如果找不到坐标，直接标记为完成，避免堵塞 Redux 队列
                this.completedKeys.add(anim.key);
                this.onComplete?.(anim.key);
            }
        });
    }

    tick(now) {
        const g = this.graphics;
        g.clear();

        // 过滤活跃动画
        this.activeAnimations = this.activeAnimations.filter(anim => {
            const elapsed = now - anim.startTime;

            // 阶段 1: 生长 (Grow)
            if (elapsed <= ANIMATION_DURATION) {
                const progress = elapsed / ANIMATION_DURATION;
                const t = 1 - Math.pow(1 - progress, 3); // Ease Out Cubic

                if (anim.isStatic) {
                    this._drawStaticEffect(g, anim, t, 1.0);
                } else {
                    this._drawTacticalArrow(g, anim, t, 1.0);
                }
                return true;
            }
            // 阶段 2: 停留与淡出 (Fade)
            else if (elapsed <= anim.totalDuration) {
                const fadeProgress = (elapsed - ANIMATION_DURATION) / FADE_DURATION;
                const alpha = 1 - fadeProgress;

                if (anim.isStatic) {
                    this._drawStaticEffect(g, anim, 1, alpha);
                } else {
                    this._drawTacticalArrow(g, anim, 1, alpha);
                    this._drawImpact(g, anim.p2, anim.color, fadeProgress);
                }
                return true;
            }
            // 阶段 3: 完成 (Destroy)
            else {
                // [Feature 2] 标记为永久完成
                this.completedKeys.add(anim.key);
                // 通知 Redux 清理队列
                this.onComplete?.(anim.key);
                return false; // 从 activeAnimations 移除
            }
        });
    }

    // ... (绘图方法 _drawTacticalArrow, _drawImpact, _drawStaticEffect 保持不变，与 v3.0 一致)
    // 为节省篇幅，此处省略具体绘图代码，请确保保留 mathUtils 和 visualConstants 的引用
    _drawTacticalArrow(g, anim, t, alpha) {
        const { p0, p1, p2, color, type } = anim;
        const width = type === 'ATTACK' ? 12 : 8;
        const arrowHeadSize = width * 2.5;
        const tip = getQuadraticBezierPoint(t, p0, p1, p2);
        const angle = getQuadraticBezierAngle(t, p0, p1, p2);
        const segments = 20 * t;
        g.moveTo(p0.x, p0.y);
        g.stroke({ width: width, color: color, alpha: alpha * 0.8, cap: 'round', join: 'round' });
        for (let i = 1; i <= segments; i++) {
            const subT = (i / 20);
            if (subT > t) break;
            const p = getQuadraticBezierPoint(subT, p0, p1, p2);
            g.lineTo(p.x, p.y);
        }
        g.lineTo(tip.x, tip.y);
        g.stroke({ width: width, color: color, alpha: alpha * 0.8 });

        if (t > 0.05) {
            g.beginPath();
            const headTipX = tip.x + Math.cos(angle) * arrowHeadSize * 0.2;
            const headTipY = tip.y + Math.sin(angle) * arrowHeadSize * 0.2;
            const baseCenterX = tip.x - Math.cos(angle) * arrowHeadSize * 0.8;
            const baseCenterY = tip.y - Math.sin(angle) * arrowHeadSize * 0.8;
            const wing1X = baseCenterX + Math.cos(angle + Math.PI / 2) * (width * 1.5);
            const wing1Y = baseCenterY + Math.sin(angle + Math.PI / 2) * (width * 1.5);
            const wing2X = baseCenterX + Math.cos(angle - Math.PI / 2) * (width * 1.5);
            const wing2Y = baseCenterY + Math.sin(angle - Math.PI / 2) * (width * 1.5);
            g.moveTo(headTipX, headTipY);
            g.lineTo(wing1X, wing1Y);
            g.lineTo(wing2X, wing2Y);
            g.closePath();
            g.fill({ color: color, alpha: alpha });
            g.beginPath();
            g.moveTo(headTipX, headTipY);
            g.lineTo((wing1X+baseCenterX)/2, (wing1Y+baseCenterY)/2);
            g.stroke({ width: 2, color: 0xFFFFFF, alpha: alpha * 0.5 });
        }
    }
    _drawImpact(g, pos, color, progress) {
        const radius = 30 * progress;
        g.circle(pos.x, pos.y, radius);
        g.stroke({ width: 3 * (1-progress), color: color, alpha: 1-progress });
    }
    _drawStaticEffect(g, anim, t, alpha) {
        const { p0, color } = anim;
        const radius = 20 * t;
        g.circle(p0.x, p0.y, radius);
        g.stroke({ width: 2, color: color, alpha: alpha });
        g.circle(p0.x, p0.y, radius * 0.5);
        g.fill({ color: color, alpha: alpha * 0.3 });
    }
    setGeometry(geometryData) { this.geometry = geometryData; }
}
