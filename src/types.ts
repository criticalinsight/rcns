import { DurableObjectNamespace, Ai } from '@cloudflare/workers-types';

export interface Env {
    RCNS_DO: DurableObjectNamespace;
    AI: Ai;
    TELEGRAM_BOT_TOKEN: string;
    TELEGRAM_SOURCE_CHANNEL_ID: string;
    TELEGRAM_API_ID?: string;
    TELEGRAM_API_HASH?: string;
    TELEGRAM_SESSION?: string;
    TWITTER_APP_KEY: string;
    TWITTER_APP_SECRET: string;
    TWITTER_ACCESS_TOKEN: string;
    TWITTER_ACCESS_SECRET: string;
    GEMINI_API_KEY: string;
}

export interface PostItem {
    id: string;
    source_url: string; // e.g., Telegram message link
    raw_text: string;
    image_url?: string; // or base64
    processed_json?: any;
    generated_tweet?: string;
    status: 'pending' | 'posted' | 'failed';
    created_at: number;
    published_at?: number;
    twitter_id?: string;
    event_date?: string; // YYYY-MM-DD
    content_hash?: string;
}
