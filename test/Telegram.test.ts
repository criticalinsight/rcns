import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TelegramCollector } from '../src/collectors/Telegram';

describe('TelegramCollector', () => {
    let telegramCollector: TelegramCollector;
    let mockEnv: any;
    let mockCallback: any;

    beforeEach(() => {
        mockEnv = {
            TELEGRAM_API_ID: '12345',
            TELEGRAM_API_HASH: 'test-hash',
            TELEGRAM_SOURCE_CHANNEL_ID: 'test-channel'
        };
        mockCallback = vi.fn();
        telegramCollector = new TelegramCollector(mockEnv, mockCallback);
    });

    it('should initialize correctly', () => {
        expect(telegramCollector).toBeDefined();
    });
});
