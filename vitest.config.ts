import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        coverage: {
            provider: 'istanbul', // Switch to istanbul for better async/branch accuracy
            reporter: ['text', 'json', 'html'],
            include: ['src/**/*.ts'],
            exclude: ['src/types.ts'],
            all: true,
            thresholds: {
                lines: 100,
                functions: 100,
                branches: 100,
                statements: 100
            }
        },
    },
});
