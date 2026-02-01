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
* **Analytics Engine**: Provides helper methods for aggregating 24h performance metrics (ingested messages, published tweets, errors).

### 3. Collectors & Publishers

Modular interfaces for external platforms.

* **`TelegramCollector`** (Bot API): Connects via HTTP. Polling is triggered by the DO Alarm every 5 minutes using `getUpdates` to ingest new messages and download media.
* **`TwitterPublisher`** (OAuth 1.0a): Posts structured tweets in the club's brand style.
* **`GeminiService`** (Vision/Text): Extracts precise metadata from flyers and generates professional copy using `gemini-2.5-flash`.

## Workflow & Persistence

1. **State Management**: `lastProcessedId` and `lastReportDay` are stored in standard DO key-value storage (`this.ctx.storage`).
2. **Heartbeat**: The `RCNS_DO` maintains an internal **Durable Object Alarm**. Every 5 minutes, the `alarm()` method is triggered, which executes the work and reschedules itself.
3. **Ingest**: Messages are fetched, and media is downloaded.
4. **Analyze**: Gemini Vision extracts details (Speaker, Date, Venue, `is_upcoming`).
5. **Publishing Strategy**:
    * **Daily Event Thread**: At 6:00 AM Nairobi time, all 'pending' events for the current day are collected and published as a single storytelling thread.
    * **Monthly Calendar Unroller**: Images identified as 'calendar' are processed **immediately**. The system creates a thread: the main tweet features the poster, followed by individual text-only replies for each event.
    * **Engagement**: Every thread ends with a standardized WhatsApp CTA tweet.
6. **Reporting & Monitoring**:
    * **Detailed Daily Report**: Sent at Nairobi Midnight (UTC+3) to Telegram.
    * **Reply Tracking**: The report now queries Twitter for recent mentions and includes both the link and a text preview of user replies directly in the Telegram summary.

## Development

### Commands

* `npm run dev`: Start local worker.
* `npm run typecheck`: Verify TypeScript types.
* `npm run deploy`: Deploy to Cloudflare.
