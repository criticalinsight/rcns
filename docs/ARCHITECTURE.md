# RCNS Architecture (Cloudflare Edition)

The Rotary Club Notification System (RCNS) has been re-architected as a **Serverless Cloudflare Worker** application, moving away from local Node.js scripting.

## Core Components

### 1. `RCNS_DO` (Durable Object)

The singleton orchestrator that maintains state and coordinates the workflow.

* **Role**: Handles cron triggers, ingestion logic, and daily reporting.
* **State**: Persistent storage via SQLite (`FactStore`).

### 2. `FactStore` (SQLite)

A robust SQL database running within the Durable Object using native **Durable Object SQLite** (`this.ctx.storage.sql`).

* **Schema**:
  * `posts`: Tracks event flyers, processing status, and deduplication hashes.
  * `logs`: Structured error and activity logging.
  * `member_birthdays`: Store for club member names and birthdays for automated celebrations.
* **Optimization (In-Memory Caching)**: To minimize SQL row reads, the system caches `lastUpdateId` and other DO state variables in memory. It also maintains a 100-item LRU cache of recently processed message IDs.

### 3. Collectors & Publishers

Modular interfaces for external platforms.

* **`TelegramCollector`** (Bot API): Connects via HTTP. Polling is triggered by the DO Alarm every 5 minutes using `getUpdates` to ingest new messages and download media.
* **`TwitterPublisher`** (OAuth 1.0a): Posts structured tweets in the club's brand style.
* **`GeminiService`** (Vision/Text): Extracts precise metadata from flyers and generates professional copy using `gemini-2.5-flash`.

## Workflow & Persistence

1. **State Management**: `lastProcessedId` and `lastReportDay` are stored in standard DO key-value storage (`this.ctx.storage`).
2. **Heartbeat**: The `RCNS_DO` maintains an internal **Durable Object Alarm**. Every 5 minutes, the `alarm()` method is triggered, which executes the work and reschedules itself.
3. **Ingest**: Messages are fetched, and media is downloaded.
4. **Efficient Deduplication**: Before processing, IDs are checked against an in-memory `Set`. If not found, a lightweight `SELECT 1` (via `hasPost`) is performed instead of a full row read.
5. **Analyze**: Gemini Vision extracts details (Speaker, Date, Venue, `is_upcoming`).
6. **Publishing Strategy**:
    * **Daily Event Thread**: At 6:00 AM Nairobi time, all 'pending' events for the current day are collected and published as a single storytelling thread.
    * **Monthly Calendar Unroller**: Images identified as 'calendar' are processed **immediately**. The system creates a thread: the main tweet features the poster, followed by individual text-only replies for each event.
    * **Event Recap Threads**: Detects recap photos/messages and generates "What you missed" highlight threads with automated summary analysis.
    * **Birthday Automation**: At 8:00 AM Nairobi time, the system checks for any member birthdays and posts a celebratory tweet if not already celebrated that year.
    * **Engagement**: Every thread ends with a standardized WhatsApp CTA tweet.
7. **Reporting & Monitoring**:
    * **Detailed Daily Report**: Sent at Nairobi Midnight (UTC+3) to Telegram.
    * **Reply Tracking**: The report now queries Twitter for recent mentions and includes both the link and a text preview of user replies directly in the Telegram summary.

## Debug & Admin APIs

The Durable Object exposes internal endpoints for maintenance and verification:

* `/test-tweet`: Sends a standard "System Test" tweet.
* `/test-thread`: Triggers a mock multi-tweet "Recap" thread.
* `/add-member?name=NAME&birthday=MM-DD`: Manually adds a member to the birthday registry.
* `/debug-posts`: Dumps recent entries from the `posts` table.
* `/debug-logs`: Dumps the latest system logs.

## Development

### Commands

* `npm run dev`: Start local worker.
* `npm run typecheck`: Verify TypeScript types.
* `npm run deploy`: Deploy to Cloudflare.
