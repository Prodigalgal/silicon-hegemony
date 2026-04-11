/**
 * @file promptGenerator.js
 * @description 负责为AI生成决策所需的完整上下文提示（Prompt）。
 * 核心职责：
 * 1. 收集当前游戏状态的各方面信息（经济、军事、外交等）。
 * 2. 将这些信息格式化并注入到GDD_PROMPT_TEMPLATE中。
 * 3. [核心修复] 注入领土邻接关系表，为AI提供地理知识。
 */

import {COMMANDER_ARCHETYPES, GDD_PROMPT_TEMPLATE} from '../store/prompt.js';
import { getAdjacencySnapshot, getVisibleTerritoryIds } from './mapUtils.js';

/**
 * 为指定的AI势力生成一个完整的、信息丰富的决策提示。
 * @param {object} faction - 当前行动的势力对象。
 * @param {object} factionAiConfig - 该势力的AI特定配置（原型、补充策略等）。
 * @param {object} state - 整个游戏的状态树。
 * @returns {string} - 一个准备好发送给LLM的完整字符串提示。
 */
export function generatePromptForFaction(faction, factionAiConfig, state) {
    console.log(`[日志][PromptGenerator] 开始为势力 ${faction.name} 生成决策提示。`);
    // 收集己方领土信息
    const factionTerritories = Object.values(state.territories).filter(t => t.owner === faction.id);

    // [v1.3 优化] 使用统一的工具函数获取可见领土（包含己方、相邻和已侦察）
    const visibleIds = getVisibleTerritoryIds(faction.id, state.territories, faction.scouted_territories);

    // 过滤出已知但非己方的领土信息（敌方或中立）
    // 我们只暴露有限的战略信息给AI，模拟战争迷雾
    const knownTerritoriesDetails = [];
    visibleIds.forEach(id => {
        const t = state.territories[id];
        if (t && t.owner !== faction.id) {
            knownTerritoriesDetails.push({
                territory_id: t.id,
                owner: t.owner || "Unowned",
                army: t.army,
                fort_level: t.fort_level,
                population: t.population
            });
        }
    });

    // 生成世界概览，提供对其他势力的宏观认知
    const worldOverview = Object.values(state.factions)
        .filter(f => f.id !== faction.id)
        .map(f => ({
            faction_id: f.id,
            name: f.name,
            estimated_strength: (f.totalArmy.regulars || 0) + (f.totalArmy.militia || 0),
            territory_count: Object.values(state.territories).filter(t => t.owner === f.id).length
        }));

    // 格式化外交关系
    const diplomaticRelations = state.diplomaticTies[faction.id]
        ? Object.entries(state.diplomaticTies[faction.id])
            .map(([targetId, pact]) => ({ with_faction_id: targetId, type: pact.type, turns_left: pact.turns_left }))
        : [];

    // 提取需要回应的外交提议
    const incomingProposals = state.diplomaticProposals
        .filter(p => p.to === faction.id)
        .map(p => ({ from_faction_id: p.from, proposal_type: p.type }));

    // [核心修复] 修正了对`state.turn`和`entry.turn`的访问方式
    const currentTurnNumber = state.turn.number || state.turn;
    const recentKeyEvents = state.log
        .filter(entry => {
            const entryTurnNumber = entry.turn?.number || entry.turn;
            return currentTurnNumber - entryTurnNumber <= 3 && entryTurnNumber > 0;
        })
        .map(entry => {
            const entryTurnNumber = entry.turn?.number || entry.turn;
            if (entry.type === 'BATTLE_REPORT') {
                return `- T${entryTurnNumber} 战斗: ${entry.message.outcome.summary}`;
            }
            if (typeof entry.message === 'string') {
                const isRelevant = entry.factionId === faction.id ||
                    entry.message.includes(faction.name) ||
                    entry.message.includes('已被消灭') ||
                    entry.message.includes('反抗同盟');

                if (isRelevant) {
                    return `- T${entryTurnNumber}: ${entry.message.replace(`[${faction.name}]`, '[你]')}`;
                }
            }
            return null;
        })
        .filter(Boolean)
        .slice(0, 15)
        .join('\n');

    console.log(`[日志][PromptGenerator] 填充模板...`);
    let prompt = GDD_PROMPT_TEMPLATE;

    prompt = prompt.replace('[AI Faction Name]', faction.name);
    prompt = prompt.replace('[Commander Archetype]', factionAiConfig.commanderName || 'Custom');

    const baseStrategy = COMMANDER_ARCHETYPES[factionAiConfig.commanderName]?.description || "";
    const supplementalStrategy = factionAiConfig.supplementalStrategy || "";

    let finalStrategy;
    if (baseStrategy && supplementalStrategy) {
        finalStrategy = `基础策略: ${baseStrategy}\n\n补充指令: ${supplementalStrategy}`;
    } else {
        finalStrategy = baseStrategy || supplementalStrategy || `你是一个${factionAiConfig.commanderName}。请根据这个身份进行通用决策。`;
    }
    prompt = prompt.replace('[Detailed Strategy Description from Archetype]', finalStrategy.trim());
    prompt = prompt.replace('[Your Previous Long Term Goal]', faction.longTermGoal || "尚未制定");
    prompt = prompt.replace('[Your Previous Short Term Objective]', faction.shortTermObjective || "尚未制定");

    prompt = prompt.replace('[Turn Number]', currentTurnNumber.toString());
    prompt = prompt.replace('[Money]', faction.money.toString());
    prompt = prompt.replace('[Action Points]', faction.actionPoints.toString());
    prompt = prompt.replace('[Current Tax Rate]', faction.tax_rate);
    prompt = prompt.replace('[Attack Bonus]', `+${(faction.attack_bonus * 100).toFixed(0)}%`);

    const totalSupply = factionTerritories.reduce((sum, t) => sum + (t.supply || 0), 0);
    prompt = prompt.replace('[Supply]', totalSupply.toString());

    const totalPopulation = faction.totalPopulation || 0;
    const totalArmy = (faction.totalArmy?.regulars || 0) + (faction.totalArmy?.militia || 0);
    prompt = prompt.replace('[Population]', totalPopulation.toString());
    prompt = prompt.replace('[Army]', totalArmy.toString());

    const factionTerritoriesForPrompt = factionTerritories.map(
        ({id, population, army, satisfaction, factories, civilian_factories, fort_level, supply, has_supply_shortage, is_supplied}) =>
            ({id, population, army, satisfaction, factories, civilian_factories, fort_level, supply, has_supply_shortage, is_supplied})
    );
    prompt = prompt.replace('[Your controlled territories]', JSON.stringify(factionTerritoriesForPrompt, null, 2));
    prompt = prompt.replace('[Known territories]', JSON.stringify(knownTerritoriesDetails, null, 2));
    prompt = prompt.replace('[World overview]', JSON.stringify(worldOverview, null, 2));
    prompt = prompt.replace('[Your diplomatic relations]', JSON.stringify(diplomaticRelations, null, 2));
    prompt = prompt.replace('[Incoming Diplomatic Proposals]', JSON.stringify(incomingProposals, null, 2));
    prompt = prompt.replace('[Recent Key Events]', recentKeyEvents || "无特别重要的近期事件。");

    const adjacencyContextIds = new Set([
        ...visibleIds,
        ...factionTerritories.map((territory) => territory.id),
    ]);
    prompt = prompt.replace('[Territory Adjacency List]', JSON.stringify(getAdjacencySnapshot(adjacencyContextIds), null, 2));

    console.log(`[日志][PromptGenerator] 提示生成完毕。`);
    return prompt;
}
