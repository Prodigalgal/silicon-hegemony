import test from 'node:test';
import assert from 'node:assert/strict';
import { GameEngine } from '../../src/engine/GameEngine.js';
import { ACTION_TYPES } from '../../src/game/constants.js';
import { createInitialGameState } from '../../src/game/utils.js';
import { installMockTerritoryCatalog } from '../helpers/mockTerritoryCatalog.js';

test('GameEngine 对非法行动会执行 1 AP 惩罚并记录日志', () => {
    installMockTerritoryCatalog();
    const engine = new GameEngine();
    const initialState = createInitialGameState([
        { name: 'Faction One', isHuman: true },
        { name: 'Faction Two', isHuman: true },
    ]);
    const preparedState = engine.prepareTurn(initialState, 'faction_1');
    const originalAp = preparedState.factions.faction_1.actionPoints;

    const nextState = engine.processTurnForFaction(preparedState, {
        factionId: 'faction_1',
        actions: [{ type: ACTION_TYPES.RECRUIT }],
        justification: 'invalid',
        diplomatic_responses: [],
    });

    assert.equal(nextState.factions.faction_1.actionPoints, originalAp - 1);
    assert.match(nextState.log[0].message, /被惩罚扣除 1 AP/);
});

test('GameEngine completeTurnForFaction 会切换到下一个势力并准备新回合', () => {
    installMockTerritoryCatalog();
    const engine = new GameEngine();
    const initialState = createInitialGameState([
        { name: 'Faction One', isHuman: true },
        { name: 'Faction Two', isHuman: false },
    ]);
    const preparedState = engine.prepareTurn(initialState, 'faction_1');

    const nextState = engine.completeTurnForFaction(preparedState, 'faction_1');

    assert.equal(nextState.activeFactionId, 'faction_2');
    assert.equal(nextState.turn.factionId, 'faction_2');
    assert.equal(nextState.gameStatus, 'awaiting_ai_input');
    assert.ok(nextState.factions.faction_2.actionPoints > 0);
});
