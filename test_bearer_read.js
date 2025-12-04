require('dotenv').config();
const { TwitterApi } = require('twitter-api-v2');

async function testBearerRead() {
    console.log("--- Testing Bearer Token Read ---");

    const token = process.env.TWITTER_BEARER_TOKEN;
    if (!token) {
        console.error("Error: TWITTER_BEARER_TOKEN is missing in .env");
        return;
    }

    // Initialize client with Bearer Token (App-only access)
    const client = new TwitterApi(token);

    // Target username to read from
    const targetUsername = 'rotarynairobis';

    try {
        console.log(`Looking up user @${targetUsername}...`);
        const user = await client.v2.userByUsername(targetUsername);

        if (user.errors) {
            console.error("API returned errors:", JSON.stringify(user.errors, null, 2));
            return;
        }

        if (!user.data) {
            console.error("No user data returned. Response:", JSON.stringify(user, null, 2));
            return;
        }

        const userId = user.data.id;
        console.log(`Found User ID: ${userId}`);

        console.log(`Fetching last tweet for user ID ${userId}...`);
        // Fetch last 5 tweets to be sure
        const tweets = await client.v2.userTimeline(userId, { max_results: 5 });

        if (tweets.data.meta.result_count === 0) {
            console.log("User has no tweets.");
            return;
        }

        const lastTweet = tweets.data.data[0];
        console.log("\n✅ Success! Last Tweet:");
        console.log("------------------------------------------------");
        console.log(`ID:   ${lastTweet.id}`);
        console.log(`Text: ${lastTweet.text}`);
        console.log("------------------------------------------------");

    } catch (e) {
        console.error("❌ Error:", e.message);
        if (e.data) {
            console.error("API Error Data:", JSON.stringify(e.data, null, 2));
        }
    }
}

testBearerRead();
