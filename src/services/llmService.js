/**
 * @file llmService.js
 * @description 负责与 OpenAI API 及其兼容格式接口交互，并提供真实连通性测试能力。
 */
import { packPromptForOpenAI, cleanAndExtractJson } from './aiUtils';
import { getProviderById, getProviderLabel, normalizeAiConfig } from './aiProviders';

const TEST_SYSTEM_PROMPT = "You are a connectivity probe. Output exactly OK. No reasoning. No explanation. No markdown.";
const TEST_PROMPT = "OK";
const GENERATION_TIMEOUT_MS = 20 * 60 * 1000;
const CONNECTIVITY_TIMEOUT_MS = 60 * 1000;
const PARTIAL_PREVIEW_MAX_LENGTH = 400;
const GENERATION_MAX_ATTEMPTS = 2;
const GENERATION_RETRY_DELAY_MS = 800;

const LLM_ERROR_CODES = {
    transport: 'TRANSPORT_ERROR',
    emptyResponse: 'EMPTY_RESPONSE',
    invalidOutput: 'INVALID_OUTPUT',
    missingFinalContent: 'MISSING_FINAL_CONTENT',
};

function createLlmError(message, code, extra = {}) {
    const error = new Error(message);
    error.code = code;
    Object.assign(error, extra);
    return error;
}

function createTransportError(message, extra = {}) {
    return createLlmError(message, LLM_ERROR_CODES.transport, extra);
}

function limitPreview(text) {
    const normalizedText = `${text || ''}`.trim();
    if (!normalizedText) {
        return '';
    }

    return normalizedText.length > PARTIAL_PREVIEW_MAX_LENGTH
        ? `${normalizedText.slice(0, PARTIAL_PREVIEW_MAX_LENGTH)}...`
        : normalizedText;
}

function wait(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

function getOpenAIProxyPath() {
    if (typeof window === 'undefined') {
        return '/silicon-hegemony/api/llm/openai';
    }

    const pathname = window.location.pathname || '';
    const basePath = pathname.startsWith('/silicon-hegemony') ? '/silicon-hegemony' : '';
    return `${basePath}/api/llm/openai`;
}

async function proxyAwareFetch(init = {}, options = {}) {
    const { timeoutMs = GENERATION_TIMEOUT_MS } = options;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const finalInit = {
        ...init,
        signal: controller.signal,
    };

    try {
        return await fetch(getOpenAIProxyPath(), finalInit);
    } finally {
        clearTimeout(timeoutId);
    }
}

function formatTransportError(error) {
    if (error?.name === 'AbortError') {
        return '请求超时。模型响应时间超过当前等待上限。';
    }

    const message = `${error?.message || ''}`;
    if (message.includes('Failed to fetch') || message.includes('network error')) {
        return '网络请求失败。目标接口可能不支持浏览器直连，或当前开发环境需要通过代理访问该接口。';
    }

    return message || '请求失败。';
}

function formatProviderError(providerLabel, error) {
    const message = error?.message || '请求失败。';

    if (error?.code === LLM_ERROR_CODES.transport) {
        return `与 ${providerLabel} 通信失败: ${message}`;
    }

    if (
        error?.code === LLM_ERROR_CODES.emptyResponse
        || error?.code === LLM_ERROR_CODES.invalidOutput
        || error?.code === LLM_ERROR_CODES.missingFinalContent
    ) {
        return `${providerLabel} 已返回响应，但结果不可用: ${message}`;
    }

    return `${providerLabel} 请求处理失败: ${message}`;
}

function isRetryableTransportError(error) {
    if (error?.code !== LLM_ERROR_CODES.transport) {
        return false;
    }

    const message = `${error?.message || ''}`;
    return (
        message.includes('请求超时')
        || message.includes('网络请求失败')
        || message.includes('502')
        || message.includes('503')
        || message.includes('504')
        || message.includes('代理流中断')
    );
}

function shouldRetryGenerationError(error) {
    return (
        error?.code === LLM_ERROR_CODES.missingFinalContent
        || error?.code === LLM_ERROR_CODES.emptyResponse
        || error?.code === LLM_ERROR_CODES.invalidOutput
        || isRetryableTransportError(error)
    );
}

function shouldFallbackToNonStream(error) {
    return (
        error?.code === LLM_ERROR_CODES.missingFinalContent
        || error?.code === LLM_ERROR_CODES.emptyResponse
        || error?.code === LLM_ERROR_CODES.invalidOutput
        || isRetryableTransportError(error)
    );
}

function extractHttpErrorMessage(response, data, rawText) {
    const contentType = response.headers.get('content-type') || '';
    const isHtml = contentType.includes('text/html') || /^\s*<!DOCTYPE html>/i.test(rawText || '');

    if (isHtml) {
        if ((rawText || '').includes('Gateway time-out') || response.status === 504) {
            return '上游服务返回 504 Gateway Timeout。更像是目标服务或其网关超时，不是浏览器 CORS 问题。';
        }

        if (response.status === 404) {
            return '目标接口返回 404。请确认 Base URL 是否正确，OpenAI-compatible 通常应填写到 `/v1`。';
        }

        return `目标服务返回了 HTML 错误页（HTTP ${response.status}）。请检查接口地址和上游网关状态。`;
    }

    const baseMessage = data?.error?.message
        || data?.message
        || rawText
        || `HTTP ${response.status}`;

    const partialPreview = data?.error?.partialContentPreview;
    if (partialPreview) {
        return `${baseMessage}\n\n已收到的部分内容预览:\n${partialPreview}`;
    }

    return baseMessage;
}

async function requestJson(body, options = {}) {
    let response;
    const timeoutMs = options.timeoutMs ?? GENERATION_TIMEOUT_MS;

    try {
        response = await proxyAwareFetch({
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                ...body,
                timeoutMs,
            }),
        }, { ...options, timeoutMs });
    } catch (error) {
        if (error?.code) {
            throw error;
        }

        throw createTransportError(formatTransportError(error));
    }

    const rawText = await response.text();
    let data = null;

    try {
        data = rawText ? JSON.parse(rawText) : null;
    } catch {
        data = null;
    }

    if (!response.ok) {
        throw createTransportError(extractHttpErrorMessage(response, data, rawText));
    }

    return data;
}

