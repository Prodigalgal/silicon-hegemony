/* src/pixi/layers/IconLayer.js */
import { Text, TextStyle } from 'pixi.js';
import { BaseLayer } from './BaseLayer';
import { COLORS } from '../visualConstants';

export class IconLayer extends BaseLayer {
    update(gameState, mapMode) {
        this.container.removeChildren();
        if (!this.geometry) return;

        const { territories } = gameState;
        const currentScale = this.container.parent.scale.x;

        // [v2.4.1 Fix] PixiJS v8 TextStyle syntax: stroke is an object { color, width }
        const baseStyle = new TextStyle({
            fontSize: 14,
            fill: 'white',
            stroke: { color: 'black', width: 3 },
            fontWeight: 'bold'
        });

        const cyberStyle = new TextStyle({
            fontSize: 12,
            fill: COLORS.CYBER_NODE_HIGH,
            stroke: { color: 0x000000, width: 2 },
            fontFamily: 'Courier New'
        });

        const style = mapMode === 'CYBER' ? cyberStyle : baseStyle;

        Object.keys(territories).forEach(id => {
            const t = territories[id];
            const geo = this.geometry[id];
            if(!t || !geo) return;

            const icons = [];
            const lines = [];

            if (t.is_capital) icons.push('👑');
            if (t.generalId) icons.push('⭐');
            if (t.is_blackout) icons.push('🚫');
            if (t.sabotaged_turns > 0) icons.push('💥');

            if (mapMode === 'SUPPLY') {
                if (t.has_supply_shortage) icons.push('⚠️');
                if (t.civilian_factories > 0) icons.push('🏭');
                if (t.supply_depots > 0) icons.push('📦');
            }
            else if (mapMode === 'MILITARY') {
                if (t.fort_level > 0) icons.push(`🛡️${t.fort_level}`);
                const totalArmy = t.army.regulars + t.army.militia;
                if (totalArmy > 0 && (currentScale > 0.6 || totalArmy > 10000)) {
                    lines.push(`${(totalArmy/1000).toFixed(1)}k`);
                }
            }
            else if (mapMode === 'CYBER') {
                if (t.server_node_level > 0) lines.push(`NODE.${t.server_node_level}`);
            }

            let finalStr = icons.join(' ');
            if (lines.length > 0) finalStr += (finalStr ? '\n' : '') + lines.join('\n');

            if (finalStr) {
                if (currentScale < 0.5 && !t.is_capital && !t.has_supply_shortage) return;

                const text = new Text({ text: finalStr, style });
                text.anchor.set(0.5);
                text.x = geo.center.x;
                text.y = geo.center.y;
                this.container.addChild(text);
            }
        });
    }

    setGeometry(geometryData) { this.geometry = geometryData; }
}