const fs = require("fs");
const path = require("path");
const axios = require("axios");

module.exports = {
  config: {
    name: "flux",
    author: "UPoL",
    version: "3.1",
    cooldowns: 5,
    role: 0,
    category: "ai",
    guide: {
      en: "{pn} <model> <prompt>"
    },
  },
  onStart: async function ({ message, args, api, event }) {
    const model = args[0];
    const prompt = args.slice(1).join(" ");

    if (!model || !prompt) {
      return message.reply("provide a model and a prompt.\nmodel actions: dev, schnell, realismLora & minj-lora", event.threadID);
    }

    const wait = message.reply(`Please wait...⏳\nGenerating with model: [  ${model}  ]...`, event.threadID, event.messageID);

    let imagineApiUrl;

    if (model === "dev") {
      imagineApiUrl = `https://upol-meaw-newapi.onrender.com/flux/v2?prompt=${encodeURIComponent(prompt)}`;
    } else if (model === "schnell") {
      imagineApiUrl = `https://upol-meaw-meaw-fluxx.onrender.com/flux?prompt=${encodeURIComponent(prompt)}`;
    } else if (model === "realismLora") {
      imagineApiUrl = `https://upol-flux-realismlora.onrender.com/flux/realismlora?prompt=${encodeURIComponent(prompt)}`;
    } else if (model === "mini-lora") {
      imagineApiUrl = `https://huggifk-flux-extra.onrender.com/flux?prompt=${encodeURIComponent(prompt)}`;
    } else {
      return api.sendMessage("Please choose from: dev, schnell, realismLora or mini-lora.", event.threadID);
    }

    try {
      const startTime = Date.now(); 
      const imagineResponse = await axios.get(imagineApiUrl, {
        responseType: "arraybuffer"
      });
      const endTime = Date.now(); 

      const timeTaken = ((endTime - startTime) / 1000).toFixed(2); 
      const requesterName = event.senderID; 

      const cacheFolderPath = path.join(__dirname, "cache");
      if (!fs.existsSync(cacheFolderPath)) {
        fs.mkdirSync(cacheFolderPath);
      }
      const imagePath = path.join(cacheFolderPath, `${Date.now()}_generated.png`);
      fs.writeFileSync(imagePath, Buffer.from(imagineResponse.data, "binary"));

      const stream = fs.createReadStream(imagePath);
      message.reply({
        body: `🖼️ Image generated in ${timeTaken} seconds.\n👤 Requested by: ${requesterName}\n📦 Model used: ${model}`,
        attachment: stream
      }, event.threadID, () => {
        fs.unlinkSync(imagePath);
      });
       message.unsend(wait, event.messageID);
    } catch (error) {
      console.error("Error:", error);
      message.reply("An error occurred. Please try again later.", event.threadID, event.messageID);
    }
  }
};
