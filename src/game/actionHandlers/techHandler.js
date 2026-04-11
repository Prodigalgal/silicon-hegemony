/**
 * @file techHandler.js
 * @description [v1.5] 处理科技树相关的行动。
 */

import { COSTS, TECH_DOCTRINES } from '../constants.js';

export function handleChooseDoctrine(state, factionId, payload) {
    const { doctrine } = payload;
    const faction = state.factions[factionId];

    if (faction.doctrine) {
        state.log.unshift({ turn: state.turn.number, factionId, message: `政策选择失败：你已经选择了 ${TECH_DOCTRINES[faction.doctrine].name}。` });
        return;
    }

    if (!TECH_DOCTRINES[doctrine]) {
        state.log.unshift({ turn: state.turn.number, factionId, message: `政策选择失败：无效的路线 ${doctrine}。` });
        return;
    }

    faction.doctrine = doctrine;
    faction.techLevel = 0;
    state.log.unshift({ turn: state.turn.number, factionId, message: `确立了国家战略：${TECH_DOCTRINES[doctrine].name}。` });
}

export function handleResearchDoctrine(state, factionId, _payload) {
    const faction = state.factions[factionId];

    if (!faction.doctrine) {
        state.log.unshift({ turn: state.turn.number, factionId, message: `研发失败：尚未选择战略路线。` });
        return;
    }

    const doctrineConfig = TECH_DOCTRINES[faction.doctrine];
    const nextLevel = faction.techLevel + 1;

    if (nextLevel > doctrineConfig.levels.length) {
        state.log.unshift({ turn: state.turn.number, factionId, message: `研发失败：已达到科技树顶峰。` });
        return;
    }

    // 成本随等级递增：1000, 2000, 3000...
    // 精英统治(TECHNOCRACY) 等级1 特性：科研成本 -15%
    let cost = COSTS.DOCTRINE_LEVEL_BASE * nextLevel;
    if (faction.doctrine === 'TECHNOCRACY' && faction.techLevel >= 1) {
        cost = Math.floor(cost * 0.85);
    }

    if (faction.money < cost) {
        state.log.unshift({ turn: state.turn.number, factionId, message: `研发失败：资金不足 (需要 ${cost})。` });
        return;
    }

    faction.money -= cost;
    faction.techLevel = nextLevel;

    const levelInfo = doctrineConfig.levels[nextLevel - 1];
    state.log.unshift({ turn: state.turn.number, factionId, message: `科技突破！${levelInfo.name} 已完成。效果：${levelInfo.effect}` });
}
