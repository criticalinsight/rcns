import { DurableObject } from 'cloudflare:workers';
import { Env, PostItem } from './types';
import { FactStore } from './FactStore';
import { ErrorLogger } from './ErrorLogger';
import { TelegramCollector } from './collectors/Telegram';
import { TwitterPublisher } from './publishers/Twitter';
import { GeminiService } from './services/Gemini';

export class RCNS_DO extends DurableObject<Env> {
    private store: FactStore;
    private logger: ErrorLogger;
    private telegram: TelegramCollector;
    private twitter: TwitterPublisher;
    private gemini: GeminiService;

    constructor(ctx: DurableObjectState, env: Env) {
        super(ctx, env);
        this.store = new FactStore(this.ctx.storage);
        this.logger = new ErrorLogger(this.store);
        this.telegram = new TelegramCollector(env, this.handleIngest.bind(this));
        this.twitter = new TwitterPublisher(env);
        this.gemini = new GeminiService(env);
    }

    async fetch(request: Request): Promise<Response> {
        const url = new URL(request.url);
        console.log(`[RCNS_DO] Request Path: ${url.pathname}`);

        if (url.pathname === '/test-twitter') {
            try {
                const id = await this.twitter.postText(`Test tweet from RCNS Worker at ${new Date().toISOString()}`);
                return new Response(`Tweet posted! ID: ${id}`);
            } catch (e: any) {
                return new Response(`Failed to tweet: ${e.message}`, { status: 500 });
            }
        }

        if (url.pathname === '/test-gemini') {
            try {
                // 1. Analyze
                const jsonStr = await this.gemini.analyzeText("Rotary Club meeting next Tuesday at 7PM at the Grand Hotel. Speaker: John Doe.");
                const cleanJson = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();
                const analysis = JSON.parse(cleanJson);

                // 2. Generate Tweet
                const tweet = await this.gemini.generateTweetFromAnalysis(analysis);

                return new Response(JSON.stringify({ analysis, tweet }, null, 2), { headers: { 'Content-Type': 'application/json' } });
            } catch (e: any) {
                return new Response(`Gemini failed: ${e.message}`, { status: 500 });
            }
        }

        if (url.pathname === '/test-models') {
            try {
                // Create a temporary instance to access the generic client if needed, 
                // but GeminiService currently encapsulates the model. 
                // We'll add a listModels method to GeminiService next.
                const models = await this.gemini.listModels();
                return new Response(JSON.stringify(models, null, 2), { headers: { 'Content-Type': 'application/json' } });
            } catch (e: any) {
                return new Response(`List Models failed: ${e.message}`, { status: 500 });
            }
        }

        if (url.pathname === '/analyze-twitter') {
            try {
                const username = 'rotarynairobis';
                const userId = await this.twitter.getUserByUsername(username);
                if (!userId) return new Response('User not found', { status: 404 });

                const tweets = await this.twitter.getUserTweets(userId);
                return new Response(JSON.stringify({ username, tweets }, null, 2), { headers: { 'Content-Type': 'application/json' } });
            } catch (e: any) {
                return new Response(`Analysis failed: ${e.message}`, { status: 500 });
            }
        }

        if (url.pathname === '/test-image-process') {
            try {
                // Use a sample event flyer image (public URL) for testing
                const imageUrl = url.searchParams.get('url') || 'https://www.rotary.org/sites/default/files/styles/w_2800/public/2020-10/End-Polio-Now-logo.jpg?itok=3vV0uV0_';

                const imageResp = await fetch(imageUrl);
                const imageBuffer = await imageResp.arrayBuffer();

                // 1. Analyze Image
                const jsonStr = await this.gemini.analyzeImage(new Uint8Array(imageBuffer));
                const cleanJson = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();
                const analysis = JSON.parse(cleanJson);

                // 2. Generate Tweet
                const tweet = await this.gemini.generateTweetFromAnalysis(analysis);

                return new Response(JSON.stringify({ imageUrl, analysis, tweet }, null, 2), { headers: { 'Content-Type': 'application/json' } });
            } catch (e: any) {
                return new Response(`Image Process Failed: ${e.message}`, { status: 500 });
            }
        }

        if (url.pathname === '/debug-posts') {
            try {
                // We'll need to add a listPosts method to FactStore or just query storage
                // For now, let's just list keys in storage to see what's there
                const posts = await this.store.listPosts(); // Need to implement this
                return new Response(JSON.stringify(posts, null, 2), { headers: { 'Content-Type': 'application/json' } });
            } catch (e: any) {
                return new Response(`Debug failed: ${e.message}`, { status: 500 });
            }
        }

        if (url.pathname === '/publish-id') {
            try {
                const id = url.searchParams.get('id');
                if (!id) return new Response('Missing id', { status: 400 });
                const post = await this.store.getPost(id);
                if (!post) return new Response('Post not found', { status: 404 });

                await this.twitter.publish(post, null);
                post.status = 'posted';
                post.published_at = Date.now();
                await this.store.savePost(post);
                return new Response(`Published post ${id}`);
            } catch (e: any) {
                return new Response(`Publish ID failed: ${e.message}`, { status: 500 });
            }
        }

        if (url.pathname === '/test-raw-tweet') {
            try {
                const text = url.searchParams.get('text') || 'Standard testing tweet';
                const id = await this.twitter.postText(text);
                return new Response(`Tweet posted: ${id}`);
            } catch (e: any) {
                return new Response(`Raw tweet failed: ${e.message}`, { status: 500 });
            }
        }

        if (url.pathname === '/publish-pending') {
            try {
                console.log('[RCNS_DO] Starting /publish-pending');
                const posts = await this.store.listPosts();
                console.log(`[RCNS_DO] Total posts in store: ${posts.length}`);

                const pending = posts.filter(p => (p.status === 'pending' || p.status === 'failed') && p.generated_tweet);
                console.log(`[RCNS_DO] Filtered ${pending.length} candidate posts for publication.`);

                let successCount = 0;
                for (const post of pending) {
                    try {
                        console.log(`[RCNS_DO] Executing publish for ID: ${post.id}`);
                        const result = await this.twitter.publish(post, null);
                        console.log(`[RCNS_DO] Publish result for ${post.id}: ${result}`);

                        post.status = 'posted';
                        post.published_at = Date.now();
                        await this.store.savePost(post);
                        successCount++;
                    } catch (e: any) {
                        console.error(`[RCNS_DO] Publish Failed for ${post.id}:`, e.message);
                        post.status = 'failed';
                        await this.store.savePost(post);
                    }
                }
                return new Response(`Processed ${successCount} posts.`);
            } catch (e: any) {
                console.error('[RCNS_DO] Publish Loop Error:', e.message);
                return new Response(`Publish failed: ${e.message}`, { status: 500 });
            }
        }

        if (url.pathname === '/debug-dialogs') {
            try {
                const dialogs = await this.telegram.getDialogs();
                const list = dialogs.map(d => ({
                    name: d.title || d.name,
                    id: d.id.toString(),
                    type: d.isChannel ? 'channel' : d.isGroup ? 'group' : 'user'
                }));
                return new Response(JSON.stringify(list, null, 2), { headers: { 'Content-Type': 'application/json' } });
            } catch (e: any) {
                return new Response(`Dialogs failed: ${e.message}`, { status: 500 });
            }
        }

        if (url.pathname === '/scheduled') {
            await this.handleScheduled();
            return new Response('OK');
        }

        if (url.pathname === '/generate-report') {
            await this.generateDailyReport();
            return new Response('Report generated and pinned.');
        }

        return new Response('RCNS Durable Object Online');
    }

