/**
 * @file utils.js
 * @description 提供游戏核心的工具函数。
 * [v1.6] 初始化赛博网络和危机状态。
 */
import { BASE_ACTION_POINTS } from './constants.js';
import { getAllTerritories, getConnectedTerritories, getTerritoryDefinition } from './mapUtils.js';

export function createInitialGameState(factionsConfig) {
    const allTerritories = getAllTerritories();
    const connectedTerritories = getConnectedTerritories();

    const initialState = {
        gameStatus: 'running',
        turnSeed: Date.now(),
        activeFactionId: 'faction_1',
        factions: {},
        territories: {},
        log: [],
        diplomaticTies: {},
        diplomaticProposals: [],
        coalitionTarget: null,
        thoughtBubble: null,
        animationQueue: [],
        winner: null,
        // [v1.6] 当前活动危机
        activeCrisis: null, // { type: 'THE_AWAKENING', duration: 5, data: {} }
        turn: {
            number: 1,
            factionId: 'faction_1',
            phase: 'planning',
            season: 0,
        },
    };

    initialState.territories = allTerritories.reduce((acc, id) => {
        const definition = getTerritoryDefinition(id);
        const terrainType = definition?.terrain || 'PLAINS';
        const nodeLevel = definition?.serverNodeLevel || 0;
        const basePopulation = definition?.basePopulation || 500000;
        const baseMoneyYield = definition?.moneyYield || 50;

        acc[id] = {
            id,
            name: definition?.name || id,
            owner: null,
            terrain: terrainType,
            latitude: definition?.latitude || 0,
            longitude: definition?.longitude || 0,
            server_node_level: nodeLevel,
            population: basePopulation,
            army: { regulars: 0, militia: 0 },
            satisfaction: 70,
            money_yield: baseMoneyYield,
            factories: 0,
            civilian_factories: 0,
            fort_level: 0,
            propaganda_towers: 0,
            lobbying_fatigue: 0,
            is_capital: false,
            is_supplied: false,
            sabotaged_turns: 0,
            lost_militia: 0,
            supply: 0,
            has_supply_shortage: false,
            supply_depots: 0,
            generalId: null,
            // [v1.6] 停电状态 (本回合有效)
            is_blackout: false,
        };
        return acc;
    }, {});

    const factionColors = ["#e6194b", "#3cb44b", "#ffe119", "#4363d8", "#f58231", "#911eb4", "#46f0f0", "#f032e6"];

    factionsConfig.forEach((config, i) => {
        const factionId = `faction_${i + 1}`;
        initialState.factions[factionId] = {
            id: factionId,
            name: config.name,
            isHuman: config.isHuman,
            money: 1000,
            // [v1.6] 算力资源
            computing_power: 50, // 初始赠送少量
            totalArmy: { regulars: 0, militia: 0 },
            totalPopulation: 0,
            color: factionColors[i % factionColors.length],
            actionPoints: BASE_ACTION_POINTS,
            tax_rate: 'MEDIUM',
            scouted_territories: [],
            longTermGoal: "",
            shortTermObjective: "",
            avgSatisfaction: 75,
            reputation_penalty: { turns: 0, value: 0 },
            attack_bonus: 0.0,
            doctrine: null,
            techLevel: 0,
            generals: [],
        };
        initialState.diplomaticTies[factionId] = {};
    });

    const availableTerritories = connectedTerritories.length > 0
        ? [...connectedTerritories]
        : [...allTerritories];
    Object.keys(initialState.factions).forEach(factionId => {
        const randomIndex = Math.floor(Math.random() * availableTerritories.length);
        const capitalId = availableTerritories.splice(randomIndex, 1)[0];

        const capital = initialState.territories[capitalId];
        capital.owner = factionId;
        capital.population = Math.round(capital.population * 1.35);
        capital.army.regulars = 25000;
        capital.factories = capital.server_node_level >= 2 ? 2 : 1;
        capital.civilian_factories = capital.server_node_level >= 1 ? 2 : 1;
        capital.satisfaction = 80;
        capital.is_capital = true;
        capital.supply = 1000;
    });

    allTerritories
        .filter((territoryId) => !Object.values(initialState.factions).some((faction) => initialState.territories[territoryId]?.owner === faction.id))
        .forEach(territoryId => {
        const neutralTerritory = initialState.territories[territoryId];
        neutralTerritory.owner = null;
        neutralTerritory.army.militia = Math.max(1200, Math.round(neutralTerritory.population * 0.004));
        neutralTerritory.satisfaction = 50;
    });

    Object.values(initialState.factions).forEach(faction => {
        Object.assign(faction, calculateFactionTotals(faction.id, initialState.territories));
    });

    initialState.log.unshift({ turn: 1, message: `模拟开始！当前季节：春季` });

    return initialState;
}

export function calculateFactionTotals(factionId, territories) {
    let totalArmy = { regulars: 0, militia: 0 };
    let totalPopulation = 0;
    for (const territory of Object.values(territories)) {
        if (territory.owner === factionId) {
            totalArmy.regulars += territory.army.regulars;
            totalArmy.militia += territory.army.militia;
            totalPopulation += territory.population;
        }
    }
    return { totalArmy, totalPopulation };
}
