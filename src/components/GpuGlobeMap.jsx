import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { AdditiveBlending, BackSide, BufferAttribute, BufferGeometry, DoubleSide, Vector3 } from 'three';
import { useDispatch, useSelector } from 'react-redux';
import { useTerritoryGeometryContext } from '../context/TerritoryGeometryContext';
import { selectMapMode } from '../store/selectors';
import { territorySelected } from '../store/gameSlice';
import {
    buildCenterColorBuffer,
    buildFillColorBuffer,
    buildGpuGlobeGeometry,
    findNearestTerritoryId,
    getTerritoryIdFromFace,
} from '../three/globeGeometry';

const CAMERA_DISTANCE_MIN = 1.9;
const CAMERA_DISTANCE_MAX = 4.7;
const CAMERA_DISTANCE_DEFAULT = 2.85;
const DEG_TO_RAD = Math.PI / 180;

const GpuGlobeMap = ({ data, onTerritoryHover, onTerritoryOut }) => {
    const containerRef = useRef(null);
    const rotateCallbackRef = useRef(null);
    const pointerStateRef = useRef({ dragging: false, lastX: 0, lastY: 0, hasDragged: false });
    const [cameraDistance, setCameraDistance] = useState(CAMERA_DISTANCE_DEFAULT);
    const { territoryCatalog, rotation, rotateBy, isInteracting } = useTerritoryGeometryContext();
    const mapMode = useSelector(selectMapMode);
    const selectedTerritoryId = useSelector(state => state.game.view.selectedTerritory);
    const dispatch = useDispatch();

    useEffect(() => {
        rotateCallbackRef.current = rotateBy;
    }, [rotateBy]);

    useEffect(() => {
        const handlePointerMove = (event) => {
            const pointerState = pointerStateRef.current;
            if (!pointerState.dragging) {
                return;
            }

            const deltaX = event.clientX - pointerState.lastX;
            const deltaY = event.clientY - pointerState.lastY;
            if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
                pointerState.hasDragged = true;
            }

            rotateCallbackRef.current?.(deltaX, deltaY);
            pointerState.lastX = event.clientX;
            pointerState.lastY = event.clientY;
        };

        const handlePointerUp = () => {
            pointerStateRef.current.dragging = false;
        };

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);

        return () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
        };
    }, []);

    const handlePointerDown = (event) => {
        if (event.button !== 0) {
            return;
        }

        pointerStateRef.current = {
            dragging: true,
            lastX: event.clientX,
            lastY: event.clientY,
            hasDragged: false,
        };
    };

    const handleWheel = (event) => {
        event.preventDefault();
        const zoomDirection = event.deltaY > 0 ? 1 : -1;
        setCameraDistance((currentDistance) => {
            const nextDistance = currentDistance + zoomDirection * 0.18;
            return Math.max(CAMERA_DISTANCE_MIN, Math.min(CAMERA_DISTANCE_MAX, nextDistance));
        });
    };

    if (!territoryCatalog) {
        return null;
    }

    return (
        <div
            ref={containerRef}
            onPointerDown={handlePointerDown}
            onWheel={handleWheel}
            style={{ width: '100%', height: '100%', overflow: 'hidden', backgroundColor: '#050608', touchAction: 'none' }}
        >
            <Canvas
                camera={{ position: [0, 0, cameraDistance], fov: 42, near: 0.1, far: 20 }}
                dpr={[1, 2]}
                gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
            >
                <GpuGlobeScene
                    data={data}
                    isInteracting={isInteracting}
                    mapMode={mapMode}
                    onTerritoryClick={(territoryId) => {
                        if (!pointerStateRef.current.hasDragged) {
                            dispatch(territorySelected(territoryId));
                        }
                    }}
                    onTerritoryHover={onTerritoryHover}
                    onTerritoryOut={onTerritoryOut}
                    rotation={rotation}
                    selectedTerritoryId={selectedTerritoryId}
                    territoryCatalog={territoryCatalog}
                />
            </Canvas>
        </div>
    );
};

