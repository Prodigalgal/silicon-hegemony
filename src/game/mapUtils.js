/**
 * @file mapUtils.js
 * @description 提供基于全球国家目录的地理与玩法辅助函数。
 */

import { TERRAIN_TYPES } from './constants.js';
import { requireTerritoryCatalog } from './territoryCatalog.js';

export function getAllTerritories() {
    return requireTerritoryCatalog().allTerritoryIds;
}

export function getConnectedTerritories() {
    return requireTerritoryCatalog().connectedTerritoryIds;
}

export function getTerritoryDefinition(territoryId) {
    return requireTerritoryCatalog().definitionsById[territoryId] || null;
}

export function getAdjacentTerritories(territoryId) {
    return requireTerritoryCatalog().adjacencyById[territoryId] || [];
}

export function getTerritoryTerrain(territoryId) {
    const typeKey = getTerritoryDefinition(territoryId)?.terrain || 'PLAINS';
    return TERRAIN_TYPES[typeKey] || TERRAIN_TYPES.PLAINS;
}

export function getTerritoryDisplayName(territoryId) {
    return getTerritoryDefinition(territoryId)?.name || territoryId;
}

export function getAdjacencySnapshot(territoryIds = null) {
    const { adjacencyById, allTerritoryIds } = requireTerritoryCatalog();
    const targetIds = territoryIds ? [...territoryIds] : allTerritoryIds;
    const targetSet = new Set(targetIds);

    return Object.fromEntries(
        targetIds.map((territoryId) => [
            territoryId,
            (adjacencyById[territoryId] || []).filter((neighborId) => targetSet.has(neighborId)),
        ]),
    );
}

export function hasSupplyLine(startTerritoryId, endTerritoryId, factionId, territories) {
    if (!endTerritoryId || !territories[startTerritoryId]) return false;
    if (startTerritoryId === endTerritoryId) return true;

    const queue = [startTerritoryId];
    const visited = new Set([startTerritoryId]);

    while (queue.length > 0) {
        const currentId = queue.shift();
        const neighbors = getAdjacentTerritories(currentId);

        for (const neighborId of neighbors) {
            if (neighborId === endTerritoryId) {
                return true;
            }

            const neighborTerritory = territories[neighborId];
            if (neighborTerritory && neighborTerritory.owner === factionId && !visited.has(neighborId)) {
                visited.add(neighborId);
                queue.push(neighborId);
            }
        }
    }

    return false;
}

export function getVisibleTerritoryIds(factionId, territories, scoutedTerritories = []) {
    const visibleIds = new Set();
    const ownedIds = [];

    Object.values(territories).forEach((territory) => {
        if (territory.owner === factionId) {
            visibleIds.add(territory.id);
            ownedIds.push(territory.id);
        }
    });

    ownedIds.forEach((territoryId) => {
        const neighbors = getAdjacentTerritories(territoryId);
        neighbors.forEach((neighborId) => visibleIds.add(neighborId));
    });

    if (Array.isArray(scoutedTerritories)) {
        scoutedTerritories.forEach((territoryId) => visibleIds.add(territoryId));
    }

    return visibleIds;
}

export function isWinterAffectedTerritory(territory, season) {
    const latitude = territory?.latitude ?? getTerritoryDefinition(territory?.id)?.latitude ?? 0;

    if (latitude >= 35) {
        return season === 3;
    }

    if (latitude <= -35) {
        return season === 1;
    }

    return false;
}
