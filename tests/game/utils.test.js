import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialGameState } from '../../src/game/utils.js';
import { installMockTerritoryCatalog } from '../helpers/mockTerritoryCatalog.js';

test('createInitialGameState 会基于领土目录创建完整初始状态并为每个势力分配首都', () => {
    installMockTerritoryCatalog();

    const state = createInitialGameState([
        { name: 'Faction One', isHuman: true },
        { name: 'Faction Two', isHuman: false },
    ]);

    assert.equal(Object.keys(state.territories).length, 4);
    assert.equal(Object.keys(state.factions).length, 2);

    const capitals = Object.values(state.territories).filter((territory) => territory.is_capital);
    assert.equal(capitals.length, 2);
    assert.ok(capitals.every((territory) => territory.owner));
    assert.ok(capitals.every((territory) => territory.army.regulars === 25000));
    assert.ok(capitals.every((territory) => territory.supply === 1000));

    const factionOne = state.factions.faction_1;
    const factionTwo = state.factions.faction_2;
    assert.ok(factionOne.totalPopulation > 0);
    assert.ok(factionTwo.totalPopulation > 0);
});
