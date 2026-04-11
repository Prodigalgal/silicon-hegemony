/**
 * @file GameEngine.js
 * @description 游戏的核心逻辑引擎。
 * [v1.4] 增加了动态 AP 成本计算逻辑，以支持地形对移动成本的影响。
 */

import {
    ACTION_POINT_COSTS,
    BASE_ACTION_POINTS,
    ACTION_TYPES,
    TERRAIN_TYPES // [v1.4]
} from '../game/constants.js';
import { actionHandlers, handleDiplomaticResponses } from '../game/actionHandlers/index.js';
import { processEndOfTurn } from '../game/turnProcessor.js';
import { calculateFactionTotals } from '../game/utils.js';
import { actionValidationRules } from '../game/actionValidation.js';

export class GameEngine {

    /**
     * [v1.4 新增] 计算行动的动态 AP 成本
     */
    _calculateActionCost(action, territories) {
        const baseCost = ACTION_POINT_COSTS[action.type] || 0;

        // 移动类行动受地形影响
        if (action.type === ACTION_TYPES.MOVE || action.type === ACTION_TYPES.MOVE_SUPPLY || action.type === ACTION_TYPES.ATTACK) {
            // 如果是攻击，成本通常不随地形变（那是战斗力的事），但我们可以设定山地攻击更累。
            // 暂时只对 MOVE 和 MOVE_SUPPLY 增加地形成本。
            if (action.type !== ACTION_TYPES.ATTACK && action.to_territory_id && territories[action.to_territory_id]) {
                const targetTerrain = territories[action.to_territory_id].terrain || 'PLAINS';
                const terrainCost = TERRAIN_TYPES[targetTerrain]?.move_cost || 1;
                // 基础 1 AP + (地形成本 - 1) -> 平原=1, 山地=2
                return Math.max(1, terrainCost);
            }
        }
        return baseCost;
    }

    processTurnForFaction(currentState, payload) {
        const state = structuredClone(currentState);

        const { actions, justification, diplomatic_responses, factionId, long_term_goal, short_term_objective } = payload;
        const faction = state.factions[factionId];

        if (!faction) {
            console.error(`[错误][GameEngine] 无法处理回合，因为找不到势力ID: ${factionId}`);
            return state;
        }

        console.log(`[日志][GameEngine] 开始为势力 ${faction.name} (ID: ${factionId}) 处理回合。`);

        if (!faction.isHuman) {
            this._handleAIIntel(state, factionId, actions, justification, long_term_goal, short_term_objective);
            handleDiplomaticResponses(state, factionId, diplomatic_responses);
        }

        if (actions) {
            console.log(`[日志][GameEngine] ${faction.name} 计划执行 ${actions.length} 个行动。`);
            for (const [index, act] of actions.entries()) {
                // [v1.4] 使用动态成本计算
                const cost = this._calculateActionCost(act, state.territories);

                if (faction.actionPoints < cost) {
                    const message = `行动 ${act.type} 因AP不足而跳过 (需要 ${cost}, 拥有 ${faction.actionPoints})。`;
                    console.warn(`[警告][GameEngine] ${message}`);
                    state.log.unshift({ turn: state.turn.number, factionId, message });
                    continue;
                }

                const validator = actionValidationRules[act.type];
                const validationError = validator ? validator(act, { territories: state.territories }) : null;

                if (validationError) {
                    // 惩罚：非法行动消耗固定 1 AP
                    faction.actionPoints -= 1;
                    const message = `[${faction.name}] 的行动 ${act.type} 失败: ${validationError}。被惩罚扣除 1 AP。`;
                    console.warn(`[警告][GameEngine] ${message}`);
                    state.log.unshift({ turn: state.turn.number, factionId, message });
                    continue;
                }

                console.log(`[日志][GameEngine] 正在执行行动 #${index + 1}: ${act.type} (消耗 ${cost} AP)`);
                faction.actionPoints -= cost;
                if (actionHandlers[act.type]) {
                    actionHandlers[act.type](state, factionId, act);
                }
                this._queueAnimation(state, factionId, act, index);
            }
        }

        state.turn.phase = 'actions_executed';
        return state;
    }

    completeTurnForFaction(currentState, completedFactionId) {
        const state = structuredClone(currentState);
        console.log(`[日志][GameEngine] 开始完成势力 ${completedFactionId} 的回合...`);
        this._updateFactionTotals(state, completedFactionId);
        this._checkForEliminatedFactions(state);

        if (this._checkWinCondition(state)) {
            console.log(`[日志][GameEngine] 检测到胜利条件达成。游戏结束。`);
            return state;
        }

        const nextFactionId = this._determineNextFaction(state, completedFactionId);
        console.log(`[日志][GameEngine] 下一个行动的势力是: ${nextFactionId}`);

        if (this._isNewTurnCycle(state, completedFactionId, nextFactionId)) {
            console.log(`[日志][GameEngine] 一个大回合已结束，开始进行回合结束结算...`);
            processEndOfTurn(state);
            console.log(`[日志][GameEngine] 回合结束结算完成。`);
        }

        return this.prepareTurn(state, nextFactionId);
    }

