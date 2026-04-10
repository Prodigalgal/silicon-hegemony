/**
 * @file constants.js
 * @description [v1.7.1] 调整季节周期。
 */

import { ALL_US_STATES } from './mapUtils';

export const SERVER_URL = 'http://localhost:8080';
export const WEBSOCKET_URL = `${SERVER_URL}/ws-entry`;

export const MAP_BASE_WIDTH = 959;
export const MAP_BASE_HEIGHT = 593;

// ... (ACTION_TYPES, ESPIONAGE_SUBTYPES, ALL_TERRITORIES, COSTS, ACTION_POINT_COSTS 保持不变) ...

export const ACTION_TYPES = {
    RECRUIT: 'RECRUIT',
    ATTACK: 'ATTACK',
    MOVE: 'MOVE',
    BUILD_FACTORY: 'BUILD_FACTORY',
    BUILD_FORTIFICATION: 'BUILD_FORTIFICATION',
    PROPAGANDA: 'PROPAGANDA',
    BUILD_PROPAGANDA_TOWER: 'BUILD_PROPAGANDA_TOWER',
    PROPOSE_NON_AGGRESSION_PACT: 'PROPOSE_NON_AGGRESSION_PACT',
    PROPOSE_TRADE_AGREEMENT: 'PROPOSE_TRADE_AGREEMENT',
    SCOUT: 'SCOUT',
    SET_TAX_RATE: 'SET_TAX_RATE',
    LOBBYING: 'LOBBYING',
    ESPIONAGE: 'ESPIONAGE',
    BUILD_CIVILIAN_FACTORY: 'BUILD_CIVILIAN_FACTORY',
    RESEARCH_ATTACK: 'RESEARCH_ATTACK',
    MOVE_SUPPLY: 'MOVE_SUPPLY',
    BUILD_SUPPLY_DEPOT: 'BUILD_SUPPLY_DEPOT',
    CHOOSE_DOCTRINE: 'CHOOSE_DOCTRINE',
    RESEARCH_DOCTRINE: 'RESEARCH_DOCTRINE',
    RECRUIT_GENERAL: 'RECRUIT_GENERAL',
    MOVE_GENERAL: 'MOVE_GENERAL',
    CYBER_ATTACK_BLACKOUT: 'CYBER_ATTACK_BLACKOUT',
    CYBER_ATTACK_HEIST: 'CYBER_ATTACK_HEIST',
    CYBER_ATTACK_DEEPFAKE: 'CYBER_ATTACK_DEEPFAKE',
};

export const ESPIONAGE_SUBTYPES = {
    SABOTAGE: 'SABOTAGE',
    INCITE_UNREST: 'INCITE_UNREST',
    STEAL_FUNDS: 'STEAL_FUNDS',
};

export const ALL_TERRITORIES = ALL_US_STATES;

export const COSTS = {
    BUILD_FACTORY: 500,
    BUILD_FORTIFICATION: 250,
    PROPAGANDA: 100,
    SCOUT: 150,
    BUILD_PROPAGANDA_TOWER: 400,
    LOBBYING: 300,
    ESPIONAGE: 750,
    BUILD_CIVILIAN_FACTORY: 300,
    RESEARCH_ATTACK_BASE: 700,
    BUILD_SUPPLY_DEPOT: 200,
    RECRUIT_GENERAL: 1000,
    DOCTRINE_LEVEL_BASE: 1000,
    CYBER_BLACKOUT: 50,
    CYBER_HEIST: 100,
    CYBER_DEEPFAKE: 300
};

