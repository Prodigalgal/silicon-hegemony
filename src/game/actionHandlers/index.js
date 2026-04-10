/**
 * @file index.js
 * @description actionHandlers的入口文件。
 * [v1.6] 注册赛博行动处理器。
 */

import { ACTION_TYPES } from '../../game/constants';
import { handleAttack } from './attackHandler';
import { handleMove, handleMoveSupply } from './movementHandler.js';
import { handleBuildFactory, handleBuildCivilianFactory, handleBuildFortification, handleBuildPropagandaTower, handleBuildSupplyDepot } from './buildHandler.js';
import { handleRecruit, handlePropaganda, handleLobbying, handleSetTaxRate, handleResearchAttack } from './politicalHandler';
import { handleProposeNonAggressionPact, handleProposeTradeAgreement, handleDiplomaticResponses } from './diplomacyHandler';
import { handleScout, handleEspionage } from './espionageHandler';
import { handleChooseDoctrine, handleResearchDoctrine } from './techHandler';
import { handleRecruitGeneral, handleMoveGeneral } from './commanderHandler';
import { handleCyberAttack } from './cyberHandler'; // [v1.6]

export const actionHandlers = {
    [ACTION_TYPES.ATTACK]: handleAttack,
    [ACTION_TYPES.MOVE]: handleMove,
    [ACTION_TYPES.MOVE_SUPPLY]: handleMoveSupply,
    [ACTION_TYPES.RECRUIT]: handleRecruit,

    [ACTION_TYPES.BUILD_FACTORY]: handleBuildFactory,
    [ACTION_TYPES.BUILD_CIVILIAN_FACTORY]: handleBuildCivilianFactory,
    [ACTION_TYPES.BUILD_FORTIFICATION]: handleBuildFortification,
    [ACTION_TYPES.BUILD_PROPAGANDA_TOWER]: handleBuildPropagandaTower,
    [ACTION_TYPES.BUILD_SUPPLY_DEPOT]: handleBuildSupplyDepot,

    [ACTION_TYPES.PROPAGANDA]: handlePropaganda,
    [ACTION_TYPES.LOBBYING]: handleLobbying,
    [ACTION_TYPES.SET_TAX_RATE]: handleSetTaxRate,
    [ACTION_TYPES.RESEARCH_ATTACK]: handleResearchAttack,

    [ACTION_TYPES.PROPOSE_NON_AGGRESSION_PACT]: handleProposeNonAggressionPact,
    [ACTION_TYPES.PROPOSE_TRADE_AGREEMENT]: handleProposeTradeAgreement,

    [ACTION_TYPES.SCOUT]: handleScout,
    [ACTION_TYPES.ESPIONAGE]: handleEspionage,

    [ACTION_TYPES.CHOOSE_DOCTRINE]: handleChooseDoctrine,
    [ACTION_TYPES.RESEARCH_DOCTRINE]: handleResearchDoctrine,
    [ACTION_TYPES.RECRUIT_GENERAL]: handleRecruitGeneral,
    [ACTION_TYPES.MOVE_GENERAL]: handleMoveGeneral,

    // [v1.6]
    [ACTION_TYPES.CYBER_ATTACK_BLACKOUT]: handleCyberAttack,
    [ACTION_TYPES.CYBER_ATTACK_HEIST]: handleCyberAttack,
    [ACTION_TYPES.CYBER_ATTACK_DEEPFAKE]: handleCyberAttack,
};

export { handleDiplomaticResponses };