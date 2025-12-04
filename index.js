const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');
const path = require('path');
const { createPoster } = require('./generate_poster');
const { postTweetAPI: postTweet } = require('./post_twitter_api');

// Configuration
const STOGRAM_DIR = path.resolve('./4K Stogram');
const CLUB_NAME = 'rcnairobisouth';

// !!! REPLACE THIS WITH YOUR API KEY !!!
const API_KEY = process.env.GEMINI_API_KEY || "YOUR_API_KEY_HERE";

async function main() {
    console.log("--- Rotary Bot: API + Browser Edition ---");

    if (API_KEY === "YOUR_API_KEY_HERE") {
        console.error("Error: Please set your GEMINI_API_KEY environment variable or edit index.js");
        return;
    }

    // 1. Find Latest Images
    const clubDir = path.join(STOGRAM_DIR, CLUB_NAME);
    if (!fs.existsSync(clubDir)) {
        console.error(`Error: Directory not found: ${clubDir}`);
        return;
    }

    const files = fs.readdirSync(clubDir)
        .filter(file => {
            const filePath = path.join(clubDir, file);
            const stats = fs.statSync(filePath);
            return (file.endsWith('.jpg') || file.endsWith('.jpeg')) && stats.size > 50000; // > 50KB
        })
        .map(file => {
            const filePath = path.join(clubDir, file);
            const stats = fs.statSync(filePath);
            return { file, path: filePath, mtime: stats.mtime };
        })
        .sort((a, b) => b.mtime - a.mtime);

    if (files.length === 0) {
        console.log("No suitable images found (checked size > 50KB).");
        return;
    }

    // 2. Analyze with Gemini API
    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite-preview-09-2025" });

    const prompt = `
    Analyze this Rotary Club poster. Extract details into JSON:
    {
        "clubName": "Name of the club",
        "speaker": "Name of the speaker",
        "topic": "Topic of the event",
        "venue": "Venue location",
        "date": "Date of the event",
        "time": "Time of the event"
    }
    If a field is missing, use null.
    Return ONLY the JSON.
    `;

    // Try top 5 images
    const imagesToTry = files.slice(0, 5);

    for (const image of imagesToTry) {
        console.log(`\nAnalyzing image: ${image.file}`);

        try {
            const imagePart = fileToGenerativePart(image.path, "image/jpeg");

            console.log("Sending to Gemini API...");
            const result = await model.generateContent([prompt, imagePart]);
            const response = await result.response;
            const text = response.text();

            console.log("Response:", text);

            // Parse JSON
            let json = null;
            try {
                const jsonMatch = text.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    json = JSON.parse(jsonMatch[0]);
                }
            } catch (e) {
                console.log("JSON Parse Error");
            }

            if (json) {
                // Check if it's a valid poster (has at least Topic or Speaker or Date)
                if (json.topic || json.speaker || (json.date && json.time)) {
                    console.log("\n[SUCCESS] Found valid poster!");
                    console.log("Details:", json);

                    // Generate Poster
                    const outputPath = path.resolve('./final_poster.jpg');
                    await createPoster(json, image.path, outputPath);

                    // Post to Twitter (Browser)
                    await postTweet(json);

                    break; // Stop loop
                } else {
                    console.log("Result contains mostly nulls. Trying next image...");
                }
            }

            // Wait a bit to avoid rate limits
            await new Promise(resolve => setTimeout(resolve, 2000));

        } catch (error) {
            console.error("API Error:", error.message);
            if (error.message.includes("429")) {
                console.log("Rate limit hit. Waiting 10s...");
                await new Promise(resolve => setTimeout(resolve, 10000));
            }
        }
    }
}

function fileToGenerativePart(path, mimeType) {
    return {
        inlineData: {
            data: Buffer.from(fs.readFileSync(path)).toString("base64"),
            mimeType
        },
    };
}

main();
