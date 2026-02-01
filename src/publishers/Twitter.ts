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

    private getAuthHeader(url: string, method: string, data?: any) {
        const token = {
            key: this.env.TWITTER_ACCESS_TOKEN,
            secret: this.env.TWITTER_ACCESS_SECRET,
        };

        const requestData = {
            url,
            method,
            data
        };

        return this.oauth.toHeader(this.oauth.authorize(requestData, token));
    }

    async postText(text: string, replyToId?: string): Promise<string> {
        const url = 'https://api.twitter.com/2/tweets';
        const method = 'POST';
        const bodyJSON: any = {
            text,
            ...(replyToId ? { reply: { in_reply_to_tweet_id: replyToId } } : {})
        };
        const body = JSON.stringify(bodyJSON);

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
            throw new Error(`Twitter API Error: ${response.status} ${error}`);
        }

        const json = await response.json() as any;
        return json.data.id;
    }

    async publish(post: PostItem, imageBuffer?: Uint8Array | null, replyToId?: string): Promise<string> {
        console.log(`[TwitterPublisher] Publishing post: ${post.id}${replyToId ? ` (Reply to ${replyToId})` : ''}`);
        const text = post.generated_tweet || post.raw_text;
        if (!text) throw new Error('No tweet text available to publish');

        let mediaId: string | undefined;

        if (imageBuffer) {
            mediaId = await this.uploadMedia(imageBuffer);
        }

        const url = 'https://api.twitter.com/2/tweets';
        const method = 'POST';
        const bodyJSON: any = {
            text,
            ...(mediaId ? { media: { media_ids: [mediaId] } } : {}),
            ...(replyToId ? { reply: { in_reply_to_tweet_id: replyToId } } : {})
        };
        const body = JSON.stringify(bodyJSON);

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
            throw new Error(`Twitter Publish Error: ${response.status} ${error}`);
        }

        const json = await response.json() as any;
        return json.data.id;
    }

    private async uploadMedia(buffer: Uint8Array): Promise<string> {
        const url = 'https://upload.twitter.com/1.1/media/upload.json';
        const method = 'POST';

        const authHeader = this.getAuthHeader(url, method);

        const formData = new FormData();
        formData.append('media', new Blob([buffer], { type: 'image/jpeg' }));

        const headers = {
            ...authHeader,
            'User-Agent': 'RCNS-Worker/1.0'
        };

        const response = await fetch(url, {
            method,
            headers,
            body: formData,
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Twitter Media Upload Error: ${response.status} ${error}`);
        }

        const json = await response.json() as any;
        return json.media_id_string;
    }

    async getUserByUsername(username: string): Promise<string | undefined> {
        const url = `https://api.twitter.com/2/users/by/username/${username}`;
        const method = 'GET';

        const headers = {
            ...this.getAuthHeader(url, method),
            'Accept': 'application/json',
        };

        const response = await fetch(url, { method, headers });
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
            'Accept': 'application/json',
        };

        const response = await fetch(url, { method, headers });
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Twitter Timeline Error: ${response.status} ${error}`);
        }

        const json = await response.json() as any;
        return json.data?.map((t: any) => t.text) || [];
    }

    async getMe(): Promise<string> {
        const url = 'https://api.twitter.com/2/users/me';
        const method = 'GET';

        const headers = {
            ...this.getAuthHeader(url, method),
            'Accept': 'application/json',
        };

        const response = await fetch(url, { method, headers });
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Twitter GetMe Error: ${response.status} ${error}`);
        }

        const json = await response.json() as any;
        return json.data.id;
    }

    async getMentions(userId: string, sinceId?: string): Promise<any[]> {
        let url = `https://api.twitter.com/2/users/${userId}/mentions?max_results=10&tweet.fields=text,created_at,author_id,conversation_id`;
        if (sinceId) {
            url += `&since_id=${sinceId}`;
        }

        const method = 'GET';
        const headers = {
            ...this.getAuthHeader(url, method),
            'Accept': 'application/json',
        };

        const response = await fetch(url, { method, headers });
        if (!response.ok) {
            console.warn(`Twitter Mentions Error: ${response.status}`);
            return [];
        }

        const json = await response.json() as any;
        return json.data || [];
    }
}
