import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GeminiService } from '../src/services/Gemini';

describe('GeminiService', () => {
    let geminiService: GeminiService;
    let mockEnv: any;

    beforeEach(() => {
        mockEnv = { GEMINI_API_KEY: 'test-api-key' };
        geminiService = new GeminiService(mockEnv);
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                candidates: [{ content: { parts: [{ text: '{"summary": "test summary", "is_upcoming": true}' }] } }]
            })
        }));
    });

    it('should analyze text and return structured JSON', async () => {
        const result = await geminiService.analyzeText('test text');
        expect(result).toContain('test summary');
    });

    it('should generate a tweet from analysis', async () => {
        const result = await geminiService.generateTweetFromAnalysis({ summary: 'test' });
        expect(result).toBeDefined();
    });
});
