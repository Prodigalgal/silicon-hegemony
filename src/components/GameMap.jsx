/* src/components/GameMap.jsx */
import React, { useState } from 'react';
import { Popover, Box, Typography, Divider, List, ListItemText } from '@mui/material';
import { useGameMapViewModel } from '../hooks/useGameMapViewModel';
import GpuGlobeMap from './GpuGlobeMap';
import PixiMap from './PixiMap';
import { TAX_RATES, SUPPLY_CONSTANTS, TERRAIN_TYPES, GENERAL_TRAITS } from '../game/constants';

const MAP_RENDERER_MODE = 'gpu';

// ... (TerritoryPopoverContent 保持不变) ...
const TerritoryPopoverContent = ({ territory, faction }) => {
    // ... (content implementation same as before)
    // 为了节省篇幅，此处省略内部实现，请保留原文件中的 TerritoryPopoverContent 代码
    if (!territory) return null;
    const satisfaction = territory.satisfaction || 0;
    const satisfactionModifier = 0.5 + (satisfaction / 100) * 0.75;
    const taxInfo = faction ? TAX_RATES[faction.tax_rate] : TAX_RATES.MEDIUM;
    const baseMoney = territory.money_yield;
    const moneyFromSatisfaction = baseMoney * (satisfactionModifier - 1);
    const moneyFromTax = baseMoney * satisfactionModifier * (taxInfo.rate - 1);
    const totalNextMoney = baseMoney + moneyFromSatisfaction + moneyFromTax;
    const popGrowthRate = 0.01;
    const basePopulationGrowth = territory.population * popGrowthRate;
    const popGrowthFromSatisfaction = basePopulationGrowth * (satisfactionModifier - 1);
    const totalNextPopulationGrowth = basePopulationGrowth + popGrowthFromSatisfaction;
    const ownerName = faction ? faction.name : (territory.owner ? '叛军' : '中立');
    const totalArmy = (territory.army.regulars || 0) + (territory.army.militia || 0);
    const terrainInfo = TERRAIN_TYPES[territory.terrain] || TERRAIN_TYPES.PLAINS;
    const general = territory.generalId && faction ? faction.generals.find(g => g.id === territory.generalId) : null;

    return (
        <Box sx={{ p: 2, maxWidth: 320, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="h6">{territory.id} <Typography component="span" variant="caption" sx={{ bgcolor: 'rgba(255,255,255,0.1)', px: 1, borderRadius: 1 }}>{terrainInfo.name}</Typography></Typography>
            <Typography variant="body2" color="text.secondary">所有者: {ownerName}</Typography>
            {general && (<Box sx={{ my: 1, p: 1, bgcolor: 'rgba(255, 215, 0, 0.1)', border: '1px dashed gold', borderRadius: 1 }}><Typography variant="body2" color="warning.main" fontWeight="bold">⭐ 将领: {general.name}</Typography><Typography variant="caption" display="block">{GENERAL_TRAITS[general.trait].name}: {GENERAL_TRAITS[general.trait].description}</Typography></Box>)}
            <Divider sx={{ my: 1 }} />
            <List dense>
                <ListItemText primary={`军队: ${totalArmy.toLocaleString()}`} secondary={`正规军: ${territory.army.regulars.toLocaleString()} / 民兵: ${territory.army.militia.toLocaleString()}`} />
                <ListItemText primary={`人口: ${territory.population.toLocaleString()}`} secondary={`预计增长: ${totalNextPopulationGrowth.toFixed(0)}`} />
                <ListItemText primary={`满意度: ${territory.satisfaction}`} />
                <ListItemText primary={`本地补给: ${territory.supply || 0}`} />
            </List>
            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle1"><b>预计下回合收入: +{totalNextMoney.toFixed(0)}</b></Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>地形效果: 移动消耗 {terrainInfo.move_cost} AP, 防御 {terrainInfo.defend_mod}x, 损耗 {terrainInfo.attrition_mod}x</Typography>
        </Box>
    );
};


function GameMap({ data }) {
    const { territories, factions, turn } = data;
    const { territoryVisuals } = useGameMapViewModel();

    const [popoverState, setPopoverState] = useState({
        position: null,
        territoryId: null
    });

    const getClientPositionFromEvent = (event) => {
        if (!event) return null;

        if (Number.isFinite(event.clientX) && Number.isFinite(event.clientY)) {
            return { left: event.clientX, top: event.clientY };
        }

        const global = event.global || event.data?.global;
        if (!global) return null;

        const canvasRect = event.currentTarget?.canvas?.getBoundingClientRect?.();
        if (!canvasRect) return null;

        return {
            left: canvasRect.left + global.x,
            top: canvasRect.top + global.y,
        };
    };

    const handleTerritoryHover = (event, territoryId) => {
        const position = getClientPositionFromEvent(event);
        if (!position || !territoryId) {
            setPopoverState({ position: null, territoryId: null });
            return;
        }

        setPopoverState({
            position,
            territoryId
        });
    };

    const handleTerritoryOut = () => {
        setPopoverState({ position: null, territoryId: null });
    };

    const popoverTerritory = territories[popoverState.territoryId];
    const popoverFaction = popoverTerritory?.owner ? factions[popoverTerritory.owner] : null;
    const currentSeason = (turn?.season !== undefined) ? turn.season : ((turn?.number || turn || 1) - 1) % 4;

    const hasValidAnchorPosition = Boolean(
        popoverState.position
        && Number.isFinite(popoverState.position.left)
        && Number.isFinite(popoverState.position.top)
    );
    const anchorPosition = hasValidAnchorPosition ? popoverState.position : { top: 0, left: 0 };

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <Popover
                id="territory-popover"
                open={hasValidAnchorPosition}
                anchorReference="anchorPosition"
                anchorPosition={anchorPosition}
                onClose={handleTerritoryOut}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                transformOrigin={{ vertical: 'top', horizontal: 'center' }}
                disableRestoreFocus
                sx={{ pointerEvents: 'none' }}
            >
                <TerritoryPopoverContent territory={popoverTerritory} faction={popoverFaction} season={currentSeason} />
            </Popover>

            {MAP_RENDERER_MODE === 'gpu' ? (
                <GpuGlobeMap
                    data={data}
                    visuals={territoryVisuals}
                    onTerritoryHover={handleTerritoryHover}
                    onTerritoryOut={handleTerritoryOut}
                />
            ) : (
                <PixiMap
                    data={data}
                    visuals={territoryVisuals}
                    onTerritoryHover={handleTerritoryHover}
                    onTerritoryOut={handleTerritoryOut}
                />
            )}
        </div>
    );
}

export default GameMap;
