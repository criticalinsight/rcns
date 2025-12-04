require('dotenv').config();
const { TwitterApi } = require('twitter-api-v2');

async function testAccessToken() {
    console.log("--- Testing Access Token & Secret (User Context) ---");

    const appKey = process.env.TWITTER_APP_KEY;
    const appSecret = process.env.TWITTER_APP_SECRET;
    const accessToken = process.env.TWITTER_ACCESS_TOKEN;
    const accessSecret = process.env.TWITTER_ACCESS_SECRET;

    if (!appKey || !appSecret || !accessToken || !accessSecret) {
        console.error("❌ Error: One or more required keys (App Key/Secret, Access Token/Secret) are missing in .env");
        return;
    }

    const client = new TwitterApi({
        appKey: appKey,
        appSecret: appSecret,
        accessToken: accessToken,
        accessSecret: accessSecret,
    });

    try {
        console.log("Attempting to fetch authenticated user details...");
        const me = await client.v2.me();

        console.log("\n✅ Success! Access Token is valid.");
        console.log("------------------------------------------------");
        console.log(`Logged in as: @${me.data.username}`);
        console.log(`User ID:      ${me.data.id}`);
        console.log(`Name:         ${me.data.name}`);
        console.log("------------------------------------------------");

    } catch (e) {
        console.error("\n❌ Access Token Test Failed:", e.message);
        if (e.data) {
            console.error("API Error Data:", JSON.stringify(e.data, null, 2));
        }
        console.log("\nPossible Causes:");
        console.log("1. Tokens are expired or revoked.");
        console.log("2. App permissions changed (e.g., Read -> Read/Write) without regenerating tokens.");
        console.log("3. System time is incorrect (OAuth 1.0a relies on timestamps).");
    }
}

testAccessToken();
