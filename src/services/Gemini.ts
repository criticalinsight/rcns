import { GoogleGenerativeAI } from "@google/generative-ai";
import { Env } from "../types";
import { PROMPTS } from "./Prompts";

export class GeminiService {
    private genAI: GoogleGenerativeAI;

    constructor(private env: Env) {
        this.genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
    }

    async analyzeText(text: string): Promise<string> {
        try {
            const model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            const prompt = PROMPTS.GENERAL_ANALYSIS + `\n\nText: "${text}"\nToday is ${new Date().toISOString()}`;

            const result = await model.generateContent(prompt);
            return result.response.text();
        } catch (e: any) {
            console.error("Gemini Analysis Failed:", e);
            throw new Error(`Gemini Error: ${e.message}`);
        }
    }

    async analyzeImage(imageBuffer: Uint8Array, mimeType: string = "image/jpeg", isRotary: boolean = true): Promise<string> {
        try {
            const model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            const prompt = isRotary ? PROMPTS.ROTARY_OCR : PROMPTS.GENERAL_ANALYSIS;
            const fullPrompt = prompt + `\nToday is ${new Date().toISOString()}`;

            const imagePart = {
                inlineData: {
                    data: Buffer.from(imageBuffer).toString("base64"),
                    mimeType
                }
            };

            const result = await model.generateContent([fullPrompt, imagePart]);
            return result.response.text();
        } catch (e: any) {
            console.error("Gemini Image Analysis Failed:", e);
            throw new Error(`Gemini Image Error: ${e.message}`);
        }
    }

    async generateTweetFromAnalysis(analysis: any): Promise<string> {
        try {
            const model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            
            let prompt = "";
            if (analysis.type === 'recap') {
                prompt = `Create an engaging "Recap" tweet based on these highlights:
                Club: ${analysis.clubName}
                Topic: ${analysis.topic}
                Highlights: ${analysis.highlights?.join(', ')}
                Summary: ${analysis.summary}
                
                Style: @rotarynairobis (No emojis, no hashtags, professional).
                Format: "Here is what you missed at the Rotary Club of ${analysis.clubName} during our session on '${analysis.topic}': [highlights summary]. Service Above Self."`;
            } else {
                prompt = PROMPTS.TWEET_GENERATION
                    .replace("{{summary}}", analysis.summary || analysis.topic || "an interesting event")
                    .replace("{{date}}", analysis.date || "soon")
                    .replace("{{location}}", analysis.location || analysis.venue || "TBD")
                    .replace("{{entities}}", analysis.entities?.join(', ') || analysis.speaker || 'None');
            }

            const result = await model.generateContent(prompt);
            return result.response.text();
        } catch (e: any) {
            console.error("Gemini Tweet Generation Failed:", e);
            throw new Error(`Gemini Tweet Error: ${e.message}`);
        }
    }

    async generateBirthdayTweet(name: string): Promise<string> {
        try {
            const model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            const prompt = PROMPTS.BIRTHDAY_CELEBRATION.replace("{{name}}", name);
            const result = await model.generateContent(prompt);
            return result.response.text();
        } catch (e: any) {
            console.error("Gemini Birthday Tweet Failed:", e);
            throw new Error(`Gemini Birthday Error: ${e.message}`);
        }
    }

}
