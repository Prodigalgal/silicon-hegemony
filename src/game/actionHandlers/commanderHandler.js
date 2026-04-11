/**
 * @file commanderHandler.js
 * @description [v1.5] 处理将领招募与调动。
 */

import { COSTS, GENERAL_TRAITS } from '../constants.js';
import { createDeterministicRandom } from './battleUtils.js';

function generateGeneralName() {
    const names = ["Smith", "Patton", "Zhukov", "Rommel", "Eisenhower", "MacArthur", "Montgomery", "Guderian", "Lee", "Grant"];
    // 简单随机
    return names[Math.floor(Math.random() * names.length)] + "-" + Math.floor(Math.random()*100);
}

export function handleRecruitGeneral(state, factionId, payload) {
    const { territory_id } = payload;
    const faction = state.factions[factionId];
    const territory = state.territories[territory_id];

    if (!territory || territory.owner !== factionId) {
        state.log.unshift({ turn: state.turn.number, factionId, message: `招募将领失败：无效的领土。` });
        return;
    }

    if (territory.generalId) {
        state.log.unshift({ turn: state.turn.number, factionId, message: `招募将领失败：该地已有将领驻扎。` });
        return;
    }

    // 精英统治减免
    let cost = COSTS.RECRUIT_GENERAL;
    if (faction.doctrine === 'TECHNOCRACY' && faction.techLevel >= 1) {
        cost = Math.floor(cost * 0.85);
    }

    if (faction.money < cost) {
        state.log.unshift({ turn: state.turn.number, factionId, message: `招募将领失败：资金不足 (需要 ${cost})。` });
        return;
    }

    faction.money -= cost;

    // 随机特质
    const traitKeys = Object.keys(GENERAL_TRAITS);
    const seedString = `${state.turn.number}-${factionId}-${territory_id}`;
    const rng = createDeterministicRandom(seedString);
    const traitKey = traitKeys[Math.floor(rng() * traitKeys.length)];
    const generalName = generateGeneralName();

    const newGeneral = {
        id: `gen_${factionId}_${Date.now()}`,
        name: generalName,
        trait: traitKey,
        location: territory_id,
        status: 'ACTIVE'
    };

    faction.generals.push(newGeneral);
    territory.generalId = newGeneral.id;

    state.log.unshift({ turn: state.turn.number, factionId, message: `新将领 ${newGeneral.name} (${GENERAL_TRAITS[traitKey].name}) 已在 ${territory_id} 就职。` });
}

export function handleMoveGeneral(state, factionId, payload) {
    const { general_id, to_territory_id } = payload;
    const faction = state.factions[factionId];

    const general = faction.generals.find(g => g.id === general_id);
    if (!general) {
        state.log.unshift({ turn: state.turn.number, factionId, message: `调动失败：找不到该将领。` });
        return;
    }

    const targetTerritory = state.territories[to_territory_id];
    if (!targetTerritory || targetTerritory.owner !== factionId) {
        state.log.unshift({ turn: state.turn.number, factionId, message: `调动失败：目标领土无效或非己方控制。` });
        return;
    }

    if (targetTerritory.generalId) {
        state.log.unshift({ turn: state.turn.number, factionId, message: `调动失败：目标领土已有将领。` });
        return;
    }

    // 清除旧位置引用
    const oldTerritory = state.territories[general.location];
    if (oldTerritory && oldTerritory.generalId === general.id) {
        oldTerritory.generalId = null;
    }

    general.location = to_territory_id;
    targetTerritory.generalId = general.id;

    state.log.unshift({ turn: state.turn.number, factionId, message: `将领 ${general.name} 已转移至 ${to_territory_id}。` });
}
