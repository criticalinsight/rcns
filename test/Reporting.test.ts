import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('cloudflare:workers', () => ({
    DurableObject: class {
        ctx: any; env: any;
        constructor(ctx: any, env: any) { this.ctx = ctx; this.env = env; }
    }
}));

vi.mock('../src/FactStore');
vi.mock('../src/ErrorLogger');
vi.mock('../src/collectors/Telegram');
vi.mock('../src/publishers/Twitter');
vi.mock('../src/services/Gemini');

import { RCNS_DO } from '../src/RCNS_DO';
import { FactStore } from '../src/FactStore';
import { TelegramCollector } from '../src/collectors/Telegram';

// Simplified mocks for testing reporting
const mockEnv = {
    TELEGRAM_SOURCE_CHANNEL_ID: '-100123456789',
    TELEGRAM_API_ID: '12345',
    TELEGRAM_API_HASH: 'hash',
    TELEGRAM_SESSION: 'session'
} as any;

const mockStorage = {
    get: vi.fn(),
    put: vi.fn(),
    sql: {
        exec: vi.fn().mockReturnValue({
            toArray: () => []
        })
    }
} as any;

const mockCtx = {
    storage: mockStorage,
    waitUntil: (p: any) => p,
} as any;

describe('RCNS_DO Daily Reporting', () => {
    let rcnsDo: RCNS_DO;
    let mockStore: any;
    let mockTelegram: any;

    beforeEach(() => {
        vi.clearAllMocks();
        rcnsDo = new RCNS_DO(mockCtx, mockEnv);

        mockStore = (rcnsDo as any).store;
        mockTelegram = (rcnsDo as any).telegram;

        mockTelegram.sendMessage.mockResolvedValue({ id: 1001 });
        mockTelegram.pinMessage.mockResolvedValue(true);

        mockStore.getDailyMetrics.mockResolvedValue({
            ingested: 5,
            published: 3,
            errors: 1,
            tweets: ['Tweet 1', 'Tweet 2', 'Tweet 3']
        });
    });

    it('generates a detailed report with metrics and tweets', async () => {
        await rcnsDo.generateDailyReport();

        expect((rcnsDo as any).store.getDailyMetrics).toHaveBeenCalled();
        expect((rcnsDo as any).telegram.sendMessage).toHaveBeenCalledWith(
            mockEnv.TELEGRAM_SOURCE_CHANNEL_ID,
            expect.stringContaining('RCNS Daily Analytics Report')
        );
        expect((rcnsDo as any).telegram.sendMessage).toHaveBeenCalledWith(
            mockEnv.TELEGRAM_SOURCE_CHANNEL_ID,
            expect.stringContaining('Messages Ingested: 5')
        );
        expect((rcnsDo as any).telegram.pinMessage).toHaveBeenCalledWith(
            mockEnv.TELEGRAM_SOURCE_CHANNEL_ID,
            1001
        );
    });

    it('triggers report only at midnight UTC', async () => {
        // Mock date to 1AM
        vi.setSystemTime(new Date('2026-01-29T01:00:00Z'));
        const spy = vi.spyOn(rcnsDo, 'generateDailyReport');

        await rcnsDo.handleScheduled();
        expect(spy).not.toHaveBeenCalled();

        // Mock date to Midnight
        vi.setSystemTime(new Date('2026-01-29T00:00:00Z'));
        mockStorage.get.mockResolvedValueOnce('2026-01-28'); // last report was yesterday

        await rcnsDo.handleScheduled();
        expect(spy).toHaveBeenCalled();
    });

    it('does not trigger report twice on the same day', async () => {
        vi.setSystemTime(new Date('2026-01-29T00:00:00Z'));
        const spy = vi.spyOn(rcnsDo, 'generateDailyReport');

        mockStorage.get.mockResolvedValueOnce('2026-01-29'); // already reported today

        await rcnsDo.handleScheduled();
        expect(spy).not.toHaveBeenCalled();
    });
});
