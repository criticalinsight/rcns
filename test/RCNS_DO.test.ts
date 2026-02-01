import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('cloudflare:workers', () => ({
    DurableObject: class {
        ctx: any; env: any;
        constructor(ctx: any, env: any) { this.ctx = ctx; this.env = env; }
    }
}));

import { RCNS_DO } from '../src/RCNS_DO';

describe('RCNS_DO', () => {
    let rcnsDO: any;
    let mockEnv: any;
    let mockCtx: any;

    beforeEach(() => {
        mockEnv = {
            GEMINI_API_KEY: 'test-key',
            TELEGRAM_SOURCE_CHANNEL_ID: 'test-channel',
            TELEGRAM_API_ID: '123',
            TELEGRAM_API_HASH: 'hash',
            TWITTER_APP_KEY: 'key',
            TWITTER_APP_SECRET: 'secret',
            TWITTER_ACCESS_TOKEN: 'token',
            TWITTER_ACCESS_SECRET: 'access-secret'
        };
        mockCtx = {
            storage: {
                get: vi.fn(),
                put: vi.fn(),
                sql: { exec: vi.fn().mockReturnValue({ toArray: () => [] }) }
            }
        };
        rcnsDO = new RCNS_DO(mockCtx as any, mockEnv);
    });

    it('should return 200 for health check', async () => {
        const request = new Request('http://localhost/');
        const response = await rcnsDO.fetch(request);
        expect(response.status).toBe(200);
        const text = await response.text();
        expect(text).toBe('RCNS Durable Object Online');
    });
});
