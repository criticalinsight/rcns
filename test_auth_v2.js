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

async function testAuth() {
    console.log("Testing OAuth 1.0a with v2 API...");
    try {
        const me = await client.v2.me();
        console.log("Success! Logged in as:", me.data);
    } catch (e) {
        console.error("v2 Auth Failed:", e.message);
        if (e.data) console.log(JSON.stringify(e.data, null, 2));
    }
}

testAuth();
