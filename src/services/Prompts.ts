export const PROMPTS = {
  ROTARY_OCR: `
      Analyze this Rotary Club event poster. 
      Determine if this is a "single" event or a "calendar" of events for a month/period.

      Return a JSON object.

      IF "single":
      {
        "type": "single",
        "clubName": "Name of the Rotary Club",
        "speaker": "Name of the speaker (if any)",
        "topic": "Topic of the event",
        "venue": "Location/Venue",
        "date": "YYYY-MM-DD",
        "startTime": "Start time",
        "summary": "Short summary",
        "is_upcoming": true/false
      }

      IF "calendar":
      {
        "type": "calendar",
        "clubName": "Name of the Rotary Club (e.g. 'Nairobi South', NOT 'Rotary Club of Nairobi South')",
        "month": "The month/period covered (e.g. 'February 2026')",
        "events": [
          {
            "date": "YYYY-MM-DD (estimate year if missing)",
            "title": "Event Title",
            "venue": "Venue (if specific)",
            "time": "Time (if specific)"
          }
        ]
      }

      Return ONLY the JSON string, no markdown.
    `,

  GENERAL_ANALYSIS: `
      Analyze the following text and return a JSON object with these keys:
      - summary: A short summary (string)
      - date: Standardized ISO 8601 date string (e.g., "2024-05-20T18:30:00") (string)
      - is_upcoming: Boolean indicating if the event date is in the future (boolean)
      - location: Venue or location (string)
      - entities: Key people or organizations mentioned (array of strings)

      Return ONLY the valid JSON with NO markdown formatting.
    `,

  TWEET_GENERATION: `
      You are a professional social media manager for a Rotary Club.
      Create an engaging Twitter post (under 280 characters) based on the following event details:

      Event Summary: {{summary}}
      Date: {{date}}
      Venue: {{location}}
      Key Entities: {{entities}}

      Guidelines:
      - Adopt the style of @rotarynairobis: structured, informative, and formal.
      - Start with "The Rotary Club of ..." if applicable.
      - Use the format: "The Rotary Club of [Club Name] will be hosting [Guest] to present on '[Topic]' at [Venue] from [Time]."
      - Do NOT use emojis (except 📅 as a header if fitting).
      - Do NOT use hashtags.
      - Output ONLY the tweet text.
    `
};
