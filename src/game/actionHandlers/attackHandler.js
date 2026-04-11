/**
 * @file attackHandler.js
 * @description 处理攻击行动的核心逻辑。
 * [v1.5] 集成科技 (Doctrines) 和指挥官 (Generals) 加成。
 */

import { getAdjacentTerritories } from '../mapUtils.js';
import {
    BATTLE_CONSTANTS,
    BATTLE_SATISFACTION_MODIFIERS,
    CONQUERED_SATISFACTION_START,
    PYRRHIC_VICTORY_LOSS_THRESHOLD,
    SUPPLY_CONSTANTS,
    TERRAIN_TYPES,
    GENERAL_TRAITS // [v1.5]
} from '../constants.js';
import { createDeterministicRandom, getBattleModifier, distributeLosses } from './battleUtils.js';

export function handleAttack(state, factionId, payload) {
    const { from_territory_id, to_territory_id, army_to_send } = payload;
    const attackerTerritory = state.territories[from_territory_id];
    const defenderTerritory = state.territories[to_territory_id];

    if (!attackerTerritory || !defenderTerritory) {
        state.log.unshift({ turn: state.turn.number, factionId, message: `攻击行动失败：无效的领土ID。` });
        return;
    }
    if (attackerTerritory.owner !== factionId) {
        state.log.unshift({ turn: state.turn.number, factionId, message: `攻击行动失败：不能从不属于你的领土 ${from_territory_id} 发起攻击。` });
        return;
    }
    if (attackerTerritory.owner === defenderTerritory.owner) {
        state.log.unshift({ turn: state.turn.number, factionId, message: `攻击行动失败：不能攻击自己的领土 ${to_territory_id}。` });
        return;
    }
    if (!getAdjacentTerritories(from_territory_id).includes(to_territory_id)) {
        state.log.unshift({ turn: state.turn.number, factionId, message: `攻击行动失败：领土 ${from_territory_id} 与 ${to_territory_id} 不相邻。` });
        return;
    }

    const sentRegulars = Math.max(0, Math.min(attackerTerritory.army.regulars, army_to_send?.regulars || 0));
    const sentMilitia = Math.max(0, Math.min(attackerTerritory.army.militia, army_to_send?.militia || 0));
    const attackingArmy = { regulars: sentRegulars, militia: sentMilitia };

    if (attackingArmy.regulars + attackingArmy.militia <= 0) {
        state.log.unshift({ turn: state.turn.number, factionId, message: `从 ${from_territory_id} 发起的攻击因未派出任何部队而取消。` });
        return;
    }

    attackerTerritory.army.regulars -= sentRegulars;
    attackerTerritory.army.militia -= sentMilitia;

    const attackerFaction = state.factions[factionId];
    const defenderFaction = defenderTerritory.owner ? state.factions[defenderTerritory.owner] : { name: "中立守军" };
    console.log(`[日志][AttackHandler] ${attackerFaction.name} 从 ${from_territory_id} 攻击位于 ${to_territory_id} 的 ${defenderFaction.name}。`);

    const battleReport = {
        type: 'BATTLE_REPORT',
        title: `战斗: ${attackerFaction.name} ⚔️ ${defenderFaction.name} @ ${to_territory_id}`,
        attacker: { id: factionId, name: attackerFaction.name, from: from_territory_id, army: { total: attackingArmy.regulars + attackingArmy.militia, regulars: attackingArmy.regulars, militia: attackingArmy.militia }, powerCalcs: [], rng: {}, finalPower: 0 },
        defender: { id: defenderTerritory.owner, name: defenderFaction.name, at: to_territory_id, army: { total: defenderTerritory.army.regulars + defenderTerritory.army.militia, regulars: defenderTerritory.army.regulars, militia: defenderTerritory.army.militia }, powerCalcs: [], rng: {}, finalPower: 0 },
        outcome: {}
    };

    // === [v1.5] 获取将领 ===
    const attackerGeneral = attackerTerritory.generalId ? attackerFaction.generals.find(g => g.id === attackerTerritory.generalId) : null;
    const defenderGeneral = defenderTerritory.generalId && defenderTerritory.owner ? state.factions[defenderTerritory.owner].generals.find(g => g.id === defenderTerritory.generalId) : null;

    if (attackerGeneral) battleReport.attacker.powerCalcs.push(`指挥官: ${attackerGeneral.name} (${GENERAL_TRAITS[attackerGeneral.trait].name})`);
    if (defenderGeneral) battleReport.defender.powerCalcs.push(`指挥官: ${defenderGeneral.name} (${GENERAL_TRAITS[defenderGeneral.trait].name})`);


    // === 攻击方计算 ===
    // [v1.5] 科技修正基础战斗力系数
    let atkRegMult = 1.0;
    let atkMilMult = BATTLE_CONSTANTS.MILITIA_POWER_MULTIPLIER;

    // 钢铁洪流 Level 2: 正规军 +15%, Level 4: +15%
    if (attackerFaction.doctrine === 'INDUSTRIAL_WARFARE') {
        if (attackerFaction.techLevel >= 2) atkRegMult += 0.15;
        if (attackerFaction.techLevel >= 4) atkRegMult += 0.15;
    }
    // 网络游击 Level 2: 民兵 +20%
    if (attackerFaction.doctrine === 'CYBER_INSURGENCY') {
        if (attackerFaction.techLevel >= 2) atkMilMult += 0.2;
    }
    // 精英统治 Level 4: 全体 +10%
    if (attackerFaction.doctrine === 'TECHNOCRACY' && attackerFaction.techLevel >= 4) {
        atkRegMult += 0.1;
        atkMilMult += 0.1; // Militia buffed slightly too
    }

    let attackerPower = (attackingArmy.regulars * atkRegMult + attackingArmy.militia * atkMilMult);
    battleReport.attacker.powerCalcs.push(`基础兵力(含科技修正): ${attackerPower.toFixed(0)}`);

    let moraleMultiplier = 1.0 + (attackerFaction.avgSatisfaction - BATTLE_CONSTANTS.MORALE_SATISFACTION_BASE) / BATTLE_CONSTANTS.MORALE_FORMULA_DIVISOR;
    attackerPower *= moraleMultiplier;
    battleReport.attacker.powerCalcs.push(`士气修正 (x${moraleMultiplier.toFixed(2)}): ${attackerPower.toFixed(0)}`);

    // 地形修正
    const targetTerrain = defenderTerritory.terrain || 'PLAINS';
    const terrainConfig = TERRAIN_TYPES[targetTerrain];
    if (terrainConfig.attack_mod !== 1.0) {
        attackerPower *= terrainConfig.attack_mod;
        battleReport.attacker.powerCalcs.push(`地形(${terrainConfig.name})修正 (x${terrainConfig.attack_mod}): ${attackerPower.toFixed(0)}`);
    }

    // [v1.5] 攻击方将领修正
    if (attackerGeneral) {
        if (attackerGeneral.trait === 'OFFENSIVE_EXPERT') {
            attackerPower *= 1.2;
            battleReport.attacker.powerCalcs.push(`将领特质(进攻专家) (x1.2): ${attackerPower.toFixed(0)}`);
        }
        if (attackerGeneral.trait === 'DESERT_FOX' && targetTerrain === 'DESERT') {
            attackerPower *= 1.3;
            battleReport.attacker.powerCalcs.push(`将领特质(沙漠之狐) (x1.3): ${attackerPower.toFixed(0)}`);
        }
        if (attackerGeneral.trait === 'MOUNTAIN_KING' && targetTerrain === 'MOUNTAIN') {
            attackerPower *= 1.3;
            battleReport.attacker.powerCalcs.push(`将领特质(山地之王) (x1.3): ${attackerPower.toFixed(0)}`);
        }
    }

    // [v1.5] 网络游击 Level 4: 敌方在己方领土作战减攻 (此处攻击方是进攻别人领土，不触发Defense Debuff)
    // 但如果防守方有 SYSTEM_OVERLOAD，攻击方会被削弱?
    // CYBER_INSURGENCY L4: "敌方在你的领土作战时攻击力 -20%" -> 这意味着如果我在防守，攻击我的敌人减攻。
    if (defenderFaction.doctrine === 'CYBER_INSURGENCY' && defenderFaction.techLevel >= 4) {
        attackerPower *= 0.8;
        battleReport.attacker.powerCalcs.push(`敌方黑客干扰 (系统过载) (x0.8): ${attackerPower.toFixed(0)}`);
    }

    if (attackerTerritory.has_supply_shortage) {
        attackerPower *= SUPPLY_CONSTANTS.NO_SUPPLY_PENALTY;
        battleReport.attacker.powerCalcs.push(`补给短缺 (x${SUPPLY_CONSTANTS.NO_SUPPLY_PENALTY}): ${attackerPower.toFixed(0)}`);
    }
    if (attackerFaction.attack_bonus > 0) {
        const bonus = 1 + attackerFaction.attack_bonus;
        attackerPower *= bonus;
        battleReport.attacker.powerCalcs.push(`旧科技加成 (x${bonus.toFixed(2)}): ${attackerPower.toFixed(0)}`);
    }

    // === 防御方计算 ===
    let defRegMult = 1.0;
    let defMilMult = BATTLE_CONSTANTS.MILITIA_POWER_MULTIPLIER;

    // 精英统治 Level 4: 全体 +10%
    if (defenderFaction.doctrine === 'TECHNOCRACY' && defenderFaction.techLevel >= 4) {
        defRegMult += 0.1;
        defMilMult += 0.1;
    }
    // 网络游击 Level 2: 民兵 +20%
    if (defenderFaction.doctrine === 'CYBER_INSURGENCY' && defenderFaction.techLevel >= 2) {
        defMilMult += 0.2;
    }
    // 钢铁洪流 L4: 正规军+15%, 民兵-20% (对防御方也生效)
    if (defenderFaction.doctrine === 'INDUSTRIAL_WARFARE' && defenderFaction.techLevel >= 4) {
        defRegMult += 0.15;
        defMilMult -= 0.1; // Militia weaker
    }

    let defenderPower = (defenderTerritory.army.regulars * defRegMult + defenderTerritory.army.militia * defMilMult);
    battleReport.defender.powerCalcs.push(`基础兵力(含科技修正): ${defenderPower.toFixed(0)}`);

    if (terrainConfig.defend_mod !== 1.0) {
        defenderPower *= terrainConfig.defend_mod;
        battleReport.defender.powerCalcs.push(`地形(${terrainConfig.name})修正 (x${terrainConfig.defend_mod}): ${defenderPower.toFixed(0)}`);
    }

    if (defenderTerritory.fort_level > 0) {
        const fortEfficiency = (defenderTerritory.is_supplied || !defenderTerritory.owner) ? 1 : BATTLE_CONSTANTS.UNSUPPLIED_FORT_EFFICIENCY_DEBUFF;
        // [v1.5] 精英统治 Level 2: 防御工事 +25%
        let fortBase = 0.25;
        if (defenderFaction.doctrine === 'TECHNOCRACY' && defenderFaction.techLevel >= 2) fortBase = 0.5;

        const fortBonus = 1 + defenderTerritory.fort_level * fortBase * fortEfficiency;

        // [v1.5] 攻城工程师无视工事
        if (attackerGeneral && attackerGeneral.trait === 'SIEGE_ENGINEER') {
            battleReport.defender.powerCalcs.push(`工事加成被攻城工程师无效化!`);
        } else {
            defenderPower *= fortBonus;
            battleReport.defender.powerCalcs.push(`工事加成${fortEfficiency < 1 ? '(补给已断)' : ''} (x${fortBonus.toFixed(2)}): ${defenderPower.toFixed(0)}`);
        }
    }

    // [v1.5] 防御方将领修正
    if (defenderGeneral) {
        if (defenderGeneral.trait === 'DEFENSIVE_MASTER') {
            defenderPower *= 1.25;
            battleReport.defender.powerCalcs.push(`将领特质(防守大师) (x1.25): ${defenderPower.toFixed(0)}`);
        }
        if (defenderGeneral.trait === 'DESERT_FOX' && targetTerrain === 'DESERT') {
            defenderPower *= 1.3;
            battleReport.defender.powerCalcs.push(`将领特质(沙漠之狐) (x1.3): ${defenderPower.toFixed(0)}`);
        }
        if (defenderGeneral.trait === 'MOUNTAIN_KING' && targetTerrain === 'MOUNTAIN') {
            defenderPower *= 1.3;
            battleReport.defender.powerCalcs.push(`将领特质(山地之王) (x1.3): ${defenderPower.toFixed(0)}`);
        }
    }

    if(defenderTerritory.owner && state.factions[defenderTerritory.owner] && defenderTerritory.has_supply_shortage) {
        defenderPower *= SUPPLY_CONSTANTS.NO_SUPPLY_PENALTY;
        battleReport.defender.powerCalcs.push(`补给短缺 (x${SUPPLY_CONSTANTS.NO_SUPPLY_PENALTY}): ${defenderPower.toFixed(0)}`);
    }

    // --- 随机性与结算 ---
    const battleSeed = `${state.turn.number}-${from_territory_id}-${to_territory_id}`;
    const seededRandom = createDeterministicRandom(battleSeed);

    const attackerResult = getBattleModifier(seededRandom);
    battleReport.attacker.rng = { roll: attackerResult.roll, mod: attackerResult.modifier };
    battleReport.attacker.finalPower = attackerPower * attackerResult.modifier;

    const defenderResult = getBattleModifier(seededRandom);
    battleReport.defender.rng = { roll: defenderResult.roll, mod: defenderResult.modifier };
    battleReport.defender.finalPower = defenderPower * defenderResult.modifier;

    const damageToDefender = Math.floor(battleReport.attacker.finalPower * 0.8);
    const damageToAttacker = Math.floor(battleReport.defender.finalPower * 0.6);
    const defenderLosses = Math.min(battleReport.defender.army.total, damageToDefender);
    const attackerLosses = Math.min(battleReport.attacker.army.total, damageToAttacker);
    battleReport.outcome.losses = { attacker: attackerLosses, defender: defenderLosses };

    const attackerLossDistribution = distributeLosses(attackingArmy, attackerLosses);
    const defenderLossDistribution = distributeLosses(defenderTerritory.army, defenderLosses);

    const survivingAttackers = {
        regulars: attackingArmy.regulars - attackerLossDistribution.regularLoss,
        militia: attackingArmy.militia - attackerLossDistribution.militiaLoss
    };

    defenderTerritory.army.regulars -= defenderLossDistribution.regularLoss;
    defenderTerritory.army.militia -= defenderLossDistribution.militiaLoss;
    defenderTerritory.lost_militia = (defenderTerritory.lost_militia || 0) + defenderLossDistribution.militiaLoss;

    const oldOwnerId = defenderTerritory.owner;
    const remainingDefenders = battleReport.defender.army.total - defenderLosses;

    let outcomeSummary = "";
    if (remainingDefenders <= 0) {
        // [v1.5] 将领处理：如果防守方有将领且战败，将领撤退（解除职务并变回空闲状态，或有几率受伤）
        if (defenderTerritory.generalId) {
            // 简单处理：将领自动撤回总部，解除绑定
            const gen = defenderFaction.generals.find(g => g.id === defenderTerritory.generalId);
            if(gen) {
                gen.location = null;
                defenderTerritory.generalId = null;
                outcomeSummary += ` 守军将领 ${gen.name} 撤离战场。`;
            }
        }

        // [v1.5] 进攻方将领移动：如果进攻方胜利，随军移动到新领土
        if (attackerTerritory.generalId && attackerGeneral) {
            attackerTerritory.generalId = null;
            defenderTerritory.generalId = attackerGeneral.id;
            attackerGeneral.location = to_territory_id;
            outcomeSummary += ` 攻方将领 ${attackerGeneral.name} 进驻。`;
        }

        defenderTerritory.owner = factionId;
        defenderTerritory.army.regulars += survivingAttackers.regulars;
        defenderTerritory.army.militia += survivingAttackers.militia;
        defenderTerritory.satisfaction = CONQUERED_SATISFACTION_START;
        defenderTerritory.fort_level = Math.floor(defenderTerritory.fort_level / 2);

        const attackerLossRatio = battleReport.attacker.army.total > 0 ? attackerLosses / battleReport.attacker.army.total : 0;
        let victoryType = attackerLossRatio < 0.25 ? 'CRUSHING_VICTORY' : (attackerLossRatio > PYRRHIC_VICTORY_LOSS_THRESHOLD ? 'PYRRHIC_VICTORY' : 'NORMAL_VICTORY');
        const victoryBonus = BATTLE_SATISFACTION_MODIFIERS[victoryType];

        Object.values(state.territories).filter(t => t.owner === factionId).forEach(t => t.satisfaction = Math.min(100, t.satisfaction + victoryBonus));
        outcomeSummary = `攻击方胜利！占领了该领土，全国士气大振(+${victoryBonus})。` + outcomeSummary;

        if(oldOwnerId && state.factions[oldOwnerId]) {
            const defeatPenalty = BATTLE_SATISFACTION_MODIFIERS.DEFEAT;
            Object.values(state.territories).filter(t => t.owner === oldOwnerId).forEach(t => t.satisfaction = Math.max(0, t.satisfaction + defeatPenalty));
            outcomeSummary += ` ${state.factions[oldOwnerId].name}士气崩溃(${defeatPenalty})。`;
        }
    } else {
        attackerTerritory.army.regulars += survivingAttackers.regulars;
        attackerTerritory.army.militia += survivingAttackers.militia;

        if (battleReport.attacker.army.total - attackerLosses <= 0) {
            // 进攻方全军覆没，如果有将领，将领“阵亡”（移除）或受伤
            if (attackerGeneral) {
                // 简单处理：移除将领
                attackerFaction.generals = attackerFaction.generals.filter(g => g.id !== attackerGeneral.id);
                attackerTerritory.generalId = null;
                outcomeSummary += ` 攻方将领 ${attackerGeneral.name} 阵亡！`;
            }

            const defeatPenalty = BATTLE_SATISFACTION_MODIFIERS.DEFEAT;
            Object.values(state.territories).filter(t => t.owner === factionId).forEach(t => t.satisfaction = Math.max(0, t.satisfaction + defeatPenalty));
            outcomeSummary = `攻击方失败，进攻部队被全歼，士气受挫(${defeatPenalty})。` + outcomeSummary;
        } else {
            outcomeSummary = `攻击方失败，领土未被占领，幸存部队已撤回。`;
        }
    }
    console.log(`[日志][AttackHandler] 战斗结束。结果: ${outcomeSummary}`);
    battleReport.outcome.summary = outcomeSummary;
    state.log.unshift({ turn: state.turn.number, factionId, message: battleReport, type: 'BATTLE_REPORT' });
}
