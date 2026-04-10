/* src/pixi/layers/LinkLayer.js */
import { Graphics } from 'pixi.js';
import { BaseLayer } from './BaseLayer';
import { getAdjacentTerritories } from '../../game/mapUtils';
import { COLORS } from '../visualConstants';

export class LinkLayer extends BaseLayer {
    constructor(app, rootContainer) {
        super(app, rootContainer);
        this.graphics = new Graphics();
        this.container.addChild(this.graphics);
    }

    update(gameState, mapMode) {
        const g = this.graphics;
        g.clear();

        if (!this.geometry) return;
        const { territories, diplomaticTies } = gameState;

        // Helper to safely get centers
        const getCenters = (t1, t2) => {
            const g1 = this.geometry[t1];
            const g2 = this.geometry[t2];
            if (g1 && g2) return [g1.center, g2.center];
            return null;
        };

        if (mapMode === 'CYBER') {
            g.beginPath();
            Object.keys(territories).forEach(t1_id => {
                getAdjacentTerritories(t1_id).forEach(t2_id => {
                    if (t1_id < t2_id) {
                        const points = getCenters(t1_id, t2_id);
                        if (points) g.moveTo(points[0].x, points[0].y).lineTo(points[1].x, points[1].y);
                    }
                });
            });
            g.stroke({ width: 0.5, color: COLORS.CYBER_GRID, alpha: 0.2 });
            return;
        }

        // Supply Lines
        if (mapMode === 'SUPPLY') {
            const drawn = new Set();
            Object.keys(territories).forEach(t1_id => {
                const t1 = territories[t1_id];
                if (!t1.owner) return;
                getAdjacentTerritories(t1_id).forEach(t2_id => {
                    const t2 = territories[t2_id];
                    if (!t2 || t2.owner !== t1.owner) return;

                    const key = [t1_id, t2_id].sort().join('-');
                    if (drawn.has(key)) return;
                    drawn.add(key);

                    // [Critical Fix] Check geometry existence
                    const points = getCenters(t1_id, t2_id);
                    if (!points) return;

                    g.beginPath();
                    g.moveTo(points[0].x, points[0].y).lineTo(points[1].x, points[1].y);
                    const isShortage = t1.has_supply_shortage || t2.has_supply_shortage;
                    g.stroke({ width: isShortage ? 2 : 4, color: isShortage ? COLORS.SUPPLY_SHORTAGE : COLORS.SUPPLY_GOOD, alpha: isShortage ? 0.8 : 0.25 });
                });
            });
        }

        // War Lines
        if (mapMode === 'POLITICAL' || mapMode === 'MILITARY') {
            const drawn = new Set();
            Object.keys(territories).forEach(t1_id => {
                const t1 = territories[t1_id];
                if(!t1.owner) return;
                getAdjacentTerritories(t1_id).forEach(t2_id => {
                    const t2 = territories[t2_id];
                    if(!t2.owner || t1.owner === t2.owner) return;

                    const relation = diplomaticTies[t1.owner]?.[t2.owner];
                    const isAtWar = !relation || (relation.type !== 'NON_AGGRESSION' && relation.type !== 'TRADE_AGREEMENT');
                    if(isAtWar) {
                        const key = [t1_id, t2_id].sort().join('-');
                        if(drawn.has(key)) return;
                        drawn.add(key);

                        // [Critical Fix] Check geometry existence
                        const points = getCenters(t1_id, t2_id);
                        if (!points) return;

                        g.beginPath();
                        g.moveTo(points[0].x, points[0].y).lineTo(points[1].x, points[1].y);
                        g.stroke({ width: 2, color: 0xFF0000, alpha: 0.4 });
                    }
                });
            });
        }
    }

    setGeometry(geometryData) { this.geometry = geometryData; }
}