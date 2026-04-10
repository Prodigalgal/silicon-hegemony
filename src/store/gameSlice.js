/**
 * @file src/store/gameSlice.js
 * @description (修复) 将默认 isPaused 设置为 false，游戏开局即运行。
 * [v1.3] 新增 mapMode 状态管理，支持多维度地图视图切换。
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { GameEngine } from '../engine/GameEngine';
import { getEngineInstance, setEngineInstance } from '../engine/engineInstance';
import { createInitialGameState } from '../game/utils';

setEngineInstance(new GameEngine());

const initialState = {
    game: null,
    isPaused: false, // [修复] 默认为 false，游戏默认继续
    // [v1.3] 地图显示模式: 'POLITICAL'(默认), 'SUPPLY', 'ECONOMIC', 'MILITARY'
    mapMode: 'POLITICAL',
    view: {
        selectedTerritory: null,
        highlightedTerritories: [],
    },
    animationQueue: [],
};

export const startGame = createAsyncThunk(
    'game/startGame',
    async (setupConfig, { rejectWithValue }) => {
        try {
            const engine = getEngineInstance();
            let newInitialState = createInitialGameState(setupConfig.factionsConfig);
            const finalState = engine.prepareTurn(newInitialState, 'faction_1');
            return finalState;
        } catch (error) {
            console.error("[错误][Thunk:startGame]", error);
            return rejectWithValue(error.message);
        }
    }
);

export const executeFactionTurn = createAsyncThunk(
    'game/executeFactionTurn',
    async (turnPayload, { getState, rejectWithValue }) => {
        if (turnPayload.isOnline) return turnPayload.payload;
        try {
            const engine = getEngineInstance();
            const currentState = getState().game.game;
            const newState = engine.processTurnForFaction(currentState, turnPayload);
            return newState;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

export const endTurn = createAsyncThunk(
    'game/endTurn',
    async (factionId, { getState, rejectWithValue }) => {
        try {
            const engine = getEngineInstance();
            const currentState = getState().game.game;
            const newState = engine.completeTurnForFaction(currentState, factionId);
            return newState;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

const gameSlice = createSlice({
    name: 'game',
    initialState,
    reducers: {
        gameStarted: (state, action) => {
            state.game = action.payload;
            state.animationQueue = action.payload.animationQueue || [];
            state.isPaused = false; // [修复] 确保重置后也是运行状态
            state.mapMode = 'POLITICAL'; // 重置地图模式
        },
        togglePause: (state) => {
            state.isPaused = !state.isPaused;
        },
        setPaused: (state, action) => {
            state.isPaused = action.payload;
        },
        // [v1.3] 设置地图显示模式
        setMapMode: (state, action) => {
            state.mapMode = action.payload;
        },
        prepareFactionTurn: (state, action) => {
            if (state.game) {
                const { factionId, actionPoints, logEntry } = action.payload;
                const faction = state.game.factions[factionId];
                if(faction) {
                    state.game.activeFactionId = factionId;
                    state.game.turn.factionId = factionId;
                    state.game.turn.phase = 'planning';
                    state.game.factions[factionId].actionPoints = actionPoints;
                    if(logEntry) state.game.log.unshift(logEntry);
                    if (faction.isHuman) {
                        state.game.gameStatus = 'awaiting_human_input';
                    } else {
                        state.game.gameStatus = 'awaiting_ai_input';
                    }
                }
            }
        },
        simulationSpeedChanged: (state, action) => {
            if (state.game) state.game.simulationSpeed = action.payload;
        },
        territorySelected: (state, action) => {
            state.view.selectedTerritory = action.payload;
        },
        highlightTerritories: (state, action) => {
            state.view.highlightedTerritories = action.payload;
        },
        animationCompleted: (state, action) => {
            if(Array.isArray(state.animationQueue)) {
                state.animationQueue = state.animationQueue.filter(anim => anim.key !== action.payload);
            }
        },
        resetGame: (state) => {
            setEngineInstance(new GameEngine());
            Object.assign(state, initialState);
            state.isPaused = false; // [修复] 重置后继续
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(startGame.fulfilled, (state, action) => {
                if (action.payload) {
                    state.game = action.payload;
                    state.animationQueue = action.payload.animationQueue || [];
                    state.isPaused = false; // [修复] 启动后继续
                }
            })
            .addCase(executeFactionTurn.fulfilled, (state, action) => {
                state.game = action.payload;
                state.animationQueue = action.payload.animationQueue || [];
            })
            .addCase(endTurn.fulfilled, (state, action) => {
                state.game = action.payload;
                state.animationQueue = action.payload.animationQueue || [];
            });
    },
});

export const {
    gameStarted,
    togglePause,
    setPaused,
    setMapMode, // [v1.3] 导出
    prepareFactionTurn,
    simulationSpeedChanged,
    territorySelected,
    highlightTerritories,
    animationCompleted,
    resetGame,
} = gameSlice.actions;

export default gameSlice.reducer;