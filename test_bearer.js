const { TwitterApi } = require('twitter-api-v2');

const BEARER_TOKEN = 'AAAAAAAAAAAAAAAAAAAAABk05wEAAAAAK5rjEV6z6fjewGRAnl1D8qlG4TY%3DUOYncAf9lhROP4iq3MV2TWXFoqAhYQeRGofkg2nVBbdN8GHF5N';

async function testBearer() {
    console.log("Testing Bearer Token...");
    const client = new TwitterApi(BEARER_TOKEN);
    try {
        // Try to get a user by username (public read)
        const user = await client.v2.userByUsername('rotarynairobis');
        console.log("Bearer Token Works! Found user:", user.data);
    } catch (e) {
        console.error("Bearer Token Failed:", e.message);
        if (e.data) console.log(JSON.stringify(e.data, null, 2));
    }
}

testBearer();
