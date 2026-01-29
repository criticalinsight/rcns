import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TwitterPublisher } from '../src/publishers/Twitter';

describe('TwitterPublisher', () => {
    let twitterPublisher: TwitterPublisher;
    let mockEnv: any;

    beforeEach(() => {
        mockEnv = {
            TWITTER_APP_KEY: 'key',
            TWITTER_APP_SECRET: 'secret',
            TWITTER_ACCESS_TOKEN: 'token',
            TWITTER_ACCESS_SECRET: 'access-secret'
        };
        twitterPublisher = new TwitterPublisher(mockEnv);
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ data: { id: '123' } })
        }));
    });

    it('should publish a post successfully', async () => {
        const result = await twitterPublisher.publish({ id: '1', generated_tweet: 'test tweet' } as any);
        expect(result).toBe('123');
    });
});