    async handleScheduled() {
        const now = new Date();
        const currentHour = now.getUTCHours();
        const lastReportDay = await this.ctx.storage.get<string>('lastReportDay');
        const todayStr = now.toISOString().split('T')[0];

        // Trigger ingest audit (polling) every time handleScheduled is called
        await this.alarm();

        // Trigger daily report at midnight UTC, once per day
        if (currentHour === 0 && lastReportDay !== todayStr) {
            console.log('[RCNS_DO] Midnight detected, generating daily report...');
            try {
                await this.generateDailyReport();
                await this.ctx.storage.put('lastReportDay', todayStr);
            } catch (e) {
                this.logger.error('RCNS_DO', 'Failed to generate daily midnight report', e);
            }
        }
    }

    async alarm() {
        console.log('[RCNS_DO] Alarm triggered, checking for new messages...');
        await this.checkNewMessages();
    }

    async generateDailyReport() {
        const since = Date.now() - 24 * 60 * 60 * 1000;
        const metrics = await this.store.getDailyMetrics(since);
        const successRate = metrics.ingested > 0 ? ((metrics.published / metrics.ingested) * 100).toFixed(1) : '0.0';

        let report = `📊 *RCNS Daily Analytics Report*\n`;
        report += `📅 Date: ${new Date().toISOString().split('T')[0]}\n\n`;
        report += `📈 *System Metrics (Last 24h):*\n`;
        report += `- Messages Ingested: ${metrics.ingested}\n`;
        report += `- Tweets Published: ${metrics.published}\n`;
        report += `- System Errors: ${metrics.errors}\n`;
        report += `- Success Rate: ${successRate}%\n\n`;

        if (metrics.tweets.length > 0) {
            report += `🐦 *Tweets Posted:*\n`;
            metrics.tweets.forEach((tweet, i) => {
                // Truncate if very long
                const summary = tweet.length > 100 ? tweet.substring(0, 97) + '...' : tweet;
                report += `${i + 1}. ${summary}\n`;
            });
        } else {
            report += `📭 No tweets posted in the last 24h.`;
        }

        const targetId = this.env.TELEGRAM_SOURCE_CHANNEL_ID;
        console.log(`[RCNS_DO] Sending daily report to ${targetId}`);

        try {
            const sentMsg = await this.telegram.sendMessage(targetId, report);
            if (sentMsg && sentMsg.id) {
                console.log(`[RCNS_DO] Report sent (ID: ${sentMsg.id}). Pinning...`);
                await this.telegram.pinMessage(targetId, sentMsg.id);
            }
        } catch (e) {
            this.logger.error('RCNS_DO', 'Failed to send/pin Telegram report', e);
            throw e;
        }
    }

