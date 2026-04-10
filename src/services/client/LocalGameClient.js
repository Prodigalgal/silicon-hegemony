/**
 * @file LocalGameClient.js
 * @description GameClient的本地实现, 包含日志以区分其操作。
 */

import { GameClient } from './GameClient';
// [修改] 导入新的 Thunks 和 Actions
import { startGame as startGameThunk, endTurn as endTurnThunk, resetGame as resetGameAction } from '../../store/gameSlice';
import { AIServiceController } from '../AIServiceController.js';

export class LocalGameClient extends GameClient {

    constructor(dispatch, getState) {
        super(dispatch, getState);
        // 在客户端初始化时，也初始化AI服务控制器
        AIServiceController.init({ dispatch, getState });
        console.log("[日志][LocalClient] 本地游戏客户端已初始化。");
    }

    setAiConfigurations(configs) {
        console.log("[日志][LocalClient] 正在设置AI配置。");
        AIServiceController.setAiConfigurations(configs);
    }

    startGame(setupConfig) {
        console.log("[日志][LocalClient] 正在派发 startGame Thunk...");
        this.dispatch(startGameThunk(setupConfig));
    }

    resetGame() {
        console.log("[日志][LocalClient] 正在派发 resetGame Action...");
        this.dispatch(resetGameAction());
    }

    setSimulationSpeed(speed) {
        console.log(`[日志][LocalClient] 模拟速度已请求设置为 ${speed}。(由GameLoopController的状态变化驱动)`);
    }

    /**
     * @override
     * 对于本地客户端，处理下一回合意味着调用AI服务为AI生成决策。
     */
    processNextTurn(factionId, gameState) {
        const currentFaction = gameState?.factions[factionId];
        // 只为AI势力自动处理回合
        if(gameState.gameStatus === 'awaiting_ai_input' && currentFaction && !currentFaction.isHuman) {
            console.log(`[日志][LocalClient] 轮到本地AI ${currentFaction.name}，正在调用AIServiceController...`);
            AIServiceController.generateTurn(factionId, gameState);
        }
    }

    /**
     * @override
     * 通过派发endTurn Thunk来结束回合。
     */
    completeTurn(factionId) {
        console.log(`[日志][LocalClient] 正在为势力 ${factionId} 派发 endTurn Thunk...`);
        this.dispatch(endTurnThunk(factionId));
    }
}