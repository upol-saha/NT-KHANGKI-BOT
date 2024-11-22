const fs = require("fs");
const path = require("path");
const axios = require("axios");

module.exports = {
  config: {
    name: "imagine",
    aliases: [],
    author: "UPoL",
    version: "1.0",
    cooldowns: 5,
    role: 0,
    shortDescription: "Generate an image based on a prompt.",
    longDescription: "Generates an image using the provided prompt.",
    category: "image",
    guide: {
      en: "{pn} <prompt>"
    }
  },
  onStart: async function ({ message, args, api, event }) {
    const obfuscatedAuthor = String.fromCharCode(85, 80, 111, 76);
    if (this.config.author !== obfuscatedAuthor) {
      return api.sendMessage("You are not authorized to change the author name.", event.threadID, event.messageID);
    }

    const prompt = args.join(" ");
    const apikey = 'UPoLxyzFM-69vsg';

    if (!prompt) {
      return message.reply("👀 Please provide a prompt.", event.threadID);
    }

    const wait = message.reply("⏳ Generating your imagination....", event.threadID, event.messageID);
    const startTime = Date.now(); 

    try {
      const imagineApiUrl = `https://upol-ai-docs.onrender.com/imagine?prompt=${encodeURIComponent(prompt)}&apikey=${apikey}`;
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

      const endTime = Date.now(); 
      const timeTaken = ((endTime - startTime) / 1000).toFixed(2); 
 
      message.unsend(wait, event.messageID);
      
      message.reply({
        body: `✅ Generated successfully in ${timeTaken} seconds!`,
        attachment: stream
      }, event.threadID, () => {
        fs.unlinkSync(imagePath); 
      });
    } catch (error) {
      console.error("Error:", error);
      api.sendMessage("❌ | An error occurred. Please try again later.", event.threadID, event.messageID);
    }
  }
};
