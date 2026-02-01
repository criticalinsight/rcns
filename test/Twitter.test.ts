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

        // Mock global fetch
        vi.stubGlobal('fetch', vi.fn().mockImplementation(async (url: string) => {
            if (url.includes('upload.twitter.com')) {
                return {
                    ok: true,
                    json: async () => ({ media_id_string: 'media_789' })
                };
            }
            return {
                ok: true,
                json: async () => ({ data: { id: '123' } })
            };
        }));
    });

    it('should publish a text post successfully', async () => {
        const result = await twitterPublisher.publish({ id: '1', generated_tweet: 'test tweet' } as any);
        expect(result).toBe('123');
        expect(fetch).toHaveBeenCalledWith(expect.stringContaining('api.twitter.com/2/tweets'), expect.anything());
    });

    it('should publish a post with media successfully', async () => {
        const result = await twitterPublisher.publish(
            { id: '1', generated_tweet: 'test tweet' } as any,
            new Uint8Array([1, 2, 3])
        );
        expect(result).toBe('123');
        expect(fetch).toHaveBeenCalledWith(expect.stringContaining('upload.twitter.com'), expect.anything());
    });

    it('should fetch user by username', async () => {
        const id = await twitterPublisher.getUserByUsername('testuser');
        expect(id).toBe('123'); // Our mock returns id: '123' for everything else
    });
});
