# RCNS (Rotary Club Notification System)

RCNS is a production-grade **Cloudflare Worker** designed to automate event notifications for the Rotary Club of Nairobi South (@rotarynairobis). It streamlines the transition from event flyer ingestion to social media publication using AI and serverless edge computing.

## 🚀 Key Features

- **Cloudflare Workers & Durable Objects**: A serverless backbone that provides 24/7 reliability and persistence via SQLite (D1 on DO).
- **Gemini AI Integration**: Uses `gemini-2.5-flash` (or newer) for:
  - **Vision**: Extracting event details (Date, Venue, Speaker) from images/flyers with `is_upcoming` detection.
  - **Text Analysis**: Summarizing and structuring event information from plain text messages.
  - **Tweet Generation**: Crafting professional, brand-aligned tweets in the `@rotarynairobis` style (No hashtags/emojis).
- **Automated Threading Workflow**:
  - **Daily 6 AM Briefing**: Aggregates all events for the current day into a single narrative thread.
  - **Monthly Calendar Unroller**: Instantly unrolls monthly schedule posters into detailed multi-tweet threads.
  - **Call To Action (CTA)**: Automatically appends engagement footers to all threads.
- **Daily Analytics & Reply Tracking**:
  - **Nairobi Midnight Summaries**: Aggregates 24-hour performance data at 00:00 Nairobi Time (UTC+3).
  - **Engagement Reporting**: Fetches and previews user replies/mentions from Twitter directly in the Telegram report.
  - **Persistent Pinning**: Automatically pins reports for community visibility.

## 🛠 Architecture

For a deep dive into the system design, see [ARCHITECTURE.md](docs/ARCHITECTURE.md).

## ⚙️ Configuration

Set the following secrets in your Cloudflare environmental variables (or `.dev.vars` for local development):

### Telegram Bot API

- `TELEGRAM_BOT_TOKEN`: Official bot token from @BotFather.
- `TELEGRAM_SOURCE_CHANNEL_ID`: The ID of the primary feed channel (e.g., `-100...`).

### Twitter (X) API v2

- `TWITTER_APP_KEY`
- `TWITTER_APP_SECRET`
- `TWITTER_ACCESS_TOKEN`
- `TWITTER_ACCESS_SECRET`

### Google Gemini

- `GEMINI_API_KEY`: API key for Google AI Studio.

## 📖 Development

### Local Setup

```bash
bun install
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