    prepareTurn(currentState, factionId) {
        const state = structuredClone(currentState);
        if (!state.factions[factionId]) {
            console.error(`[错误][GameEngine] 无法准备回合，因为找不到势力ID: ${factionId}`);
            return state;
        }

        const faction = state.factions[factionId];
        console.log(`[日志][GameEngine] 正在为 ${faction.name} (ID: ${factionId}) 准备新回合。`);

        state.activeFactionId = factionId;
        state.turn.factionId = factionId;
        state.turn.phase = 'planning';

        const numTerritories = Object.values(state.territories).filter(t => t.owner === factionId).length;
        faction.actionPoints = BASE_ACTION_POINTS + Math.floor(numTerritories / 5);
        const logMessage = `${faction.name} 开始回合, 获得 ${faction.actionPoints} AP。`;
        state.log.unshift({ turn: state.turn.number, factionId, message: logMessage });
        console.log(`[日志][GameEngine] ${logMessage}`);

        if (faction.isHuman) {
            state.gameStatus = 'awaiting_human_input';
        } else {
            state.gameStatus = 'awaiting_ai_input';
        }
        console.log(`[日志][GameEngine] 游戏状态已设置为: ${state.gameStatus}`);
        return state;
    }

    _handleAIIntel(state, factionId, actions, justification, long_term_goal, short_term_objective) {
        const faction = state.factions[factionId];
        let primaryIntent = 'neutral';
        if (actions && actions.length > 0) {
            if (actions.some(a => a.type === 'ATTACK')) primaryIntent = 'aggressive';
            else if (actions.some(a => a.type === 'BUILD_FACTORY' || a.type === 'PROPOSE_TRADE_AGREEMENT')) primaryIntent = 'economic';
            else if (actions.some(a => a.type === 'PROPAGANDA' || a.type === 'LOBBYING')) primaryIntent = 'populist';
            else if (actions.some(a => a.type === 'BUILD_FORTIFICATION' || a.type === 'ESPIONAGE')) primaryIntent = 'scheming';
        }

        const aiJustification = justification || "AI未提供决策理由。";
        state.thoughtBubble = { factionId, text: aiJustification, intent: primaryIntent };
        state.log.unshift({ turn: state.turn.number, factionId, message: `[${faction.name}] 报告: "${aiJustification}"`});
        console.log(`[日志][GameEngine] AI ${faction.name} 决策理由: "${aiJustification}"`);

        if (long_term_goal) faction.longTermGoal = long_term_goal;
        if (short_term_objective) faction.shortTermObjective = short_term_objective;
        faction.scouted_territories = [];
    }

    _queueAnimation(state, factionId, act, index) {
        let animationPayload = { type: act.type, factionId, key: `${state.turn.number}-${factionId}-${index}-${Date.now()}` };

        if (act.type === ACTION_TYPES.ATTACK || act.type === ACTION_TYPES.MOVE || act.type === ACTION_TYPES.MOVE_SUPPLY) {
            animationPayload.from = act.from_territory_id;
            animationPayload.to = act.to_territory_id;
        } else if ([
            ACTION_TYPES.RECRUIT, ACTION_TYPES.BUILD_FACTORY, ACTION_TYPES.BUILD_FORTIFICATION,
            ACTION_TYPES.BUILD_PROPAGANDA_TOWER, ACTION_TYPES.PROPAGANDA, ACTION_TYPES.SCOUT,
            ACTION_TYPES.LOBBYING, ACTION_TYPES.ESPIONAGE, ACTION_TYPES.BUILD_CIVILIAN_FACTORY,
            ACTION_TYPES.BUILD_SUPPLY_DEPOT
        ].includes(act.type)) {
            animationPayload.target = act.territory_id || act.target_territory_id;
            if (act.type === ACTION_TYPES.SCOUT) {
                const homeTerritory = Object.values(state.territories).find(t => t.owner === factionId && t.is_capital) || Object.values(state.territories).find(t => t.owner === factionId);
                if (homeTerritory) animationPayload.from = homeTerritory.id;
            }
        }

        if (animationPayload.from || animationPayload.target) {
            state.animationQueue.push(animationPayload);
        }
    }

    _updateFactionTotals(state, factionId) {
        const faction = state.factions[factionId];
        if (faction) {
            const { totalArmy, totalPopulation } = calculateFactionTotals(factionId, state.territories);
            faction.totalArmy = totalArmy;
            faction.totalPopulation = totalPopulation;
            console.log(`[日志][GameEngine] 已更新势力 ${faction.name} 的总数: 军队=${totalArmy.regulars + totalArmy.militia}, 人口=${totalPopulation}`);
        }
    }

    _checkForEliminatedFactions(state) {
        const currentFactionKeys = Object.keys(state.factions);
        currentFactionKeys.forEach(id => {
            if (!Object.values(state.territories).some(t => t.owner === id)) {
                const factionName = state.factions[id].name;
                delete state.factions[id];
                const message = `${factionName} 已被消灭！`;
                state.log.unshift({ turn: state.turn.number, message });
                console.log(`[日志][GameEngine] ${message}`);
            }
        });
    }

    _checkWinCondition(state) {
        const aliveFactionIds = Object.keys(state.factions);
        if (aliveFactionIds.length <= 1) {
            state.gameStatus = 'finished';
            state.winner = aliveFactionIds.length === 1 ? state.factions[aliveFactionIds[0]] : null;
            const message = state.winner ? `胜利! ${state.winner.name} 征服了全境！` : `僵局! 所有派系都被消灭了。`;
            state.log.unshift({ turn: state.turn.number, message });
            state.thoughtBubble = null;
            return true;
        }
        return false;
    }

    _determineNextFaction(state, completedFactionId) {
        const aliveFactionIds = Object.keys(state.factions).sort();
        const currentIndex = aliveFactionIds.indexOf(completedFactionId);
        if(currentIndex === -1) {
            return aliveFactionIds[0];
        }
        const nextIndex = (currentIndex + 1) % aliveFactionIds.length;
        return aliveFactionIds[nextIndex];
    }

    _isNewTurnCycle(state, completedFactionId, nextFactionId) {
        const aliveFactionIds = Object.keys(state.factions).sort();
        return aliveFactionIds.indexOf(nextFactionId) === 0;
    }
}
