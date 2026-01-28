import OAuth from 'oauth-1.0a';
import HmacSHA1 from 'crypto-js/hmac-sha1';
import Base64 from 'crypto-js/enc-base64';
import { Env, PostItem } from '../types';

export class TwitterPublisher {
    private oauth: OAuth;

    constructor(private env: Env) {
        this.oauth = new OAuth({
            consumer: {
                key: env.TWITTER_APP_KEY,
                secret: env.TWITTER_APP_SECRET,
            },
            signature_method: 'HMAC-SHA1',
            hash_function(base_string, key) {
                return Base64.stringify(HmacSHA1(base_string, key));
            },
        });
    }

    private getAuthHeader(url: string, method: string) {
        const token = {
            key: this.env.TWITTER_ACCESS_TOKEN,
            secret: this.env.TWITTER_ACCESS_SECRET,
        };

        const requestData = {
            url,
            method,
        };

        return this.oauth.toHeader(this.oauth.authorize(requestData, token));
    }

    async postText(text: string): Promise<string> {
        const url = 'https://api.twitter.com/2/tweets';
        const method = 'POST';
        const body = JSON.stringify({ text });

        console.log(`[TwitterPublisher] Preparing to post. Body length: ${body.length}`);

        const authHeader = this.getAuthHeader(url, method);
        const headers = {
            ...authHeader,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'RCNS-Worker/1.0'
        };

        const response = await fetch(url, {
            method,
            headers,
            body: body,
        });

        if (!response.ok) {
            const error = await response.text();
            console.error(`[TwitterPublisher] HTTP ${response.status} Error:`, error);
            throw new Error(`Twitter API Error: ${response.status} ${error}`);
        }

        const json = await response.json() as any;
        return json.data.id || 'unknown_id';
    }

    async publish(post: PostItem, imageBuffer?: Uint8Array | null): Promise<string> {
        console.log(`[TwitterPublisher] Publishing post: ${post.id}`);
        const text = post.generated_tweet || post.raw_text;
        if (!text) throw new Error('No tweet text available to publish');
        return this.postText(text);
    }
    async getUserByUsername(username: string): Promise<string> {
        const url = `https://api.twitter.com/2/users/by/username/${username}`;
        const method = 'GET';

        const headers = {
            ...this.getAuthHeader(url, method),
            'Content-Type': 'application/json',
        };

        const response = await fetch(url, { headers });
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Twitter User Fetch Error: ${response.status} ${error}`);
        }

        const json = await response.json() as any;
        return json.data?.id;
    }

    async getUserTweets(userId: string): Promise<string[]> {
        const url = `https://api.twitter.com/2/users/${userId}/tweets?max_results=5&exclude=retweets,replies`;
        const method = 'GET';

        const headers = {
            ...this.getAuthHeader(url, method),
            'Content-Type': 'application/json',
        };

        const response = await fetch(url, { headers });
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Twitter Timeline Error: ${response.status} ${error}`);
        }

        const json = await response.json() as any;
        return json.data?.map((t: any) => t.text) || [];
    }
}
