import { Sprite, Texture } from 'pixi.js';
import { BaseLayer } from './BaseLayer';

const GLOBE_PADDING = 28;

export class GlobeLayer extends BaseLayer {
    constructor(app, rootContainer) {
        super(app, rootContainer);
        this.sprite = new Sprite();
        this.sprite.anchor.set(0.5);
        this.container.addChild(this.sprite);

        this.globe = null;
        this.currentMapMode = null;
        this.textureCache = new Map();
        this.lastCacheKey = null;
    }

    setGeometry(globeData) {
        this.globe = globeData;
        this._applyTexture(this.currentMapMode);
    }

    update(_gameState, mapMode) {
        if (this.currentMapMode === mapMode) {
            return;
        }

        this.currentMapMode = mapMode;
        this._applyTexture(mapMode);
    }

    destroy() {
        this.textureCache.forEach((texture) => texture.destroy(true));
        this.textureCache.clear();
        super.destroy();
    }

    _applyTexture(mapMode = 'POLITICAL') {
        if (!this.globe) {
            return;
        }

        const { center, radius } = this.globe;
        const resolution = Math.min(window.devicePixelRatio || 1, 2);
        const logicalSize = Math.ceil((radius + GLOBE_PADDING) * 2);
        const cacheKey = `${mapMode}-${Math.round(radius)}-${resolution}`;

        if (!this.textureCache.has(cacheKey)) {
            this.textureCache.set(cacheKey, createGlobeTexture(logicalSize, mapMode, resolution));
        }

        if (this.lastCacheKey && this.lastCacheKey !== cacheKey) {
            this.sprite.texture = Texture.EMPTY;
        }

        this.lastCacheKey = cacheKey;
        this.sprite.texture = this.textureCache.get(cacheKey);
        this.sprite.x = center.x;
        this.sprite.y = center.y;
        this.sprite.width = logicalSize;
        this.sprite.height = logicalSize;
    }
}

function createGlobeTexture(logicalSize, mapMode, resolution) {
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(logicalSize * resolution);
    canvas.height = Math.ceil(logicalSize * resolution);

    const context = canvas.getContext('2d');
    if (!context) {
        throw new Error('无法创建 globe canvas context。');
    }

    context.scale(resolution, resolution);

    const isCyber = mapMode === 'CYBER';
    const center = logicalSize / 2;
    const radius = logicalSize / 2 - GLOBE_PADDING;

    const outerGlow = context.createRadialGradient(center, center, radius * 0.9, center, center, radius + 22);
    outerGlow.addColorStop(0, isCyber ? 'rgba(16, 58, 96, 0.00)' : 'rgba(46, 94, 142, 0.00)');
    outerGlow.addColorStop(1, isCyber ? 'rgba(27, 214, 255, 0.18)' : 'rgba(124, 174, 232, 0.12)');
    context.fillStyle = outerGlow;
    context.beginPath();
    context.arc(center, center, radius + 24, 0, Math.PI * 2);
    context.fill();

    context.strokeStyle = isCyber ? 'rgba(27, 214, 255, 0.28)' : 'rgba(127, 201, 255, 0.22)';
    context.lineWidth = 3;
    context.beginPath();
    context.arc(center, center, radius + 6, 0, Math.PI * 2);
    context.stroke();

    const sphereGradient = context.createRadialGradient(
        center - radius * 0.26,
        center - radius * 0.32,
        radius * 0.12,
        center,
        center,
        radius,
    );
    sphereGradient.addColorStop(0, isCyber ? 'rgba(14, 39, 63, 0.98)' : 'rgba(16, 30, 48, 0.98)');
    sphereGradient.addColorStop(0.52, isCyber ? 'rgba(7, 20, 33, 0.98)' : 'rgba(9, 17, 29, 0.98)');
    sphereGradient.addColorStop(1, isCyber ? 'rgba(3, 10, 18, 0.98)' : 'rgba(5, 10, 18, 0.98)');
    context.fillStyle = sphereGradient;
    context.beginPath();
    context.arc(center, center, radius, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = isCyber ? 'rgba(255, 255, 255, 0.045)' : 'rgba(255, 255, 255, 0.06)';
    drawEllipse(context, center - radius * 0.16, center - radius * 0.22, radius * 0.72, radius * 0.5);

    context.fillStyle = isCyber ? 'rgba(0, 0, 0, 0.14)' : 'rgba(0, 0, 0, 0.18)';
    drawEllipse(context, center + radius * 0.22, center + radius * 0.28, radius * 0.9, radius * 0.62);

    return Texture.from(canvas);
}

function drawEllipse(context, centerX, centerY, radiusX, radiusY) {
    context.beginPath();
    context.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
    context.fill();
}
