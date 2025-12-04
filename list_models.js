const { GoogleGenerativeAI } = require("@google/generative-ai");

const API_KEY = process.env.GEMINI_API_KEY;

async function main() {
    if (!API_KEY) {
        console.error("Please set GEMINI_API_KEY");
        return;
    }

    const genAI = new GoogleGenerativeAI(API_KEY);
    // Note: listModels is not directly on genAI instance in some versions, 
    // but let's try the model manager if available, or just try a known working model like 'gemini-pro'

    // Actually, the library exposes a ModelManager? 
    // Let's try to just use 'gemini-pro' which is the safest bet for v1beta.
    // But for images we need 'gemini-pro-vision'.

    console.log("Trying gemini-pro-vision...");
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });
        const result = await model.generateContent(["Test", { inlineData: { data: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", mimeType: "image/png" } }]);
        console.log("gemini-pro-vision WORKS!");
    } catch (e) {
        console.log("gemini-pro-vision failed:", e.message);
    }

    console.log("Trying gemini-1.5-flash...");
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(["Test"]);
        console.log("gemini-1.5-flash WORKS!");
    } catch (e) {
        console.log("gemini-1.5-flash failed:", e.message);
    }

}

main();
