# RCNS Twitter Bot

This project automates posting updates to the Rotary Club of Nairobi South (@rotarynairobis) Twitter account.

## Features
- **Twitter API Integration**: Uses `twitter-api-v2` to post tweets and upload media.
- **GitHub Actions**: Automated workflows to test connections and post tweets.
- **Puppeteer Fallback**: Includes Puppeteer scripts for browser-based automation if needed.

## Setup

1.  **Environment Variables**:
    Copy `.env.example` to `.env` and fill in your Twitter API credentials:
    ```
    TWITTER_APP_KEY=...
    TWITTER_APP_SECRET=...
    TWITTER_ACCESS_TOKEN=...
    TWITTER_ACCESS_SECRET=...
    TWITTER_BEARER_TOKEN=...
    ```

2.  **Install Dependencies**:
    ```bash
    npm install
    ```

## Usage

### Run Locally
To post a test tweet:
```bash
node post_text_tweet.js
```

### GitHub Actions
Go to the **Actions** tab in the repository to run workflows manually:
- **Test Twitter Connection**: Verifies authentication.
- **Post Tweet**: Posts a configured text tweet (e.g., ":hello").
