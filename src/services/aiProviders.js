/**
 * @file aiProviders.js
 * @description 统一维护单一 OpenAI-Compatible 配置与旧配置兼容逻辑。
 */

export const OPENAI_COMPATIBLE_PROVIDER = {
    id: 'openai_compatible',
    label: 'OpenAI-Compatible',
    protocol: 'openai',
    apiKeyLabel: 'API Key / Gateway Client Token',
    defaultModel: 'gpt-4.1-mini',
    models: ['gpt-4.1-mini', 'gpt-4o-mini', 'gpt-4.1'],
    baseUrl: 'https://api.openai.com/v1',
    supportsCustomBaseUrl: true,
    supportsJsonResponseFormat: false,
    placeholder: '填写兼容 OpenAI Chat Completions 的模型名称。',
    baseUrlPlaceholder: 'https://your-openai-compatible-host/v1',
    baseUrlHelperText: '支持 OpenAI 官方接口，也支持任何兼容 OpenAI Chat Completions 的服务。',
};

const LEGACY_PROVIDER_IDS = new Set(['openai', 'custom_openai', OPENAI_COMPATIBLE_PROVIDER.id]);

const LEGACY_SERVICE_TYPES = new Set([
    'OpenAI',
    'OpenAI-Compatible',
    'OpenAI-Compatible Proxy',
    'Google Gemini',
    'Anthropic Claude',
]);

export function getProviderById() {
    return OPENAI_COMPATIBLE_PROVIDER;
}

export function getProviderLabel() {
    return OPENAI_COMPATIBLE_PROVIDER.label;
}

export function getModelIdentifier(config) {
    return normalizeAiConfig(config).model;
}

export function normalizeAiConfig(rawConfig = {}) {
    const incomingProviderId = rawConfig.providerId;
    const providerId = LEGACY_PROVIDER_IDS.has(incomingProviderId)
        || LEGACY_SERVICE_TYPES.has(rawConfig.serviceType)
        ? OPENAI_COMPATIBLE_PROVIDER.id
        : OPENAI_COMPATIBLE_PROVIDER.id;

    const normalizedModel = `${rawConfig.model || rawConfig.customModelName || OPENAI_COMPATIBLE_PROVIDER.defaultModel}`.trim()
        || OPENAI_COMPATIBLE_PROVIDER.defaultModel;

    const normalizedBaseUrl = `${rawConfig.baseUrl || OPENAI_COMPATIBLE_PROVIDER.baseUrl}`.trim()
        || OPENAI_COMPATIBLE_PROVIDER.baseUrl;
    const normalizedCredential = `${rawConfig.apiKey || rawConfig.gatewayClientKey || rawConfig.clientKey || ''}`.trim();

    return {
        ...rawConfig,
        providerId,
        model: normalizedModel,
        baseUrl: normalizedBaseUrl,
        apiKey: normalizedCredential,
        gatewayClientKey: rawConfig.gatewayClientKey || rawConfig.clientKey || '',
        serviceType: OPENAI_COMPATIBLE_PROVIDER.label,
        customModelName: normalizedModel,
    };
}