export const ACTION_POINT_COSTS = {
    [ACTION_TYPES.RECRUIT]: 1,
    [ACTION_TYPES.ATTACK]: 1,
    [ACTION_TYPES.MOVE]: 1,
    [ACTION_TYPES.BUILD_FACTORY]: 1,
    [ACTION_TYPES.BUILD_FORTIFICATION]: 1,
    [ACTION_TYPES.PROPAGANDA]: 1,
    [ACTION_TYPES.PROPOSE_NON_AGGRESSION_PACT]: 1,
    [ACTION_TYPES.PROPOSE_TRADE_AGREEMENT]: 1,
    [ACTION_TYPES.SCOUT]: 1,
    [ACTION_TYPES.BUILD_PROPAGANDA_TOWER]: 1,
    [ACTION_TYPES.SET_TAX_RATE]: 0,
    [ACTION_TYPES.LOBBYING]: 0,
    [ACTION_TYPES.ESPIONAGE]: 1,
    [ACTION_TYPES.BUILD_CIVILIAN_FACTORY]: 1,
    [ACTION_TYPES.RESEARCH_ATTACK]: 1,
    [ACTION_TYPES.MOVE_SUPPLY]: 1,
    [ACTION_TYPES.BUILD_SUPPLY_DEPOT]: 1,
    [ACTION_TYPES.CHOOSE_DOCTRINE]: 0,
    [ACTION_TYPES.RESEARCH_DOCTRINE]: 1,
    [ACTION_TYPES.RECRUIT_GENERAL]: 1,
    [ACTION_TYPES.MOVE_GENERAL]: 1,
    [ACTION_TYPES.CYBER_ATTACK_BLACKOUT]: 0,
    [ACTION_TYPES.CYBER_ATTACK_HEIST]: 0,
    [ACTION_TYPES.CYBER_ATTACK_DEEPFAKE]: 1,
};

export const BATTLE_CONSTANTS = {
    MILITIA_POWER_MULTIPLIER: 0.5,
    MORALE_SATISFACTION_BASE: 75,
    MORALE_FORMULA_DIVISOR: 150,
    MILITIA_RECOVERY_RATE: 0.1,
    UNSUPPLIED_RECRUIT_PENALTY: 0.75,
    UNSUPPLIED_FORT_EFFICIENCY_DEBUFF: 0.5,
};

export const SUPPLY_CONSTANTS = {
    SUPPLY_PER_FACTORY: 75,
    REGULAR_UPKEEP: 1.5,
    MILITIA_UPKEEP: 1,
    NO_SUPPLY_PENALTY: 0.5,
    ATTRITION_RATE: 0.1,
    DEPOT_ATTRITION_REDUCTION: 0.03,
};

export const RESEARCH_ATTACK_INCREMENT = 0.02;

export const INTRIGUE_CONSTANTS = {
    LOBBYING_BASE_EFFECT: 15,
    LOBBYING_FATIGUE_GAIN: 0.25,
    LOBBYING_FATIGUE_DECAY: 0.1,
    ESPIONAGE_BASE_SUCCESS_RATE: 0.7,
};

export const REBELLION_THRESHOLD = 20;
export const BASE_ACTION_POINTS = 5;
export const PACT_DURATION = 10;
export const TRADE_PACT_BONUS = 0.15;
export const COALITION_POWER_THRESHOLD = 0.6;
export const PROPAGANDA_EFFECT = 20;
export const CONQUERED_SATISFACTION_START = 25;
export const PROPAGANDA_TOWER_EFFECT = { INTERNAL: 3, EXTERNAL: -2 };
export const GARRISON_SUPPRESSION_THRESHOLD = 0.2;

export const RECRUITMENT_POLICIES = {
    PATRIOTIC: { threshold: 75, yield_percent: 0.10, penalty: -2, cost: 200 },
    WILLING: { threshold: 60, yield_percent: 0.15, penalty: -5, cost: 150 },
    STANDARD: { threshold: 40, yield_percent: 0.20, penalty: -10, cost: 100 },
    FORCED: { threshold: 0, yield_percent: 0.25, penalty: -15, cost: 50 },
};

export const BATTLE_SATISFACTION_MODIFIERS = {
    CRUSHING_VICTORY: 10,
    NORMAL_VICTORY: 5,
    PYRRHIC_VICTORY: 2,
    DEFEAT: -8,
};

export const PYRRHIC_VICTORY_LOSS_THRESHOLD = 0.6;

export const TAX_RATES = {
    LOW: { rate: 0.7, satisfaction_change: 2 },
    MEDIUM: { rate: 1.0, satisfaction_change: -1 },
    HIGH: { rate: 1.3, satisfaction_change: -3 },
};

