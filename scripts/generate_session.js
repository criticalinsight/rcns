import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import input from "input";

const apiId = 25625345;
const apiHash = "c4825194e28cd20e026d70e1b03c6f64";
const stringSession = new StringSession("");

(async () => {
    console.log("Loading interactive login...");
    const client = new TelegramClient(stringSession, apiId, apiHash, {
        connectionRetries: 5,
    });
    await client.start({
        phoneNumber: async () => await input.text("Please enter your number: "),
        password: async () => await input.text("Please enter your password: "),
        phoneCode: async () => await input.text("Please enter the code you received: "),
        onError: (err) => console.log(err),
    });
    console.log("You should now be connected.");
    console.log("Save this string to your TELEGRAM_SESSION secret:");
    console.log(client.session.save()); // This will print the session string
    await client.sendMessage("me", { message: "Hello from RCNS!" });
})();
