/**
 * @file store.js
 * @description 配置并导出Redux store。
 * 这是整个应用状态管理的中心枢纽。
 */
import { configureStore } from '@reduxjs/toolkit';
import gameReducer from './gameSlice';
import historyReducer from './historySlice';
import roomReducer from './roomSlice';
import userReducer from './userSlice';
import uiReducer from './uiSlice';

export const store = configureStore({
    // 将所有的slice reducer合并到根reducer中
    reducer: {
        game: gameReducer,
        history: historyReducer,
        room: roomReducer,
        user: userReducer,
        ui: uiReducer,
    },
});