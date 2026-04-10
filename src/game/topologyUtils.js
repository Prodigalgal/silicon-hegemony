/* src/game/topologyUtils.js */

const QUANTIZE_FACTOR = 2;

const pointKey = (p) => `${Math.round(p.x * QUANTIZE_FACTOR)},${Math.round(p.y * QUANTIZE_FACTOR)}`;

const edgeKey = (p1, p2) => {
    const k1 = pointKey(p1);
    const k2 = pointKey(p2);
    return k1 < k2 ? `${k1}|${k2}` : `${k2}|${k1}`;
};

// 静态拓扑提取 (用于海岸线和固定州界) - 保持不变，只运行一次
export function extractTopology(geometryData) {
    // ... (保持原有代码不变)
    const edgeCounts = new Map();
    const edgeSegments = new Map();
    Object.values(geometryData).forEach(geo => {
        geo.polygons.forEach(poly => {
            for (let i = 0; i < poly.length; i += 2) {
                const x1 = poly[i]; const y1 = poly[i + 1];
                const x2 = (i + 2 < poly.length) ? poly[i + 2] : poly[0];
                const y2 = (i + 2 < poly.length) ? poly[i + 3] : poly[1];
                if (Math.hypot(x1 - x2, y1 - y2) < 1) continue;
                const p1 = { x: x1, y: y1 }; const p2 = { x: x2, y: y2 };
                const key = edgeKey(p1, p2);
                edgeCounts.set(key, (edgeCounts.get(key) || 0) + 1);
                if (!edgeSegments.has(key)) edgeSegments.set(key, [p1, p2]);
            }
        });
    });
    const coastlines = [];
    const borders = [];
    edgeCounts.forEach((count, key) => {
        const segment = edgeSegments.get(key);
        if (count === 1) coastlines.push(segment);
        else if (count >= 2) borders.push(segment);
    });
    return { coastlines, borders };
}

/**
 * [v2.6 New] 动态前线提取器
 * 根据当前的领土所有权，识别出不同势力之间的边界。
 */
export function extractFrontlines(geometryData, territories) {
    const edgeOwners = new Map(); // Key: EdgeKey, Value: Set<OwnerID>
    const edgeSegments = new Map();

    // 1. 遍历所有领土，记录每条边所属的势力
    Object.values(geometryData).forEach(geo => {
        const territory = territories[geo.id];
        // 如果领土无主（中立），我们视其 owner 为 null 或 "NEUTRAL"
        // 但为了绘制前线，我们通常关心的是 "有主 vs 有主" 或 "有主 vs 中立"
        const owner = territory?.owner || "NEUTRAL";

        geo.polygons.forEach(poly => {
            for (let i = 0; i < poly.length; i += 2) {
                const x1 = poly[i]; const y1 = poly[i + 1];
                const x2 = (i + 2 < poly.length) ? poly[i + 2] : poly[0];
                const y2 = (i + 2 < poly.length) ? poly[i + 3] : poly[1];
                if (Math.hypot(x1 - x2, y1 - y2) < 1) continue;

                const p1 = { x: x1, y: y1 };
                const p2 = { x: x2, y: y2 };
                const key = edgeKey(p1, p2);

                if (!edgeOwners.has(key)) edgeOwners.set(key, new Set());
                edgeOwners.get(key).add(owner);

                if (!edgeSegments.has(key)) edgeSegments.set(key, [p1, p2]);
            }
        });
    });

    const frontlines = []; // 敌对边界 (不同势力之间)
    const neutralBorders = []; // 势力与中立区边界

    edgeOwners.forEach((owners, key) => {
        // 只有当一条边被两个不同的区域共享时，才可能是边界
        if (owners.size === 2) {
            const ownersArray = Array.from(owners);
            const o1 = ownersArray[0];
            const o2 = ownersArray[1];

            // 如果两边所有者不同
            if (o1 !== o2) {
                const segment = edgeSegments.get(key);

                // 情况 A: 一方是中立 (Frontier)
                if (o1 === "NEUTRAL" || o2 === "NEUTRAL") {
                    neutralBorders.push(segment);
                }
                // 情况 B: 双方都是势力 (War Front)
                else {
                    frontlines.push(segment);
                }
            }
        }
    });

    return { frontlines, neutralBorders };
}