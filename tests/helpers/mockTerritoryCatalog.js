import { setTerritoryCatalog } from '../../src/game/territoryCatalog.js';

export function createMockTerritoryCatalog() {
    const definitionsById = {
        Alpha: {
            id: 'Alpha',
            name: 'Alpha',
            latitude: 40,
            longitude: 10,
            terrain: 'PLAINS',
            serverNodeLevel: 2,
            basePopulation: 1200000,
            moneyYield: 140,
        },
        Bravo: {
            id: 'Bravo',
            name: 'Bravo',
            latitude: 15,
            longitude: 20,
            terrain: 'URBAN',
            serverNodeLevel: 3,
            basePopulation: 1600000,
            moneyYield: 180,
        },
        Charlie: {
            id: 'Charlie',
            name: 'Charlie',
            latitude: -10,
            longitude: 35,
            terrain: 'SWAMP',
            serverNodeLevel: 0,
            basePopulation: 800000,
            moneyYield: 90,
        },
        Delta: {
            id: 'Delta',
            name: 'Delta',
            latitude: 55,
            longitude: -5,
            terrain: 'MOUNTAIN',
            serverNodeLevel: 1,
            basePopulation: 950000,
            moneyYield: 100,
        },
    };

    return {
        allTerritoryIds: ['Alpha', 'Bravo', 'Charlie', 'Delta'],
        connectedTerritoryIds: ['Alpha', 'Bravo', 'Charlie'],
        definitionsById,
        adjacencyById: {
            Alpha: ['Bravo'],
            Bravo: ['Alpha', 'Charlie'],
            Charlie: ['Bravo'],
            Delta: [],
        },
        featuresById: {},
    };
}

export function installMockTerritoryCatalog(overrides = {}) {
    const catalog = {
        ...createMockTerritoryCatalog(),
        ...overrides,
    };

    if (overrides.definitionsById) {
        catalog.definitionsById = overrides.definitionsById;
    }

    if (overrides.adjacencyById) {
        catalog.adjacencyById = overrides.adjacencyById;
    }

    if (overrides.allTerritoryIds) {
        catalog.allTerritoryIds = overrides.allTerritoryIds;
    }

    if (overrides.connectedTerritoryIds) {
        catalog.connectedTerritoryIds = overrides.connectedTerritoryIds;
    }

    setTerritoryCatalog(catalog);
    return catalog;
}
