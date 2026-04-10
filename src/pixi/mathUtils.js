/* src/pixi/mathUtils.js */

/**
 * 计算二次贝塞尔曲线上的点
 * B(t) = (1-t)^2 * P0 + 2(1-t)t * P1 + t^2 * P2
 */
export function getQuadraticBezierPoint(t, p0, p1, p2) {
    const oneMinusT = 1 - t;
    return {
        x: oneMinusT * oneMinusT * p0.x + 2 * oneMinusT * t * p1.x + t * t * p2.x,
        y: oneMinusT * oneMinusT * p0.y + 2 * oneMinusT * t * p1.y + t * t * p2.y
    };
}

/**
 * 计算二次贝塞尔曲线在 t 处的切线角度
 * B'(t) = 2(1-t)(P1 - P0) + 2t(P2 - P1)
 */
export function getQuadraticBezierAngle(t, p0, p1, p2) {
    const dx = 2 * (1 - t) * (p1.x - p0.x) + 2 * t * (p2.x - p1.x);
    const dy = 2 * (1 - t) * (p1.y - p0.y) + 2 * t * (p2.y - p1.y);
    return Math.atan2(dy, dx);
}

/**
 * 计算两点间的中点，并添加随机垂直偏移，作为贝塞尔曲线的控制点
 * 这样可以让直线变曲线，且多条线不重叠
 */
export function getControlPoint(p0, p2, offsetScale = 0.2) {
    const midX = (p0.x + p2.x) / 2;
    const midY = (p0.y + p2.y) / 2;
    const dx = p2.x - p0.x;
    const dy = p2.y - p0.y;

    // 计算法向量 (-dy, dx)
    const normalX = -dy;
    const normalY = dx;

    // 随机偏移方向 (1 或 -1)，基于坐标哈希保持确定性但看起来随机
    const seed = (p0.x + p2.y) % 2 > 1 ? 1 : -1;

    // 偏移量
    const offsetX = normalX * offsetScale * seed;
    const offsetY = normalY * offsetScale * seed;

    return {
        x: midX + offsetX,
        y: midY + offsetY
    };
}
