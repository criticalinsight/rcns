import { GoogleGenerativeAI } from "@google/generative-ai";
import { Env } from "../types";

export class GeminiService {
    private genAI: GoogleGenerativeAI;

    constructor(private env: Env) {
        this.genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
    }

    async analyzeText(text: string): Promise<string> {
        try {
            const model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            const prompt = `
            Analyze the following text and return a JSON object with these keys:
            - summary: A short summary of the event (string)
            - date: Standardized ISO 8601 date string (e.g., "2024-05-20T18:30:00") (string)
            - is_upcoming: Boolean indicating if the event date is in the future relative to today (${new Date().toISOString()}) (boolean)
            - location: Venue or location (string)
            - entities: Key people or organizations mentioned (array of strings)

            Text: "${text}"
            
            Return ONLY the valid JSON with NO markdown formatting.
            `;

            const result = await model.generateContent(prompt);
            return result.response.text();
        } catch (e: any) {
            console.error("Gemini Analysis Failed:", e);
            throw new Error(`Gemini Error: ${e.message}`);
        }
    }

    async analyzeImage(imageBuffer: Uint8Array, mimeType: string = "image/jpeg"): Promise<string> {
        try {
            const model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            const prompt = `
            Analyze the following event flyer/image and return a JSON object with these keys:
            - summary: A short summary of the event (string)
            - date: Standardized ISO 8601 date string (e.g., "2024-05-20T18:30:00") (string)
            - is_upcoming: Boolean indicating if the event date is in the future relative to today (${new Date().toISOString()}) (boolean)
            - location: Venue or location (string)
            - entities: Key people or organizations mentioned (array of strings)

            Return ONLY the valid JSON with NO markdown formatting.
            `;

            const imagePart = {
                inlineData: {
                    data: Buffer.from(imageBuffer).toString("base64"),
                    mimeType
                }
            };

            const result = await model.generateContent([prompt, imagePart]);
            return result.response.text();
        } catch (e: any) {
            console.error("Gemini Image Analysis Failed:", e);
            throw new Error(`Gemini Image Error: ${e.message}`);
        }
    }

    async generateTweetFromAnalysis(analysis: any): Promise<string> {
        try {
            const model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            const prompt = `
            You are a professional social media manager for a Rotary Club.
            Create an engaging Twitter post (under 280 characters) based on the following event details:

            Event Summary: ${analysis.summary}
            Date: ${analysis.date}
            Venue: ${analysis.location}
            Key Entities: ${analysis.entities?.join(', ') || 'None'}

            Guidelines:
            - Adopt the style of @rotarynairobis: structured, informative, and formal.
            - Start with "The Rotary Club of ..." if applicable.
            - Use the format: "The Rotary Club of [Club Name] will be hosting [Guest] to present on '[Topic]' at [Venue] from [Time]."
            - Or for lists: "📅 Events for [Date]: If you are interested in networking, professional development or community service here are some events you should attend."
            - Do NOT use emojis (except 📅 as a header if fitting).
            - Do NOT use hashtags.
            - Output ONLY the tweet text.
            `;

            const result = await model.generateContent(prompt);
            return result.response.text();
        } catch (e: any) {
            console.error("Gemini Tweet Generation Failed:", e);
            throw new Error(`Gemini Tweet Error: ${e.message}`);
        }
    }

    async listModels() {
        const key = this.env.GEMINI_API_KEY;
        const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
        return await resp.json();
    }
}
