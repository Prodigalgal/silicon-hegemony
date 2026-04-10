/**
 * @file mapUtils.js
 * @description 提供了与游戏地图相关的地理信息和工具函数。
 * [v1.6] 增加服务器节点映射。
 */

import { TERRAIN_TYPES } from './constants';

export const US_STATE_ADJACENCY = {
    "AL": ["MS", "TN", "GA", "FL"], "AZ": ["CA", "NV", "UT", "CO", "NM"], "AR": ["MO", "TN", "MS", "LA", "TX", "OK"],
    "CA": ["OR", "NV", "AZ"], "CO": ["WY", "NE", "KS", "OK", "NM", "AZ", "UT"], "CT": ["NY", "MA", "RI"],
    "DE": ["MD", "PA", "NJ"], "FL": ["AL", "GA"], "GA": ["FL", "AL", "TN", "NC", "SC"], "ID": ["MT", "WY", "UT", "NV", "OR", "WA"],
    "IL": ["IN", "KY", "MO", "IA", "WI"], "IN": ["MI", "OH", "KY", "IL"], "IA": ["MN", "WI", "IL", "MO", "NE", "SD"],
    "KS": ["NE", "MO", "OK", "CO"], "KY": ["IN", "OH", "WV", "VA", "TN", "MO", "IL"], "LA": ["TX", "AR", "MS"],
    "ME": ["NH"], "MD": ["VA", "WV", "PA", "DE"], "MA": ["RI", "CT", "NY", "NH", "VT"], "MI": ["OH", "IN", "WI"],
    "MN": ["WI", "IA", "SD", "ND"], "MS": ["LA", "AR", "TN", "AL"], "MO": ["IA", "IL", "KY", "TN", "AR", "OK", "KS", "NE"],
    "MT": ["ND", "SD", "WY", "ID"], "NE": ["SD", "IA", "MO", "KS", "CO", "WY"], "NV": ["ID", "UT", "AZ", "CA", "OR"],
    "NH": ["VT", "MA", "ME"], "NJ": ["DE", "PA", "NY"], "NM": ["AZ", "UT", "CO", "OK", "TX"], "NY": ["NJ", "PA", "VT", "MA", "CT"],
    "NC": ["VA", "TN", "GA", "SC"], "ND": ["MN", "SD", "MT"], "OH": ["PA", "WV", "KY", "IN", "MI"],
    "OK": ["KS", "MO", "AR", "TX", "NM", "CO"], "OR": ["CA", "NV", "ID", "WA"], "PA": ["NY", "NJ", "DE", "MD", "WV", "OH"],
    "RI": ["CT", "MA"], "SC": ["GA", "NC"], "SD": ["ND", "MN", "IA", "NE", "WY", "MT"], "TN": ["KY", "VA", "NC", "GA", "AL", "MS", "AR", "MO"],
    "TX": ["NM", "OK", "AR", "LA"], "UT": ["ID", "WY", "CO", "NM", "AZ", "NV"], "VT": ["NY", "NH", "MA"],
    "VA": ["MD", "WV", "KY", "TN", "NC"], "WA": ["ID", "OR"], "WV": ["OH", "PA", "MD", "VA", "KY"],
    "WI": ["MI", "IL", "IA", "MN"], "WY": ["MT", "SD", "NE", "CO", "UT", "ID"],
    "AK": []
};

export const STATE_TERRAIN_MAPPING = {
    "AL": "PLAINS", "AZ": "DESERT", "AR": "PLAINS",
    "CA": "URBAN", "CO": "MOUNTAIN", "CT": "URBAN",
    "DE": "PLAINS", "FL": "SWAMP", "GA": "PLAINS", "ID": "MOUNTAIN",
    "IL": "PLAINS", "IN": "PLAINS", "IA": "PLAINS",
    "KS": "PLAINS", "KY": "MOUNTAIN", "LA": "SWAMP",
    "ME": "MOUNTAIN", "MD": "URBAN", "MA": "URBAN", "MI": "PLAINS",
    "MN": "PLAINS", "MS": "PLAINS", "MO": "PLAINS",
    "MT": "MOUNTAIN", "NE": "PLAINS", "NV": "DESERT",
    "NH": "MOUNTAIN", "NJ": "URBAN", "NM": "DESERT", "NY": "URBAN",
    "NC": "PLAINS", "ND": "PLAINS", "OH": "URBAN",
    "OK": "PLAINS", "OR": "MOUNTAIN", "PA": "MOUNTAIN",
    "RI": "URBAN", "SC": "PLAINS", "SD": "PLAINS", "TN": "MOUNTAIN",
    "TX": "PLAINS", "UT": "DESERT", "VT": "MOUNTAIN",
    "VA": "PLAINS", "WA": "MOUNTAIN", "WV": "MOUNTAIN",
    "WI": "PLAINS", "WY": "MOUNTAIN", "AK": "MOUNTAIN"
};

/**
 * [v1.6 新增] 服务器节点定义 (Level 1-3)
 * 现实中科技/数据中心较多的州等级较高。
 */
export const SERVER_NODES = {
    "CA": 3, // 硅谷
    "VA": 3, // 数据中心巷
    "NY": 2, "TX": 2, "MA": 2, "WA": 2,
    "IL": 1, "GA": 1, "UT": 1, "CO": 1, "FL": 1, "OH": 1
};

export function getAdjacentTerritories(territoryId) {
    return US_STATE_ADJACENCY[territoryId] || [];
}

export function getTerritoryTerrain(territoryId) {
    const typeKey = STATE_TERRAIN_MAPPING[territoryId] || "PLAINS";
    return TERRAIN_TYPES[typeKey];
}

export const ALL_US_STATES = Object.keys(US_STATE_ADJACENCY);

export function hasSupplyLine(startTerritoryId, endTerritoryId, factionId, territories) {
    if (!endTerritoryId || !territories[startTerritoryId]) return false;
    if (startTerritoryId === endTerritoryId) return true;
    const queue = [startTerritoryId];
    const visited = new Set([startTerritoryId]);
    while (queue.length > 0) {
        const currentId = queue.shift();
        const neighbors = getAdjacentTerritories(currentId);
        for (const neighborId of neighbors) {
            if (neighborId === endTerritoryId) { return true; }
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
    Object.values(territories).forEach(t => {
        if (t.owner === factionId) { visibleIds.add(t.id); ownedIds.push(t.id); }
    });
    ownedIds.forEach(id => {
        const neighbors = getAdjacentTerritories(id);
        neighbors.forEach(nId => visibleIds.add(nId));
    });
    if (scoutedTerritories && Array.isArray(scoutedTerritories)) {
        scoutedTerritories.forEach(id => visibleIds.add(id));
    }
    return visibleIds;
}