function ensureConfig(config) {
    if (!config.apiKey?.trim()) {
        throw new Error('API Key / Gateway Client Token 不能为空。');
    }

    if (!config.model?.trim()) {
        throw new Error('模型名称不能为空。');
    }

    if (!config.baseUrl?.trim()) {
        throw new Error('接口地址不能为空。');
    }
}

function flattenOpenAIText(value) {
    if (Array.isArray(value)) {
        return value.map((part) => {
            if (typeof part === 'string') {
                return part;
            }

            if (typeof part?.text === 'string') {
                return part.text;
            }

            if (typeof part?.content === 'string') {
                return part.content;
            }

            return '';
        }).join('');
    }

    return typeof value === 'string' ? value : '';
}

function joinTruthySegments(segments = []) {
    return segments.filter(Boolean).join('');
}

function extractOpenAIChoiceParts(choice = {}) {
    const delta = choice?.delta || {};
    const message = choice?.message || {};

    return {
        content: joinTruthySegments([
            flattenOpenAIText(delta.content),
            flattenOpenAIText(message.content),
            flattenOpenAIText(choice.text),
        ]),
        reasoning: joinTruthySegments([
            flattenOpenAIText(delta.reasoning_content),
            flattenOpenAIText(delta.reasoning),
            flattenOpenAIText(message.reasoning_content),
            flattenOpenAIText(message.reasoning),
            flattenOpenAIText(choice.reasoning_content),
            flattenOpenAIText(choice.reasoning),
        ]),
        finishReason: choice?.finish_reason || null,
    };
}

function extractOpenAIResponseParts(data) {
    return extractOpenAIChoiceParts(data?.choices?.[0]);
}

function buildMissingFinalContentMessage(reasoning, finishReason) {
    const truncationHint = finishReason === 'length'
        ? '上游返回的 `finish_reason=length`，说明输出很可能在最终答案生成前就被长度限制截断了。'
        : '';

    return [
        'OpenAI-compatible 接口已返回流式数据，但只包含 reasoning 内容，未返回最终答案内容。',
        truncationHint,
    ].filter(Boolean).join('\n\n');
}

