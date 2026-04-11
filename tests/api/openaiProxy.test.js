import test from 'node:test';
import assert from 'node:assert/strict';
import { buildHeaders, resolveProxyAuthToken } from '../../pages/api/llm/openai.js';

test('resolveProxyAuthToken 在没有独立 gateway key 时会直接使用 apiKey', () => {
    assert.equal(resolveProxyAuthToken('sk-gw-test.secret', ''), 'sk-gw-test.secret');
});

test('buildHeaders 在 gateway token 下会同时附带 Authorization 和 x-api-key', () => {
    const headers = buildHeaders('sk-gw-test.secret', '', {});

    assert.equal(headers.Authorization, 'Bearer sk-gw-test.secret');
    assert.equal(headers['x-api-key'], 'sk-gw-test.secret');
});
