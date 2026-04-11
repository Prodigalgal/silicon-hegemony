import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAiConfig } from '../../src/services/aiProviders.js';

test('normalizeAiConfig 会把旧 clientKey 兼容归并到单一 apiKey 字段', () => {
    const normalizedConfig = normalizeAiConfig({
        model: 'gpt-4.1-mini',
        baseUrl: 'https://example.com/v1',
        clientKey: 'sk-gw-test.secret',
    });

    assert.equal(normalizedConfig.apiKey, 'sk-gw-test.secret');
    assert.equal(normalizedConfig.gatewayClientKey, 'sk-gw-test.secret');
});
