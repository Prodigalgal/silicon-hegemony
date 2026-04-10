/**
 * @file src/game/turnProcessor.js
 * @description (重构 v1.7.1) 调整季节计算逻辑，每 10 回合变更一次季节。
 */

import {
    PACT_DURATION,
    TRADE_PACT_BONUS,
    REBELLION_THRESHOLD,
    TAX_RATES,
    GARRISON_SUPPRESSION_THRESHOLD,
    PROPAGANDA_TOWER_EFFECT,
    BATTLE_CONSTANTS,
    INTRIGUE_CONSTANTS,
    COALITION_POWER_THRESHOLD,
    SUPPLY_CONSTANTS,
    SEASONS,
    NORTHERN_STATES,
    TERRAIN_TYPES,
    CYBER_CONSTANTS,
    CRISIS_TYPES,
    TURNS_PER_SEASON // [v1.7.1]
} from './constants';
import { getAdjacentTerritories, hasSupplyLine } from "./mapUtils.js";
import { calculateFactionTotals } from "./utils.js";

function createSeededRandom(seed) {
    let h = 1779033703 ^ seed.toString().length;
    for(let i = 0; i < seed.toString().length; i++) {
        h = Math.imul(h ^ seed.toString().charCodeAt(i), 3432918353);
        h = h << 13 | h >>> 19;
    }
    return function() {
        h = Math.imul(h ^ h >>> 16, 2246822507);
        h = Math.imul(h ^ h >>> 13, 3266489909);
        return ((h ^= h >>> 16) >>> 0) / 4294967296;
    }
}

function processCapitalReassignment(state) {
    const remainingFactionIds = Object.keys(state.factions);
    remainingFactionIds.forEach(factionId => {
        const factionTerritories = Object.values(state.territories).filter(t => t.owner === factionId);
        if (factionTerritories.length === 0) return;
        const hasCapital = factionTerritories.some(t => t.is_capital);
        if (!hasCapital) {
            const newCapital = factionTerritories.reduce((prev, current) =>
                (prev.population > current.population) ? prev : current
            );
            newCapital.is_capital = true;
            const factionName = state.factions[factionId]?.name || factionId;
            state.log.unshift({ turn: state.turn.number, factionId: factionId, message: `首都沦陷！${factionName} 已将临时政府迁往 ${newCapital.id}。` });
        }
    });
}

function processEconomicsAndPopulation(state) {
    const factionIncomes = {};
    Object.values(state.factions).forEach(f => factionIncomes[f.id] = 0);
    const season = state.turn.season || 0;
    const activeCrisis = state.activeCrisis;

    Object.values(state.territories).forEach(t => {
        if (t.owner && state.factions[t.owner]) {
            const owner = state.factions[t.owner];
            const satisfactionModifier = 0.5 + (t.satisfaction / 100) * 0.75;
            const taxInfo = TAX_RATES[owner.tax_rate];
            let income = Math.floor(t.money_yield * satisfactionModifier * taxInfo.rate);

            if (activeCrisis && activeCrisis.type === 'MARKET_CRASH') {
                income = 0;
            }

            factionIncomes[owner.id] += income;

            let growthMod = 1.0;
            if (season === 2) growthMod = 1.2;
            if (season === 3) growthMod = 0.8;
            if (activeCrisis && activeCrisis.type === 'BIO_PLAGUE') {
                growthMod = -0.1;
            }

            const popGrowthRate = 0.01 * growthMod;
            if (activeCrisis && activeCrisis.type === 'BIO_PLAGUE') {
                t.population += Math.floor(t.population * popGrowthRate);
            } else {
                const popGrowthFromSatisfaction = t.population * popGrowthRate * (satisfactionModifier - 1);
                t.population += Math.round(t.population * popGrowthRate + popGrowthFromSatisfaction);
            }
        }
    });

    Object.values(state.factions).forEach(fac => {
        let finalIncome = factionIncomes[fac.id] || 0;
        const tradePartners = Object.keys(state.diplomaticTies[fac.id] || {})
            .filter(partnerId => state.diplomaticTies[fac.id][partnerId]?.type === 'TRADE_AGREEMENT');
        const tradeBonus = Math.floor(finalIncome * TRADE_PACT_BONUS * tradePartners.length);
        finalIncome += tradeBonus;
        fac.money += finalIncome;
    });
}

