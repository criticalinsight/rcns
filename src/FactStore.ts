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

        // Migration: Add generated_tweet if not exists
        try {
            this.storage.sql.exec('ALTER TABLE posts ADD COLUMN generated_tweet TEXT');
        } catch (e) {
            // Already exists or other error
        }
    }

    async savePost(item: PostItem) {
        const sql = `
            INSERT OR REPLACE INTO posts (
                id, source_url, raw_text, image_url, processed_json, generated_tweet,
                status, created_at, published_at, content_hash
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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

    getPost(id: string): PostItem | null {
        const row = this.storage.sql.exec('SELECT * FROM posts WHERE id = ?', id).toArray()[0] as any;
        if (!row) return null;

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
}
