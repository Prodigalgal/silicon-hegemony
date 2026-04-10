/**
 * @file AIServiceController.js
 * @description 管理AI决策流程的单例控制器，包含详细的日志记录。
 */
import { getAIActions } from './llmService';
import { generatePromptForFaction } from '../game/promptGenerator';
import { executeFactionTurn } from '../store/gameSlice';
import { showSnackbar } from '../store/uiSlice';
import { getModelIdentifier, getProviderLabel, normalizeAiConfig } from './aiProviders';

class AIController {
    store = null;
    aiConfigsWithKeys = {};

    init({dispatch, getState}) {
        if (this.store) return; // 避免重复初始化
        this.store = { dispatch, getState };
        console.log("[日志][AIServiceController] AI服务控制器已初始化。");
    }

    setAiConfigurations(configs) {
        this.aiConfigsWithKeys = configs;
        console.log("[日志][AIServiceController] 已接收并设置AI配置。");
    }

    /**
     * 按需为AI生成回合决策。
     * 此方法由 GameClient 在GameLoopController检测到AI回合时调用。
     * @param {string} factionId - 需要决策的AI势力ID。
     * @param {object} gameState - 当前的游戏状态。
     */
    async generateTurn(factionId, gameState) {
        if (!this.store) {
            console.error("[错误][AIServiceController] 尚未初始化，无法为AI生成回合。");
            return;
        }

        if (gameState.gameStatus !== 'awaiting_ai_input' || gameState.activeFactionId !== factionId) {
            console.warn(`[警告][AIServiceController] generateTurn被调用，但当前并非 ${factionId} 的行动回合。当前状态: ${gameState.gameStatus}, 活动势力: ${gameState.activeFactionId}`);
            return;
        }

        try {
            const currentFaction = gameState.factions[factionId];
            const rawAiConfig = this.aiConfigsWithKeys[factionId];

            if (!rawAiConfig) {
                throw new Error(`找不到势力 ${factionId} 的AI配置。`);
            }

            const fullAiConfig = normalizeAiConfig(rawAiConfig);

            const modelIdentifier = getModelIdentifier(fullAiConfig);
            const providerLabel = getProviderLabel(fullAiConfig);
            console.log(`[日志][AIServiceController] 正在为 ${currentFaction.name} 使用 ${providerLabel} / [${modelIdentifier}] 生成决策...`);

            const prompt = generatePromptForFaction(currentFaction, fullAiConfig, gameState);
            const aiPlan = await getAIActions(fullAiConfig, prompt);

            console.log(`[日志][AIServiceController] 成功从LLM获取到 ${currentFaction.name} 的行动计划。正在派发执行...`, aiPlan);
            this.store.dispatch(executeFactionTurn({ ...aiPlan, factionId }));

        } catch (error) {
            const errorMessage = `为势力 ${factionId} 的AI决策生成失败: ${error.message}`;
            console.error(`[错误][AIServiceController] ${errorMessage}`);

            // 向用户显示一个非阻塞的错误通知
            this.store.dispatch(showSnackbar({ message: errorMessage, severity: 'error' }));

            // [核心修复] 即使AI决策失败，也需要结束其回合，防止游戏卡死。
            // 我们提交一个空的行动计划，并附上错误理由。
            console.warn(`[警告][AIServiceController] 因决策失败，将为 ${factionId} 提交一个空的行动计划以结束其回合。`);
            this.store.dispatch(executeFactionTurn({
                actions: [],
                justification: `AI决策系统故障: ${error.message}`,
                diplomatic_responses: [],
                long_term_goal: "维持现状，等待系统恢复。",
                short_term_objective: "跳过本回合以避免进一步错误。",
                factionId,
            }));
        }
    }
}

// 导出单例
export const AIServiceController = new AIController();
