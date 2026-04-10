/**
 * @file roomSlice.js
 * @description Redux slice 用于管理在线游戏房间的状态。
 * 追踪房间信息、玩家列表、势力配置和准备状态。
 */
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    isConnected: false,    // WebSocket连接状态
    roomId: null,
    roomName: "",
    hostPlayerId: null,
    players: [],           // { id, name, factionId, isReady }
    factionsConfig: {},    // { faction_1: {...}, faction_2: {...} }
    connectionStatus: 'idle', // 'idle', 'joining', 'in_lobby', 'error'
};

const roomSlice = createSlice({
    name: 'room',
    initialState,
    reducers: {
        setConnected: (state, action) => {
            state.isConnected = action.payload;
            state.connectionStatus = action.payload ? 'in_lobby' : 'idle';
        },
        // 用从服务器收到的完整大厅状态更新store
        setLobbyState: (state, action) => {
            const { hostPlayerId, players, factionsConfig, roomId, roomName } = action.payload;
            if(hostPlayerId !== undefined) state.hostPlayerId = hostPlayerId;
            if(players !== undefined) state.players = players;
            if(factionsConfig !== undefined) state.factionsConfig = factionsConfig;
            if(roomId !== undefined) state.roomId = roomId;
            if(roomName !== undefined) state.roomName = roomName;
        },
        // 离开或断开连接时重置房间状态
        resetRoom: () => initialState,
    }
});

export const { setConnected, setLobbyState, resetRoom } = roomSlice.actions;
export const selectRoom = state => state.room;
export default roomSlice.reducer;