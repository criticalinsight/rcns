# RCNS Architecture (Cloudflare Edition)

The Rotary Club Notification System (RCNS) has been re-architected as a **Serverless Cloudflare Worker** application, moving away from local Node.js scripting.

## Core Components

### 1. `RCNS_DO` (Durable Object)
The singleton orchestrator that maintains state and coordinates the workflow.
*   **Role**: Handles cron triggers, ingestion logic, and daily reporting.
*   **State**: Persistent storage via SQLite (`FactStore`).

### 2. `FactStore` (SQLite)
A robust SQL database running within the Durable Object.
*   **Schema**:
    *   `posts`: Tracks event flyers, processing status, and deduplication hashes.
    *   `logs`: Structured error and activity logging.
*   **Analytics Engine**: Provides helper methods for aggregating 24h performance metrics (ingested messages, published tweets, errors).

### 3. Collectors & Publishers
Modular interfaces for external platforms.
*   **`TelegramCollector`** (GramJS): Connects to MTProto. Uses a Polling mechanism triggered by the DO Alarm to ingest messages and download media.
*   **`TwitterPublisher`** (OAuth 1.0a): Posts structured tweets in the club's brand style.
*   **`GeminiService`** (Vision/Text): Extracted precise metadata from flyers and generates professional copy.

## Workflow

1.  **Ingest**: Messages are fetched from Telegram via periodic polling.
2.  **Analyze**: Gemini Vision extracts details (Speaker, Date, Venue, is_upcoming).
3.  **Publish**: Upcoming events are automatically posted to Twitter.
4.  **Report**: Every midnight UTC, the system generates a 24h performance summary, sends it to Telegram, and pins it.

## Development

### Commands
*   `npm run dev`: Start local worker.
*   `npm run typecheck`: Verify TypeScript types.
*   `npm run deploy`: Deploy to Cloudflare.
