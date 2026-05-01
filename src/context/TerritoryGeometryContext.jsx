/* src/context/TerritoryGeometryContext.jsx */
import React, { createContext, startTransition, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { geoOrthographic, geoPath } from 'd3-geo';
import { SVG_VIEWBOX_HEIGHT, SVG_VIEWBOX_WIDTH } from '../pixi/visualConstants';
import { buildTerritoryCatalog, setTerritoryCatalog } from '../game/territoryCatalog';

const TerritoryGeometryContext = createContext(null);

// eslint-disable-next-line react-refresh/only-export-components
export const useTerritoryGeometryContext = () => {
    const context = useContext(TerritoryGeometryContext);
    if (!context) throw new Error('Context Error');
    return context;
};

export const TerritoryGeometryProvider = ({ children }) => {
    const [adminRegionDataState, setAdminRegionDataState] = useState({
        featureCollection10m: null,
        loading: true,
        error: null,
    });
    const [rotation, setRotation] = useState([100, -25, 0]);
    const [isInteracting, setIsInteracting] = useState(false);
    const [projectedGeometryEnabled, setProjectedGeometryEnabled] = useState(false);
    const rotationRef = useRef(rotation);
    const animationFrameRef = useRef(null);
    const interactionTimeoutRef = useRef(null);

    useEffect(() => {
        const loadData = async () => {
            try {
                const response10m = await fetch('https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_1_states_provinces.geojson');
                if (!response10m.ok) {
                    throw new Error('Failed to fetch 10m admin region map data');
                }

                const featureCollection10m = await response10m.json();
                setAdminRegionDataState({
                    featureCollection10m,
                    loading: false,
                    error: null,
                });
            } catch (error) {
                console.error(error);
                setAdminRegionDataState({
                    featureCollection10m: null,
                    loading: false,
                    error,
                });
            }
        };

        loadData();
    }, []);

    useEffect(() => {
        rotationRef.current = rotation;
    }, [rotation]);

    const territoryCatalog = useMemo(() => {
        if (!adminRegionDataState.featureCollection10m) {
            return null;
        }

        return buildTerritoryCatalog(adminRegionDataState.featureCollection10m);
    }, [adminRegionDataState.featureCollection10m]);

    useEffect(() => {
        if (territoryCatalog) {
            setTerritoryCatalog(territoryCatalog);
        }
    }, [territoryCatalog]);

    const rotateBy = useCallback((deltaX, deltaY) => {
        const [longitude, latitude, gamma] = rotationRef.current;
        rotationRef.current = [
            normalizeLongitude(longitude + deltaX * 0.28),
            clamp(latitude - deltaY * 0.18, -75, 75),
            gamma,
        ];

        if (!isInteracting) {
            setIsInteracting(true);
        }

        if (interactionTimeoutRef.current !== null) {
            window.clearTimeout(interactionTimeoutRef.current);
        }

        interactionTimeoutRef.current = window.setTimeout(() => {
            interactionTimeoutRef.current = null;
            setIsInteracting(false);
        }, 140);

        if (animationFrameRef.current !== null) {
            return;
        }

        animationFrameRef.current = window.requestAnimationFrame(() => {
            animationFrameRef.current = null;
            const nextRotation = rotationRef.current;
            startTransition(() => {
                setRotation(nextRotation);
            });
        });
    }, [isInteracting]);

    useEffect(() => () => {
        if (animationFrameRef.current !== null) {
            window.cancelAnimationFrame(animationFrameRef.current);
        }

        if (interactionTimeoutRef.current !== null) {
            window.clearTimeout(interactionTimeoutRef.current);
        }
    }, []);

    const geometry = useMemo(() => {
        if (!projectedGeometryEnabled || !adminRegionDataState.featureCollection10m || !territoryCatalog) {
            return null;
        }

        return buildProjectedGeometry(territoryCatalog, rotation, isInteracting);
    }, [adminRegionDataState.featureCollection10m, isInteracting, projectedGeometryEnabled, rotation, territoryCatalog]);

    if (adminRegionDataState.loading) {
        return (
            <Box sx={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'white' }}>
                <CircularProgress />&nbsp;INITIALIZING GLOBE MAP...
            </Box>
        );
    }

    if (adminRegionDataState.error) {
        return <Box sx={{ color: 'red', p: 4 }}>Map Error: {adminRegionDataState.error.message}</Box>;
    }

    return (
        <TerritoryGeometryContext.Provider value={{
            geometry,
            isInteracting,
            projectedGeometryEnabled,
            rotateBy,
            rotation,
            setProjectedGeometryEnabled,
            territoryCatalog,
        }}>
            {children}
        </TerritoryGeometryContext.Provider>
    );
};

