# Rotary Bot Automation Workflow

## Objective
Automate the process of finding new Rotary Club event posters on Instagram, analyzing them for details, creating a standardized Twitter card, and publishing it to X (Twitter).

## Core Components
1.  **Browser Engine:** Chrome (running with persistent user profile `bot_profile`).
2.  **Controller:** Rust (using `chromiumoxide` or `headless_chrome` to drive the browser).
3.  **State Management:** Local JSON file (`state.json`) to track processed posts.

## Step-by-Step Workflow

### 1. Initialization
*   Load `state.json` to see the last processed post URL.
*   Launch Chrome with `--user-data-dir=./bot_profile` and `--remote-debugging-port=9222`.
*   Connect to the browser via WebSocket (CDP).

### 2. Scrape Instagram (Source)
*   **Navigate:** Go to `instagram.com/{target_username}/`.
*   **Check:** Is there a new post? (Compare latest post URL with `state.json`).
    *   *If no new post:* Exit.
    *   *If new post:* Proceed.
*   **Action:** Click the latest post.
*   **Extract:**
    *   Download the image (Poster).
    *   Copy the caption text (Context).

### 3. Analyze with Gemini (Intelligence)
*   **Navigate:** Go to `gemini.google.com`.
*   **Action:** Upload the downloaded poster image.
*   **Prompt:** Send a strict prompt:
    > "Analyze this event poster. Extract the following fields into a JSON object: { clubName, speaker, topic, venue, date, time }. If a field is missing, use null."
*   **Extract:** Wait for the response and parse the JSON block.

### 4. Generate Content (Processing)
*   **Image Processing:**
    *   Create a blank 1200x675 canvas (Twitter Card standard).
    *   Resize the original poster to fit the left side (maintain aspect ratio).
    *   Render the extracted text (Topic, Speaker, Date, Venue) on the right side using a clean font.
    *   Save as `final_poster.jpg`.
*   **Text Processing:**
    *   Compose a tweet: "📅 Upcoming Event: {Topic}\n🗣️ Speaker: {Speaker}\n📍 {Venue}\n⏰ {Date} at {Time}\n#Rotary #ServiceAboveSelf"

### 5. Publish to Twitter (Destination)
*   **Navigate:** Go to `x.com`.
*   **Action:** Click "Post" / Compose.
*   **Upload:** Attach `final_poster.jpg`.
*   **Type:** Paste the composed tweet text.
*   **Submit:** Click "Post".

### 6. Finalize
*   **Update State:** Write the new post URL to `state.json`.
*   **Cleanup:** Close browser (or leave open for debugging).
