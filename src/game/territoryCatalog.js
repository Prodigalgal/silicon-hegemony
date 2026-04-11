import { geoArea, geoCentroid } from 'd3-geo';

let territoryCatalog = null;

const EDGE_QUANTIZATION = 10000;

const LEVEL_3_NODE_COUNTRIES = new Set([
    'United States of America',
    'China',
    'Japan',
    'Germany',
    'United Kingdom',
    'India',
    'France',
    'South Korea',
    'Singapore',
]);

const LEVEL_2_NODE_COUNTRIES = new Set([
    'Canada',
    'Brazil',
    'Italy',
    'Spain',
    'Australia',
    'Netherlands',
    'Russia',
    'Mexico',
    'Turkey',
    'Saudi Arabia',
    'Sweden',
    'Switzerland',
    'Poland',
    'Indonesia',
    'United Arab Emirates',
    'Israel',
]);

const URBAN_MICRO_STATES = new Set([
    'Singapore',
    'Macao',
    'Hong Kong',
    'Monaco',
    'Vatican',
    'San Marino',
    'Andorra',
    'Liechtenstein',
    'Luxembourg',
    'Malta',
    'Bahrain',
    'Qatar',
]);

export function buildTerritoryCatalog(adminRegionFeatureCollection) {
    const features = (adminRegionFeatureCollection?.features || []).filter((feature) => feature?.properties?.name);
    const definitionsById = {};
    const adjacencyById = {};
    const featuresById = {};
    const edgeOwners = new Map();

    features.forEach((feature) => {
        const territoryDefinition = buildTerritoryDefinition(feature);
        const territoryId = territoryDefinition.id;

        definitionsById[territoryId] = territoryDefinition;
        adjacencyById[territoryId] = [];
        featuresById[territoryId] = feature;

        extractOuterRings(feature).forEach((ring) => {
            for (let index = 0; index < ring.length - 1; index += 1) {
                const start = ring[index];
                const end = ring[index + 1];
                const edgeKey = createEdgeKey(start, end);

                if (!edgeOwners.has(edgeKey)) {
                    edgeOwners.set(edgeKey, new Set());
                }

                edgeOwners.get(edgeKey).add(territoryId);
            }
        });
    });

    edgeOwners.forEach((owners) => {
        if (owners.size < 2) {
            return;
        }

        const ownerIds = [...owners];
        ownerIds.forEach((ownerId, ownerIndex) => {
            for (let neighborIndex = ownerIndex + 1; neighborIndex < ownerIds.length; neighborIndex += 1) {
                const neighborId = ownerIds[neighborIndex];
                adjacencyById[ownerId].push(neighborId);
                adjacencyById[neighborId].push(ownerId);
            }
        });
    });

    Object.keys(adjacencyById).forEach((territoryId) => {
        adjacencyById[territoryId] = [...new Set(adjacencyById[territoryId])].sort((a, b) => a.localeCompare(b));
    });

    const allTerritoryIds = Object.keys(definitionsById).sort((a, b) => a.localeCompare(b));
    const connectedTerritoryIds = allTerritoryIds.filter((territoryId) => adjacencyById[territoryId]?.length > 0);

    return {
        allTerritoryIds,
        connectedTerritoryIds,
        definitionsById,
        adjacencyById,
        featuresById,
    };
}

export function setTerritoryCatalog(catalog) {
    territoryCatalog = catalog;
}

export function getTerritoryCatalog() {
    return territoryCatalog;
}

export function requireTerritoryCatalog() {
    if (!territoryCatalog) {
        throw new Error('行政区目录尚未初始化。');
    }

    return territoryCatalog;
}

function buildTerritoryDefinition(feature) {
    const properties = feature.properties || {};
    const countryName = properties.admin || properties.adm0_name || properties.geonunit || 'Unknown';
    const regionName = properties.name || properties.name_en || 'Unknown';
    const centroid = geoCentroid(feature);
    const longitude = normalizeLongitude(centroid[0]);
    const latitude = centroid[1];
    const area = geoArea(feature);
    const terrain = deriveTerrainType(countryName, latitude, longitude, area);
    const serverNodeLevel = deriveServerNodeLevel(countryName, area, latitude);
    const climateBand = deriveClimateBand(latitude);
    const economicTier = deriveEconomicTier(area, serverNodeLevel, climateBand);
    const basePopulation = estimatePopulation(area, serverNodeLevel, economicTier);
    const moneyYield = estimateMoneyYield(area, serverNodeLevel, economicTier);
    const displayName = countryName && countryName !== regionName
        ? `${regionName}, ${countryName}`
        : regionName;

    return {
        id: displayName,
        name: displayName,
        regionName,
        countryName,
        code: properties.code_hasc || properties.iso_3166_2 || properties.adm1_code || displayName,
        latitude,
        longitude,
        area,
        terrain,
        climateBand,
        serverNodeLevel,
        economicTier,
        basePopulation,
        moneyYield,
    };
}

