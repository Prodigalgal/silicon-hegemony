/**
 * @file battleUtils.js
 * @description 提供战斗计算中可复用的辅助函数。
 * 将这些通用逻辑抽离出来，有助于保持attackHandler的清晰和专注。
 */

/**
 * 创建一个确定性的伪随机数生成器。
 * 相同的种子总会产生相同的随机数序列，这对于可复现的游戏逻辑至关重要。
 * @param {string | number} seed - 用于生成随机序列的种子。
 * @returns {function(): number} 一个返回[0, 1)之间浮点数的函数。
 */
export function createDeterministicRandom(seed) {
    let h = 1779033703 ^ seed.toString().length;
    for(let i = 0; i < seed.toString().length; i++) {
        h = Math.imul(h ^ seed.toString().charCodeAt(i), 3432918353);
        h = h << 13 | h >>> 19;
    }
    return function() {
        h = Math.imul(h ^ h >>> 16, 2246822507);
        h = Math.imul(h ^ h >>> 13, 3266489909);
        return ((h ^= h >>> 16) >>> 0) / 4294967296;
    }
}

/**
 * 模拟掷2个六面骰，并根据结果计算战斗修正系数。
 * @param {function(): number} seededRandom - 一个确定性的随机数生成器。
 * @returns {{modifier: number, roll: number}} 包含修正系数和骰子点数的对象。
 */
export function getBattleModifier(seededRandom) {
    // 模拟掷两个骰子
    const dice1 = 1 + Math.floor(seededRandom() * 6);
    const dice2 = 1 + Math.floor(seededRandom() * 6);
    const rollSum = dice1 + dice2; // 点数和范围 [2, 12]

    // 将点数和映射到 [0.7, 1.3] 的修正范围内
    // 2点 -> 0.7, 7点 -> 1.0, 12点 -> 1.3
    const modifier = 0.7 + ((rollSum - 2) / 10) * 0.6;
    return { modifier: parseFloat(modifier.toFixed(2)), roll: rollSum };
}

/**
 * 根据正规军和民兵的比例，将总战损分配到两类兵种上。
 * @param {{regulars: number, militia: number}} armyObj - 包含正规军和民兵数量的对象。
 * @param {number} totalLosses - 需要分配的总损失数量。
 * @returns {{regularLoss: number, militiaLoss: number}} 包含各类兵种损失数量的对象。
 */
export function distributeLosses(armyObj, totalLosses) {
    const totalArmy = armyObj.regulars + armyObj.militia;
    if (totalArmy === 0) return { regularLoss: 0, militiaLoss: 0 };

    // 优先损失民兵
    const militiaLoss = Math.min(armyObj.militia, totalLosses);
    const remainingLosses = totalLosses - militiaLoss;
    const regularLoss = Math.min(armyObj.regulars, remainingLosses);

    // 如果还有剩余损失（不太可能发生），确保总损失正确
    const finalMilitiaLoss = totalLosses - regularLoss;

    return { regularLoss, militiaLoss: finalMilitiaLoss };
}