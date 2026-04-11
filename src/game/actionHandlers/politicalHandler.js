// src/game/actionHandlers/politicalHandler.js

import { COSTS, PROPAGANDA_EFFECT, RECRUITMENT_POLICIES, BATTLE_CONSTANTS, RESEARCH_ATTACK_INCREMENT, INTRIGUE_CONSTANTS } from '../constants.js';
import { hasSupplyLine } from '../mapUtils.js';

export function handleRecruit(state, factionId, payload) {
    const { territory_id, policy } = payload;
    const territory = state.territories[territory_id];
    const faction = state.factions[factionId];
    const selectedPolicy = RECRUITMENT_POLICIES[policy];

    if (!selectedPolicy || !territory || territory.owner !== factionId) return;

    let reason = "";
    if (faction.money < selectedPolicy.cost) reason = "资金不足";
    else if (territory.satisfaction < selectedPolicy.threshold) reason = "民众支持度不足";

    if (reason) {
        state.log.unshift({ turn: state.turn, factionId, message: `在 ${territory_id} 执行 ${policy} 征兵失败：${reason}。` });
        return;
    }

    faction.money -= selectedPolicy.cost;
    let potentialRecruits = Math.floor(territory.population * selectedPolicy.yield_percent);

    const capital = Object.values(state.territories).find(t => t.owner === factionId && t.is_capital);
    const isSuppliedNow = capital ? hasSupplyLine(territory_id, capital.id, factionId, state.territories) : false;

    if (!isSuppliedNow) {
        potentialRecruits = Math.floor(potentialRecruits * (1 - BATTLE_CONSTANTS.UNSUPPLIED_RECRUIT_PENALTY));
        state.log.unshift({ turn: state.turn, factionId, message: `警告：${territory_id} 的补给线已断，征兵效率大幅降低！` });
    }

    const actualRecruits = Math.min(potentialRecruits, territory.population - 1);

    if (actualRecruits <= 0) {
        state.log.unshift({ turn: state.turn, factionId, message: `在 ${territory_id} 的征兵行动未能招募到任何士兵。` });
        return;
    }

    territory.population -= actualRecruits;
    territory.army.regulars += actualRecruits;
    territory.satisfaction = Math.max(0, territory.satisfaction + selectedPolicy.penalty);
    state.log.unshift({ turn: state.turn, factionId, message: `在 ${territory_id} 耗费 ${selectedPolicy.cost} 金钱招募了 ${actualRecruits} 正规军。` });
}

export function handlePropaganda(state, factionId, payload) {
    const { territory_id } = payload;
    const faction = state.factions[factionId];
    const territory = state.territories[territory_id];

    if (!territory) { state.log.unshift({ turn: state.turn, factionId, message: `宣传失败：无效的领土ID。` }); return; }
    if (territory.owner !== factionId) { state.log.unshift({ turn: state.turn, factionId, message: `宣传失败：不能在不属于你的领土上宣传。` }); return; }
    if (faction.money < COSTS.PROPAGANDA) { state.log.unshift({ turn: state.turn, factionId, message: `宣传失败：资金不足，需要 ${COSTS.PROPAGANDA}。` }); return; }

    faction.money -= COSTS.PROPAGANDA;
    territory.satisfaction += PROPAGANDA_EFFECT;
    state.log.unshift({ turn: state.turn, factionId, message: `在 ${territory_id} 进行了宣传。` });
}

export function handleLobbying(state, factionId, payload) {
    const { territory_id } = payload;
    const faction = state.factions[factionId];
    const territory = state.territories[territory_id];

    if (!territory) { state.log.unshift({ turn: state.turn, factionId, message: `游说失败：无效的领土ID。` }); return; }
    if (territory.owner !== factionId) { state.log.unshift({ turn: state.turn, factionId, message: `游说失败：不能在不属于你的领土上游说。` }); return; }
    if (faction.money < COSTS.LOBBYING) { state.log.unshift({ turn: state.turn, factionId, message: `游说失败：资金不足，需要 ${COSTS.LOBBYING}。` }); return; }

    faction.money -= COSTS.LOBBYING;
    const effect = INTRIGUE_CONSTANTS.LOBBYING_BASE_EFFECT * (1 - territory.lobbying_fatigue);
    territory.satisfaction += Math.round(effect);
    territory.lobbying_fatigue = Math.min(1, territory.lobbying_fatigue + INTRIGUE_CONSTANTS.LOBBYING_FATIGUE_GAIN);
    state.log.unshift({ turn: state.turn, factionId, message: `在 ${territory_id} 进行了游说, 满意度提升了 ${Math.round(effect)}。` });
}

export function handleSetTaxRate(state, factionId, payload) {
    const { rate } = payload;
    const faction = state.factions[factionId];
    if (!['LOW', 'MEDIUM', 'HIGH'].includes(rate)) {
        state.log.unshift({ turn: state.turn, factionId, message: `设置税率失败：无效的税率'${rate}'。`});
        return;
    }
    faction.tax_rate = rate;
    state.log.unshift({ turn: state.turn, factionId, message: `税率已调整为 ${rate}。` });
}

export function handleResearchAttack(state, factionId, _payload) {
    const faction = state.factions[factionId];
    const researchCost = Math.floor(COSTS.RESEARCH_ATTACK_BASE * (1 + faction.attack_bonus * 10));
    if (faction.money < researchCost) {
        state.log.unshift({ turn: state.turn, factionId, message: `研发失败：资金不足，需要 ${researchCost}。` });
        return;
    }
    faction.money -= researchCost;
    faction.attack_bonus += RESEARCH_ATTACK_INCREMENT;
    state.log.unshift({ turn: state.turn, factionId, message: `军事科技取得突破！全军永久攻击力提升至 +${(faction.attack_bonus * 100).toFixed(0)}%。` });
}
