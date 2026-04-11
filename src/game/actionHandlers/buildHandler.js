/**
 * @file buildHandler.js
 * @description 包含了所有与“建造”相关的行动处理器。
 * 通过一个通用的建造函数来减少重复代码。
 */

import { COSTS } from '../../game/constants.js';

/**
 * 通用的建造/升级逻辑处理器。
 * @param {object} state - 游戏状态。
 * @param {string} factionId - 执行行动的派系ID。
 * @param {object} payload - 行动参数，必须包含 territory_id。
 * @param {string} actionType - 建造的行动类型 (用于日志)。
 * @param {number} cost - 建造所需的金钱。
 * @param {function} updateTerritory - 一个用于更新领土属性的函数。
 * @param {string} successMessage - 成功后记录到日志的消息。
 */
function handleBuildAction(state, factionId, payload, actionType, cost, updateTerritory, successMessage) {
    const { territory_id } = payload;
    const faction = state.factions[factionId];
    const territory = state.territories[territory_id];

    // --- 前置条件检查 ---
    if (!territory) {
        state.log.unshift({ turn: state.turn.number, factionId, message: `${actionType} 失败：无效的领土ID。` });
        return;
    }
    if (territory.owner !== factionId) {
        state.log.unshift({ turn: state.turn.number, factionId, message: `${actionType} 失败：不能在不属于你的领土 ${territory_id} 上执行此行动。` });
        return;
    }
    if (faction.money < cost) {
        state.log.unshift({ turn: state.turn.number, factionId, message: `${actionType} 失败：资金不足，需要 ${cost}。` });
        return;
    }

    // --- 执行行动 ---
    faction.money -= cost;
    updateTerritory(territory);

    // 记录成功日志
    state.log.unshift({ turn: state.turn.number, factionId, message: successMessage });
}

// --- 导出的具体行动处理器 ---

export const handleBuildFactory = (state, factionId, payload) =>
    handleBuildAction(state, factionId, payload, 'BUILD_FACTORY', COSTS.BUILD_FACTORY,
        (t) => { t.factories = (t.factories || 0) + 1; },
        `在 ${payload.territory_id} 建造了一座军事工厂。`);

export const handleBuildCivilianFactory = (state, factionId, payload) =>
    handleBuildAction(state, factionId, payload, 'BUILD_CIVILIAN_FACTORY', COSTS.BUILD_CIVILIAN_FACTORY,
        (t) => { t.civilian_factories = (t.civilian_factories || 0) + 1; },
        `在 ${payload.territory_id} 建造了一座民用工厂。`);

export const handleBuildFortification = (state, factionId, payload) =>
    handleBuildAction(state, factionId, payload, 'BUILD_FORTIFICATION', COSTS.BUILD_FORTIFICATION,
        (t) => { t.fort_level = (t.fort_level || 0) + 1; },
        `在 ${payload.territory_id} 升级了防御工事。`);

export const handleBuildPropagandaTower = (state, factionId, payload) =>
    handleBuildAction(state, factionId, payload, 'BUILD_PROPAGANDA_TOWER', COSTS.BUILD_PROPAGANDA_TOWER,
        (t) => { t.propaganda_towers = (t.propaganda_towers || 0) + 1; },
        `在 ${payload.territory_id} 建造了一座宣传塔。`);

export const handleBuildSupplyDepot = (state, factionId, payload) =>
    handleBuildAction(state, factionId, payload, 'BUILD_SUPPLY_DEPOT', COSTS.BUILD_SUPPLY_DEPOT,
        (t) => { t.supply_depots = (t.supply_depots || 0) + 1; },
        `在 ${payload.territory_id} 建造了一座补给站。`);
