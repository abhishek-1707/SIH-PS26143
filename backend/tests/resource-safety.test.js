'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const boundedFetch = require('../src/services/bounded-fetch');
const sentinel = require('../src/services/sentinel.service');

test('bounded streaming body, provider errors and AOI/scene guards', async () => {
    const original = global.fetch;
    let calls = 0;
    try {
        global.fetch = async () => {
            calls++;
            return new Response('123456789');
        };
        await assert.rejects(
            boundedFetch('https://example.invalid', {}, 8),
            /size limit/,
        );
        global.fetch = async () => {
            calls++;
            return new Response('secret upstream details', { status: 401 });
        };
        await assert.rejects(
            boundedFetch('https://example.invalid'),
            /HTTP 401/,
        );
        const before = calls;
        for (const options of [
            {
                bbox: [-180, -80, 180, 80],
                datetime: '2024-06-19T00:00:00Z/2024-06-19T01:00:00Z',
            },
            {
                bbox: [74.7, 13.2, 74.78, 13.28],
                datetime: '2024-01-01/2025-01-01',
            },
            {
                bbox: [74.7, 13.2, 74.78, 13.28],
                datetime: '2024-06-19T00:00:00Z/2024-06-19T01:00:00Z',
                limit: 100,
            },
        ])
            await assert.rejects(sentinel.searchCatalog(options));
        await assert.rejects(
            sentinel.getSentinel1GrdImage({
                bbox: [74.7, 13.2, 74.78, 13.28],
                from: '2024-06-19T00:00:00Z',
                to: '2024-06-19T01:00:00Z',
                width: 100000,
            }),
        );
        assert.equal(
            calls,
            before,
            'invalid limits must reject before any request',
        );
    } finally {
        global.fetch = original;
    }
});

test('download concurrency is bounded and aborted/error reads release capacity', async () => {
    const original = global.fetch;
    const releases = [];
    try {
        global.fetch = async () =>
            new Response(
                new ReadableStream({
                    start(controller) {
                        releases.push(() => controller.close());
                    },
                }),
            );
        const first = boundedFetch('https://example.invalid');
        const second = boundedFetch('https://example.invalid');
        await new Promise((resolve) => setImmediate(resolve));
        await assert.rejects(
            boundedFetch('https://example.invalid'),
            /capacity/,
        );
        releases.forEach((release) => release());
        await Promise.all([first, second]);
        global.fetch = async () => {
            throw new DOMException('test timeout', 'AbortError');
        };
        await assert.rejects(
            boundedFetch('https://example.invalid'),
            /timed out/,
        );
        global.fetch = async () => new Response('ok');
        assert.equal(
            (await boundedFetch('https://example.invalid')).status,
            200,
        );
    } finally {
        global.fetch = original;
    }
});
