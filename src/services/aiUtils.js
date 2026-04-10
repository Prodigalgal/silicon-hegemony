/**
 * @file aiUtils.js
 * @description AI服务的通用工具函数。
 */

/**
 * 将我们的标准Prompt文本包装成OpenAI兼容的`messages`数组格式。
 * @param {string} prompt - 完整的prompt文本。
 * @returns {object[]} OpenAI格式的messages数组。
 */
export function packPromptForOpenAI(prompt) {
    console.log("[日志][aiUtils] 将Prompt包装为OpenAI格式。");
    return [
        {
            role: "system",
            content: "You are a helpful assistant designed to output JSON."
        },
        {
            role: "user",
            content: prompt
        }
    ];
}

/**
 * 从可能包含Markdown代码块的文本中提取纯JSON字符串。
 * @param {string} rawText - 从LLM返回的原始文本。
 * @returns {string} 清理后的JSON字符串。
 */
export function cleanAndExtractJson(rawText) {
    if (!rawText) {
        console.warn("[日志][aiUtils] 接收到空的原始文本进行清理。");
        return "";
    }
    console.log("[日志][aiUtils] 正在清理和提取JSON...");
    const match = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match && match[1]) {
        console.log("[日志][aiUtils] 从Markdown代码块中成功提取JSON。");
        return match[1].trim();
    }
    console.log("[日志][aiUtils] 未找到Markdown代码块，直接使用原始文本。");
    return rawText.trim();
}
