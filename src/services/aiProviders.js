/**
 * @file aiProviders.js
 * @description 统一维护 OpenAI API 体系配置、默认模型与旧配置兼容逻辑。
 */

export const AI_PROVIDERS = [
    {
        id: 'openai',
        label: 'OpenAI',
        protocol: 'openai',
        apiKeyLabel: 'OpenAI API Key',
        defaultModel: 'gpt-4.1-mini',
        models: ['gpt-4.1-mini', 'gpt-4o-mini', 'gpt-4.1'],
        baseUrl: 'https://api.openai.com/v1',
        supportsCustomBaseUrl: false,
        supportsJsonResponseFormat: true,
        placeholder: '使用 OpenAI 官方 Chat Completions 接口。',
    },
    {
        id: 'custom_openai',
        label: '自定义 OpenAI-Compatible',
        protocol: 'openai',
        apiKeyLabel: 'API Key / Token',
        defaultModel: 'gpt-4o-mini',
        models: [],
        baseUrl: '',
        supportsCustomBaseUrl: true,
        supportsJsonResponseFormat: false,
        placeholder: '适用于自建网关、代理服务或其他兼容 OpenAI 的接口。',
    },
];

export const AI_PROVIDER_OPTIONS = AI_PROVIDERS.map(({ id, label }) => ({ id, label }));

const PROVIDERS_BY_ID = AI_PROVIDERS.reduce((acc, provider) => {
    acc[provider.id] = provider;
    return acc;
}, {});

const LEGACY_SERVICE_TYPE_TO_PROVIDER_ID = {
    'Google Gemini': 'openai',
    'Anthropic Claude': 'openai',
    'OpenAI-Compatible Proxy': 'custom_openai',
};

export function getProviderById(providerId) {
    return PROVIDERS_BY_ID[providerId] || PROVIDERS_BY_ID.openai;
}

export function getProviderLabel(config) {
    return getProviderById(normalizeAiConfig(config).providerId).label;
}

export function getModelIdentifier(config) {
    return normalizeAiConfig(config).model;
}

export function applyProviderPreset(rawConfig, providerId) {
    const previousConfig = normalizeAiConfig(rawConfig);
    const provider = getProviderById(providerId);

    return normalizeAiConfig({
        ...previousConfig,
        providerId,
        model: provider.defaultModel,
        baseUrl: provider.supportsCustomBaseUrl
            ? (previousConfig.baseUrl || provider.baseUrl || '')
            : (provider.baseUrl || ''),
    });
}

export function normalizeAiConfig(rawConfig = {}) {
    const providerId = rawConfig.providerId
        || LEGACY_SERVICE_TYPE_TO_PROVIDER_ID[rawConfig.serviceType]
        || 'openai';
    const provider = getProviderById(providerId);

    const normalizedModel = rawConfig.model
        || rawConfig.customModelName
        || provider.defaultModel;

    const normalizedBaseUrl = provider.supportsCustomBaseUrl
        ? (rawConfig.baseUrl || provider.baseUrl || '')
        : (provider.baseUrl || '');

    return {
        ...rawConfig,
        providerId,
        model: normalizedModel,
        baseUrl: normalizedBaseUrl,
        apiKey: rawConfig.apiKey || '',
        serviceType: provider.label,
        customModelName: normalizedModel,
    };
}
