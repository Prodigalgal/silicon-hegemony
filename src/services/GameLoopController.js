/**
 * @file src/services/GameLoopController.js
 * @description (修复) 控制器现在严格遵守全局 isPaused 状态，实现游戏流的暂停。
 */

import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useGameClient } from '../hooks/useGameClient';
import { selectGameData, selectCurrentFaction, selectAnimationQueue } from '../store/selectors';

const GameLoopController = () => {
    const gameData = useSelector(selectGameData);
    const currentFaction = useSelector(selectCurrentFaction);
    const animationQueue = useSelector(selectAnimationQueue);
    const isPaused = useSelector(state => state.game.isPaused); // [新增] 获取暂停状态
    const gameClient = useGameClient();

    // Effect 1: 触发AI行动
    useEffect(() => {
        if (!gameData || !currentFaction || !gameClient) return;

        // [核心修复] 如果游戏暂停，直接阻断 AI 逻辑触发
        if (isPaused) {
            return;
        }

        const isAITurn = !currentFaction.isHuman;

        // 条件：是AI回合、游戏状态是等待AI输入、回合阶段是'planning'
        if (isAITurn && gameData.gameStatus === 'awaiting_ai_input' && gameData.turn.phase === 'planning') {
            gameClient.processNextTurn(gameData.activeFactionId, gameData);
        }
    }, [gameData, currentFaction, gameClient, isPaused]); // 添加 isPaused 为依赖

    // Effect 2: 在动画播放完毕后，正式结束回合
    useEffect(() => {
        if (!gameData || !currentFaction || !gameClient) return;

        // 条件：回合阶段是'actions_executed' 且 动画队列为空
        if (gameData.turn.phase === 'actions_executed' && animationQueue.length === 0) {
            gameClient.completeTurn(gameData.activeFactionId);
        }
    }, [gameData, animationQueue, currentFaction, gameClient]);

    return null;
};

export default GameLoopController;