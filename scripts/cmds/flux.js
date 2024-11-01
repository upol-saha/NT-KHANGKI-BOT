const fs = require("fs");
const path = require("path");
const axios = require("axios");

module.exports = {
  config: {
    name: "flux",
    author: "UPoL",
    version: "3.2",
    cooldowns: 5,
    role: 0,
    category: "media",
    guide: "{pn} <model> <prompt>\nAvailable models: flux-dev, flux-schnell, flux-realismlLora",
  },
  onStart: async function ({ message, args, api, event }) {
    const model = args[0];
    const prompt = args.slice(1).join(" ");
    const models = {
      "dev": `https://upol-meaw-newapi.onrender.com/flux/v2?prompt=${encodeURIComponent(prompt)}`,
      "schnell": `https://upol-meaw-meaw-fluxx.onrender.com/flux?prompt=${encodeURIComponent(prompt)}`,
      "realismLora": `https://upol-flux-realismlora.onrender.com/flux/realismlora?prompt=${encodeURIComponent(prompt)}`
    };
    if (!model || !models[model]) {
      return api.sendMessage("⚠️ Please specify a valid model: `flux-dev`, `flux-schnell`, or `flux-realismLora`.", event.threadID);
    }
    if (!prompt) {
      return api.sendMessage("❗ Please provide a prompt after specifying the model.", event.threadID);
    }
    api.sendMessage("Please wait....⏳", event.threadID, event.messageID);
    try {
      const imagineApiUrl = models[model];
      const modelName = model.replace("-", " ").toUpperCase();
      const imagineResponse = await axios.get(imagineApiUrl, {
        responseType: "arraybuffer"
      });
      const cacheFolderPath = path.join(__dirname, "cache");
      if (!fs.existsSync(cacheFolderPath)) {
        fs.mkdirSync(cacheFolderPath);
      }
      const imagePath = path.join(cacheFolderPath, `${Date.now()}_generated.png`);
      fs.writeFileSync(imagePath, Buffer.from(imagineResponse.data, "binary"));
      const stream = fs.createReadStream(imagePath);
      api.sendMessage({
        body: `✅ Image generated successfully\n🎨 Using the model: ( ${modelName} ) model`,
        attachment: stream
      }, event.threadID, () => {
        fs.unlinkSync(imagePath);
      });
    } catch (error) {
      console.error("Error:", error.response ? error.response.data : error.message);
      api.sendMessage("❌ | An error occurred while generating the image. Please try again later. 😔", event.threadID, event.messageID);
    }
  }
};