function findSupplyNetworks(factionId, territories) {
    const networks = [];
    const visited = new Set();
    const factionTerritories = Object.values(territories).filter(t => t.owner === factionId);
    for (const startNode of factionTerritories) {
        if (!visited.has(startNode.id)) {
            const currentNetwork = [];
            const queue = [startNode.id];
            visited.add(startNode.id);
            while (queue.length > 0) {
                const currentId = queue.shift();
                currentNetwork.push(currentId);
                const neighbors = getAdjacentTerritories(currentId);
                for (const neighborId of neighbors) {
                    const neighborTerritory = territories[neighborId];
                    if (neighborTerritory?.owner === factionId && !visited.has(neighborId)) {
                        visited.add(neighborId);
                        queue.push(neighborId);
                    }
                }
            }
            networks.push(currentNetwork);
        }
    }
    return networks;
}

function processSupplyAndAttrition(state, remainingFactionIds) {
    processCapitalReassignment(state);
    const season = state.turn.season || 0;
    const seasonConfig = SEASONS[season];
    const isWinter = season === 3;

    Object.values(state.territories).forEach(t => {
        if (t.owner) {
            const capital = Object.values(state.territories).find(cap => cap.owner === t.owner && cap.is_capital);
            t.is_supplied = capital ? hasSupplyLine(t.id, capital.id, t.owner, state.territories) : false;
        } else {
            t.is_supplied = false;
        }
    });

    remainingFactionIds.forEach(factionId => {
        const faction = state.factions[factionId];
        if (!faction) return;
        const networks = findSupplyNetworks(factionId, state.territories);
        networks.forEach((networkTerritoryIds) => {
            let networkSupplyPool = 0;
            let networkSupplyConsumption = 0;
            networkTerritoryIds.forEach(id => {
                const t = state.territories[id];
                let weatherSupplyMod = seasonConfig.supply_mod;
                if (isWinter && NORTHERN_STATES.includes(id)) weatherSupplyMod *= 0.5;
                networkSupplyPool += (t.supply || 0);
                if (t.sabotaged_turns === 0) {
                    networkSupplyPool += Math.floor((t.civilian_factories || 0) * SUPPLY_CONSTANTS.SUPPLY_PER_FACTORY * weatherSupplyMod);
                }
                networkSupplyConsumption += (t.army.regulars * SUPPLY_CONSTANTS.REGULAR_UPKEEP) + (t.army.militia * SUPPLY_CONSTANTS.MILITIA_UPKEEP);
            });
            const finalSupply = networkSupplyPool - networkSupplyConsumption;
            if (finalSupply < 0) {
                state.log.unshift({ turn: state.turn.number, factionId, message: `警告！${faction.name} 在 ${networkTerritoryIds.join(', ')} 区域的补给网络已耗尽！` });
                networkTerritoryIds.forEach(id => {
                    const t = state.territories[id];
                    t.supply = 0;
                    t.has_supply_shortage = true;
                    if (t.army.regulars > 0) {
                        const depotBonus = (t.supply_depots || 0) * SUPPLY_CONSTANTS.DEPOT_ATTRITION_REDUCTION;
                        const terrainType = t.terrain || 'PLAINS';
                        const terrainAttritionMod = TERRAIN_TYPES[terrainType].attrition_mod;
                        let weatherAttritionMod = 1.0;
                        if (isWinter && NORTHERN_STATES.includes(id)) weatherAttritionMod = 2.0;
                        const finalAttritionRate = Math.max(0.01, (SUPPLY_CONSTANTS.ATTRITION_RATE + seasonConfig.attrition_base) * terrainAttritionMod * weatherAttritionMod - depotBonus);
                        const attritionLosses = Math.ceil(t.army.regulars * finalAttritionRate);
                        t.army.regulars -= attritionLosses;
                        if (attritionLosses > 0) {
                            state.log.unshift({ turn: state.turn.number, factionId, message: `位于 ${id} 的部队遭受严重损耗，损失 ${attritionLosses} 正规军！` });
                        }
                    }
                });
            } else {
                const supplyPerTerritory = Math.floor(finalSupply / networkTerritoryIds.length);
                const remainder = finalSupply % networkTerritoryIds.length;
                networkTerritoryIds.forEach((id, index) => {
                    const t = state.territories[id];
                    t.supply = supplyPerTerritory + (index < remainder ? 1 : 0);
                    t.has_supply_shortage = false;
                });
            }
        });
    });
}

