require('dotenv').config();
const { TwitterApi } = require('twitter-api-v2');

const client = new TwitterApi({
    appKey: process.env.TWITTER_APP_KEY,
    appSecret: process.env.TWITTER_APP_SECRET,
    accessToken: process.env.TWITTER_ACCESS_TOKEN,
    accessSecret: process.env.TWITTER_ACCESS_SECRET,
    clientId: process.env.TWITTER_CLIENT_ID,
    clientSecret: process.env.TWITTER_CLIENT_SECRET,
});

async function postTextTweet() {
    console.log("--- Posting Test Text Tweet to Twitter (API) ---");

    try {
        const tweetText = ':hello';

        // Post Tweet (v2)
        // v2 is generally preferred for simple text tweets if the app has v2 access
        // However, the original code used v1.1. Let's try v2 first, if it fails fallback or use v1.
        // Actually, the original code used client.v1.tweet. Let's stick to what was working or likely to work.
        // But v2 is `client.v2.tweet(tweetText)`.

        // Let's try v2 first as it is the modern standard.
        console.log("Posting tweet...");
        const tweet = await client.v2.tweet(tweetText);

        console.log("Tweet posted successfully!");
        console.log("ID:", tweet.data.id);
        console.log("Text:", tweet.data.text);

    } catch (e) {
        console.error("Twitter API Error Message:", e.message);
        if (e.data) console.error("Twitter API Error Data:", JSON.stringify(e.data, null, 2));

        // Fallback to v1 if v2 fails (e.g. due to access level)
        try {
            console.log("Attempting v1.1 fallback...");
            const tweetText = `Test tweet from API (v1.1) at ${new Date().toISOString()}`;
            const tweet = await client.v1.tweet(tweetText);
            console.log("Tweet posted successfully (v1.1)!");
            console.log("ID:", tweet.id_str);
            console.log("Text:", tweet.text);
        } catch (e1) {
            console.error("Twitter API v1.1 Error Message:", e1.message);
            if (e1.data) console.error("Twitter API v1.1 Error Data:", JSON.stringify(e1.data, null, 2));
        }
    }
}

postTextTweet();
