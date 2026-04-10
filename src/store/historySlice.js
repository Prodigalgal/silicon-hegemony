/**
 * @file historySlice.js
 * @description Redux slice 用于管理游戏历史快照和回溯状态。
 */
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    snapshots: [],
    viewingTurn: -1,
};

const historySlice = createSlice({
    name: 'history',
    initialState,
    reducers: {
        addSnapshot: (state, action) => {
            console.log(`[日志][History] 添加回合 ${action.payload.turn.number} 的快照。`);
            state.snapshots.push(JSON.parse(JSON.stringify(action.payload)));
        },
        setViewingTurn: (state, action) => {
            const newTurnIndex = action.payload;
            if (newTurnIndex >= -1 && newTurnIndex < state.snapshots.length) {
                console.log(`[日志][History] 设置查看的回合索引为: ${newTurnIndex}`);
                state.viewingTurn = newTurnIndex;
            } else {
                console.warn(`[警告][History] 尝试设置无效的回合索引: ${newTurnIndex}。操作被忽略。`);
            }
        },
        resetHistory: (state) => {
            console.log("[日志][History] 重置历史记录。");
            Object.assign(state, initialState);
        },
    }
});

export const { addSnapshot, setViewingTurn, resetHistory } = historySlice.actions;
export const selectHistory = (state) => state.history;
export default historySlice.reducer;