require('dotenv').config();
const { TwitterApi } = require('twitter-api-v2');
const fs = require('fs');
const path = require('path');

const client = new TwitterApi({
    appKey: process.env.TWITTER_APP_KEY,
    appSecret: process.env.TWITTER_APP_SECRET,
    accessToken: process.env.TWITTER_ACCESS_TOKEN,
    accessSecret: process.env.TWITTER_ACCESS_SECRET,
    clientId: process.env.TWITTER_CLIENT_ID,
    clientSecret: process.env.TWITTER_CLIENT_SECRET,
});

const BEARER_TOKEN = process.env.TWITTER_BEARER_TOKEN;

const POSTER_PATH = path.resolve('./final_poster.jpg');

async function postTweetAPI(details) {
    console.log("--- Posting to Twitter (API) ---");

    try {
        // Verify Credentials - Commented out as Free Tier might not allow reading profile
        // const me = await client.v1.verifyCredentials();
        // console.log(`Logged in as: @${me.screen_name}`);

        if (!fs.existsSync(POSTER_PATH)) {
            console.error("Error: final_poster.jpg not found.");
            return;
        }

        // Upload Media (v1.1 is still the standard for media upload in this lib)
        console.log("Uploading media...");
        const mediaId = await client.v1.uploadMedia(POSTER_PATH);
        console.log(`Media uploaded. ID: ${mediaId}`);

        // Compose Text
        const tweetText = `📅 Upcoming Event: ${details.topic}\n🗣️ Speaker: ${details.speaker}\n📍 ${details.venue}\n⏰ ${details.date} at ${details.time}\n\n#Rotary #ServiceAboveSelf`;

        // Post Tweet (v2)
        console.log("Posting tweet (v2)...");
        const tweet = await client.v2.tweet(tweetText, { media: { media_ids: [mediaId] } });

        console.log("Tweet posted successfully!");
        console.log("ID:", tweet.data.id);
        console.log("Text:", tweet.data.text);

    } catch (e) {
        console.error("Twitter API Error Message:", e.message);
        if (e.data) console.error("Twitter API Error Data:", JSON.stringify(e.data, null, 2));
    }
}

// Allow running standalone
if (require.main === module) {
    // Mock details if running directly
    const mockDetails = {
        topic: "Test Event via API",
        speaker: "API Bot",
        venue: "Virtual",
        date: "Today",
        time: "Now"
    };
    // If we have a real poster, use it. Otherwise this might fail on upload.
    postTweetAPI(mockDetails);
}

module.exports = { postTweetAPI };
