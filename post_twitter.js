const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const path = require('path');
const fs = require('fs');

puppeteer.use(StealthPlugin());

const BOT_PROFILE_DIR = path.resolve('./bot_profile');
const POSTER_PATH = path.resolve('./final_poster.jpg');

async function postTweet(details) {
    console.log("--- Posting to Twitter ---");

    if (!fs.existsSync(POSTER_PATH)) {
        console.error("Error: final_poster.jpg not found.");
        return;
    }

    console.log("Launching Chrome...");
    const browser = await puppeteer.launch({
        headless: false,
        userDataDir: BOT_PROFILE_DIR,
        args: ['--start-maximized'],
        defaultViewport: null,
        executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" // Adjust if needed
    });

    const page = (await browser.pages())[0];

    console.log("Navigating to X.com...");
    await page.goto('https://x.com/home', { waitUntil: 'networkidle2' });

    // Check Login & Switch Account
    try {
        await page.waitForSelector('div[data-testid="SideNav_AccountSwitcher_Button"]', { timeout: 10000 });

        console.log("Opening Account Switcher...");
        await page.click('div[data-testid="SideNav_AccountSwitcher_Button"]');
        await page.waitForTimeout(2000);

        // Look for the delegate account using XPath to find text
        const [accountLink] = await page.$x("//div[contains(., '@rotarynairobis')]");

        if (accountLink) {
            console.log("Found target account. Switching...");
            await accountLink.click();
            await page.waitForTimeout(5000); // Wait for reload
        } else {
            console.log("Target account '@rotarynairobis' not found in switcher. Assuming already logged in or not delegated.");
            // Click outside to close switcher
            await page.mouse.click(500, 100);
        }

    } catch (e) {
        console.log("Account switcher not found or error switching:", e.message);
    }

    // Go to compose
    await page.goto('https://x.com/compose/post', { waitUntil: 'networkidle2' });

    // Check Compose Window
    try {
        await page.waitForSelector('div[data-testid="tweetTextarea_0"]', { timeout: 10000 });
    } catch (e) {
        console.log("Compose window not found.");
        console.log("Please log in and switch to @rotarynairobis manually, then press ENTER.");
        await new Promise(resolve => {
            process.stdin.once('data', () => resolve());
        });
    }

    // Upload Image
    console.log("Uploading image...");
    const fileInput = await page.$('input[type="file"]');
    if (fileInput) {
        await fileInput.uploadFile(POSTER_PATH);
    } else {
        console.error("Could not find file input.");
        return;
    }

    await page.waitForTimeout(2000);

    // Type Text
    const tweetText = `📅 Upcoming Event: ${details.topic}\n🗣️ Speaker: ${details.speaker}\n📍 ${details.venue}\n⏰ ${details.date} at ${details.time}\n\n#Rotary #ServiceAboveSelf`;

    console.log("Typing text...");
    await page.type('div[data-testid="tweetTextarea_0"]', tweetText);

    await page.waitForTimeout(2000);

    // Click Post
    console.log("Posting...");
    const postButton = await page.$('button[data-testid="tweetButton"]');
    if (postButton) {
        await postButton.click();
        console.log("Tweet posted!");
        await page.waitForTimeout(5000); // Wait for post to complete
    } else {
        console.error("Post button not found.");
    }

    // await browser.close();
}

if (require.main === module) {
    const mockDetails = {
        topic: "Test Event",
        speaker: "John Doe",
        venue: "Virtual",
        date: "Tomorrow",
        time: "6pm"
    };
    postTweet(mockDetails);
}

module.exports = { postTweet };