function processComputingPower(state, remainingFactionIds) {
    remainingFactionIds.forEach(id => {
        const faction = state.factions[id];
        if (!faction) return;

        let cpGain = 0;
        Object.values(state.territories).forEach(t => {
            if (t.owner === id && t.server_node_level > 0) {
                cpGain += t.server_node_level * CYBER_CONSTANTS.CP_PER_NODE_LEVEL;
            }
        });

        faction.computing_power += cpGain;
    });
}

function processCrisis(state, seededRandom) {
    if (state.activeCrisis) {
        state.activeCrisis.duration--;
        if (state.activeCrisis.duration <= 0) {
            state.log.unshift({ turn: state.turn.number, message: `危机解除：${state.activeCrisis.name} 已经结束。` });
            state.activeCrisis = null;
        } else {
            state.log.unshift({ turn: state.turn.number, message: `危机持续：${state.activeCrisis.name} (剩余 ${state.activeCrisis.duration} 回合)。` });

            if (state.activeCrisis.type === 'THE_AWAKENING') {
                const targets = Object.values(state.territories).filter(t => t.factories >= 2 && t.owner !== null);
                if (targets.length > 0) {
                    const target = targets[Math.floor(seededRandom() * targets.length)];
                    const oldOwner = target.owner;
                    target.owner = null;
                    target.army.regulars = 0;
                    target.army.militia = 10000;
                    state.log.unshift({ turn: state.turn.number, message: `[旧网苏醒] 也是AI接管了 ${target.id} (原属 ${state.factions[oldOwner]?.name})！` });
                }
            }
        }
    }

    if (!state.activeCrisis && state.turn.number > 10) {
        const roll = seededRandom();
        if (roll < 0.05) {
            const crisisTypes = Object.keys(CRISIS_TYPES);
            const selectedType = crisisTypes[Math.floor(seededRandom() * crisisTypes.length)];
            const crisisConfig = CRISIS_TYPES[selectedType];

            state.activeCrisis = {
                type: selectedType,
                name: crisisConfig.name,
                description: crisisConfig.description,
                duration: 5
            };

            state.log.unshift({ turn: state.turn.number, message: `!!! 全球危机爆发 !!! ${crisisConfig.name}: ${crisisConfig.description}` });
        }
    }
}

function cleanupTemporaryStatus(state) {
    Object.values(state.territories).forEach(t => {
        t.is_blackout = false;
    });
}

function processMilitiaAndRecovery(state) {
    Object.values(state.territories).forEach(t => {
        if (t.owner) {
            const newMilitia = Math.floor(t.population * 0.005 * (t.satisfaction / 100));
            t.army.militia += newMilitia;
            if (t.lost_militia > 0) {
                const recovered = Math.ceil(t.lost_militia * BATTLE_CONSTANTS.MILITIA_RECOVERY_RATE);
                t.army.militia += recovered;
                t.lost_militia -= recovered;
            }
        }
    });
}

function processTimedEffects(state) {
    Object.values(state.territories).forEach(t => {
        if (t.sabotaged_turns > 0) t.sabotaged_turns--;
        if (t.lobbying_fatigue > 0) t.lobbying_fatigue = Math.max(0, t.lobbying_fatigue - INTRIGUE_CONSTANTS.LOBBYING_FATIGUE_DECAY);
    });
    const expiredPacts = [];
    for (const f1 in state.diplomaticTies) {
        for (const f2 in state.diplomaticTies[f1]) {
            if (f1 < f2 && isFinite(state.diplomaticTies[f1][f2].turns_left)) {
                state.diplomaticTies[f1][f2].turns_left--;
                state.diplomaticTies[f2][f1].turns_left--;
                if (state.diplomaticTies[f1][f2].turns_left <= 0) expiredPacts.push({ f1, f2 });
            }
        }
    }
    expiredPacts.forEach(({ f1, f2 }) => {
        delete state.diplomaticTies[f1][f2];
        delete state.diplomaticTies[f2][f1];
    });
}

