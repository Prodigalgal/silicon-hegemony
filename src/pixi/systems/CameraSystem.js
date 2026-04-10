/* src/pixi/systems/CameraSystem.js */
import { SVG_VIEWBOX_WIDTH, SVG_VIEWBOX_HEIGHT, ZOOM_MIN, ZOOM_MAX } from '../visualConstants';

export class CameraSystem {
    constructor(app, rootContainer, onUpdate) {
        this.app = app;
        this.rootContainer = rootContainer;
        this.onUpdate = onUpdate; // 回调，用于通知外部重绘 (LOD)

        this.isDragging = false;
        this.lastPos = { x: 0, y: 0 };
        this.hasDragged = false;

        this._bindEvents();
    }

    fitToScreen() {
        const { width, height } = this.app.screen;
        const scale = Math.min(width / SVG_VIEWBOX_WIDTH, height / SVG_VIEWBOX_HEIGHT) * 0.9;
        this.rootContainer.scale.set(scale);
        this.rootContainer.x = (width - SVG_VIEWBOX_WIDTH * scale) / 2;
        this.rootContainer.y = (height - SVG_VIEWBOX_HEIGHT * scale) / 2;
        if (this.onUpdate) this.onUpdate();
    }

    _bindEvents() {
        this.app.canvas.addEventListener('wheel', this._onWheel.bind(this), { passive: false });
        this.app.canvas.addEventListener('pointerdown', this._onPointerDown.bind(this));

        this._boundMove = this._onPointerMove.bind(this);
        this._boundUp = this._onPointerUp.bind(this);
        window.addEventListener('pointermove', this._boundMove);
        window.addEventListener('pointerup', this._boundUp);
    }

    destroy() {
        window.removeEventListener('pointermove', this._boundMove);
        window.removeEventListener('pointerup', this._boundUp);
    }

    _onWheel(e) {
        e.preventDefault();
        const scaleFactor = 1.1;
        const direction = e.deltaY > 0 ? 1 / scaleFactor : scaleFactor;

        const worldPos = this.rootContainer.toLocal({x: e.clientX, y: e.clientY});
        let newScale = this.rootContainer.scale.x * direction;
        newScale = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, newScale));

        this.rootContainer.scale.set(newScale);
        const newScreenPos = this.rootContainer.toGlobal(worldPos);
        this.rootContainer.x -= (newScreenPos.x - e.clientX);
        this.rootContainer.y -= (newScreenPos.y - e.clientY);

        if (this.onUpdate) this.onUpdate();
    }

    _onPointerDown(e) {
        if (e.button === 0) {
            this.isDragging = true;
            this.hasDragged = false;
            this.lastPos = { x: e.clientX, y: e.clientY };
        }
    }

    _onPointerMove(e) {
        if (this.isDragging) {
            const dx = e.clientX - this.lastPos.x;
            const dy = e.clientY - this.lastPos.y;
            if (Math.abs(dx) > 2 || Math.abs(dy) > 2) this.hasDragged = true;
            this.rootContainer.x += dx;
            this.rootContainer.y += dy;
            this.lastPos = { x: e.clientX, y: e.clientY };
        }
    }

    _onPointerUp() {
        this.isDragging = false;
    }
}