    async checkNewMessages() {
        try {
            const targetId = this.env.TELEGRAM_SOURCE_CHANNEL_ID;
            const lastId = await this.ctx.storage.get<number>('lastProcessedId') || 0;

            console.log(`[RCNS_DO] Polling ${targetId} for messages > ${lastId}`);
            const messages = await this.telegram.getMessages(targetId, 5);

            // GramJS returns messages in reverse order (newest first usually, but check)
            // We want to process them in chronological order
            const newMessages = messages
                .filter(m => m.id > lastId)
                .sort((a, b) => a.id - b.id);

            if (newMessages.length === 0) {
                console.log('[RCNS_DO] No new messages found.');
                return;
            }

            for (const msg of newMessages) {
                await this.handleIngest(msg);
                await this.ctx.storage.put('lastProcessedId', msg.id);
            }

            console.log(`[RCNS_DO] Processed ${newMessages.length} new messages.`);
        } catch (e: any) {
            console.error('[RCNS_DO] Polling Failed:', e.message);
        }
    }

    async handleIngest(msg: any) {
        const id = msg.id.toString();
        const existing = await this.store.getPost(id);
        if (existing) {
            console.log(`[RCNS_DO] Post ${id} already exists, skipping.`);
            return;
        }

        console.log('Ingesting message:', msg.id);

        let analysis = null;
        const text = msg.message || '';
        let mediaBuffer: Uint8Array | null = null;

        // 1. Check for media
        if (msg.media) {
            console.log('Message has media, downloading...');
            mediaBuffer = await this.telegram.downloadMedia(msg);
        }

        // 2. Analyze (Image takes precedence, or analyze text if no image)
        try {
            let jsonStr = '';
            if (mediaBuffer) {
                console.log('Analyzing image with Gemini...');
                jsonStr = await this.gemini.analyzeImage(mediaBuffer);
            } else if (text) {
                console.log('Analyzing text with Gemini...');
                jsonStr = await this.gemini.analyzeText(text);
            }

            if (jsonStr) {
                const cleanJson = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();
                analysis = JSON.parse(cleanJson);
                console.log('Analysis result:', analysis);
            }
        } catch (e) {
            this.logger.error('RCNS_DO', 'Failed to analyze message', e);
        }

        // 3. Generate Tweet from Analysis (if successful)
        let generatedTweet = '';
        if (analysis) {
            try {
                generatedTweet = await this.gemini.generateTweetFromAnalysis(analysis);
                console.log('Generated Tweet:', generatedTweet);
            } catch (e) {
                this.logger.error('RCNS_DO', 'Failed to generate tweet', e);
            }
        }

        // Construct a PostItem from the Telegram message
        const post: PostItem = {
            id: msg.id.toString(),
            source_url: `https://t.me/c/${this.env.TELEGRAM_SOURCE_CHANNEL_ID.replace('-100', '')}/${msg.id}`,
            raw_text: text,
            processed_json: analysis,
            generated_tweet: generatedTweet,
            status: 'pending',
            created_at: Date.now(),
        };

        // Save to FactStore (initial pending state)
        await this.store.savePost(post);
        console.log(`Saved pending post ${post.id} to FactStore with analysis.`);

        // 4. Auto-Publish (if tweet generated)
        if (generatedTweet) {
            if (analysis?.is_upcoming === false) {
                console.log(`Skipping publication for past event: ${post.id}`);
                post.status = 'posted'; // Mark as 'posted' to avoid retries, or add a 'skipped' status
                post.published_at = Date.now();
                await this.store.savePost(post);
                return;
            }

            try {
                console.log(`Publishing tweet for post ${post.id}...`);
                const twitterId = await this.twitter.publish(post, mediaBuffer);
                post.status = 'posted';
                post.published_at = Date.now();
                // Save again with 'posted' status
                await this.store.savePost(post);
                console.log(`Successfully posted tweet! ID: ${twitterId}`);
            } catch (e: any) {
                this.logger.error('RCNS_DO', 'Failed to publish tweet', e);
            }
        }
    }
}
