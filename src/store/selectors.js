/**
 * @file selectors.js
 * @description [v1.6] 增加 CYBER 模式渲染逻辑。
 */

import { createSelector } from '@reduxjs/toolkit';
import { getVisibleTerritoryIds } from '../game/mapUtils';

const selectGameSlice = (state) => state.game;
const selectRoomSlice = (state) => state.room;

export const selectGameData = createSelector(
    [selectGameSlice],
    (game) => game.game
);

export const selectAnimationQueue = createSelector(
    [selectGameSlice],
    (game) => game.animationQueue
);

export const selectMapMode = createSelector(
    [selectGameSlice],
    (game) => game.mapMode || 'POLITICAL'
);

export const selectCurrentFaction = createSelector(
    [selectGameData],
    (gameData) => {
        if (!gameData || !gameData.activeFactionId || !gameData.factions) {
            return null;
        }
        return gameData.factions[gameData.activeFactionId] || null;
    }
);

export const selectFactionById = (state, factionId) =>
    selectGameData(state)?.factions?.[factionId] || null;

export const selectAiConfigById = (state, factionId) =>
    selectRoomSlice(state)?.factionsConfig?.[factionId] || null;

export const selectControlledTerritories = createSelector(
    [
        (state) => selectGameData(state)?.territories,
        (state, factionId) => factionId,
    ],
    (territories, factionId) => {
        if (!territories || !factionId) return [];
        return Object.values(territories).filter(t => t.owner === factionId);
    }
);

export const selectFactionStats = createSelector(
    [selectControlledTerritories],
    (controlledTerritories) => {
        if (!controlledTerritories) return { totalSupply: 0, territoryCount: 0, totalFactories: 0 };
        const stats = controlledTerritories.reduce((acc, t) => {
            acc.totalSupply += (t.supply || 0);
            acc.totalFactories += (t.factories || 0);
            return acc;
        }, {
            totalSupply: 0,
            territoryCount: controlledTerritories.length,
            totalFactories: 0,
        });
        return stats;
    }
);

export const selectVisibleTerritoryIds = createSelector(
    [
        (state) => selectGameData(state)?.territories,
        (state) => selectGameData(state)?.factions
    ],
    (territories, factions) => {
        if (!factions || !territories) return new Set();
        const humanFaction = Object.values(factions).find(f => f.isHuman);
        if (humanFaction) {
            return getVisibleTerritoryIds(humanFaction.id, territories, humanFaction.scouted_territories);
        } else {
            return new Set(Object.keys(territories));
        }
    }
);

export const selectTerritoryVisuals = createSelector(
    [
        (state) => selectGameData(state)?.territories,
        (state) => selectGameData(state)?.factions,
        selectMapMode,
        selectVisibleTerritoryIds
    ],
    (territories, factions, mapMode, visibleIds) => {
        const visuals = {};
        if (!territories || !factions) return visuals;

        Object.keys(territories).forEach(id => {
            const t = territories[id];
            const isVisible = visibleIds.has(id);
            const owner = t.owner ? factions[t.owner] : null;

            let fill = 0x222222;
            let alpha = 0.8;
            let stroke = 0x000000;
            let strokeWidth = 1;

            if (isVisible) {
                switch (mapMode) {
                    case 'SUPPLY':
                        if (t.has_supply_shortage) {
                            fill = 0xff0000;
                            alpha = 0.6;
                        } else if (t.is_supplied) {
                            fill = 0x4CAF50;
                            alpha = 0.4 + Math.min(0.5, (t.supply || 0) / 200);
                        } else {
                            fill = 0x555555;
                            alpha = 0.4;
                        }
                        break;

                    case 'ECONOMIC': {
                        const moneyVal = t.money_yield || 0;
                        const ecoIntensity = Math.min(1, moneyVal / 150);
                        fill = owner ? parseInt(owner.color.replace('#', '0x'), 16) : 0x555555;
                        alpha = 0.2 + ecoIntensity * 0.8;
                        break;
                    }

                    case 'MILITARY': {
                        const armySize = t.army.regulars + t.army.militia;
                        if (armySize > 0) {
                            const armyIntensity = Math.min(1, armySize / 20000);
                            fill = 0xf44336;
                            alpha = 0.3 + armyIntensity * 0.7;
                        } else {
                            fill = 0x333333;
                            alpha = 0.3;
                        }
                        if (owner) stroke = parseInt(owner.color.replace('#', '0x'), 16);
                        break;
                    }

                    case 'CYBER': { // [v1.6]
                        if (t.server_node_level > 0) {
                            // 节点等级越高，蓝色越亮
                            const intensity = t.server_node_level / 3; // 0.33, 0.66, 1.0
                            fill = 0x2196F3;
                            alpha = 0.3 + intensity * 0.6;
                            stroke = 0x00FFFF; // 霓虹蓝边框
                            strokeWidth = 2;
                        } else {
                            fill = 0x101010; // 暗黑背景
                            alpha = 0.8;
                        }
                        break;
                    }

                    case 'POLITICAL':
                    default:
                        fill = owner ? parseInt(owner.color.replace('#', '0x'), 16) : 0x555555;
                        alpha = owner ? 0.5 + (t.satisfaction / 100) * 0.5 : 0.4;
                        break;
                }
                // 悬停高亮由 Sprite 组件处理
                if (mapMode !== 'CYBER') strokeWidth = 1.5;
            } else {
                fill = 0x111111;
                alpha = 0.9;
                stroke = 0x333333;
            }

            visuals[id] = { fill, alpha, stroke, strokeWidth, isVisible };
        });
        return visuals;
    }
);
