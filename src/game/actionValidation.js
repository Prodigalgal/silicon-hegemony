/**
 * @file actionValidation.js
 * @description [v1.6] 赛博行动验证。
 */

import { ACTION_TYPES, ESPIONAGE_SUBTYPES } from './constants';

export const actionValidationRules = {
    [ACTION_TYPES.ATTACK]: (params, context) => {
        if (!params.from_territory_id) return "必须选择出发地。";
        if (!params.to_territory_id) return "必须选择目的地。";

        const fromTerritory = context.territories[params.from_territory_id];
        if (!fromTerritory) return "出发地不存在。";

        const regulars = params.army_to_send?.regulars || 0;
        const militia = params.army_to_send?.militia || 0;

        if (regulars + militia <= 0) return "必须至少派遣1名士兵。";
        if (regulars > fromTerritory.army.regulars) return `正规军数量不足 (最多: ${fromTerritory.army.regulars})。`;
        if (militia > fromTerritory.army.militia) return `民兵数量不足 (最多: ${fromTerritory.army.militia})。`;

        return null;
    },

    [ACTION_TYPES.MOVE]: (params, context) => {
        if (!params.from_territory_id) return "必须选择出发地。";
        if (!params.to_territory_id) return "必须选择目的地。";
        if (!params.army_amount || params.army_amount <= 0) return "必须指定大于0的移动数量。";

        const fromTerritory = context.territories[params.from_territory_id];
        if (!fromTerritory) return "出发地不存在。";
        if (params.army_amount > fromTerritory.army.regulars) return `正规军数量不足 (最多: ${fromTerritory.army.regulars})。`;
        // [v1.6] 停电检查: 停电地区无法作为移动出发地
        if (fromTerritory.is_blackout) return `出发地 ${params.from_territory_id} 正处于停电状态，无法移动军队！`;

        return null;
    },

    [ACTION_TYPES.MOVE_SUPPLY]: (params, context) => {
        if (!params.from_territory_id) return "必须选择出发地。";
        if (!params.to_territory_id) return "必须选择目的地。";
        if (!params.supply_amount || params.supply_amount <= 0) return "必须指定大于0的补给数量。";

        const fromTerritory = context.territories[params.from_territory_id];
        if (!fromTerritory) return "出发地不存在。";
        if (params.supply_amount > fromTerritory.supply) return `补给数量不足 (最多: ${fromTerritory.supply})。`;

        return null;
    },

    [ACTION_TYPES.RECRUIT]: (params) => !params.territory_id ? "必须选择领土。" : null,
    [ACTION_TYPES.BUILD_FACTORY]: (params) => !params.territory_id ? "必须选择领土。" : null,
    [ACTION_TYPES.BUILD_CIVILIAN_FACTORY]: (params) => !params.territory_id ? "必须选择领土。" : null,
    [ACTION_TYPES.BUILD_FORTIFICATION]: (params) => !params.territory_id ? "必须选择领土。" : null,
    [ACTION_TYPES.BUILD_PROPAGANDA_TOWER]: (params) => !params.territory_id ? "必须选择领土。" : null,
    [ACTION_TYPES.BUILD_SUPPLY_DEPOT]: (params) => !params.territory_id ? "必须选择领土。" : null,
    [ACTION_TYPES.PROPAGANDA]: (params) => !params.territory_id ? "必须选择领土。" : null,
    [ACTION_TYPES.LOBBYING]: (params) => !params.territory_id ? "必须选择领土。" : null,
    [ACTION_TYPES.SCOUT]: (params) => !params.territory_id ? "必须选择领土。" : null,
    [ACTION_TYPES.SET_TAX_RATE]: (params) => !params.rate ? "必须选择税率。" : null,
    [ACTION_TYPES.PROPOSE_NON_AGGRESSION_PACT]: (params) => !params.to_faction_id ? "必须选择目标势力。" : null,
    [ACTION_TYPES.PROPOSE_TRADE_AGREEMENT]: (params) => !params.to_faction_id ? "必须选择目标势力。" : null,
    [ACTION_TYPES.ESPIONAGE]: (params) => {
        if (!params.subtype) return "必须选择间谍行动类型。";
        if (params.subtype === ESPIONAGE_SUBTYPES.STEAL_FUNDS) {
            if (!params.target_faction_id) return "必须选择目标势力。";
        } else {
            if (!params.target_territory_id) return "必须选择目标领土。";
        }
        return null;
    },
    [ACTION_TYPES.RESEARCH_ATTACK]: () => null,
    [ACTION_TYPES.CHOOSE_DOCTRINE]: (params) => !params.doctrine ? "必须选择一个路线。" : null,
    [ACTION_TYPES.RESEARCH_DOCTRINE]: () => null,
    [ACTION_TYPES.RECRUIT_GENERAL]: (params) => !params.territory_id ? "必须选择领土。" : null,
    [ACTION_TYPES.MOVE_GENERAL]: (params) => {
        if (!params.general_id) return "必须选择将领。";
        if (!params.to_territory_id) return "必须选择目的地。";
        return null;
    },

    // [v1.6] 赛博
    [ACTION_TYPES.CYBER_ATTACK_BLACKOUT]: (params) => !params.target_territory_id ? "必须选择目标领土。" : null,
    [ACTION_TYPES.CYBER_ATTACK_HEIST]: (params) => !params.target_faction_id ? "必须选择目标势力。" : null,
    [ACTION_TYPES.CYBER_ATTACK_DEEPFAKE]: (params) => !params.target_territory_id ? "必须选择目标领土。" : null,
};