function processSatisfaction(state, remainingFactionIds) {
    const propagandaEffects = {};
    Object.values(state.territories).forEach(t => propagandaEffects[t.id] = 0);
    Object.values(state.territories).forEach(territory => {
        if (territory.propaganda_towers > 0 && territory.owner) {
            const ownerId = territory.owner;
            const towerCount = territory.propaganda_towers;
            const affectedTerritories = [territory.id, ...getAdjacentTerritories(territory.id)];
            affectedTerritories.forEach(affectedId => {
                const targetTerritory = state.territories[affectedId];
                if (targetTerritory) {
                    if (targetTerritory.owner === ownerId) {
                        propagandaEffects[affectedId] += PROPAGANDA_TOWER_EFFECT.INTERNAL * towerCount;
                    } else if (targetTerritory.owner !== null) {
                        propagandaEffects[affectedId] += PROPAGANDA_TOWER_EFFECT.EXTERNAL * towerCount;
                    }
                }
            });
        }
    });
    Object.values(state.territories).forEach(t => {
        if (t.owner && state.factions[t.owner]) {
            const owner = state.factions[t.owner];
            const taxInfo = TAX_RATES[owner.tax_rate];
            let satisfactionChange = 1 + taxInfo.satisfaction_change + (propagandaEffects[t.id] || 0);
            t.satisfaction = Math.max(0, Math.min(100, t.satisfaction + satisfactionChange));
        }
    });
    remainingFactionIds.forEach(id => {
        const faction = state.factions[id];
        if (!faction) return;
        const factionTerritories = Object.values(state.territories).filter(t => t.owner === id);
        if (factionTerritories.length > 0) {
            const totalPop = factionTerritories.reduce((sum, t) => sum + t.population, 0);
            if (totalPop > 0) {
                const weightedSatisfaction = factionTerritories.reduce((sum, t) => sum + t.satisfaction * t.population, 0);
                faction.avgSatisfaction = Math.round(weightedSatisfaction / totalPop);
            } else {
                faction.avgSatisfaction = 50;
            }
        }
    });
}

function processRebellion(state, seededRandom) {
    Object.values(state.territories).forEach(t => {
        if (t.owner && t.satisfaction < REBELLION_THRESHOLD) {
            const totalArmyInTerritory = t.army.regulars + t.army.militia;
            const suppressionThreshold = t.population * GARRISON_SUPPRESSION_THRESHOLD;
            if (totalArmyInTerritory > suppressionThreshold) {
                state.log.unshift({ turn: state.turn.number, factionId: t.owner, message: `在 ${t.id} 的驻军成功压制了不满情绪。` });
                return;
            }
            const rebellionChance = (REBELLION_THRESHOLD - t.satisfaction) / 100;
            if (seededRandom() < rebellionChance) {
                const oldOwnerId = t.owner;
                const oldOwnerName = state.factions[oldOwnerId]?.name || "原属主";
                state.log.unshift({ turn: state.turn.number, factionId: oldOwnerId, message: `叛乱在 ${t.id} 爆发了！领土脱离 ${oldOwnerName} 的控制！` });
                t.owner = null;
                t.army.regulars = 0;
                t.army.militia = Math.floor(t.population * 0.1);
                t.population = Math.floor(t.population * 0.9);
                t.satisfaction = 50;
                t.is_capital = false;
            }
        }
    });
}

