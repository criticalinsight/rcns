import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FactStore } from '../src/FactStore';

describe('FactStore', () => {
    let mockSql: any;
    let store: FactStore;

    beforeEach(() => {
        mockSql = {
            exec: vi.fn().mockReturnValue({
                toArray: () => []
            })
        };
        store = new FactStore({ sql: mockSql } as any);
    });

    it('should aggregate daily metrics from posts and logs', async () => {
        mockSql.exec.mockReturnValueOnce({ toArray: () => [{ status: 'published', generated_tweet: 'T1' }, { status: 'pending' }] }); // posts
        mockSql.exec.mockReturnValueOnce({ toArray: () => [{ id: 'L1' }] }); // logs

        const metrics = await store.getDailyMetrics(Date.now());
        expect(metrics.ingested).toBe(2);
        expect(metrics.published).toBe(1);
        expect(metrics.errors).toBe(1);
        expect(metrics.tweets).toContain('T1');
    });
});
