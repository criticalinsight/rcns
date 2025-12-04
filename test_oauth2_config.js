require('dotenv').config();
const { TwitterApi } = require('twitter-api-v2');

async function testOAuth2Config() {
    console.log("--- Testing OAuth 2.0 Configuration (Client ID / Secret) ---");

    const clientId = process.env.TWITTER_CLIENT_ID;
    const clientSecret = process.env.TWITTER_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        console.error("❌ Error: TWITTER_CLIENT_ID or TWITTER_CLIENT_SECRET is missing in .env");
        return;
    }

    console.log("Keys found in .env.");

    // Initialize client for OAuth 2.0
    const client = new TwitterApi({
        clientId: clientId,
        clientSecret: clientSecret,
    });

    try {
        // Generate an Auth Link
        // This doesn't make a network request to Twitter yet, but it verifies the library accepts the keys
        // and constructs a valid URL structure.
        const { url, codeVerifier, state } = client.generateOAuth2AuthLink(
            'http://localhost:3000/callback',
            { scope: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'] }
        );

        console.log("\n✅ Configuration is valid for generating Auth Links!");
        console.log("Generated Auth URL (Click to test if keys are valid on Twitter's side):");
        console.log(url);
        console.log("\n(Note: You don't need to click this unless you are building a login flow. This just proves the keys are correctly loaded.)");

    } catch (e) {
        console.error("❌ Error generating Auth Link:", e.message);
    }
}

testOAuth2Config();
