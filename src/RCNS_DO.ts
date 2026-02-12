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

    private lastUpdateId: number = 0;
    private lastReportDay: string = "";
    private lastThreadDay: string = "";
    private lastBirthdayDay: string = "";
    private processedIds = new Set<string>();

    constructor(ctx: DurableObjectState, env: Env) {
        super(ctx, env);
        this.store = new FactStore(this.ctx.storage);
        this.logger = new ErrorLogger(this.store);
        this.telegram = new TelegramCollector(env, this.handleIngest.bind(this));
        this.twitter = new TwitterPublisher(env);
        this.gemini = new GeminiService(env);

        this.ctx.blockConcurrencyWhile(async () => {
            this.lastUpdateId = await this.ctx.storage.get<number>('lastUpdateId') || 0;
            this.lastReportDay = await this.ctx.storage.get<string>('lastReportDay') || "";
            this.lastThreadDay = await this.ctx.storage.get<string>('lastThreadDay') || "";
            this.lastBirthdayDay = await this.ctx.storage.get<string>('lastBirthdayDay') || "";
        });
    }

    async fetch(request: Request): Promise<Response> {
        const url = new URL(request.url);
        console.log(`[RCNS_DO] Request Path: ${url.pathname}`);

        // Self-prime alarm if missing
        const currentAlarm = await this.ctx.storage.getAlarm();
        if (currentAlarm === null) {
            console.log('[RCNS_DO] No alarm found, priming heartbeat...');
            await this.ctx.storage.setAlarm(Date.now() + 5000);
        }


        if (url.pathname === '/debug-posts') {
            try {
                const posts = await this.store.listPosts();
                return new Response(JSON.stringify(posts, null, 2), { headers: { 'Content-Type': 'application/json' } });
            } catch (e: any) {
                return new Response(`Posts Debug Failed: ${e.message}`, { status: 500 });
            }
        }



        if (url.pathname === '/debug-logs') {
            try {
                const logs = await this.store.listLogs(50);
                return new Response(JSON.stringify(logs, null, 2), { headers: { 'Content-Type': 'application/json' } });
            } catch (e: any) {
                return new Response(`Logs Debug Failed: ${e.message}`, { status: 500 });
            }
        }

        if (url.pathname === '/debug-state') {
            try {
                const lastReportDay = this.lastReportDay;
                const nextAlarm = await this.ctx.storage.getAlarm();
                return new Response(JSON.stringify({
                    lastId: this.lastUpdateId,
                    lastReportDay,
                    nextAlarm: nextAlarm ? new Date(nextAlarm).toISOString() : null
                }, null, 2), { headers: { 'Content-Type': 'application/json' } });
            } catch (e: any) {
                return new Response(`State Debug Failed: ${e.message}`, { status: 500 });
            }
        }


        if (url.pathname === '/scheduled') {
            await this.handleScheduled();
            return new Response('OK (Manual Trigger)');
        }

        if (url.pathname === '/generate-report') {
            await this.generateDailyReport();
            return new Response('Report generated and pinned.');
        }

        if (url.pathname === '/health') {
            try {
                const lastPollSuccess = await this.ctx.storage.get<number>('lastPollSuccess') || 0;
                const pollFailureCount = await this.ctx.storage.get<number>('pollFailureCount') || 0;
                const now = Date.now();
                const isStale = (now - lastPollSuccess) > 15 * 60 * 1000; // 15 mins

                const status = (pollFailureCount < 5 && !isStale) ? 'OK' : 'DEGRADED';

                return new Response(JSON.stringify({
                    status,
                    lastPollSuccess: new Date(lastPollSuccess).toISOString(),
                    pollFailureCount,
                    isStale,
                    now: new Date(now).toISOString()
                }, null, 2), {
                    status: status === 'OK' ? 200 : 500,
                    headers: { 'Content-Type': 'application/json' }
                });
            } catch (e: any) {
                return new Response(`Health Check Failed: ${e.message}`, { status: 500 });
            }
        }

        if (url.pathname === '/history') {
            try {
                const sinceParam = url.searchParams.get('since') || '2026-01-28';
                const sinceTimestamp = Math.floor(new Date(sinceParam).getTime() / 1000);
                const limit = parseInt(url.searchParams.get('limit') || '100');
                const targetId = this.env.TELEGRAM_SOURCE_CHANNEL_ID;

                console.log(`[RCNS_DO] Fetching history since ${sinceParam} (${sinceTimestamp})`);
                const messages = await this.telegram.getMessages(targetId, limit);

                const filtered = messages
                    .filter(m => m.date >= sinceTimestamp)
                    .map(m => ({
                        id: m.id,
                        date: new Date(m.date * 1000).toISOString(),
                        text: m.message || '[Media]',
                        hasMedia: !!m.media
                    }))
                    .sort((a, b) => b.id - a.id); // Newest first

                return new Response(JSON.stringify({
                    since: sinceParam,
                    count: filtered.length,
                    messages: filtered
                }, null, 2), { headers: { 'Content-Type': 'application/json' } });
            } catch (e: any) {
                return new Response(`History check failed: ${e.message}`, { status: 500 });
            }
        }

        if (url.pathname === '/add-member') {
            const name = url.searchParams.get('name');
            const birthday = url.searchParams.get('birthday'); // MM-DD
            if (!name || !birthday) return new Response('Missing name or birthday', { status: 400 });
            await this.store.addMemberBirthday(name, birthday);
            return new Response(`Added ${name} with birthday ${birthday}`);
        }

        if (url.pathname === '/test-tweet') {
            try {
                const tweetId = await this.twitter.postText("RCNS System Test: Service Above Self. [Test Tweet]");
                return new Response(`Test tweet sent! ID: ${tweetId}`);
            } catch (e: any) {
                return new Response(`Test tweet failed: ${e.message}`, { status: 500 });
            }
        }

        if (url.pathname === '/test-thread') {
            const mockAnalysis = {
                type: 'recap',
                clubName: 'Nairobi South',
                topic: 'Artificial Intelligence in Rotary',
                highlights: [
                    'Explored the future of AI in community service.',
                    'Discussed ethical implications of automation.',
                    'Brainstormed ways to leverage data for impact.'
                ],
                summary: 'An enlightening session on how technology can amplify our service.'
            };
            const post: PostItem = {
                id: 'test-recap-' + Date.now(),
                source_url: 'https://t.me/test/1',
                raw_text: 'Test recap thread content',
                status: 'pending',
                created_at: Date.now()
            };
            try {
                const threadId = await this.publishRecapThread(post, mockAnalysis, null);
                return new Response(`Thread test initiated! Main ID: ${threadId}`);
            } catch (e: any) {
                return new Response(`Thread test failed: ${e.message}`, { status: 500 });
            }
        }

        return new Response('RCNS Durable Object Online');
    }

    async handleScheduled() {
        const now = new Date();
        // Nairobi is UTC+3
        const nairobiHour = (now.getUTCHours() + 3) % 24;
        const nairobiDate = new Date(now.getTime() + (3 * 60 * 60 * 1000));
        const todayStr = nairobiDate.toISOString().split('T')[0];

        // Trigger ingest audit (polling)
        await this.checkNewMessages();

        // Trigger daily report at midnight Nairobi time (21:00 UTC), once per day
        if (nairobiHour === 0 && this.lastReportDay !== todayStr) {
            console.log(`[RCNS_DO] Nairobi Midnight detected (${todayStr}), generating daily report...`);
            try {
                await this.generateDailyReport();
                this.lastReportDay = todayStr;
                await this.ctx.storage.put('lastReportDay', todayStr);
            } catch (e) {
                this.logger.error('RCNS_DO', 'Failed to generate daily Nairobi report', e);
            }
        }

        // Trigger daily event thread at 6 AM Nairobi time, once per day
        if (nairobiHour === 6 && this.lastThreadDay !== todayStr) {
            console.log(`[RCNS_DO] Nairobi 6 AM detected (${todayStr}), generating daily event thread...`);
            try {
                await this.generateDailyEventThread();
                this.lastThreadDay = todayStr;
                await this.ctx.storage.put('lastThreadDay', todayStr);
            } catch (e) {
                this.logger.error('RCNS_DO', 'Failed to generate daily event thread', e);
            }
        }

        // Trigger birthday check at 8 AM Nairobi time
        if (nairobiHour === 8 && this.lastBirthdayDay !== todayStr) {
            console.log(`[RCNS_DO] Nairobi 8 AM detected (${todayStr}), checking for birthdays...`);
            try {
                await this.checkBirthdays(nairobiDate);
                this.lastBirthdayDay = todayStr;
                await this.ctx.storage.put('lastBirthdayDay', todayStr);
            } catch (e) {
                this.logger.error('RCNS_DO', 'Failed to check birthdays', e);
            }
        }
    }

    async alarm() {
        console.log('[RCNS_DO] Alarm pulse triggered.');
        await this.handleScheduled();

        // Reschedule for 5 minutes from now
        const nextAlarm = Date.now() + 5 * 60 * 1000;
        await this.ctx.storage.setAlarm(nextAlarm);
        console.log(`[RCNS_DO] Next alarm scheduled for: ${new Date(nextAlarm).toISOString()}`);
    }

    async generateDailyReport() {
        let report = `📊 *RCNS Daily Status Report*\n`;
        report += `📅 Date: ${new Date().toISOString().split('T')[0]}\n\n`;
        report += `✅ System is active and polling Telegram every 5 minutes.\n`;
        report += `🔍 State: lastUpdateId=${this.lastUpdateId}\n`;

        report += `\n`;

        // Check for mentions/replies
        try {
            const myId = await this.twitter.getMe();
            const mentions = await this.twitter.getMentions(myId);

            if (mentions.length > 0) {
                report += `\n💬 *New Replies/Mentions:*\n`;
                for (const m of mentions) {
                    const cleanText = m.text ? m.text.replace(/\n/g, ' ').substring(0, 100) : 'No text';
                    report += `- [Open Reply](https://twitter.com/user/status/${m.id}): "${cleanText}"\n`;
                }
            } else {
                report += `\n💬 No new replies detected.\n`;
            }
        } catch (e: any) {
            this.logger.error('RCNS_DO', 'Failed to fetch mentions for report', e);
            report += `\n⚠️ Failed to fetch replies.\n`;
        }

        const targetId = this.env.TELEGRAM_SOURCE_CHANNEL_ID;
        console.log(`[RCNS_DO] Sending daily report to ${targetId}`);

        try {
            const sentMsg = await this.telegram.sendMessage(targetId, report);
            if (sentMsg && sentMsg.message_id) {
                console.log(`[RCNS_DO] Report sent (ID: ${sentMsg.message_id}). Pinning...`);
                await this.telegram.pinMessage(targetId, sentMsg.message_id);
            }
        } catch (e) {
            this.logger.error('RCNS_DO', 'Failed to send/pin Telegram report', e);
            throw e;
        }
    }

    async checkNewMessages() {
        try {
            const targetId = this.env.TELEGRAM_SOURCE_CHANNEL_ID;
            const lastUpdateId = this.lastUpdateId;

            console.log(`[RCNS_DO] Polling for updates after ${lastUpdateId}`);
            const updates = await this.telegram.getUpdates(lastUpdateId + 1);

            if (updates.length === 0) {
                console.log('[RCNS_DO] No new updates found.');
                // Update success timestamp anyway to show heartbeat
                await this.ctx.storage.put('lastPollSuccess', Date.now());
                await this.ctx.storage.put('pollFailureCount', 0);
                return;
            }

            for (const update of updates) {
                const msg = update.channel_post || update.message;
                // Verify it's from our target channel
                if (msg && msg.chat.id.toString() === targetId) {
                    await this.handleIngest(msg);
                }
                this.lastUpdateId = update.update_id;
                await this.ctx.storage.put('lastUpdateId', update.update_id);
            }

            console.log(`[RCNS_DO] Processed ${updates.length} updates.`);

            // Reset failure count and update success timestamp
            await this.ctx.storage.put('lastPollSuccess', Date.now());
            await this.ctx.storage.put('pollFailureCount', 0);

        } catch (e: any) {
            console.error('[RCNS_DO] Polling Failed:', e.message);
            await this.store.logError('RCNS_DO', `Polling Failed: ${e.message}`, { stack: e.stack });

            // Track consecutive failures
            const count = (await this.ctx.storage.get<number>('pollFailureCount') || 0) + 1;
            await this.ctx.storage.put('pollFailureCount', count);

            if (count === 5) {
                const alert = `🚨 *RCNS ADMIN ALERT*\n\nIngestion has failed for 25 consecutive minutes.\nError: \`${e.message}\`\n\nAutomated processing may be stopped.`;
                await this.telegram.sendMessage(this.env.TELEGRAM_SOURCE_CHANNEL_ID, alert);
                console.warn('[RCNS_DO] 5 consecutive failures detected, alert sent.');
            }
        }
    }

    async handleIngest(msg: any) {
        const id = (msg.message_id || msg.id).toString();

        // 0. Memory cache check
        if (this.processedIds.has(id)) {
            console.log(`[RCNS_DO] Post ${id} hit in-memory cache, skipping.`);
            return;
        }

        // 1. Efficient SQL check
        const existing = await this.store.hasPost(id);
        if (existing) {
            console.log(`[RCNS_DO] Post ${id} hit SQL check, skipping.`);
            this.addToIdCache(id);
            return;
        }

        console.log('Ingesting message:', id);

        let analysis = null;
        const text = msg.text || msg.caption || msg.message || '';
        let mediaBuffer: Uint8Array | null = null;

        // 1. Check for media (Bot API has photo array or document)
        if (msg.photo || msg.document || msg.media) {
            console.log('Message has media, downloading...');
            mediaBuffer = await this.telegram.downloadMedia(msg);
        }

        // 2. Analyze (Image takes precedence, or analyze text if no image)
        try {
            let jsonStr = '';
            if (mediaBuffer) {
                console.log('Analyzing image with Gemini...');
                // Detect recap or event
                const isRecap = text.toLowerCase().includes('missed') || text.toLowerCase().includes('recap');
                jsonStr = await this.gemini.analyzeImage(mediaBuffer, "image/jpeg", !isRecap);
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
        if (analysis && analysis.type !== 'calendar') {
            try {
                generatedTweet = await this.gemini.generateTweetFromAnalysis(analysis);
                console.log('Generated Tweet:', generatedTweet);
            } catch (e) {
                this.logger.error('RCNS_DO', 'Failed to generate tweet', e);
            }
        }

        // Construct a PostItem from the Telegram message
        const post: PostItem = {
            id: (msg.message_id || msg.id).toString(),
            source_url: `https://t.me/c/${this.env.TELEGRAM_SOURCE_CHANNEL_ID.replace('-100', '')}/${msg.message_id || msg.id}`,
            raw_text: text,
            processed_json: analysis,
            generated_tweet: generatedTweet,
            status: 'pending',
            created_at: Date.now(),
            event_date: analysis?.date ? analysis.date.split('T')[0] : null,
        };

        // Save to FactStore (initial pending state)
        await this.store.savePost(post);
        this.addToIdCache(post.id);
        console.log(`Saved pending post ${post.id} to FactStore with analysis.`);

        if (analysis?.type === 'calendar') {
            await this.publishCalendarThread(post, analysis, mediaBuffer);

            // Update status to posted
            post.status = 'posted';
            post.published_at = Date.now();
            await this.store.savePost(post);
            console.log(`Published calendar thread for post ${post.id}.`);
        } else if (analysis?.type === 'recap') {
            await this.publishRecapThread(post, analysis, mediaBuffer);

            // Update status to posted
            post.status = 'posted';
            post.published_at = Date.now();
            await this.store.savePost(post);
            console.log(`Published recap thread for post ${post.id}.`);
        } else {
            console.log(`Saved post ${post.id} to FactStore with analysis. Status: pending for 6 AM thread.`);
        }
    }

    async publishCalendarThread(post: PostItem, analysis: any, mediaBuffer: Uint8Array | null) {
        let clubName = analysis.clubName || 'the Club';
        const month = analysis.month || 'this month';

        // Clean club name
        clubName = clubName.replace(/The Rotary Club of /i, '').replace(/Rotary Club of /i, '');

        const header = `Here's what will be happening at The Rotary Club of ${clubName} in ${month}:`;

        if (!mediaBuffer) {
            this.logger.error('RCNS_DO', `Warning: No media buffer available for calendar thread ${post.id}`);
        }

        // Post Main Tweet with Media
        const mainTweetId = await this.twitter.publish({ ...post, generated_tweet: header }, mediaBuffer, undefined);
        this.logger.log('RCNS_DO', `Calendar thread started: ${mainTweetId}`);

        let lastTweetId = mainTweetId;

        // Post Events
        if (analysis.events && Array.isArray(analysis.events)) {
            for (const event of analysis.events) {
                const date = event.date || 'TBD';
                const title = event.title || 'Event';
                const venue = event.venue ? `📍 ${event.venue}` : '';
                const time = event.time ? `⏰ ${event.time}` : '';

                const replyText = `📅 ${date}: ${title}\n${venue}\n${time}`.trim();

                try {
                    lastTweetId = await this.twitter.postText(replyText, lastTweetId);
                } catch (e: any) {
                    this.logger.error('RCNS_DO', `Failed to reply in calendar thread`, e);
                }
            }
        }

        // Post CTA Tweet
        const ctaText = "Comment below to get early notifications of upcoming events on WhatsApp.";
        try {
            await this.twitter.postText(ctaText, lastTweetId);
            this.logger.log('RCNS_DO', `CTA posted for calendar thread: ${mainTweetId}`);
        } catch (e: any) {
            this.logger.error('RCNS_DO', `Failed to post CTA for calendar thread`, e);
        }

        return mainTweetId;
    }

    async generateDailyEventThread() {
        // Find events for TODAY in Nairobi
        const now = new Date();
        const nairobiDate = new Date(now.getTime() + (3 * 60 * 60 * 1000));
        const todayStr = nairobiDate.toISOString().split('T')[0];

        this.logger.log('RCNS_DO', `Building thread for ${todayStr}...`);
        const events = await this.store.getEventsForDate(todayStr);

        if (events.length === 0) {
            this.logger.log('RCNS_DO', `No events found for ${todayStr}. Skipping thread.`);
            return;
        }

        // Format: 10th December
        const day = nairobiDate.getDate();
        const month = nairobiDate.toLocaleString('en-GB', { month: 'long', timeZone: 'Africa/Nairobi' });
        const dateDisplay = `${day}${this.getOrdinal(day)} ${month}`;

        // Tweet 1: Header
        const header = `📅 Events for ${dateDisplay}:\n\nIf you are interested in networking, professional development, or community service, here are some events you should attend.`;

        try {
            let lastTweetId = await this.twitter.postText(header);
            this.logger.log('RCNS_DO', `Thread started: ${lastTweetId}`);

            for (const post of events) {
                try {
                    // Re-download media for the tweet if available
                    let mediaBuffer: Uint8Array | null = null;
                    if (post.image_url) {
                        try {
                            const resp = await fetch(post.image_url);
                            if (resp.ok) mediaBuffer = new Uint8Array(await resp.arrayBuffer());
                        } catch (e) {
                            this.logger.error('RCNS_DO', `Failed to fetch media for post ${post.id}`, e);
                        }
                    }

                    const tweetId = await this.twitter.publish(post, mediaBuffer, lastTweetId);

                    // Mark as posted
                    post.status = 'posted';
                    post.published_at = Date.now();
                    post.twitter_id = tweetId;
                    await this.store.savePost(post);

                } catch (e: any) {
                    this.logger.error('RCNS_DO', `Failed to post thread item ${post.id}`, e);
                }
            }

            // Post CTA Tweet
            const ctaText = "Comment below to get early notifications of upcoming events on WhatsApp.";
            try {
                await this.twitter.postText(ctaText, lastTweetId);
                this.logger.log('RCNS_DO', `CTA posted for daily thread.`);
            } catch (e: any) {
                this.logger.error('RCNS_DO', `Failed to post CTA for daily thread`, e);
            }

        } catch (e: any) {
            this.logger.error('RCNS_DO', 'Failed to initiate daily thread', e);
        }
    }

    async publishRecapThread(post: PostItem, analysis: any, mediaBuffer: Uint8Array | null) {
        const clubName = analysis.clubName || 'Nairobi South';
        const topic = analysis.topic || 'Event';
        const header = `Here is what you missed at the Rotary Club of ${clubName} during our session on '${topic}':`;

        // Post Main Tweet with Media
        const mainTweetId = await this.twitter.publish({ ...post, generated_tweet: header }, mediaBuffer, undefined);
        this.logger.log('RCNS_DO', `Recap thread started: ${mainTweetId}`);

        let lastTweetId = mainTweetId;

        // Post Highlights
        if (analysis.highlights && Array.isArray(analysis.highlights)) {
            for (const highlight of analysis.highlights) {
                try {
                    lastTweetId = await this.twitter.postText(`✨ ${highlight}`, lastTweetId);
                } catch (e: any) {
                    this.logger.error('RCNS_DO', `Failed to reply in recap thread`, e);
                }
            }
        }

        // Post Summary
        if (analysis.summary) {
            try {
                await this.twitter.postText(`${analysis.summary}\n\nService Above Self.`, lastTweetId);
            } catch (e: any) {
                this.logger.error('RCNS_DO', `Failed to post summary for recap thread`, e);
            }
        }

        return mainTweetId;
    }

    async checkBirthdays(now: Date) {
        const mm = (now.getMonth() + 1).toString().padStart(2, '0');
        const dd = now.getDate().toString().padStart(2, '0');
        const mmDd = `${mm}-${dd}`;
        const currentYear = now.getFullYear();

        console.log(`[RCNS_DO] Searching for birthdays on ${mmDd}`);
        const birthdays = await this.store.getBirthdaysForDate(mmDd);

        for (const person of birthdays) {
            if (person.last_celebrated_year < currentYear) {
                console.log(`[RCNS_DO] Celebrating birthday for ${person.name}`);
                try {
                    const tweetText = await this.gemini.generateBirthdayTweet(person.name);
                    await this.twitter.postText(tweetText);
                    await this.store.markBirthdayCelebrated(person.id, currentYear);
                    this.logger.log('RCNS_DO', `Birthday tweet posted for ${person.name}`);
                } catch (e) {
                    this.logger.error('RCNS_DO', `Failed to celebrate birthday for ${person.name}`, e);
                }
            }
        }
    }

    private getOrdinal(d: number) {
        if (d > 3 && d < 21) return 'th';
        switch (d % 10) {
            case 1: return "st";
            case 2: return "nd";
            case 3: return "rd";
            default: return "th";
        }
    }

    private addToIdCache(id: string) {
        this.processedIds.add(id);
        if (this.processedIds.size > 100) {
            const firstId = this.processedIds.values().next().value;
            if (firstId) this.processedIds.delete(firstId);
        }
    }
}
