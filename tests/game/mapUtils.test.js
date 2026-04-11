import test from 'node:test';
import assert from 'node:assert/strict';
import { getVisibleTerritoryIds, hasSupplyLine } from '../../src/game/mapUtils.js';
import { installMockTerritoryCatalog } from '../helpers/mockTerritoryCatalog.js';

test('hasSupplyLine 会沿着己方连通领土找到补给线', () => {
    installMockTerritoryCatalog();

    const territories = {
        Alpha: { id: 'Alpha', owner: 'faction_1' },
        Bravo: { id: 'Bravo', owner: 'faction_1' },
        Charlie: { id: 'Charlie', owner: 'faction_1' },
        Delta: { id: 'Delta', owner: null },
    };

    assert.equal(hasSupplyLine('Charlie', 'Alpha', 'faction_1', territories), true);
});

test('hasSupplyLine 会在中途被非己方领土阻断时返回 false', () => {
    installMockTerritoryCatalog();

    const territories = {
        Alpha: { id: 'Alpha', owner: 'faction_1' },
        Bravo: { id: 'Bravo', owner: 'faction_2' },
        Charlie: { id: 'Charlie', owner: 'faction_1' },
        Delta: { id: 'Delta', owner: null },
    };

    assert.equal(hasSupplyLine('Charlie', 'Alpha', 'faction_1', territories), false);
});

test('getVisibleTerritoryIds 会返回己方、邻接和侦察到的领土', () => {
    installMockTerritoryCatalog();

    const territories = {
        Alpha: { id: 'Alpha', owner: 'faction_1' },
        Bravo: { id: 'Bravo', owner: null },
        Charlie: { id: 'Charlie', owner: 'faction_2' },
        Delta: { id: 'Delta', owner: null },
    };

    const visibleIds = getVisibleTerritoryIds('faction_1', territories, ['Delta']);

    assert.deepEqual([...visibleIds].sort(), ['Alpha', 'Bravo', 'Delta']);
});
