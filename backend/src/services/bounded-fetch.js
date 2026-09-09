'use strict';
const limits = require('./resource-limits');
let active = 0;
// The timeout remains active through body consumption, not merely response headers.
async function boundedFetch(
    url,
    options = {},
    maxBytes = limits.downloadBytes,
) {
    if (active >= 2)
        throw new Error('CDSE request capacity reached; retry shortly');
    active++;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), limits.requestMs);
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
            redirect: 'error',
        });
        if (!response.ok)
            throw new Error(
                `CDSE access unavailable (HTTP ${response.status}); check account permissions/quota`,
            );
        if (Number(response.headers.get('content-length')) > maxBytes)
            throw new Error('CDSE response exceeds size limit');
        let bytes = 0;
        const chunks = [];
        for await (const chunk of response.body) {
            bytes += chunk.length;
            if (bytes > maxBytes)
                throw new Error('CDSE response exceeds size limit');
            chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);
        return {
            ok: true,
            status: response.status,
            headers: response.headers,
            json: async () => JSON.parse(buffer.toString('utf8')),
            arrayBuffer: async () => buffer,
        };
    } catch (error) {
        controller.abort();
        if (error.name === 'AbortError' || error.name === 'TimeoutError')
            throw new Error('CDSE request timed out; retry manually');
        throw error;
    } finally {
        clearTimeout(timer);
        active--;
    }
}
module.exports = boundedFetch;
