/**
 * @file useFactionDetailsViewModel.js
 * @description (重构 v1.6.1) 修复控制领土数据返回错误的 Bug。
 */

import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
    selectFactionById,
    selectControlledTerritories,
    selectFactionStats,
    selectAiConfigById
} from '../store/selectors';
import { TECH_DOCTRINES, GENERAL_TRAITS } from '../game/constants';

export function useFactionDetailsViewModel(factionId) {
    const faction = useSelector(state => selectFactionById(state, factionId));
    const controlledTerritories = useSelector(state => selectControlledTerritories(state, factionId));
    const factionStats = useSelector(state => selectFactionStats(state, factionId));
    const rawAiConfig = useSelector(state => selectAiConfigById(state, factionId));

    return useMemo(() => {
        const aiConfig = rawAiConfig || (faction ? { isHuman: faction.isHuman, commanderName: faction.name } : null);
        if (!faction || !factionStats || !aiConfig) return null;

        const { regulars, militia } = faction.totalArmy;
        const totalArmyCount = regulars + militia;

        let doctrineName = "未选择路线";
        let techInfo = "Tech Level 0";
        if (faction.doctrine && TECH_DOCTRINES[faction.doctrine]) {
            doctrineName = TECH_DOCTRINES[faction.doctrine].name;
            techInfo = `Lv.${faction.techLevel}`;
        }

        const generals = (faction.generals || []).map(g => ({
            id: g.id,
            name: g.name,
            location: g.location,
            traitName: GENERAL_TRAITS[g.trait]?.name || g.trait,
            traitDesc: GENERAL_TRAITS[g.trait]?.description || "",
        }));

        const stats = [
            { label: "💰 金钱", value: faction.money.toLocaleString() },
            { label: "🔋 算力 (CP)", value: faction.computing_power.toLocaleString() },
            { label: "📦 总补给", value: factionStats.totalSupply.toLocaleString() },
            { label: "🌍 领土数量", value: factionStats.territoryCount },
            { label: "👥 总人口", value: faction.totalPopulation.toLocaleString() },
            { label: "😊 平均满意度", value: `${faction.avgSatisfaction}%` },
            { label: "🔬 战略路线", value: doctrineName },
            { label: "📈 科技等级", value: techInfo },
        ];

        const armyBreakdown = {
            total: totalArmyCount,
            regulars: regulars,
            militia: militia,
            regularPercent: totalArmyCount > 0 ? (regulars / totalArmyCount) * 100 : 0,
            militiaPercent: totalArmyCount > 0 ? (militia / totalArmyCount) * 100 : 0,
        };

        // 创建一个副本进行排序，避免修改 Redux 状态（虽然 filter 返回的是新数组，但为了严谨）
        const formattedTerritories = [...controlledTerritories]
            .sort((a, b) => b.is_capital - a.is_capital)
            .map(t => ({
                id: t.id,
                name: `${t.id}`,
                isCapital: t.is_capital,
                hasGeneral: !!t.generalId,
                chips: [
                    { title: "人口", label: `👥 ${t.population.toLocaleString()}`, color: "default" },
                    { title: "驻军", label: `⚔️ ${(t.army.regulars + t.army.militia).toLocaleString()}`, color: "default" },
                    { title: "满意度", label: `😊 ${t.satisfaction}`, color: "default" },
                    { title: "本地补给", label: `📦 ${t.supply || 0}`, color: "default" },
                    { title: "节点等级", label: `📡 Lv.${t.server_node_level}`, color: "info" },
                    { title: "军工厂", label: `🏭 ${t.factories}`, color: "default" },
                    { title: "防御工事", label: `🛡️ ${t.fort_level}`, color: "default" },
                    ...(t.has_supply_shortage ? [{ title: "补给短缺", label: '补给短缺', color: 'warning', variant: 'outlined' }] : []),
                    ...(t.sabotaged_turns > 0 ? [{ title: "被破坏", label: `被破坏 (${t.sabotaged_turns})`, color: 'error', variant: 'outlined' }] : []),
                    ...(t.is_blackout ? [{ title: "停电", label: '🚫 停电', color: 'error', variant: 'filled' }] : [])
                ]
            }));

        return {
            name: faction.name,
            color: faction.color,
            commanderName: aiConfig.isHuman ? '玩家' : (aiConfig.commanderName || '未知'),
            stats,
            armyBreakdown,
            // [修复] 这里必须返回 formattedTerritories，而不是原始的 controlledTerritories
            controlledTerritories: formattedTerritories,
            generals,
        };
    }, [faction, controlledTerritories, factionStats, rawAiConfig]);
}
