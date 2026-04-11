/* src/pixi/layers/TerritoryLayer.js */
import { Graphics } from 'pixi.js';
import { BaseLayer } from './BaseLayer';
import { COLORS, lerpColor } from '../visualConstants';

export class TerritoryLayer extends BaseLayer {
    constructor(app, rootContainer, callbacks) {
        super(app, rootContainer);
        this.callbacks = callbacks; // { onClick, onHover, onOut, isDraggingGetter }
        this.graphicsMap = new Map();
        this.geometry = null;
        this.hoveredId = null;
        this.interactivityEnabled = true;
    }

    setGeometry(geometryData) {
        this.geometry = geometryData;
        const nextIds = new Set(Object.keys(geometryData));

        this.graphicsMap.forEach((graphics, territoryId) => {
            if (!nextIds.has(territoryId)) {
                this.container.removeChild(graphics);
                graphics.destroy();
                this.graphicsMap.delete(territoryId);
            }
        });

        Object.values(geometryData).forEach((geo) => {
            if (this.graphicsMap.has(geo.id)) {
                return;
            }

            const graphics = new Graphics();
            graphics.label = geo.id;
            graphics.eventMode = this.interactivityEnabled ? 'static' : 'none';
            graphics.cursor = 'pointer';

            graphics.on('pointerover', (event) => this._onHover(geo.id, event));
            graphics.on('pointerout', () => this._onOut(geo.id));
            graphics.on('pointertap', (event) => {
                if (!this.callbacks.getIsDragged()) {
                    this.callbacks.onClick?.(geo.id);
                    event.stopPropagation();
                }
            });

            this.container.addChild(graphics);
            this.graphicsMap.set(geo.id, graphics);
        });
    }

    setInteractionEnabled(enabled) {
        this.interactivityEnabled = enabled;
        this.graphicsMap.forEach((graphics) => {
            graphics.eventMode = enabled ? 'static' : 'none';
        });
        if (!enabled) {
            this.hoveredId = null;
        }
    }

    _onHover(id, event) {
        this.hoveredId = id;
        this.callbacks.onHover?.(id, event);
        // 局部重绘优化？目前先依赖外部触发 update
        // 但为了响应快，我们可以手动触发一次回调给 Renderer
    }

    _onOut(id) {
        if (this.hoveredId === id) {
            this.hoveredId = null;
            this.callbacks.onOut?.(id);
        }
    }

    update(gameState, mapMode, selectedId) {
        if (!this.geometry) return;
        const { territories, factions } = gameState;

        this.graphicsMap.forEach((g, id) => {
            const t = territories[id];
            const geo = this.geometry[id];
            if (!t || !geo) return;

            const owner = t.owner ? factions[t.owner] : null;
            const isSelected = selectedId === id;
            const isHovered = this.hoveredId === id;

            let style = this._calculateStyle(t, owner, mapMode, isSelected, isHovered);

            g.clear();
            g.beginPath();
            geo.polygons.forEach(poly => g.poly(poly));
            g.fill({ color: style.fill, alpha: style.alpha });
            g.stroke({ width: style.strokeWidth, color: style.stroke, alpha: style.strokeAlpha });
        });
    }

    _calculateStyle(t, owner, mapMode, isSelected, isHovered) {
        let fill = COLORS.NEUTRAL_FILL;
        let alpha = 1.0;
        let stroke = 0x98aecd;
        let strokeWidth = 1.15;
        let strokeAlpha = 0.46;

        if (mapMode === 'ECONOMIC') {
            let score = t.money_yield * (0.5 + (t.satisfaction / 100) * 0.75) + (t.civilian_factories || 0) * 50;
            if (owner) score += Math.min(100, (owner.money / 20) * 0.1); // 简化计算
            const intensity = Math.min(1, score / 300);

            if (intensity < 0.5) fill = lerpColor(COLORS.ECO_POOR, COLORS.ECO_MID, intensity * 2);
            else fill = lerpColor(COLORS.ECO_MID, COLORS.ECO_RICH, (intensity - 0.5) * 2);

            if (owner) {
                stroke = parseInt(owner.color.replace('#', '0x'), 16);
                strokeWidth = 1.5;
                strokeAlpha = 0.6;
            } else {
                alpha = 0.6;
            }
            if (intensity > 0.8) { alpha = 1.0; strokeWidth = 2; strokeAlpha = 0.9; }

        } else if (mapMode === 'CYBER') {
            fill = 0x000000;
            alpha = 0.85;
            if (t.server_node_level > 0) {
                const intensity = t.server_node_level / 3;
                stroke = lerpColor(COLORS.CYBER_NODE_LOW, COLORS.CYBER_NODE_HIGH, intensity);
                strokeWidth = 1.5 + intensity;
                strokeAlpha = 0.8 + intensity * 0.2;
                if (owner) { fill = parseInt(owner.color.replace('#', '0x'), 16); alpha = 0.15; }
            } else {
                stroke = 0x004444; strokeWidth = 1; strokeAlpha = 0.4;
            }
            if (isHovered || isSelected) {
                stroke = COLORS.CYBER_NODE_HIGH; strokeWidth = 3; strokeAlpha = 1; fill = 0x002233; alpha = 0.6;
            }

        } else if (mapMode === 'MILITARY') {
            const totalArmy = t.army.regulars + t.army.militia;
            const intensity = Math.min(1, totalArmy / 25000);
            if (totalArmy > 0) {
                fill = lerpColor(COLORS.HEATMAP_LOW, COLORS.HEATMAP_HIGH, intensity);
                alpha = 0.8 + intensity * 0.2;
            } else {
                fill = COLORS.NEUTRAL_FILL; alpha = 0.5;
            }
            if (owner) { stroke = parseInt(owner.color.replace('#', '0x'), 16); strokeWidth = 2; strokeAlpha = 0.8; }

        } else if (mapMode === 'SUPPLY') {
            if (t.has_supply_shortage) { fill = COLORS.SUPPLY_SHORTAGE; alpha = 0.9; }
            else if (t.is_supplied) {
                const ratio = Math.min(1, (t.supply || 0) / 500);
                fill = lerpColor(COLORS.SUPPLY_OK, COLORS.SUPPLY_GOOD, ratio); alpha = 0.7;
            } else {
                fill = COLORS.NEUTRAL_FILL; alpha = 0.4;
            }
            if (owner) { stroke = parseInt(owner.color.replace('#', '0x'), 16); strokeWidth = 1.5; strokeAlpha = 0.5; }

        } else {
            // POLITICAL
            fill = owner ? parseInt(owner.color.replace('#', '0x'), 16) : COLORS.NEUTRAL_FILL;
            alpha = owner ? 0.62 + (t.satisfaction / 100) * 0.34 : 0.42;
        }

        if (mapMode !== 'CYBER') {
            if (isSelected) { stroke = COLORS.HIGHLIGHT_STROKE; strokeWidth = 3; strokeAlpha = 1.0; }
            else if (isHovered) { stroke = 0xFFFFFF; strokeWidth = 2.2; strokeAlpha = 0.88; }
        }

        return { fill, alpha, stroke, strokeWidth, strokeAlpha };
    }
}
