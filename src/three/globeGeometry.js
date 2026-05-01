import { Color, Vector3 } from 'three';

export const GLOBE_RADIUS = 1;
const DEG_TO_RAD = Math.PI / 180;
const DEFAULT_MAX_BOUNDARY_VERTICES = 900000;
const DEFAULT_MAX_FILL_VERTICES = 650000;
const DEFAULT_BOUNDARY_RADIUS = 1.006;
const DEFAULT_FILL_RADIUS = 1.002;
const DEFAULT_CENTER_RADIUS = 1.018;

export function buildGpuGlobeGeometry(territoryCatalog, options = {}) {
    const featuresById = territoryCatalog?.featuresById || {};
    const definitionsById = territoryCatalog?.definitionsById || {};
    const targetMaxBoundaryVertices = options.targetMaxBoundaryVertices || DEFAULT_MAX_BOUNDARY_VERTICES;
    const targetMaxFillVertices = options.targetMaxFillVertices || DEFAULT_MAX_FILL_VERTICES;
    const boundaryRadius = options.boundaryRadius || DEFAULT_BOUNDARY_RADIUS;
    const fillRadius = options.fillRadius || DEFAULT_FILL_RADIUS;
    const centerRadius = options.centerRadius || DEFAULT_CENTER_RADIUS;
    const ringsByTerritory = [];
    let estimatedBoundaryVertices = 0;
    let estimatedFillVertices = 0;

    Object.entries(featuresById).forEach(([territoryId, feature]) => {
        const rings = extractOuterRings(feature);
        if (rings.length === 0) {
            return;
        }

        ringsByTerritory.push({ territoryId, rings });
        rings.forEach((ring) => {
            estimatedBoundaryVertices += Math.max(0, ring.length - 1) * 2;
            estimatedFillVertices += Math.max(0, ring.length - 1) * 3;
        });
    });

    const boundaryStep = Math.max(1, Math.ceil(estimatedBoundaryVertices / targetMaxBoundaryVertices));
    const fillStep = Math.max(1, Math.ceil(estimatedFillVertices / targetMaxFillVertices));
    const boundaryPositions = [];
    const fillPositions = [];
    const fillTerritoryIdsByFace = [];
    const centerPositions = [];
    const centerTerritoryIds = [];
    const centerVectors = [];

    ringsByTerritory.forEach(({ territoryId, rings }) => {
        rings.forEach((ring) => {
            appendRingSegments(boundaryPositions, ring, boundaryStep, boundaryRadius);
            appendRingFillTriangles(fillPositions, fillTerritoryIdsByFace, ring, fillStep, fillRadius, territoryId);
        });
    });

    Object.entries(definitionsById).forEach(([territoryId, definition]) => {
        if (!Number.isFinite(definition.longitude) || !Number.isFinite(definition.latitude)) {
            return;
        }

        const vector = lonLatToVector3(definition.longitude, definition.latitude, centerRadius);
        centerPositions.push(vector.x, vector.y, vector.z);
        centerTerritoryIds.push(territoryId);
        centerVectors.push(vector.clone().normalize());
    });

    return {
        boundaryPositions: new Float32Array(boundaryPositions),
        fillPositions: new Float32Array(fillPositions),
        fillTerritoryIdsByFace,
        centerPositions: new Float32Array(centerPositions),
        centerTerritoryIds,
        centerVectors,
        meta: {
            boundaryStep,
            fillStep,
            estimatedBoundaryVertices,
            estimatedFillVertices,
            actualBoundaryVertices: boundaryPositions.length / 3,
            actualFillVertices: fillPositions.length / 3,
        },
    };
}

export function buildCenterColorBuffer(centerTerritoryIds, territories, factions, mapMode, selectedTerritoryId) {
    const colors = new Float32Array(centerTerritoryIds.length * 3);
    const color = new Color();

    centerTerritoryIds.forEach((territoryId, index) => {
        const territory = territories?.[territoryId];
        const owner = territory?.owner ? factions?.[territory.owner] : null;
        const isSelected = selectedTerritoryId === territoryId;
        color.setHex(resolveTerritoryColor(territory, owner, mapMode, isSelected));
        color.toArray(colors, index * 3);
    });

    return colors;
}

export function buildFillColorBuffer(fillTerritoryIdsByFace, territories, factions, mapMode, selectedTerritoryId, hoveredTerritoryId) {
    const colors = new Float32Array(fillTerritoryIdsByFace.length * 9);
    const color = new Color();

    fillTerritoryIdsByFace.forEach((territoryId, faceIndex) => {
        const territory = territories?.[territoryId];
        const owner = territory?.owner ? factions?.[territory.owner] : null;
        const isSelected = selectedTerritoryId === territoryId;
        const isHovered = hoveredTerritoryId === territoryId;
        color.setHex(resolveTerritoryColor(territory, owner, mapMode, isSelected, isHovered));

        const offset = faceIndex * 9;
        color.toArray(colors, offset);
        color.toArray(colors, offset + 3);
        color.toArray(colors, offset + 6);
    });

    return colors;
}

export function getTerritoryIdFromFace(fillTerritoryIdsByFace, faceIndex) {
    if (!Number.isInteger(faceIndex) || faceIndex < 0) {
        return null;
    }

    return fillTerritoryIdsByFace[faceIndex] || null;
}

