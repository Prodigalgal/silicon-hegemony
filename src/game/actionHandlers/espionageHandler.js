// src/game/actionHandlers/espionageHandler.js

import { COSTS, ESPIONAGE_SUBTYPES, INTRIGUE_CONSTANTS } from '../constants';
import { createDeterministicRandom } from './battleUtils';

export function handleScout(state, factionId, payload) {
    const { territory_id } = payload;
    const faction = state.factions[factionId];
    const territory = state.territories[territory_id];

    if (!territory) { state.log.unshift({ turn: state.turn, factionId, message: `侦察失败：无效的领土ID。` }); return; }
    if (territory.owner === factionId) { state.log.unshift({ turn: state.turn, factionId, message: `侦察失败：不能侦察自己的领土 ${territory_id}。` }); return; }
    if (faction.money < COSTS.SCOUT) { state.log.unshift({ turn: state.turn, factionId, message: `侦察失败：资金不足，需要 ${COSTS.SCOUT}。` }); return; }

    faction.money -= COSTS.SCOUT;
    if (!faction.scouted_territories) {
        faction.scouted_territories = [];
    }
    faction.scouted_territories.push(territory_id);
    state.log.unshift({ turn: state.turn, factionId, message: `已派出侦察兵前往 ${territory_id}。` });
}

export function handleEspionage(state, factionId, payload) {
    const { subtype, target_territory_id, target_faction_id } = payload;
    const actingFaction = state.factions[factionId];
    if (actingFaction.money < COSTS.ESPIONAGE) { state.log.unshift({ turn: state.turn, factionId, message: `间谍行动失败：资金不足。` }); return; }
    let targetFaction, targetTerritory;
    if (subtype === ESPIONAGE_SUBTYPES.STEAL_FUNDS) {
        targetFaction = state.factions[target_faction_id];
        if (!targetFaction) { state.log.unshift({ turn: state.turn, factionId, message: `间谍行动失败：无效的目标势力ID。` }); return; }
    } else {
        targetTerritory = state.territories[target_territory_id];
        if (!targetTerritory) { state.log.unshift({ turn: state.turn, factionId, message: `间谍行动失败：无效的目标领土ID。` }); return; }
        if (!targetTerritory.owner) { state.log.unshift({ turn: state.turn, factionId, message: `间谍行动失败：不能对中立领土执行此行动。` }); return; }
        targetFaction = state.factions[targetTerritory.owner];
    }
    if (targetFaction.id === factionId) { state.log.unshift({ turn: state.turn, factionId, message: `间谍行动失败：不能以自己为目标。` }); return; }
    actingFaction.money -= COSTS.ESPIONAGE;
    const targetFactionIdForPenalty = targetFaction.id;
    const successRate = INTRIGUE_CONSTANTS.ESPIONAGE_BASE_SUCCESS_RATE - (targetFaction.avgSatisfaction - 75) / 500;
    const finalSuccessRate = Math.max(0.1, Math.min(0.95, successRate));
    const seedString = `${state.turn}-${factionId}-${targetFactionIdForPenalty || target_territory_id}`;
    const seededRandom = createDeterministicRandom(seedString);
    const isSuccess = seededRandom() < finalSuccessRate;
    let message = `对 ${targetFaction.name} 发起了 ${subtype} 间谍行动...`;
    if (isSuccess) {
        message += ' 行动成功！';
        switch (subtype) {
            case ESPIONAGE_SUBTYPES.SABOTAGE: targetTerritory.sabotaged_turns = (targetTerritory.sabotaged_turns || 0) + 3; message += ` ${target_territory_id} 的工厂将在未来3回合内停止运作。`; break;
            case ESPIONAGE_SUBTYPES.INCITE_UNREST: targetTerritory.satisfaction = Math.max(0, targetTerritory.satisfaction - 30); message += ` ${target_territory_id} 的民心大幅下降。`; break;
            case ESPIONAGE_SUBTYPES.STEAL_FUNDS: { const stolenAmount = Math.floor(targetFaction.money * 0.1); targetFaction.money -= stolenAmount; actingFaction.money += stolenAmount; message += ` 成功窃取了 ${stolenAmount} 资金。`; break; }
        }
    } else {
        message += ' 行动失败并被发现！';
        if (!state.diplomaticTies[factionId]) state.diplomaticTies[factionId] = {};
        if (!state.diplomaticTies[targetFactionIdForPenalty]) state.diplomaticTies[targetFactionIdForPenalty] = {};
        delete state.diplomaticTies[factionId][targetFactionIdForPenalty];
        delete state.diplomaticTies[targetFactionIdForPenalty][factionId];
        actingFaction.reputation_penalty = { turns: 5, value: -10 };
        message += ` ${actingFaction.name} 的外交声誉受损。`;
    }
    state.log.unshift({ turn: state.turn, factionId, message });
}