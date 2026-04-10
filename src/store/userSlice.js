/**
 * @file userSlice.js
 * @description Redux slice 用于管理当前用户（玩家）的状态。
 * 主要用于在线游戏模式，追踪用户的会话ID和昵称。
 */
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    id: null, // 将由WebSocket会话ID填充
    name: "玩家" + Math.floor(Math.random() * 1000), // 提供一个随机的默认名
};

const userSlice = createSlice({
    name: 'user',
    initialState,
    reducers: {
        // 当连接到服务器并获取到会话ID时调用
        setUserInfo: (state, action) => {
            state.id = action.payload.id;
            if (action.payload.name) {
                state.name = action.payload.name;
            }
        },
        // 允许用户在主菜单更改自己的昵称
        setName: (state, action) => {
            state.name = action.payload;
        },
        // 重置用户状态
        resetUser: () => initialState,
    }
});

export const { setUserInfo, setName, resetUser } = userSlice.actions;
export const selectUser = state => state.user;
export default userSlice.reducer;