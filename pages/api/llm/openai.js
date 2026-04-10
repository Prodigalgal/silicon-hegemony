export const config = {
    api: {
        bodyParser: {
            sizeLimit: '4mb',
        },
        responseLimit: false,
    },
};

const DEFAULT_UPSTREAM_TIMEOUT_MS = 20 * 60 * 1000;

function joinUrl(baseUrl, path) {
    const normalizedBaseUrl = (baseUrl || '').replace(/\/+$/, '');
    const normalizedPath = path.replace(/^\/+/, '');
    return `${normalizedBaseUrl}/${normalizedPath}`;
}

function buildHeaders(apiKey, extraHeaders = {}) {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Accept-Encoding': 'identity',
        ...extraHeaders,
    };
}

function buildCompletionEnvelope(content, finishReason = 'stop') {
    return {
        choices: [
            {
                index: 0,
                message: {
                    role: 'assistant',
                    content,
                },
                finish_reason: finishReason,
            },
        ],
    };
}

async function requestUpstream(baseUrl, apiKey, payload, stream, timeoutMs = DEFAULT_UPSTREAM_TIMEOUT_MS) {
    const controller = new AbortController();
    const normalizedTimeoutMs = Number.isFinite(timeoutMs) && timeoutMs > 0
        ? timeoutMs
        : DEFAULT_UPSTREAM_TIMEOUT_MS;
    const timeoutId = setTimeout(() => controller.abort(), normalizedTimeoutMs);

    try {
        return await fetch(joinUrl(baseUrl, 'chat/completions'), {
            method: 'POST',
            headers: buildHeaders(apiKey, stream ? { Accept: 'text/event-stream' } : {}),
            body: JSON.stringify({
                ...payload,
                ...(stream ? { stream: true } : {}),
            }),
            signal: controller.signal,
        });
    } finally {
        clearTimeout(timeoutId);
    }
}

async function parseUpstreamJsonResponse(upstreamResponse) {
    const text = await upstreamResponse.text();

    try {
        return text ? JSON.parse(text) : {};
    } catch {
        return buildCompletionEnvelope(text.trim());
    }
}

async function pipeUpstreamStream(req, res, upstreamResponse) {
    if (!upstreamResponse.body) {
        throw new Error('上游流式响应没有返回 body。');
    }

    const reader = upstreamResponse.body.getReader();
    const upstreamContentType = upstreamResponse.headers.get('content-type') || 'text/event-stream; charset=utf-8';
    const upstreamCacheControl = upstreamResponse.headers.get('cache-control');

    req.socket?.setTimeout?.(0);
    res.socket?.setTimeout?.(0);
    res.socket?.setNoDelay?.(true);
    res.statusCode = upstreamResponse.status;
    res.setHeader('Content-Type', upstreamContentType);
    res.setHeader('Cache-Control', upstreamCacheControl || 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.setHeader('Content-Encoding', 'identity');
    res.setHeader('x-sh-proxy-mode', 'stream-forward');
    res.flushHeaders?.();

    try {
        while (true) {
            const { value, done } = await reader.read();
            if (done) {
                break;
            }

            if (value?.length) {
                res.write(value);
                res.flush?.();
            }
        }
    } catch (error) {
        if (!res.writableEnded) {
            const errorPayload = JSON.stringify({
                error: {
                    message: `代理流中断: ${error.message}`,
                },
            });
            res.write(`data: ${errorPayload}\n\n`);
        }
        console.error('[next-openai-proxy] 流式转发失败:', error);
    } finally {
        reader.releaseLock?.();
        if (!res.writableEnded) {
            res.end();
        }
    }
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.status(405).json({ error: { message: '仅支持 POST 请求。' } });
        return;
    }

    const {
        baseUrl,
        apiKey,
        payload,
        stream = false,
        timeoutMs = DEFAULT_UPSTREAM_TIMEOUT_MS,
    } = req.body || {};

    if (!baseUrl || !apiKey || !payload) {
        res.status(400).json({ error: { message: '缺少 baseUrl、apiKey 或 payload。' } });
        return;
    }

    try {
        const upstreamResponse = await requestUpstream(baseUrl, apiKey, payload, stream, timeoutMs);

        const contentType = upstreamResponse.headers.get('content-type') || '';

        if (!upstreamResponse.ok) {
            const errorText = await upstreamResponse.text();
            res.status(upstreamResponse.status).send(errorText);
            return;
        }

        if (stream) {
            if (contentType.includes('application/json')) {
                const data = await parseUpstreamJsonResponse(upstreamResponse);
                res.setHeader('x-sh-proxy-mode', 'stream-json-direct');
                res.status(200).json(data);
                return;
            }

            await pipeUpstreamStream(req, res, upstreamResponse);
            return;
        }

        if (contentType.includes('application/json')) {
            const data = await parseUpstreamJsonResponse(upstreamResponse);
            res.setHeader('x-sh-proxy-mode', 'json-direct');
            res.status(200).json(data);
            return;
        }

        const text = await upstreamResponse.text();
        try {
            const data = JSON.parse(text);
            if (!res.headersSent) {
                res.status(200).json(data);
                return;
            }
        } catch {
            res.status(200).send(text);
            return;
        }

    } catch (error) {
        console.error('[next-openai-proxy] 请求失败:', error);
        if (!res.headersSent) {
            res.status(502).json({ error: { message: `代理请求失败: ${error.message}` } });
            return;
        }

        if (!res.writableEnded) {
            res.end();
        }
    }
}