export function findNearestTerritoryId(localPoint, centerVectors, centerTerritoryIds, threshold = 0.988) {
    if (!localPoint || centerVectors.length === 0) {
        return null;
    }

    const normalizedPoint = localPoint.clone().normalize();
    let bestIndex = -1;
    let bestScore = -Infinity;

    centerVectors.forEach((centerVector, index) => {
        const score = normalizedPoint.dot(centerVector);
        if (score > bestScore) {
            bestScore = score;
            bestIndex = index;
        }
    });

    if (bestIndex < 0 || bestScore < threshold) {
        return null;
    }

    return centerTerritoryIds[bestIndex] || null;
}

export function lonLatToVector3(longitude, latitude, radius = GLOBE_RADIUS) {
    const lambda = longitude * DEG_TO_RAD;
    const phi = latitude * DEG_TO_RAD;
    const cosPhi = Math.cos(phi);

    return new Vector3(
        radius * cosPhi * Math.sin(lambda),
        radius * Math.sin(phi),
        radius * cosPhi * Math.cos(lambda),
    );
}

function appendRingSegments(target, ring, step, radius) {
    if (!ring || ring.length < 2) {
        return;
    }

    let previous = ring[0];
    for (let index = step; index < ring.length; index += step) {
        const current = ring[index];
        appendSegment(target, previous, current, radius);
        previous = current;
    }

    const last = ring[ring.length - 1];
    if (previous !== last) {
        appendSegment(target, previous, last, radius);
    }
}

function appendSegment(target, start, end, radius) {
    if (!isCoordinate(start) || !isCoordinate(end)) {
        return;
    }

    const startVector = lonLatToVector3(start[0], start[1], radius);
    const endVector = lonLatToVector3(end[0], end[1], radius);
    target.push(startVector.x, startVector.y, startVector.z, endVector.x, endVector.y, endVector.z);
}

function appendRingFillTriangles(target, faceTerritoryIds, ring, step, radius, territoryId) {
    if (!ring || ring.length < 4) {
        return;
    }

    const sampledCoordinates = [];
    const lastIndex = ring.length - 1;

    for (let index = 0; index < lastIndex; index += step) {
        const coord = ring[index];
        if (isCoordinate(coord)) {
            sampledCoordinates.push(coord);
        }
    }

    if (sampledCoordinates.length < 3) {
        return;
    }

    const center = calculateSphericalCenter(sampledCoordinates, radius);
    const sampledVectors = sampledCoordinates.map((coord) => lonLatToVector3(coord[0], coord[1], radius));

    for (let index = 0; index < sampledVectors.length; index += 1) {
        const current = sampledVectors[index];
        const next = sampledVectors[(index + 1) % sampledVectors.length];

        if (current.distanceToSquared(next) < 0.0000002) {
            continue;
        }

        target.push(
            center.x, center.y, center.z,
            current.x, current.y, current.z,
            next.x, next.y, next.z,
        );
        faceTerritoryIds.push(territoryId);
    }
}

function calculateSphericalCenter(coordinates, radius) {
    const center = new Vector3();

    coordinates.forEach((coord) => {
        center.add(lonLatToVector3(coord[0], coord[1], 1));
    });

    if (center.lengthSq() < 0.000001) {
        return lonLatToVector3(coordinates[0][0], coordinates[0][1], radius);
    }

    return center.normalize().multiplyScalar(radius);
}

function extractOuterRings(feature) {
    const geometry = feature?.geometry || {};

    if (geometry.type === 'Polygon') {
        return geometry.coordinates?.[0] ? [ensureClosedRing(geometry.coordinates[0])] : [];
    }

    if (geometry.type === 'MultiPolygon') {
        return (geometry.coordinates || [])
            .map((polygon) => polygon?.[0] ? ensureClosedRing(polygon[0]) : [])
            .filter((ring) => ring.length > 0);
    }

    return [];
}

function ensureClosedRing(ring = []) {
    if (ring.length === 0) {
        return [];
    }

    const first = ring[0];
    const last = ring[ring.length - 1];
    if (first?.[0] === last?.[0] && first?.[1] === last?.[1]) {
        return ring;
    }

    return [...ring, first];
}

function isCoordinate(point) {
    return Array.isArray(point)
        && Number.isFinite(point[0])
        && Number.isFinite(point[1]);
}

function resolveTerritoryColor(territory, owner, mapMode, isSelected, isHovered = false) {
    if (isSelected) {
        return 0xffd700;
    }

    if (isHovered) {
        return mapMode === 'CYBER' ? 0xffffff : 0xdff6ff;
    }

    if (!territory) {
        return 0x5d6978;
    }

    if (mapMode === 'CYBER') {
        return territory.server_node_level > 0 ? 0x00e5ff : 0x163047;
    }

    if (mapMode === 'MILITARY') {
        const totalArmy = (territory.army?.regulars || 0) + (territory.army?.militia || 0);
        return totalArmy > 0 ? 0xff385f : 0x58616d;
    }

    if (mapMode === 'SUPPLY') {
        if (territory.has_supply_shortage) return 0xff3d00;
        if (territory.is_supplied) return 0x00e676;
        return 0x58616d;
    }

    if (mapMode === 'ECONOMIC') {
        const intensity = Math.min(1, (territory.money_yield || 0) / 260);
        return intensity > 0.68 ? 0xfff176 : intensity > 0.35 ? 0xffb300 : 0x795548;
    }

    return owner?.color ? Number.parseInt(owner.color.replace('#', ''), 16) : 0x6d7887;
}