const GpuGlobeScene = ({
    data,
    isInteracting,
    mapMode,
    onTerritoryClick,
    onTerritoryHover,
    onTerritoryOut,
    rotation,
    selectedTerritoryId,
    territoryCatalog,
}) => {
    const groupRef = useRef(null);
    const hoveredTerritoryRef = useRef(null);
    const [hoveredTerritoryId, setHoveredTerritoryId] = useState(null);
    const globeGeometry = useMemo(
        () => buildGpuGlobeGeometry(territoryCatalog),
        [territoryCatalog],
    );
    const boundaryGeometry = useMemo(() => {
        const geometry = new BufferGeometry();
        geometry.setAttribute('position', new BufferAttribute(globeGeometry.boundaryPositions, 3));
        return geometry;
    }, [globeGeometry.boundaryPositions]);
    const fillGeometry = useMemo(() => {
        const geometry = new BufferGeometry();
        geometry.setAttribute('position', new BufferAttribute(globeGeometry.fillPositions, 3));
        geometry.computeVertexNormals();
        return geometry;
    }, [globeGeometry.fillPositions]);
    const centerGeometry = useMemo(() => {
        const geometry = new BufferGeometry();
        geometry.setAttribute('position', new BufferAttribute(globeGeometry.centerPositions, 3));
        return geometry;
    }, [globeGeometry.centerPositions]);

    const centerColors = useMemo(
        () => buildCenterColorBuffer(
            globeGeometry.centerTerritoryIds,
            data?.territories,
            data?.factions,
            mapMode,
            selectedTerritoryId,
        ),
        [data?.factions, data?.territories, globeGeometry.centerTerritoryIds, mapMode, selectedTerritoryId],
    );
    const fillColors = useMemo(
        () => buildFillColorBuffer(
            globeGeometry.fillTerritoryIdsByFace,
            data?.territories,
            data?.factions,
            mapMode,
            selectedTerritoryId,
            hoveredTerritoryId,
        ),
        [data?.factions, data?.territories, globeGeometry.fillTerritoryIdsByFace, hoveredTerritoryId, mapMode, selectedTerritoryId],
    );

    useEffect(() => {
        fillGeometry.setAttribute('color', new BufferAttribute(fillColors, 3));
        fillGeometry.attributes.color.needsUpdate = true;
    }, [fillColors, fillGeometry]);

    useEffect(() => {
        centerGeometry.setAttribute('color', new BufferAttribute(centerColors, 3));
        centerGeometry.attributes.color.needsUpdate = true;
    }, [centerColors, centerGeometry]);

    useEffect(() => () => {
        boundaryGeometry.dispose();
        fillGeometry.dispose();
        centerGeometry.dispose();
    }, [boundaryGeometry, centerGeometry, fillGeometry]);

    const eulerRotation = useMemo(
        () => [
            -rotation[1] * DEG_TO_RAD,
            rotation[0] * DEG_TO_RAD,
            rotation[2] * DEG_TO_RAD,
        ],
        [rotation],
    );

    const pickTerritory = (event) => {
        if (!groupRef.current || !event.point) {
            return null;
        }

        const localPoint = groupRef.current.worldToLocal(new Vector3().copy(event.point));
        return findNearestTerritoryId(localPoint, globeGeometry.centerVectors, globeGeometry.centerTerritoryIds);
    };

    const pickTerritoryFromFace = (event) => {
        return getTerritoryIdFromFace(globeGeometry.fillTerritoryIdsByFace, event.faceIndex) || pickTerritory(event);
    };

    const handlePointerMove = (event) => {
        event.stopPropagation();

        if (isInteracting) {
            if (hoveredTerritoryRef.current) {
                hoveredTerritoryRef.current = null;
                setHoveredTerritoryId(null);
                onTerritoryOut?.();
            }
            return;
        }

        const territoryId = pickTerritoryFromFace(event);
        if (territoryId === hoveredTerritoryRef.current) {
            return;
        }

        hoveredTerritoryRef.current = territoryId;
        setHoveredTerritoryId(territoryId);
        if (!territoryId) {
            onTerritoryOut?.();
            return;
        }

        const sourceEvent = event.nativeEvent || event.sourceEvent || {};
        onTerritoryHover?.({
            clientX: sourceEvent.clientX,
            clientY: sourceEvent.clientY,
        }, territoryId);
    };

    const handlePointerOut = () => {
        hoveredTerritoryRef.current = null;
        setHoveredTerritoryId(null);
        onTerritoryOut?.();
    };

    const handleClick = (event) => {
        event.stopPropagation();
        const territoryId = pickTerritoryFromFace(event);
        if (territoryId) {
            onTerritoryClick?.(territoryId);
        }
    };

    return (
        <>
            <ambientLight intensity={0.75} />
            <directionalLight position={[3, 2, 5]} intensity={1.35} />
            <group ref={groupRef} rotation={eulerRotation}>
                <mesh onPointerMove={handlePointerOut}>
                    <sphereGeometry args={[1, 96, 64]} />
                    <meshStandardMaterial color={mapMode === 'CYBER' ? '#071724' : '#101a2a'} roughness={0.72} metalness={0.08} />
                </mesh>
                <mesh scale={1.035}>
                    <sphereGeometry args={[1, 96, 64]} />
                    <meshBasicMaterial color={mapMode === 'CYBER' ? '#0ee7ff' : '#73a9ff'} transparent opacity={0.055} side={BackSide} />
                </mesh>
                <mesh geometry={fillGeometry} onClick={handleClick} onPointerMove={handlePointerMove} onPointerOut={handlePointerOut}>
                    <meshBasicMaterial
                        depthWrite={false}
                        opacity={mapMode === 'CYBER' ? 0.34 : 0.48}
                        polygonOffset
                        polygonOffsetFactor={-1}
                        side={DoubleSide}
                        transparent
                        vertexColors
                    />
                </mesh>
                <lineSegments geometry={boundaryGeometry}>
                    <lineBasicMaterial
                        color={mapMode === 'CYBER' ? '#36f1ff' : '#d2dded'}
                        opacity={isInteracting ? 0.42 : 0.74}
                        transparent
                    />
                </lineSegments>
                <points geometry={centerGeometry}>
                    <pointsMaterial
                        size={isInteracting ? 0.009 : 0.013}
                        sizeAttenuation
                        transparent
                        opacity={mapMode === 'CYBER' ? 0.95 : 0.82}
                        vertexColors
                        blending={AdditiveBlending}
                        depthWrite={false}
                    />
                </points>
            </group>
        </>
    );
};

export default React.memo(GpuGlobeMap);
