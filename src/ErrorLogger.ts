import { FactStore } from './FactStore';

export class ErrorLogger {
    constructor(private store: FactStore) { }

    log(module: string, message: string, context?: any) {
        console.log(`[${module}] ${message}`, context || '');
        // Async fire-and-forget to store
        this.store.logError(module, message, context).catch(e => console.error('Failed to log error:', e));
    }

    error(module: string, message: string, error?: any) {
        console.error(`[${module}] ${message}`, error || '');
        this.store.logError(module, message, { error: String(error), stack: error?.stack }).catch(e => console.error('Failed to log error:', e));
    }
}
