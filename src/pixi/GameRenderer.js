/* src/pixi/GameRenderer.js */
import { Application, Container } from 'pixi.js';
import { COLORS } from './visualConstants';
import { CameraSystem } from './systems/CameraSystem';
import { GlobeLayer } from './layers/GlobeLayer';
import { GridLayer } from './layers/GridLayer';
import { TerritoryLayer } from './layers/TerritoryLayer';
import { BorderLayer } from './layers/BorderLayer';
import { LinkLayer } from './layers/LinkLayer';
import { IconLayer } from './layers/IconLayer';
import { AnimationLayer } from './layers/AnimationLayer';
import { WeatherLayer } from './layers/WeatherLayer';

export class GameRenderer {
    constructor(containerElement, dispatch, interactionOptions = {}) {
        this.app = new Application();
        this.containerElement = containerElement;
        this.dispatch = dispatch;
        this.interactionOptions = interactionOptions;

        this.isReady = false;
        this.isDestroyed = false;

        // 数据缓存
        this.geometry = null;
        this.pendingGameState = null;

        this._init().catch(err => console.error("[GameRenderer] Init failed:", err));
    }

    async _init() {
        const { width, height } = this.containerElement.getBoundingClientRect();
        await this.app.init({
            width, height, backgroundColor: COLORS.BACKGROUND, backgroundAlpha: 0,
            resolution: window.devicePixelRatio || 1, autoDensity: true, antialias: true
        });

        if (this.isDestroyed) { this.app.destroy(true); return; }
        this.containerElement.appendChild(this.app.canvas);

        // 根容器
        this.rootContainer = new Container();
        this.app.stage.addChild(this.rootContainer);

        // 初始化系统
        this.camera = new CameraSystem(this.app, this.rootContainer, () => {
            this.layers?.icon.update(this.gameState, this.mapMode); // 缩放后更新图标 LOD
        }, this.interactionOptions);

        // 初始化层级 (顺序很重要)
        this.layers = {
            globe: new GlobeLayer(this.app, this.rootContainer),
            grid: new GridLayer(this.app, this.rootContainer),
            territory: new TerritoryLayer(this.app, this.rootContainer, {
                onClick: (id) => {
                    if(!this.camera.hasDragged) this.onTerritoryClick?.(id);
                },
                onHover: (id, event) => {
                    this.onTerritoryHoverCallback?.(event, id);
                    // 这里我们可以优化：只通知 territory layer 高亮
                    this.layers.territory.update(this.gameState, this.mapMode, this.selectedTerritoryId);
                },
                onOut: (id) => {
                    this.onTerritoryOutCallback?.(id);
                    this.layers.territory.update(this.gameState, this.mapMode, this.selectedTerritoryId);
                },
                getIsDragged: () => this.camera.hasDragged
            }),
            link: new LinkLayer(this.app, this.rootContainer),
            border: new BorderLayer(this.app, this.rootContainer),
            animation: new AnimationLayer(this.app, this.rootContainer, (key) => this.onAnimationComplete?.(key)),
            icon: new IconLayer(this.app, this.rootContainer),
            weather: new WeatherLayer(this.app, this.app.stage) // Weather 在最上层，且不随地图缩放
        };

        this.app.ticker.add(this._tick.bind(this));
        this.camera.fitToScreen();
        this.isReady = true;

        if (this.geometry) this._applyGeometry(this.geometry);
        if (this.pendingGameState) {
            this._applyUpdate(this.pendingGameState.state, this.pendingGameState.mapMode, this.pendingGameState.selectedId);
            this.pendingGameState = null;
        }
    }

    // --- API ---

    setGeometry(geometryData) {
        this.geometry = geometryData;
        if (this.isReady) {
            this._applyGeometry(geometryData);
            if (this.gameState) {
                this._applyUpdate(this.gameState, this.mapMode, this.selectedTerritoryId);
            }
        }
    }

    update(gameState, mapMode, selectedTerritoryId) {
        if (!this.isReady) {
            this.pendingGameState = { state: gameState, mapMode, selectedId: selectedTerritoryId };
            return;
        }
        this._applyUpdate(gameState, mapMode, selectedTerritoryId);
    }

    setCallbacks(callbacks) {
        this.onTerritoryHoverCallback = callbacks.onTerritoryHover;
        this.onTerritoryOutCallback = callbacks.onTerritoryOut;
        this.onTerritoryClick = callbacks.onTerritoryClick;
        this.onAnimationComplete = callbacks.onAnimationComplete;
    }

    destroy() {
        this.isDestroyed = true;
        this.camera?.destroy();
        // Layers destroy logic if needed
        if (this.app && this.app.renderer) {
            this.app.destroy(true, { children: true, texture: true, baseTexture: true });
        }
    }

    resize(width, height) {
        if (!this.isReady) return;
        this.app.renderer.resize(width, height);
        this.layers.grid.update(null, this.mapMode); // Redraw grid
        this.camera.fitToScreen();
    }

    // --- Internal ---

    _applyGeometry(geometryData) {
        this.layers.globe.setGeometry(geometryData.globe);
        this.layers.grid.setGeometry(geometryData.territories);
        this.layers.territory.setGeometry(geometryData.territories);
        this.layers.link.setGeometry(geometryData.territories);
        this.layers.border.setGeometry(geometryData);
        this.layers.animation.setGeometry?.(geometryData.territories);
        this.layers.icon.setGeometry(geometryData.territories);
        this.layers.weather.setGeometry?.(geometryData.territories);
    }

    _applyUpdate(gameState, mapMode, selectedTerritoryId) {
        this.gameState = gameState;
        this.mapMode = mapMode;
        this.selectedTerritoryId = selectedTerritoryId;
        const isInteracting = Boolean(this.geometry?.meta?.isInteracting);

        // 分发更新
        this.layers.globe.update(gameState, mapMode);
        this.layers.grid.update(gameState, mapMode);
        this.layers.territory.setInteractionEnabled(!isInteracting);
        this.layers.territory.update(gameState, mapMode, selectedTerritoryId);
        this.layers.link.container.visible = !isInteracting;
        this.layers.icon.container.visible = !isInteracting;

        if (!isInteracting) {
            this.layers.link.update(gameState, mapMode);
            this.layers.icon.update(gameState, mapMode);
        }

        this.layers.border.update(gameState, mapMode);
        this.layers.animation.update(gameState);
        this.layers.weather.update(gameState);
    }

    _tick() {
        if (!this.isReady) return;
        const now = Date.now();
        this.layers.animation.tick(now);
        this.layers.weather.tick(now);
    }
}
