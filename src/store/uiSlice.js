/**
 * @file uiSlice.js
 * @description Redux slice 用于管理全局UI状态。
 * 核心职责：
 * 1. 存储和管理全局错误信息。
 * 2. 存储和管理全局Snackbar（非阻塞通知）的状态。
 * 这样做可以将UI状态逻辑与业务逻辑（如gameSlice）分离开，提高代码的可维护性。
 */
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    // 用于存储全局性、阻塞性的错误信息。当它有值时，可以弹出一个对话框。
    globalError: null,
    // Snackbar状态，用于显示非阻塞式通知
    snackbar: {
        open: false,
        message: '',
        severity: 'info', // 'success', 'info', 'warning', 'error'
    },
};

const uiSlice = createSlice({
    name: 'ui',
    initialState,
    reducers: {
        // 设置全局错误信息
        setGlobalError: (state, action) => {
            state.globalError = action.payload;
        },
        // 清除全局错误信息
        clearGlobalError: (state) => {
            state.globalError = null;
        },
        // 显示一个Snackbar通知
        showSnackbar: (state, action) => {
            console.log(`[日志][uiSlice] 准备显示Snackbar: severity=${action.payload.severity}, message=${action.payload.message}`);
            state.snackbar.open = true;
            state.snackbar.message = action.payload.message;
            state.snackbar.severity = action.payload.severity || 'info'; // 默认为'info'级别
        },
        // 关闭当前的Snackbar
        closeSnackbar: (state) => {
            console.log("[日志][uiSlice] 关闭Snackbar。");
            state.snackbar.open = false;
        },
    },
});

// 导出actions，以便在其他地方（如组件或thunks中）派发
export const { setGlobalError, clearGlobalError, showSnackbar, closeSnackbar } = uiSlice.actions;

// 导出一个基础选择器，用于在组件中访问UI状态
export const selectUi = (state) => state.ui;

export default uiSlice.reducer;