/* src/pixi/visualConstants.js */
// 视图常量
export const SVG_VIEWBOX_WIDTH = 959;
export const SVG_VIEWBOX_HEIGHT = 593;
export const ZOOM_MIN = 0.1;
export const ZOOM_MAX = 10.0;

// 调色板
export const COLORS = {
    // Supply
    SUPPLY_GOOD: 0x00E676,
    SUPPLY_OK: 0xFFEA00,
    SUPPLY_BAD: 0xFF3D00,
    SUPPLY_SHORTAGE: 0xD50000,

    // Cyber
    CYBER_BG: 0x020204,
    CYBER_GRID: 0x004080,
    CYBER_NODE_LOW: 0x00E5FF,
    CYBER_NODE_HIGH: 0xFF4081,

    // Military
    HEATMAP_LOW: 0x1a1a1a,
    HEATMAP_HIGH: 0xFF1744,

    // Economic
    ECO_POOR: 0x3E2723,
    ECO_MID: 0xFFB300,
    ECO_RICH: 0xFFFF8D,

    BACKGROUND: 0x050608,
    NEUTRAL_FILL: 0x15171a,
    NEUTRAL_STROKE: 0x2a2f35,
    HIGHLIGHT_STROKE: 0xFFD700,

    // 战术颜色 (Tactical Colors)
    TACTICAL_ATTACK: 0xD50000, // 鲜血红，代表进攻
    TACTICAL_MOVE: 0x00B0FF,   // 战术蓝，代表机动
    TACTICAL_BUILD: 0x00E676,  // 建设绿
    TACTICAL_ESPIONAGE: 0xAA00FF, // 谍报紫
};

// 颜色插值工具
export function lerpColor(a, b, amount) {
    const ar = (a >> 16), ag = (a >> 8) & 0xff, ab = a & 0xff;
    const br = (b >> 16), bg = (b >> 8) & 0xff, bb = b & 0xff;
    const rr = ar + amount * (br - ar);
    const rg = ag + amount * (bg - ag);
    const rb = ab + amount * (bb - ab);
    return ((rr << 16) | (rg << 8) | (rb | 0));
}