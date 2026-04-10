/* src/pixi/layers/BaseLayer.js */
import { Container } from 'pixi.js';

export class BaseLayer {
    constructor(app, rootContainer) {
        this.app = app;
        this.container = new Container(); // 每个层都有自己的容器
        rootContainer.addChild(this.container);
    }

    /**
     * 当几何数据更新时调用 (通常只在初始化时)
     * @param {object} geometryData
     */
    setGeometry(_geometryData) {}

    /**
     * 当游戏状态或显示模式更新时调用
     * @param {object} gameState
     * @param {string} mapMode
     * @param {string} selectedTerritoryId
     */
    update(_gameState, _mapMode, _selectedTerritoryId) {}

    /**
     * 每一帧调用 (用于动画)
     * @param {number} now 当前时间戳
     */
    tick(_now) {}

    /**
     * 销毁层级资源
     */
    destroy() {
        this.container.destroy({ children: true });
    }
}
