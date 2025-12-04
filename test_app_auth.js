const { TwitterApi } = require('twitter-api-v2');

const appKey = 'IOfOh2FXxgU9MX5lG76OBvmhv';
const appSecret = 'DBt7DSnEoLJxbboRw1a4FW8SzdoPyCBdDM1FxQ2hANYNa8kLSr';

async function testAppAuth() {
    console.log("Testing App-Only Auth (Consumer Keys)...");

    // App-only auth uses only Consumer Keys
    const client = new TwitterApi({
        appKey: appKey,
        appSecret: appSecret,
    });

    try {
        // Get the app-only client (this exchanges key/secret for a bearer token internally)
        const appClient = await client.appLogin();

        console.log("App Login Successful!");

        // Try to fetch a user
        const user = await appClient.v2.userByUsername('RotaryNairobiS');
        console.log("Found user:", user.data);

    } catch (e) {
        console.error("App Auth Failed:", e.message);
        if (e.data) console.log(JSON.stringify(e.data, null, 2));
    }
}

testAppAuth();
