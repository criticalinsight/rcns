import { PostItem } from './types';

export class FactStore {
    constructor(private storage: DurableObjectStorage) {
        this.ensureSchema();
    }

    private ensureSchema() {
        this.storage.sql.exec(`
            CREATE TABLE IF NOT EXISTS posts (
                id TEXT PRIMARY KEY,
                source_url TEXT,
                raw_text TEXT,
                image_url TEXT,
                processed_json TEXT,
                generated_tweet TEXT,
                status TEXT,
                created_at INTEGER,
                published_at INTEGER,
                twitter_id TEXT,
                event_date TEXT,
                content_hash TEXT
            )
        `);

        this.storage.sql.exec(`
            CREATE TABLE IF NOT EXISTS logs (
                id TEXT PRIMARY KEY,
                module TEXT,
                ecosystem TEXT,
                message TEXT,
                context TEXT,
                created_at INTEGER
            )
        `);

        // Migration: Add new columns if not exists
        try {
            this.storage.sql.exec('ALTER TABLE posts ADD COLUMN generated_tweet TEXT');
        } catch (e) { }
        try {
            this.storage.sql.exec('ALTER TABLE posts ADD COLUMN twitter_id TEXT');
        } catch (e) { }
        try {
            this.storage.sql.exec('ALTER TABLE posts ADD COLUMN event_date TEXT');
        } catch (e) { }
    }

    async savePost(item: PostItem) {
        const sql = `
            INSERT OR REPLACE INTO posts (
                id, source_url, raw_text, image_url, processed_json, generated_tweet,
                status, created_at, published_at, twitter_id, event_date, content_hash
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        this.storage.sql.exec(
            sql,
            item.id,
            item.source_url,
            item.raw_text,
            item.image_url || null,
            item.processed_json ? JSON.stringify(item.processed_json) : null,
            item.generated_tweet || null,
            item.status,
            item.created_at,
            item.published_at || null,
            item.twitter_id || null,
            item.event_date || null,
            item.content_hash || null
        );
    }

    async listPosts(): Promise<PostItem[]> {
        const rows = this.storage.sql.exec('SELECT * FROM posts ORDER BY created_at DESC LIMIT 10').toArray() as any[];
        return rows.map(row => ({
            ...row,
            processed_json: row.processed_json ? JSON.parse(row.processed_json) : null
        }));
    }

    async getPost(id: string): Promise<PostItem | null> {
        const sql = `SELECT * FROM posts WHERE id = ?`;
        const results = this.storage.sql.exec(sql, id);
        const row = results.next().value;
        if (!row) return null;
        return this.mapRow(row);
    }

    async getEventsForDate(date: string): Promise<PostItem[]> {
        const sql = `SELECT * FROM posts WHERE event_date = ? AND status != 'posted'`;
        const results = this.storage.sql.exec(sql, date);
        const posts: PostItem[] = [];
        for (const row of results) {
            posts.push(this.mapRow(row));
        }
        return posts;
    }

    private mapRow(row: any): PostItem {
        return {
            ...row,
            processed_json: row.processed_json ? JSON.parse(row.processed_json) : null
        };
    }

    async logError(module: string, message: string, context?: any) {
        this.storage.sql.exec(
            'INSERT INTO logs (id, module, ecosystem, message, context, created_at) VALUES (?, ?, ?, ?, ?, ?)',
            crypto.randomUUID(),
            module,
            'RCNS',
            message,
            context ? JSON.stringify(context) : null,
            Date.now()
        );
    }

    async getDailyMetrics(since: number): Promise<{
        ingested: number;
        published: number;
        errors: number;
        tweets: string[];
    }> {
        const posts = this.storage.sql.exec(
            'SELECT generated_tweet, status FROM posts WHERE created_at >= ?',
            since
        ).toArray() as any[];

        const logs = this.storage.sql.exec(
            'SELECT id FROM logs WHERE created_at >= ?',
            since
        ).toArray() as any[];

        return {
            ingested: posts.length,
            published: posts.filter(p => p.status === 'posted').length,
            errors: logs.length,
            tweets: posts.filter(p => p.generated_tweet).map(p => p.generated_tweet)
        };
    }

    async listLogs(limit: number = 20): Promise<any[]> {
        return this.storage.sql.exec('SELECT * FROM logs ORDER BY created_at DESC LIMIT ?', limit).toArray();
    }
}