async function readOpenAICompatibleStream(response) {
    if (!response.body) {
        throw new Error('代理未返回可读取的流式响应。');
    }

    const decoder = new TextDecoder();
    const reader = response.body.getReader();
    let buffer = '';
    let fullContent = '';
    let fullReasoning = '';
    let lastFinishReason = null;

    const flushBuffer = (flushTail = false) => {
        const events = buffer.split(/\r?\n\r?\n/);
        buffer = flushTail ? '' : (events.pop() || '');

        for (const eventText of events) {
            const dataLines = eventText
                .split(/\r?\n/)
                .filter(line => line.startsWith('data:'))
                .map(line => line.slice(5).trimStart());

            if (dataLines.length === 0) {
                continue;
            }

            const payload = dataLines.join('\n').trim();
            if (!payload || payload === '[DONE]') {
                continue;
            }

            let parsed = null;
            try {
                parsed = JSON.parse(payload);
            } catch {
                continue;
            }

            if (parsed?.error?.message) {
                const error = createTransportError(parsed.error.message);
                error.partialContent = (fullContent || fullReasoning).trim();
                throw error;
            }

            const { content, reasoning, finishReason } = extractOpenAIResponseParts(parsed);
            fullContent += content;
            fullReasoning += reasoning;
            if (finishReason) {
                lastFinishReason = finishReason;
            }
        }
    };

    try {
        while (true) {
            const { value, done } = await reader.read();
            if (done) {
                break;
            }

            buffer += decoder.decode(value, { stream: true });
            flushBuffer(false);
        }

        buffer += decoder.decode();
        flushBuffer(true);
    } catch (error) {
        const streamError = createLlmError(
            error.message || '流式响应解析失败。',
            error.code || LLM_ERROR_CODES.invalidOutput,
            {
                partialContent: error.partialContent || (fullContent || fullReasoning).trim(),
            },
        );
        throw streamError;
    } finally {
        reader.releaseLock?.();
    }

    const content = fullContent.trim();
    const reasoning = fullReasoning.trim();

    if (!content && !reasoning) {
        throw createLlmError('OpenAI-compatible 流式响应聚合后为空。', LLM_ERROR_CODES.emptyResponse);
    }

    return {
        content,
        reasoning,
        finishReason: lastFinishReason,
    };
}

async function requestOpenAICompatibleStreamText(init = {}, options = {}) {
    let response;
    const timeoutMs = options.timeoutMs ?? GENERATION_TIMEOUT_MS;

    try {
        response = await proxyAwareFetch({
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                ...init,
                stream: true,
                timeoutMs,
            }),
        }, { ...options, timeoutMs });
    } catch (error) {
        if (error?.code) {
            throw error;
        }

        throw createTransportError(formatTransportError(error));
    }

    const contentType = response.headers.get('content-type') || '';

    if (!response.ok) {
        const rawText = await response.text();
        let data = null;

        try {
            data = rawText ? JSON.parse(rawText) : null;
        } catch {
            data = null;
        }

        throw createTransportError(extractHttpErrorMessage(response, data, rawText));
    }

    if (contentType.includes('application/json')) {
        const rawText = await response.text();
        let data = null;

        try {
            data = rawText ? JSON.parse(rawText) : null;
        } catch {
            data = null;
        }

        const { content, reasoning, finishReason } = extractOpenAIResponseParts(data);
        if (!content && !reasoning) {
            throw createLlmError('OpenAI-compatible 接口返回了空响应。', LLM_ERROR_CODES.emptyResponse);
        }

        return { content: content.trim(), reasoning: reasoning.trim(), finishReason };
    }

    return readOpenAICompatibleStream(response);
}

async function requestOpenAICompatibleNonStreamText(init = {}, options = {}) {
    const data = await requestJson({
        ...init,
    }, options);

    const { content, reasoning, finishReason } = extractOpenAIResponseParts(data);
    if (!content && !reasoning) {
        throw createLlmError('OpenAI-compatible 接口返回了空响应。', LLM_ERROR_CODES.emptyResponse);
    }

    return {
        content: content.trim(),
        reasoning: reasoning.trim(),
        finishReason,
    };
}

