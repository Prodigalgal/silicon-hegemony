/* src/context/TerritoryGeometryContext.jsx */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import * as topojson from 'topojson-client';
import { geoAlbersUsa, geoPath } from 'd3-geo';

const FIPS_TO_ABBR = {
    1: "AL", 2: "AK", 4: "AZ", 5: "AR", 6: "CA", 8: "CO", 9: "CT", 10: "DE", 11: "DC",
    12: "FL", 13: "GA", 15: "HI", 16: "ID", 17: "IL", 18: "IN", 19: "IA", 20: "KS",
    21: "KY", 22: "LA", 23: "ME", 24: "MD", 25: "MA", 26: "MI", 27: "MN", 28: "MS",
    29: "MO", 30: "MT", 31: "NE", 32: "NV", 33: "NH", 34: "NJ", 35: "NM", 36: "NY",
    37: "NC", 38: "ND", 39: "OH", 40: "OK", 41: "OR", 42: "PA", 44: "RI", 45: "SC",
    46: "SD", 47: "TN", 48: "TX", 49: "UT", 50: "VT", 51: "VA", 53: "WA", 54: "WV",
    55: "WI", 56: "WY"
};

const TerritoryGeometryContext = createContext(null);

// eslint-disable-next-line react-refresh/only-export-components
export const useTerritoryGeometryContext = () => {
    const context = useContext(TerritoryGeometryContext);
    if (!context) throw new Error("Context Error");
    return context;
};

export const TerritoryGeometryProvider = ({ children }) => {
    const [geometry, setGeometry] = useState({ data: null, loading: true, error: null });

    useEffect(() => {
        const loadData = async () => {
            try {
                console.log("[Geo] Fetching US TopoJSON...");
                const response = await fetch('https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json');
                if (!response.ok) throw new Error("Failed to fetch map data");
                const usData = await response.json();

                console.log("[Geo] Processing Geography...");
                const projection = geoAlbersUsa().scale(1200).translate([480, 300]);
                const features = topojson.feature(usData, usData.objects.states).features;

                const parsedData = {};

                features.forEach(feature => {
                    // [Critical Fix] 强制转换为数字，处理 "01" vs 1 的问题
                    const fips = Number(feature.id);
                    const abbr = FIPS_TO_ABBR[fips];
                    if (!abbr) return;

                    const geometryType = feature.geometry.type;
                    const rawCoords = feature.geometry.coordinates;
                    const polygons = [];

                    const processRing = (ring) => {
                        const flatPoints = [];
                        ring.forEach(coord => {
                            const projected = projection(coord);
                            if (projected) {
                                flatPoints.push(projected[0], projected[1]);
                            }
                        });
                        if (flatPoints.length > 4) polygons.push(flatPoints);
                    };

                    if (geometryType === "Polygon") {
                        processRing(rawCoords[0]);
                    } else if (geometryType === "MultiPolygon") {
                        rawCoords.forEach(poly => processRing(poly[0]));
                    }

                    if (polygons.length > 0) {
                        const centroid = d3_geoCentroid(projection, feature);
                        parsedData[abbr] = {
                            id: abbr,
                            center: centroid,
                            polygons
                        };
                    }
                });

                console.log(`[Geo] Loaded ${Object.keys(parsedData).length} states.`);
                setGeometry({ data: parsedData, loading: false, error: null });

            } catch (err) {
                console.error(err);
                setGeometry({ data: null, loading: false, error: err });
            }
        };

        loadData();
    }, []);

    if (geometry.loading) return <Box sx={{height:'100vh', display:'flex', justifyContent:'center', alignItems:'center', color:'white'}}><CircularProgress />&nbsp;INITIALIZING VECTOR MAP...</Box>;
    if (geometry.error) return <Box sx={{color:'red', p:4}}>Map Error: {geometry.error.message}</Box>;

    return (
        <TerritoryGeometryContext.Provider value={geometry.data}>
            {children}
        </TerritoryGeometryContext.Provider>
    );
};

function d3_geoCentroid(projection, feature) {
    const pathGenerator = geoPath().projection(projection);
    const [x, y] = pathGenerator.centroid(feature);
    return { x, y };
}
