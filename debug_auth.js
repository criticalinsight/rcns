require('dotenv').config();
const { TwitterApi } = require('twitter-api-v2');

async function debugAuth() {
    console.log("=== Twitter Auth Debugger ===");

    // 1. Test Bearer Token (App-only)
    console.log("\n1. Testing Bearer Token (App-only)...");
    if (process.env.TWITTER_BEARER_TOKEN) {
        try {
            const appClient = new TwitterApi(process.env.TWITTER_BEARER_TOKEN);
            // v2.userByUsername requires Basic or Bearer token (App-only is fine for public data usually, but v2 might require User Context for some)
            // Let's try a simple v2 endpoint that allows App-only, like looking up a user by ID or username.
            // Actually, v2.userByUsername('Twitter') is a good test.
            const user = await appClient.v2.userByUsername('Twitter');
            console.log("✅ Bearer Token works! Found user ID:", user.data.id);
        } catch (e) {
            console.error("❌ Bearer Token Failed:", e.message);
            if (e.data) console.error("   Details:", JSON.stringify(e.data));
        }
    } else {
        console.log("⚠️ No Bearer Token found in .env");
    }

    // 2. Test OAuth 1.0a (User Context - Read/Write)
    console.log("\n2. Testing OAuth 1.0a (User Context)...");
    const userClient = new TwitterApi({
        appKey: process.env.TWITTER_APP_KEY,
        appSecret: process.env.TWITTER_APP_SECRET,
        accessToken: process.env.TWITTER_ACCESS_TOKEN,
        accessSecret: process.env.TWITTER_ACCESS_SECRET,
    });

    try {
        const me = await userClient.v2.me();
        console.log("✅ OAuth 1.0a works! Logged in as:", me.data.username);
    } catch (e) {
        console.error("❌ OAuth 1.0a Failed:", e.message);
        if (e.data) console.error("   Details:", JSON.stringify(e.data));
        console.log("\n💡 SUGGESTION: If this failed, your Access Token/Secret might be expired or mismatch the App permissions.");
        console.log("   Go to Developer Portal -> Projects & Apps -> [Your App] -> Keys and tokens -> Access Token and Secret -> Regenerate");
    }
}

debugAuth();