async function getActionsFromOpenAICompatibleOnce(prompt, config) {
    console.log(`[日志][llmService] 准备调用 OpenAI-compatible 接口，模型: ${config.model}，URL: ${config.baseUrl}`);

    const provider = getProviderById(config.providerId);
    const sharedPayload = {
        model: config.model,
        messages: packPromptForOpenAI(prompt),
        temperature: 0.7,
    };

    if (provider.supportsJsonResponseFormat) {
        sharedPayload.response_format = { type: 'json_object' };
    }
    const requestInit = {
        baseUrl: config.baseUrl,
        apiKey: config.apiKey,
        payload: {
            ...sharedPayload,
        },
    };

    let content = '';
    let reasoning = '';
    let finishReason = null;
    let responseMode = 'stream';

    const fallbackToNonStream = async (reason) => {
        if (responseMode === 'non-stream') {
            return;
        }

        console.warn(
            `[警告][llmService] ${getProviderLabel(config)} ${reason}，回退到非流式请求。`,
        );
        ({ content, reasoning, finishReason } = await requestOpenAICompatibleNonStreamText(
            requestInit,
            { timeoutMs: GENERATION_TIMEOUT_MS },
        ));
        responseMode = 'non-stream';
    };

    try {
        ({ content, reasoning, finishReason } = await requestOpenAICompatibleStreamText(
            requestInit,
            { timeoutMs: GENERATION_TIMEOUT_MS },
        ));
    } catch (error) {
        if (!shouldFallbackToNonStream(error)) {
            throw error;
        }

        await fallbackToNonStream(`流式生成失败。原因: ${error.message}`);
    }

    if (!content) {
        if (responseMode === 'stream') {
            await fallbackToNonStream('流式响应未返回最终答案内容');
        }
    }

    if (!content) {
        if (reasoning) {
            console.warn('[警告][llmService] OpenAI-compatible 收到 reasoning-only 响应预览:', limitPreview(reasoning));
        }

        throw createLlmError(
            reasoning
                ? buildMissingFinalContentMessage(reasoning, finishReason)
                : 'OpenAI-compatible 接口返回了空响应。',
            reasoning ? LLM_ERROR_CODES.missingFinalContent : LLM_ERROR_CODES.emptyResponse,
            {
                partialContentPreview: limitPreview(reasoning),
            },
        );
    }

    let cleanedContent = cleanAndExtractJson(content);
    if (!cleanedContent) {
        if (responseMode === 'stream') {
            await fallbackToNonStream('流式响应返回空文本，无法提取 JSON');
            cleanedContent = cleanAndExtractJson(content);
        }
    }

    if (!cleanedContent) {
        console.warn('[警告][llmService] 模型返回了空文本，无法提取 JSON。原始响应预览:', limitPreview(content));
        throw createLlmError(
            '模型返回了空文本，无法提取 JSON。',
            LLM_ERROR_CODES.invalidOutput,
            {
                partialContentPreview: limitPreview(content),
            },
        );
    }

    try {
        return JSON.parse(cleanedContent);
    } catch {
        if (responseMode === 'stream') {
            await fallbackToNonStream('流式响应内容不是合法 JSON');
            cleanedContent = cleanAndExtractJson(content);
            return JSON.parse(cleanedContent);
        }

        console.warn('[警告][llmService] 模型返回了非 JSON 内容预览:', limitPreview(content));
        throw createLlmError(
            '模型已返回内容，但内容不是合法 JSON，无法直接生成行动计划。',
            LLM_ERROR_CODES.invalidOutput,
            {
                partialContentPreview: limitPreview(content),
            },
        );
    }
}

async function getActionsFromOpenAICompatible(prompt, config) {
    let lastError = null;

    for (let attempt = 1; attempt <= GENERATION_MAX_ATTEMPTS; attempt += 1) {
        try {
            return await getActionsFromOpenAICompatibleOnce(prompt, config);
        } catch (error) {
            lastError = error;
            const shouldRetry = attempt < GENERATION_MAX_ATTEMPTS && shouldRetryGenerationError(error);

            if (!shouldRetry) {
                throw error;
            }

            console.warn(
                `[警告][llmService] ${getProviderLabel(config)} 第 ${attempt} 次生成失败，将自动重试。原因: ${error.message}`,
            );
            await wait(GENERATION_RETRY_DELAY_MS * attempt);
        }
    }

    throw lastError || createLlmError('请求失败。', LLM_ERROR_CODES.transport);
}

async function testOpenAICompatibleConnection(config) {
    const data = await requestJson({
        baseUrl: config.baseUrl,
        apiKey: config.apiKey,
        payload: {
            model: config.model,
            messages: [
                { role: 'system', content: TEST_SYSTEM_PROMPT },
                { role: 'user', content: TEST_PROMPT },
            ],
            temperature: 0,
            max_tokens: 8,
        },
    }, { timeoutMs: CONNECTIVITY_TIMEOUT_MS });

    const { content, reasoning } = extractOpenAIResponseParts(data);
    const text = content.trim() || reasoning.trim();
    if (!text) {
        throw createLlmError('测试请求成功，但模型未返回内容。', LLM_ERROR_CODES.emptyResponse);
    }

    return text;
}

export async function testAIConnection(rawConfig) {
    const config = normalizeAiConfig(rawConfig);
    ensureConfig(config);

    try {
        const preview = await testOpenAICompatibleConnection(config);
        return {
            providerId: config.providerId,
            providerLabel: getProviderLabel(config),
            model: config.model,
            preview,
        };
    } catch (error) {
        throw new Error(`测试 ${getProviderLabel(config)} 失败: ${error.message}`);
    }
}

export async function getAIActions(factionConfig, prompt) {
    const config = normalizeAiConfig(factionConfig);
    ensureConfig(config);

    try {
        console.log(`[日志][llmService] 正在通过 ${getProviderLabel(config)} 发起请求...`);
        return await getActionsFromOpenAICompatible(prompt, config);
    } catch (error) {
        const providerLabel = getProviderLabel(config);
        console.error(`[错误][llmService] 调用 ${providerLabel} 时发生错误:`, error);
        throw new Error(formatProviderError(providerLabel, error));
    }
}
