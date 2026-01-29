import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ErrorLogger } from '../src/ErrorLogger';

describe('ErrorLogger', () => {
    let mockStore: any;
    let logger: ErrorLogger;

    beforeEach(() => {
        mockStore = { logError: vi.fn().mockResolvedValue(undefined) };
        logger = new ErrorLogger(mockStore as any);
    });

    it('should log a message and call store.logError', async () => {
        const module = 'TestModule';
        const message = 'Test Message';
        const context = { key: 'value' };
        logger.log(module, message, context);
        expect(mockStore.logError).toHaveBeenCalledWith(module, message, context);
    });

    it('should log an error and call store.logError with error details', async () => {
        const module = 'TestModule';
        const message = 'Test Error Message';
        const error = new Error('Test Error');
        logger.error(module, message, error);
        expect(mockStore.logError).toHaveBeenCalled();
    });

    it('should handle optional context in log', () => {
        logger.log('TestModule', 'No Context');
        expect(mockStore.logError).toHaveBeenCalled();
    });

    it('should handle optional error in error log', () => {
        logger.error('TestModule', 'No Error Object');
        expect(mockStore.logError).toHaveBeenCalled();
    });
});
