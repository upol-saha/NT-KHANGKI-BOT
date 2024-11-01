const fs = require("fs");
const path = require("path");
const axios = require("axios");

module.exports = {
  config: {
    name: "mj",
    author: "UPoL 🐔",
    version: "1.0",
    cooldowns: 420,
    role: 2,
    category: "image",
    guide: {
       en: "{pn} <prompt>",
    }
  },
  onStart: async function ({ message, args, api, event }) {
    const prompt = args.join(" ");

    if (!prompt) {
      return message.reply("add prompt.", event.threadID);
    }

    const wait = await message.reply("Processing....⏳", event.threadID, event.messageID);
    api.setMessageReaction("⏳", event.messageID, () => {}, true);

    try {
      const imagineApiUrl = `https://upol-happyjourney.onrender.com/midjourney?prompt=${encodeURIComponent(prompt)}`;

      const imagineResponse = await axios.get(imagineApiUrl, {
        responseType: "arraybuffer"
      });

      const cacheFolderPath = path.join(__dirname, "cache");
      if (!fs.existsSync(cacheFolderPath)) {
        fs.mkdirSync(cacheFolderPath);
      }
      const imagePath = path.join(cacheFolderPath, `${Date.now()}_generated_image.png`);
      fs.writeFileSync(imagePath, Buffer.from(imagineResponse.data, "binary"));

      const stream = fs.createReadStream(imagePath);
      message.reply({
        body: "Generated!",
        attachment: stream
      }, event.threadID, () => {
        fs.unlinkSync(imagePath);
      });
      message.unsend(wait, event.messageID);
      api.setMessageReaction("✅", event.messageID, () => {}, true);
    } catch (error) {
      console.error("Error:", error);
      api.sendMessage("error.", event.threadID, event.messageID);
      api.setMessageReaction("❌", event.messageID, () => {}, true);
    }
  }
};
