/* src/components/PixiMap.jsx */
import React, { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTerritoryGeometryContext } from '../context/TerritoryGeometryContext';
import { selectMapMode } from '../store/selectors';
import { territorySelected, animationCompleted } from '../store/gameSlice';
import { GameRenderer } from '../pixi/GameRenderer';

const PixiMap = ({ data, onTerritoryHover, onTerritoryOut }) => {
    const containerRef = useRef(null);
    const rendererRef = useRef(null);
    const { geometry, rotateBy, setProjectedGeometryEnabled } = useTerritoryGeometryContext();
    const mapMode = useSelector(selectMapMode);
    const selectedTerritoryId = useSelector(state => state.game.view.selectedTerritory);
    const dispatch = useDispatch();
    const hoverCallbackRef = useRef(onTerritoryHover);
    const outCallbackRef = useRef(onTerritoryOut);
    const rotateCallbackRef = useRef(rotateBy);

    useEffect(() => {
        hoverCallbackRef.current = onTerritoryHover;
        outCallbackRef.current = onTerritoryOut;
    }, [onTerritoryHover, onTerritoryOut]);

    useEffect(() => {
        rotateCallbackRef.current = rotateBy;
    }, [rotateBy]);

    useEffect(() => {
        setProjectedGeometryEnabled?.(true);

        return () => setProjectedGeometryEnabled?.(false);
    }, [setProjectedGeometryEnabled]);

    // 1. 初始化渲染器 (Mount)
    useEffect(() => {
        if (!containerRef.current) return;

        // 创建渲染器
        const renderer = new GameRenderer(containerRef.current, dispatch, {
            onRotate: (deltaX, deltaY) => rotateCallbackRef.current?.(deltaX, deltaY),
        });
        rendererRef.current = renderer;

        // 绑定回调
        renderer.setCallbacks({
            onTerritoryHover: (event, territoryId) => hoverCallbackRef.current?.(event, territoryId),
            onTerritoryOut: () => outCallbackRef.current?.(),
            onTerritoryClick: (id) => dispatch(territorySelected(id)),
            onAnimationComplete: (key) => dispatch(animationCompleted(key))
        });

        // 清理 (Unmount)
        return () => {
            renderer.destroy();
            rendererRef.current = null;
        };
    }, [dispatch]);

    // 2. 同步几何数据
    useEffect(() => {
        if (rendererRef.current && geometry) {
            rendererRef.current.setGeometry(geometry);
        }
    }, [geometry]);

    // 3. 同步游戏状态
    useEffect(() => {
        if (rendererRef.current && data) {
            rendererRef.current.update(data, mapMode, selectedTerritoryId);
        }
    }, [data, mapMode, selectedTerritoryId]);

    // 4. 处理窗口大小调整
    useEffect(() => {
        const handleResize = () => {
            if (containerRef.current && rendererRef.current) {
                const { width, height } = containerRef.current.getBoundingClientRect();
                rendererRef.current.resize(width, height);
            }
        };

        window.addEventListener('resize', handleResize);

        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <div
            ref={containerRef}
            style={{ width: '100%', height: '100%', overflow: 'hidden', backgroundColor: '#050505' }}
        />
    );
};

export default React.memo(PixiMap);
