# RCNS (Rotary Club Notification System)

RCNS is a production-grade **Cloudflare Worker** designed to automate event notifications for the Rotary Club of Nairobi South (@rotarynairobis). It streamlines the transition from event flyer ingestion to social media publication using AI and serverless edge computing.

## 🚀 Key Features

-   **Cloudflare Workers & Durable Objects**: A serverless backbone that provides 24/7 reliability and persistence via SQLite (D1 on DO).
-   **Gemini AI Integration**: Uses `gemini-2.5-flash` for:
    -   **Vision**: Extracting event details (Date, Venue, Speaker) from images/flyers.
    -   **Text Analysis**: Summarizing and structuring event information.
    -   **Tweet Generation**: Crafting professional, brand-aligned tweets in the `@rotarynairobis` style (No hashtags/emojis).
-   **Telegram Polling**: Periodically polls a dedicated Telegram channel for new event forwards using **GramJS**.
-   **Automated Workflow**: Fully automated cycle from Telegram Ingestion → AI Analysis → Twitter Publication.
-   **Daily Analytics & Reporting**:
    -   **Midnight Summaries**: Aggregates 24-hour performance data (ingests, posts, errors) at 00:00 UTC.
    -   **Telegram Distribution**: Sends formatted reports to the source channel.
    -   **Persistent Pinning**: Automatically pins daily reports for community visibility.

## 🛠 Architecture

For a deep dive into the system design, see [ARCHITECTURE.md](docs/ARCHITECTURE.md).

## ⚙️ Configuration

Set the following secrets in your Cloudflare environmental variables (or `.dev.vars` for local development):

### Telegram MTProto
-   `TELEGRAM_API_ID`: Your Telegram API ID.
-   `TELEGRAM_API_HASH`: Your Telegram API Hash.
-   `TELEGRAM_SESSION`: MTProto session string (generated via `scripts/generate_session.js`).
-   `TELEGRAM_SOURCE_CHANNEL_ID`: High-level ID of the source channel (e.g., `-100...`).

### Twitter (X) API v2
-   `TWITTER_APP_KEY`
-   `TWITTER_APP_SECRET`
-   `TWITTER_ACCESS_TOKEN`
-   `TWITTER_ACCESS_SECRET`

### Google Gemini
-   `GEMINI_API_KEY`: API key for Google AI Studio.

## 📖 Development

### Local Setup
```bash
bun install
# Generate a Telegram Session string if needed
bun scripts/generate_session.js
```

### Deployment
```bash
# Push to Cloudflare Production
bun run deploy
```

### Monitoring
```bash
# Live logs from the Edge
bun x wrangler tail
```

## 📜 License
Private/Proprietary for the Rotary Club of Nairobi South.
