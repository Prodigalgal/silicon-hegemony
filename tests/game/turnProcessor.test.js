import test from 'node:test';
import assert from 'node:assert/strict';
import { processEndOfTurn } from '../../src/game/turnProcessor.js';
import { createInitialGameState } from '../../src/game/utils.js';
import { installMockTerritoryCatalog } from '../helpers/mockTerritoryCatalog.js';

test('processEndOfTurn 会让失去补给线的领土进入短缺并产生正规军损耗', () => {
    installMockTerritoryCatalog();

    const state = createInitialGameState([
        { name: 'Faction One', isHuman: true },
    ]);

    Object.values(state.territories).forEach((territory) => {
        territory.owner = null;
        territory.is_capital = false;
        territory.army.regulars = 0;
        territory.army.militia = 0;
        territory.civilian_factories = 0;
        territory.supply = 0;
        territory.satisfaction = 80;
    });

    state.territories.Alpha.owner = 'faction_1';
    state.territories.Alpha.is_capital = true;
    state.territories.Alpha.supply = 1000;

    state.territories.Delta.owner = 'faction_1';
    state.territories.Delta.army.regulars = 1000;
    state.territories.Delta.population = 900000;
    state.territories.Delta.supply = 0;
    state.territories.Delta.civilian_factories = 0;
    state.territories.Delta.supply_depots = 0;

    state.factions.faction_1.totalArmy = { regulars: 1000, militia: 0 };
    state.factions.faction_1.totalPopulation = 2100000;

    processEndOfTurn(state);

    assert.equal(state.territories.Delta.has_supply_shortage, true);
    assert.equal(state.territories.Delta.supply, 0);
    assert.ok(state.territories.Delta.army.regulars < 1000);
});