function extractOuterRings(feature) {
    const geometry = feature.geometry || {};

    if (geometry.type === 'Polygon') {
        return geometry.coordinates ? [ensureClosedRing(geometry.coordinates[0])] : [];
    }

    if (geometry.type === 'MultiPolygon') {
        return (geometry.coordinates || []).map((polygon) => ensureClosedRing(polygon[0]));
    }

    return [];
}

function ensureClosedRing(ring = []) {
    if (ring.length === 0) {
        return [];
    }

    const first = ring[0];
    const last = ring[ring.length - 1];
    if (first[0] === last[0] && first[1] === last[1]) {
        return ring;
    }

    return [...ring, first];
}

function createEdgeKey(start, end) {
    const left = pointKey(start);
    const right = pointKey(end);
    return left < right ? `${left}|${right}` : `${right}|${left}`;
}

function pointKey(point) {
    return `${Math.round(point[0] * EDGE_QUANTIZATION)},${Math.round(point[1] * EDGE_QUANTIZATION)}`;
}

function deriveTerrainType(countryName, latitude, longitude, area) {
    const absLatitude = Math.abs(latitude);

    if (URBAN_MICRO_STATES.has(countryName) || area < 0.00004) {
        return 'URBAN';
    }

    if (
        absLatitude <= 28
        && (
            (longitude >= -20 && longitude <= 60)
            || (longitude >= 110 && longitude <= 150)
            || (longitude >= -120 && longitude <= -68)
        )
    ) {
        return 'DESERT';
    }

    if (
        absLatitude <= 18
        && (
            (longitude >= -82 && longitude <= -45)
            || (longitude >= 8 && longitude <= 35)
            || (longitude >= 90 && longitude <= 155)
        )
    ) {
        return 'SWAMP';
    }

    if (absLatitude >= 52 || area >= 0.02) {
        return 'MOUNTAIN';
    }

    return 'PLAINS';
}

function deriveServerNodeLevel(countryName, area, latitude) {
    if (LEVEL_3_NODE_COUNTRIES.has(countryName)) {
        return 3;
    }

    if (LEVEL_2_NODE_COUNTRIES.has(countryName)) {
        return 2;
    }

    if (URBAN_MICRO_STATES.has(countryName) || (area < 0.0008 && Math.abs(latitude) < 55)) {
        return 1;
    }

    return 0;
}

function deriveClimateBand(latitude) {
    const absLatitude = Math.abs(latitude);

    if (absLatitude >= 60) return 'POLAR';
    if (absLatitude >= 45) return 'COLD';
    if (absLatitude >= 23) return 'TEMPERATE';
    return 'TROPICAL';
}

function deriveEconomicTier(area, serverNodeLevel, climateBand) {
    if (serverNodeLevel >= 3) return 3;
    if (serverNodeLevel >= 2 || area >= 0.01) return 2;
    if (serverNodeLevel >= 1 || climateBand === 'TEMPERATE') return 1;
    return 0;
}

function estimatePopulation(area, serverNodeLevel, economicTier) {
    const base = Math.max(160000, Math.round(area * 1800000000));
    const nodeMultiplier = 1 + serverNodeLevel * 0.42;
    const economyMultiplier = 1 + economicTier * 0.16;
    return Math.round(base * nodeMultiplier * economyMultiplier);
}

function estimateMoneyYield(area, serverNodeLevel, economicTier) {
    const base = Math.max(24, Math.round(area * 520));
    return base + serverNodeLevel * 32 + economicTier * 18;
}

function normalizeLongitude(value) {
    let normalized = value % 360;

    if (normalized > 180) {
        normalized -= 360;
    }

    if (normalized < -180) {
        normalized += 360;
    }

    return normalized;
}
