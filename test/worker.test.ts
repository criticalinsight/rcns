import { describe, it, expect, vi } from 'vitest';

vi.mock('cloudflare:workers', () => ({
    DurableObject: class {
        ctx: any; env: any;
        constructor(ctx: any, env: any) { this.ctx = ctx; this.env = env; }
    }
}));

import worker from '../src/worker';

describe('Worker', () => {
    it('should route fetch to Durable Object', async () => {
        const mockStub = { fetch: vi.fn().mockResolvedValue(new Response('OK')) };
        const env = { RCNS_DO: { get: vi.fn().mockReturnValue(mockStub), idFromName: vi.fn().mockReturnValue('id') } } as any;
        const request = new Request('http://localhost/');
        const response = await worker.fetch(request, env, {} as any);
        expect(response.status).toBe(200);
    });

    it('should route scheduled event to Durable Object', async () => {
        const mockStub = { handleScheduled: vi.fn() };
        const env = { RCNS_DO: { get: vi.fn().mockReturnValue(mockStub), idFromName: vi.fn().mockReturnValue('id') } } as any;
        const ctx = { waitUntil: vi.fn() } as any;
        await worker.scheduled({} as any, env, ctx);
        expect(env.RCNS_DO.get).toHaveBeenCalled();
    });
});