function buildProjectedGeometry(territoryCatalog, rotation, isInteracting) {
    const projection = geoOrthographic()
        .rotate(rotation)
        .fitExtent(
            [
                [118, 18],
                [SVG_VIEWBOX_WIDTH - 118, SVG_VIEWBOX_HEIGHT - 18],
            ],
            { type: 'Sphere' },
        );
    const pathGenerator = geoPath().projection(projection);
    const sphereBounds = pathGenerator.bounds({ type: 'Sphere' });
    const globeCenter = {
        x: (sphereBounds[0][0] + sphereBounds[1][0]) / 2,
        y: (sphereBounds[0][1] + sphereBounds[1][1]) / 2,
    };
    const globeRadius = (sphereBounds[1][0] - sphereBounds[0][0]) / 2;
    const territories = {};
    const projectionOptions = isInteracting
        ? {
            samplingStep: 10,
            maxProjectedPolygons: 1,
            minProjectedSize: 3.5,
            fallbackMarkerRadius: 2.6,
        }
        : {
            samplingStep: 1,
            maxProjectedPolygons: Infinity,
            minProjectedSize: 0,
            fallbackMarkerRadius: 0,
        };

    Object.entries(territoryCatalog.featuresById).forEach(([territoryId, displayFeature]) => {
        const polygons = projectFeatureToPolygons(displayFeature, projection, projectionOptions);
        const [x, y] = pathGenerator.centroid(displayFeature);

        if (polygons.length === 0 && projectionOptions.fallbackMarkerRadius > 0 && Number.isFinite(x) && Number.isFinite(y)) {
            polygons.push(createMarkerPolygon(x, y, projectionOptions.fallbackMarkerRadius));
        }

        if (polygons.length === 0) {
            return;
        }

        territories[territoryId] = {
            id: territoryId,
            center: { x, y },
            polygons,
        };
    });

    return {
        territories,
        globe: {
            center: globeCenter,
            radius: globeRadius,
        },
        meta: {
            isInteracting,
            samplingStep: projectionOptions.samplingStep,
        },
    };
}

function projectFeatureToPolygons(feature, projection, options) {
    const geometryType = feature.geometry.type;
    const rawCoords = feature.geometry.coordinates;
    const projectedPolygons = [];

    const processRing = (ring) => {
        const flatPoints = [];
        const step = Math.max(1, options.samplingStep);

        for (let index = 0; index < ring.length; index += step) {
            const coord = ring[index];
            const projected = projection(coord);
            if (projected) {
                flatPoints.push(projected[0], projected[1]);
            }
        }

        const lastCoord = ring[ring.length - 1];
        const projectedLastCoord = projection(lastCoord);
        if (projectedLastCoord) {
            flatPoints.push(projectedLastCoord[0], projectedLastCoord[1]);
        }

        if (flatPoints.length > 4) {
            const bounds = getPolygonBounds(flatPoints);
            const width = bounds.maxX - bounds.minX;
            const height = bounds.maxY - bounds.minY;

            if (Math.max(width, height) >= options.minProjectedSize) {
                projectedPolygons.push({
                    points: flatPoints,
                    score: width * height,
                });
            }
        }
    };

    if (geometryType === 'Polygon') {
        processRing(rawCoords[0]);
    } else if (geometryType === 'MultiPolygon') {
        rawCoords.forEach((poly) => processRing(poly[0]));
    }

    projectedPolygons.sort((left, right) => right.score - left.score);
    return projectedPolygons
        .slice(0, options.maxProjectedPolygons)
        .map((polygon) => polygon.points);
}

function getPolygonBounds(flatPoints) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (let index = 0; index < flatPoints.length; index += 2) {
        const x = flatPoints[index];
        const y = flatPoints[index + 1];
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
    }

    return { minX, minY, maxX, maxY };
}

function createMarkerPolygon(centerX, centerY, radius) {
    return [
        centerX,
        centerY - radius,
        centerX + radius,
        centerY,
        centerX,
        centerY + radius,
        centerX - radius,
        centerY,
    ];
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function normalizeLongitude(value) {
    let normalized = value % 360;

    if (normalized > 180) normalized -= 360;
    if (normalized < -180) normalized += 360;

    return normalized;
}
