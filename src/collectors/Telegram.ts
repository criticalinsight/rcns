export class TelegramCollector {
    private baseUrl: string;

    constructor(private env: Env, private onMessage: (msg: any) => Promise<void>) {
        this.baseUrl = `https://api.telegram.org/bot${this.env.TELEGRAM_BOT_TOKEN}`;
    }

    private async api(method: string, params: any = {}): Promise<any> {
        const resp = await fetch(`${this.baseUrl}/${method}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params)
        });
        const data: any = await resp.json();
        if (!data.ok) {
            throw new Error(`Telegram Error [${method}]: ${data.description}`);
        }
        return data.result;
    }

    async sendMessage(chatId: string, text: string): Promise<any> {
        return await this.api('sendMessage', {
            chat_id: chatId,
            text: text
        });
    }

    async pinMessage(chatId: string, messageId: number) {
        try {
            await this.api('pinChatMessage', {
                chat_id: chatId,
                message_id: messageId
            });
        } catch (e) {
            console.error(`[TelegramCollector] Pinning failed:`, e);
        }
    }

    async downloadMedia(message: any): Promise<Uint8Array | null> {
        // Message format for Bot API is different. 
        // We'll look for photo or document.
        const fileId = message.photo ? message.photo[message.photo.length - 1].file_id :
            message.document ? message.document.file_id : null;

        if (!fileId) return null;

        const file = await this.api('getFile', { file_id: fileId });
        const filePath = file.file_path;
        const downloadUrl = `https://api.telegram.org/file/bot${this.env.TELEGRAM_BOT_TOKEN}/${filePath}`;

        const resp = await fetch(downloadUrl);
        const buffer = await resp.arrayBuffer();
        return new Uint8Array(buffer);
    }

    async getUpdates(offset: number = 0): Promise<any[]> {
        return await this.api('getUpdates', {
            offset,
            timeout: 0,
            allowed_updates: ["message", "channel_post"]
        });
    }

    // Historical messages using a User account / history endpoint is NOT possible with Bot API 
    // without a third-party library or webhook history log. 
    // We'll provide a dummy method for now to avoid breaking RCNS_DO or refactor it.
    async getMessages(chatId: string, limit: number = 10): Promise<any[]> {
        console.warn("[TelegramCollector] getMessages is not natively supported by Bot API. Use getUpdates.");
        return [];
    }

    async getMe(): Promise<any> {
        return await this.api('getMe');
    }
}
import { Env } from '../types';