export const TERRAIN_TYPES = {
    PLAINS: { name: "平原", move_cost: 1, attack_mod: 1.0, defend_mod: 1.0, attrition_mod: 1.0 },
    MOUNTAIN: { name: "山地", move_cost: 2, attack_mod: 0.7, defend_mod: 1.3, attrition_mod: 1.5 },
    DESERT: { name: "荒漠", move_cost: 1, attack_mod: 1.0, defend_mod: 0.9, attrition_mod: 2.0 },
    URBAN: { name: "都会", move_cost: 1, attack_mod: 0.8, defend_mod: 1.2, attrition_mod: 1.0 },
    SWAMP: { name: "沼泽", move_cost: 2, attack_mod: 0.8, defend_mod: 1.1, attrition_mod: 1.2 },
};

// [v1.7.1] 定义每个季节持续的回合数
export const TURNS_PER_SEASON = 10;

export const SEASONS = {
    0: { name: "春季", supply_mod: 1.0, attrition_base: 0 },
    1: { name: "夏季", supply_mod: 1.1, attrition_base: 0.02 },
    2: { name: "秋季", supply_mod: 1.2, attrition_base: 0 },
    3: { name: "冬季", supply_mod: 0.7, attrition_base: 0.05 },
};

export const NORTHERN_STATES = ["WA", "ID", "MT", "ND", "MN", "WI", "MI", "NY", "VT", "NH", "ME", "AK"];

export const TECH_DOCTRINES = {
    INDUSTRIAL_WARFARE: {
        name: "钢铁洪流",
        description: "专注于重工业与正规军火力。",
        levels: [
            { name: "标准化生产", effect: "工厂建造消耗 -10%" },
            { name: "机械化步兵", effect: "正规军攻击力 +15%" },
            { name: "后勤列车", effect: "补给产出 +20%" },
            { name: "全面战争", effect: "正规军攻击力再 +15%，但民兵战斗力 -20%" }
        ]
    },
    CYBER_INSURGENCY: {
        name: "网络游击",
        description: "专注于非对称战争与破坏。",
        levels: [
            { name: "暗网通讯", effect: "谍报行动消耗 -20%" },
            { name: "人民战争", effect: "民兵战斗力 +20%" },
            { name: "深度渗透", effect: "谍报成功率 +15%" },
            { name: "系统过载", effect: "敌方在你的领土作战时攻击力 -20%" }
        ]
    },
    TECHNOCRACY: {
        name: "精英统治",
        description: "专注于高科技与精锐防御。",
        levels: [
            { name: "AI辅助设计", effect: "科研/招募将领消耗 -15%" },
            { name: "自动化炮塔", effect: "防御工事加成 +25%" },
            { name: "外骨骼军团", effect: "全军受到的地形损耗减半" },
            { name: "天基打击", effect: "攻击力 +10%，防御力 +10%" }
        ]
    }
};

export const GENERAL_TRAITS = {
    OFFENSIVE_EXPERT: { name: "进攻专家", description: "进攻时战斗力 +20%" },
    DEFENSIVE_MASTER: { name: "防守大师", description: "防御时战斗力 +25%" },
    LOGISTICS_GENIUS: { name: "后勤天才", description: "所在领土军队损耗 -30%" },
    CHARISMATIC_LEADER: { name: "魅力领袖", description: "所在领土每回合满意度 +2" },
    SIEGE_ENGINEER: { name: "攻城工程师", description: "无视敌方防御工事加成" },
    DESERT_FOX: { name: "沙漠之狐", description: "在荒漠作战战斗力 +30%，无视荒漠损耗" },
    MOUNTAIN_KING: { name: "山地之王", description: "在山地作战战斗力 +30%，移动消耗减半" },
};

export const CRISIS_TYPES = {
    THE_AWAKENING: { name: "旧网苏醒", description: "一个流氓AI控制了所有自动化程度高（3+工厂）的领土！" },
    BIO_PLAGUE: { name: "生化瘟疫", description: "致命病毒爆发。人口正在锐减！封锁边境！" },
    MARKET_CRASH: { name: "全球股灾", description: "经济系统崩溃。所有税收和工厂产出归零。" },
};

export const CYBER_CONSTANTS = {
    CP_PER_NODE_LEVEL: 10,
};