function processFactionTotalsAndCoalition(state, remainingFactionIds) {
    remainingFactionIds.forEach(id => {
        if (state.factions[id]) {
            Object.assign(state.factions[id], calculateFactionTotals(id, state.territories));
        }
    });
    const totalArmyInWorld = remainingFactionIds.reduce((sum, id) => {
        const faction = state.factions[id];
        return sum + (faction ? ((faction.totalArmy.regulars || 0) + (faction.totalArmy.militia || 0)) : 0);
    }, 0);
    if (!state.coalitionTarget && remainingFactionIds.length > 2) {
        let currentOverlord = null;
        for (const factionId of remainingFactionIds) {
            const faction = state.factions[factionId];
            if (faction) {
                const factionTotalArmy = (faction.totalArmy.regulars || 0) + (faction.totalArmy.militia || 0);
                const otherFactionsArmy = totalArmyInWorld - factionTotalArmy;
                if (factionTotalArmy > 0 && otherFactionsArmy > 0 && factionTotalArmy > otherFactionsArmy * COALITION_POWER_THRESHOLD) {
                    currentOverlord = faction;
                    break;
                }
            }
        }
        if (currentOverlord) {
            state.coalitionTarget = currentOverlord.id;
            state.log.unshift({ turn: state.turn.number, message: `威胁警报！一个反抗同盟正在形成，以对抗日益强大的 ${currentOverlord.name}！` });
            const coalitionMembers = remainingFactionIds.filter(id => id !== currentOverlord.id);
            coalitionMembers.forEach(memberId => {
                if(!state.diplomaticTies[memberId]) state.diplomaticTies[memberId] = {};
                if(!state.diplomaticTies[currentOverlord.id]) state.diplomaticTies[currentOverlord.id] = {};
                state.diplomaticTies[memberId][currentOverlord.id] = { type: 'COALITION_WAR', turns_left: Infinity };
                state.diplomaticTies[currentOverlord.id][memberId] = { type: 'COALITION_WAR', turns_left: Infinity };
                coalitionMembers.forEach(otherMemberId => {
                    if (memberId !== otherMemberId) {
                        if(!state.diplomaticTies[memberId]) state.diplomaticTies[memberId] = {};
                        state.diplomaticTies[memberId][otherMemberId] = { type: 'NON_AGGRESSION', turns_left: PACT_DURATION * 2 };
                    }
                });
            });
        }
    } else if (state.coalitionTarget) {
        const overlord = state.factions[state.coalitionTarget];
        const overlordArmy = overlord ? ((overlord.totalArmy.regulars || 0) + (overlord.totalArmy.militia || 0)) : 0;
        const otherFactionsArmy = totalArmyInWorld - overlordArmy;
        const isThreatGone = !overlord || (overlordArmy <= otherFactionsArmy * COALITION_POWER_THRESHOLD);
        if (isThreatGone) {
            const oldTargetId = state.coalitionTarget;
            state.log.unshift({ turn: state.turn.number, message: `威胁解除！反抗同盟已解散。` });
            state.coalitionTarget = null;
            remainingFactionIds.forEach(fId => {
                if (state.diplomaticTies[fId]?.[oldTargetId]?.type === 'COALITION_WAR') delete state.diplomaticTies[fId][oldTargetId];
            });
            if (state.factions[oldTargetId] && state.diplomaticTies[oldTargetId]) {
                Object.keys(state.diplomaticTies[oldTargetId]).forEach(fId => {
                    if (state.diplomaticTies[oldTargetId][fId]?.type === 'COALITION_WAR') delete state.diplomaticTies[oldTargetId][fId];
                });
            }
        }
    }
}

export function processEndOfTurn(state) {
    const currentTurn = state.turn.number;
    console.log(`[日志][TurnProcessor] ====== 回合 ${currentTurn} 结算开始 ======`);
    state.log.unshift({ turn: currentTurn, message: `--- 回合 ${currentTurn} 结算阶段 ---` });

    cleanupTemporaryStatus(state);

    state.turn.number += 1;

    // [v1.7.1] 季节更新逻辑：每 TURNS_PER_SEASON 切换一次
    // 示例：若 TURNS_PER_SEASON=10
    // T1-T10: season=0 (Spring)
    // T11-T20: season=1 (Summer)
    const previousSeason = state.turn.season;
    state.turn.season = Math.floor((state.turn.number - 1) / TURNS_PER_SEASON) % 4;

    if (state.turn.season !== previousSeason) {
        const seasonName = SEASONS[state.turn.season].name;
        state.log.unshift({ turn: state.turn.number, message: `季节更替：${seasonName} 已至。` });
    }

    state.turnSeed += 1;
    const seededRandom = createSeededRandom(state.turnSeed);
    const remainingFactionIds = Object.keys(state.factions);

    processEconomicsAndPopulation(state);
    processSupplyAndAttrition(state, remainingFactionIds);
    processComputingPower(state, remainingFactionIds);
    processMilitiaAndRecovery(state);
    processTimedEffects(state);
    processSatisfaction(state, remainingFactionIds);
    processRebellion(state, seededRandom);
    processCrisis(state, seededRandom);
    processFactionTotalsAndCoalition(state, remainingFactionIds);

    console.log(`[日志][TurnProcessor] ====== 回合 ${currentTurn} 结算完成 ======`);
}
