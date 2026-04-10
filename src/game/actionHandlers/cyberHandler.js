/**
 * @file cyberHandler.js
 * @description [v1.6] 处理赛博网络攻击。
 */

import { COSTS, ACTION_TYPES } from '../constants';
import { createDeterministicRandom } from './battleUtils';

export function handleCyberAttack(state, factionId, payload) {
    const { type, target_territory_id, target_faction_id } = payload;
    const faction = state.factions[factionId];

    // 1. 成本检查
    let cpCost = 0;
    if (type === ACTION_TYPES.CYBER_ATTACK_BLACKOUT) cpCost = COSTS.CYBER_BLACKOUT;
    if (type === ACTION_TYPES.CYBER_ATTACK_HEIST) cpCost = COSTS.CYBER_HEIST;
    if (type === ACTION_TYPES.CYBER_ATTACK_DEEPFAKE) cpCost = COSTS.CYBER_DEEPFAKE;

    if (faction.computing_power < cpCost) {
        state.log.unshift({ turn: state.turn.number, factionId, message: `赛博攻击失败：算力不足 (需要 ${cpCost} CP)。` });
        return;
    }

    faction.computing_power -= cpCost;

    // 2. 执行逻辑
    if (type === ACTION_TYPES.CYBER_ATTACK_BLACKOUT) {
        const territory = state.territories[target_territory_id];
        if (!territory) {
            state.log.unshift({ turn: state.turn.number, factionId, message: `攻击无效：目标领土不存在。` });
            return;
        }
        // 停电：设置标记，回合结算时或移动时检查
        territory.is_blackout = true;
        state.log.unshift({ turn: state.turn.number, factionId, message: `黑客攻击成功！${target_territory_id} 发生大规模停电，防御系统瘫痪。` });
    }
    else if (type === ACTION_TYPES.CYBER_ATTACK_HEIST) {
        const targetFaction = state.factions[target_faction_id];
        if (!targetFaction) {
            state.log.unshift({ turn: state.turn.number, factionId, message: `攻击无效：目标势力不存在。` });
            return;
        }

        // 成功率计算 (基于算力差或固定概率)
        const seed = `${state.turn.number}-${factionId}-${target_faction_id}`;
        const rng = createDeterministicRandom(seed);

        if (rng() > 0.4) { // 60% 成功率
            const stolen = Math.floor(targetFaction.money * 0.2);
            targetFaction.money -= stolen;
            faction.money += stolen;
            state.log.unshift({ turn: state.turn.number, factionId, message: `数字劫掠成功！从 ${targetFaction.name} 窃取了 ${stolen} 金钱。` });
        } else {
            state.log.unshift({ turn: state.turn.number, factionId, message: `数字劫掠失败！攻击被 ${targetFaction.name} 的防火墙拦截。` });
        }
    }
    else if (type === ACTION_TYPES.CYBER_ATTACK_DEEPFAKE) {
        const territory = state.territories[target_territory_id];
        if (!territory || !territory.owner || territory.owner === factionId) {
            state.log.unshift({ turn: state.turn.number, factionId, message: `攻击无效：目标领土不合法。` });
            return;
        }

        // 深伪：极低概率直接让领土中立化 (引发暴乱)
        // 成功率受满意度影响：满意度越低越容易成功
        const baseChance = 0.3;
        const satisfactionMod = (100 - territory.satisfaction) / 200; // 50 sat -> +0.25 chance
        const finalChance = baseChance + satisfactionMod;

        const seed = `${state.turn.number}-${factionId}-${target_territory_id}-deepfake`;
        const rng = createDeterministicRandom(seed);

        if (rng() < finalChance) {
            const oldOwner = territory.owner;
            territory.owner = null;
            territory.satisfaction = 20; // 暴乱后满意度极低
            territory.army.regulars = 0; // 驻军瓦解或撤离
            state.log.unshift({ turn: state.turn.number, factionId, message: `深伪攻击引发了 ${target_territory_id} 的全面暴动！领土已脱离 ${state.factions[oldOwner].name} 的控制。` });
        } else {
            state.log.unshift({ turn: state.turn.number, factionId, message: `针对 ${target_territory_id} 的深伪攻击未能引发足够的不满。` });
        }
    }
}