/**
 * @file movementHandler.js
 * @description 包含了所有与“移动”相关的行动处理器，如移动军队和运输补给。
 */

import { getAdjacentTerritories } from '../mapUtils.js';

export function handleMove(state, factionId, payload) {
    const { from_territory_id, to_territory_id, army_amount } = payload;
    const from = state.territories[from_territory_id];
    const to = state.territories[to_territory_id];

    if (!from || !to) {
        state.log.unshift({ turn: state.turn.number, factionId, message: `移动失败：无效的领土ID。` });
        return;
    }
    if (from.owner !== factionId || to.owner !== factionId) {
        state.log.unshift({ turn: state.turn.number, factionId, message: `移动失败：只能在自己的领土之间移动。` });
        return;
    }
    if (!getAdjacentTerritories(from.id).includes(to.id)) {
        state.log.unshift({ turn: state.turn.number, factionId, message: `移动失败：领土不相邻。` });
        return;
    }

    const validAmount = Math.max(0, Math.min(from.army.regulars, army_amount || 0));
    if (validAmount <= 0) {
        state.log.unshift({ turn: state.turn.number, factionId, message: `从 ${from_territory_id} 移动失败：没有足够的正规军可供移动。` });
        return;
    }

    from.army.regulars -= validAmount;
    to.army.regulars += validAmount;
    state.log.unshift({ turn: state.turn.number, factionId, message: `从 ${from_territory_id} 移动 ${validAmount} 正规军至 ${to_territory_id}。` });
    console.log(`[日志][MovementHandler] 成功移动 ${validAmount} 正规军从 ${from_territory_id} 到 ${to_territory_id}。`);
}

export function handleMoveSupply(state, factionId, payload) {
    const { from_territory_id, to_territory_id, supply_amount } = payload;
    const from = state.territories[from_territory_id];
    const to = state.territories[to_territory_id];

    if (!from || !to) {
        state.log.unshift({ turn: state.turn.number, factionId, message: `运输补给失败：无效的领土ID。` });
        return;
    }
    if (from.owner !== factionId || to.owner !== factionId) {
        state.log.unshift({ turn: state.turn.number, factionId, message: `运输补给失败：只能在自己的领土之间运输。` });
        return;
    }
    if (!getAdjacentTerritories(from.id).includes(to.id)) {
        state.log.unshift({ turn: state.turn.number, factionId, message: `运输补给失败：领土不相邻。` });
        return;
    }

    const amount = Math.max(0, Math.min(from.supply, supply_amount || 0));
    if (amount <= 0) {
        state.log.unshift({ turn: state.turn.number, factionId, message: `从 ${from_territory_id} 运输补给失败：没有足够的补给。` });
        return;
    }

    from.supply -= amount;
    to.supply += amount;
    state.log.unshift({ turn: state.turn.number, factionId, message: `从 ${from_territory_id} 运输 ${amount} 补给至 ${to_territory_id}。` });
    console.log(`[日志][MovementHandler] 成功运输 ${amount} 补给从 ${from_territory_id} 到 ${to_territory_id}。`);
}
