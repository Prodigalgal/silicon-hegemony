/**
 * @file useGameSnapshots.js
 * @description 一个自定义Hook，负责在游戏状态推进时自动创建历史快照。
 */

import { useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { addSnapshot } from '../store/historySlice';
// [核心修正] 从正确的 'selectors.js' 文件导入，而不是 'gameSlice.js'
import { selectGameData } from '../store/selectors';

/**
 * 这是一个后台运行的Hook，它监听游戏状态，并在每个新回合开始时，
 * 自动将当前的游戏状态作为快照存入history slice中。
 */
export function useGameSnapshots() {
    const dispatch = useDispatch();
    const gameData = useSelector(selectGameData);
    const lastSnapshotTurnRef = useRef(-1);

    useEffect(() => {
        if (!gameData) return;

        const { gameStatus, turn } = gameData;
        const currentTurnNumber = turn.number;

        // 条件：游戏正在进行中，并且当前回合数大于最后一次快照的回合数
        const isActiveGame = gameStatus !== 'setup' && gameStatus !== 'finished';
        if (isActiveGame && currentTurnNumber > lastSnapshotTurnRef.current) {

            // 派发action，将当前完整的游戏状态添加到快照数组中
            dispatch(addSnapshot(gameData));

            // 更新ref以记录我们已经为这一回合创建了快照
            lastSnapshotTurnRef.current = currentTurnNumber;
        }
    }, [gameData, dispatch]); // 依赖项是整个gameData对象，因为它的任何变化都可能需要评估
}