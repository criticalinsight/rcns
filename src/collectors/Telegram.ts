import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import { NewMessage } from "telegram/events";
// import { Helper } from "telegram/lib/Helpers";
import { Env } from '../types';

export class TelegramCollector {
    private client: TelegramClient;
    private session: StringSession;

    constructor(private env: Env, private onMessage: (msg: any) => Promise<void>) {
        this.session = new StringSession(this.env.TELEGRAM_SESSION || "");
        this.client = new TelegramClient(
            this.session,
            parseInt(this.env.TELEGRAM_API_ID),
            this.env.TELEGRAM_API_HASH,
            { connectionRetries: 5 }
        );
    }

    async connect() {
        if (!this.client.connected) {
            await this.client.connect();
        }
        // In a real Worker, you'd handle authentication via QR or reusable session string
    }

    async listen() {
        await this.connect();
        const targetId = this.env.TELEGRAM_SOURCE_CHANNEL_ID;

        console.log(`[TelegramCollector] Listening for events in ${targetId}`);

        this.client.addEventHandler(async (event: any) => {
            const message = event.message;
            if (!message || message.out) return;

            // Check if message is from the target channel
            const peerId = message.peerId;
            let chatId = '';

            if (peerId) {
                if (peerId.channelId) chatId = `-100${peerId.channelId.toString()}`;
                else if (peerId.chatId) chatId = `-${peerId.chatId.toString()}`;
                else if (peerId.userId) chatId = peerId.userId.toString();
            }

            if (chatId === targetId) {
                console.log(`[TelegramCollector] Ingesting message from ${chatId}`);
                await this.onMessage(message);
            }
        }, new NewMessage({ incoming: true }));
    }

    async sendMessage(chatId: string, text: string): Promise<any> {
        await this.connect();
        return await this.client.sendMessage(chatId, { message: text });
    }

    async pinMessage(chatId: string, messageId: number) {
        await this.connect();
        try {
            await this.client.pinMessage(chatId, messageId, { notify: true });
        } catch (e) {
            console.error(`[TelegramCollector] Pinning failed for ${messageId} in ${chatId}:`, e);
        }
    }

    async downloadMedia(message: any): Promise<Uint8Array | null> {
        await this.connect();
        if (!message.media) return null;
        const buffer = await this.client.downloadMedia(message.media, {});
        return buffer as Uint8Array;
    }

    async getMessages(chatId: string, limit: number = 10): Promise<any[]> {
        await this.connect();
        return await this.client.getMessages(chatId, { limit });
    }

    async getDialogs(): Promise<any[]> {
        await this.connect();
        return await this.client.getDialogs({});
    }
}
