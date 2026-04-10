/**
 * @file GameClient.js
 * @description 定义了游戏客户端的抽象基类（接口）。
 * 规定了所有具体客户端（如LocalGameClient, OnlineGameClient）必须实现的方法，
 * 从而允许上层逻辑（如GameLoopController）以统一的方式与不同游戏模式进行交互。
 */

export class GameClient {
    constructor(dispatch, getState) {
        if (this.constructor === GameClient) {
            throw new Error("抽象类 'GameClient' 不能被直接实例化。");
        }
        this.dispatch = dispatch;
        this.getState = getState;
    }

    /**
     * 设置AI配置，通常包含API密钥等敏感信息。
     * @param {object} configs - AI配置对象。
     */
    setAiConfigurations(_configs) {
        throw new Error("方法 'setAiConfigurations()' 必须被实现。");
    }

    /**
     * 开始一局新游戏。
     * @param {object} setupConfig - 游戏设置，如势力配置。
     */
    startGame(_setupConfig) {
        throw new Error("方法 'startGame()' 必须被实现。");
    }

    /**
     * 重置当前游戏。
     */
    resetGame() {
        throw new Error("方法 'resetGame()' 必须被实现。");
    }

    /**
     * 设置模拟速度（主要影响AI回合间的延迟）。
     * @param {number} speed - 延迟时间（毫秒）。
     */
    setSimulationSpeed(_speed) {
        throw new Error("方法 'setSimulationSpeed()' 必须被实现。");
    }

    /**
     * 处理下一个回合，对于AI是生成决策，对于玩家则是等待输入。
     * @param {string} factionId - 当前活动势力的ID。
     * @param {object} gameState - 当前的游戏状态。
     */
    processNextTurn(_factionId, _gameState) {
        throw new Error("方法 'processNextTurn()' 必须被实现。");
    }

    /**
     * [新增] 结束指定势力的回合。
     * 这个方法被 GameLoopController 调用，因此必须是接口的一部分。
     * @param {string} factionId - 结束回合的势力ID。
     */
    completeTurn(_factionId) {
        throw new Error("方法 'completeTurn()' 必须被实现。");
    }
}
