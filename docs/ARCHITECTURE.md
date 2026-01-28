# RCNS Architecture (Cloudflare Edition)

The Rotary Club Notification System (RCNS) has been re-architected as a **Serverless Cloudflare Worker** application, moving away from local Node.js scripting.

## Core Components

### 1. `RCNS_DO` (Durable Object)
The singleton orchestrator that maintains state and coordinates the workflow.
*   **Role**: Handles cron triggers, ingestion logic, and publishing queues.
*   **State**: Persistent storage via SQLite (`FactStore`).

### 2. `FactStore` (SQLite)
A robust SQL database running within the Durable Object.
*   **Replaces**: `state.json`
*   **Schema**:
    *   `posts`: Tracks event flyers, processing status, and deduplication hashes.
    *   `logs`: Structured error and activity logging.

### 3. Collectors & Publishers
Modular interfaces for external platforms.
*   **`TelegramCollector`**: Uses **GramJS** to connect to Telegram MTProto. Since Workers are stateless, it uses a **Polling** mechanism triggered by the Durable Object Alarm (every 5 minutes) to fetch new messages from the source channel.
*   **`TwitterPublisher`**: Uses OAuth 1.0a signatures to interact with the Twitter v2 API. It handles text-only tweets in the current phase.
*   **`GeminiService`**: Integrates with Google Generative AI to provide Vision and Text analysis capabilities. It uses a structured prompt to enforce the Rotary brand style.

## Workflow

1.  **Ingest**: An event flyer is forwarded to the designated Telegram Channel.
2.  **Detect**: `RCNS_DO` (via Telegram IO) receives the message.
3.  **Analyze**: Gemini Vision extracts event details (Speaker, Date, Venue).
4.  **Approve**: The system sends a summary back to Telegram for admin confirmation (Future Phase).
5.  **Publish**: Validated events are posted to Twitter.

## Development

### Commands
*   `npm run dev`: Start local worker.
*   `npm run typecheck`: Verify TypeScript types.
*   `npm run deploy`: Deploy to Cloudflare.
