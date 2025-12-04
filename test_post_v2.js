const { TwitterApi } = require('twitter-api-v2');

const client = new TwitterApi({
    appKey: 'IOfOh2FXxgU9MX5lG76OBvmhv',
    appSecret: 'DBt7DSnEoLJxbboRw1a4FW8SzdoPyCBdDM1FxQ2hANYNa8kLSr',
    accessToken: '1554173133694836736-H2BsPBLuXgclesT63QAJo4Rnbumejg',
    accessSecret: 'utLHd6Mmb64wOpJqFr5RHaaStPWrq1Gl3gjffvCu58hTk',
});

async function testPost() {
    console.log("Testing v2 Tweet...");
    try {
        const tweet = await client.v2.tweet("Hello World! Setting up my Rotary Bot. 🤖 #Rotary");
        console.log("Success! Tweet ID:", tweet.data.id);
    } catch (e) {
        console.error("Post Failed:", e.message);
        if (e.data) console.log(JSON.stringify(e.data, null, 2));
    }
}

testPost();
