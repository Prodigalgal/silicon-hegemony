// src/game/actionHandlers/diplomacyHandler.js
import { PACT_DURATION } from '../constants.js';

export function handleProposeDiplomacy(state, factionId, payload, type) {
    const { to_faction_id } = payload;
    const to_faction = state.factions[to_faction_id];
    if (!to_faction) { state.log.unshift({ turn: state.turn, factionId, message: `${type}提议失败：无效的目标势力。`}); return; }

    const proposalType = type === 'TRADE' ? 'TRADE_AGREEMENT' : 'NON_AGGRESSION_PACT';
    const existing = state.diplomaticProposals.find(p => p.from === factionId && p.to === to_faction_id && p.type === proposalType);
    if(existing) { state.log.unshift({ turn: state.turn, factionId, message: `${type}提议失败：已存在相同的待定提议。`}); return; }

    state.diplomaticProposals.push({ from: factionId, to: to_faction_id, type: proposalType });
    state.log.unshift({ turn: state.turn, factionId, message: `向 ${to_faction.name} 提出了${type === 'TRADE' ? '贸易协定' : '互不侵犯条约'}。` });
}

export const handleProposeNonAggressionPact = (state, factionId, payload) => handleProposeDiplomacy(state, factionId, payload, 'NON_AGGRESSION');
export const handleProposeTradeAgreement = (state, factionId, payload) => handleProposeDiplomacy(state, factionId, payload, 'TRADE');

export function handleDiplomaticResponses(state, factionId, responses) {
    if (!responses) return;
    responses.forEach(res => {
        const proposalIndex = state.diplomaticProposals.findIndex(
            p => p.to === factionId && p.from === res.from_faction_id && p.type.includes(res.proposal_type)
        );
        if (proposalIndex > -1) {
            const proposal = state.diplomaticProposals[proposalIndex];
            const proposer = state.factions[proposal.from];
            if (res.response === 'ACCEPT') {
                let pactType, duration, message;
                if(proposal.type === 'NON_AGGRESSION_PACT') {
                    pactType = 'NON_AGGRESSION';
                    duration = PACT_DURATION;
                    message = `${state.factions[factionId].name} 接受了来自 ${proposer.name} 的互不侵犯条约。`;
                } else if (proposal.type === 'TRADE_AGREEMENT') {
                    pactType = 'TRADE_AGREEMENT';
                    duration = Infinity;
                    message = `${state.factions[factionId].name} 接受了来自 ${proposer.name} 的贸易协定。`;
                }
                state.diplomaticTies[proposal.from][proposal.to] = { type: pactType, turns_left: duration };
                state.diplomaticTies[proposal.to][proposal.from] = { type: pactType, turns_left: duration };
                state.log.unshift({ turn: state.turn, factionId, message });
            } else {
                state.log.unshift({ turn: state.turn, factionId, message: `${state.factions[factionId].name} 拒绝了来自 ${proposer.name} 的 ${proposal.type}。`});
            }
            state.diplomaticProposals.splice(proposalIndex, 1);
        }
    });
}
