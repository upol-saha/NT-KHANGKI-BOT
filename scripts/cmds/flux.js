const fs = require("fs");
const path = require("path");
const axios = require("axios");

const usageDataPath = path.join(__dirname, "usageData.json");
let usageData = {};

if (fs.existsSync(usageDataPath)) {
  usageData = JSON.parse(fs.readFileSync(usageDataPath));
}

module.exports = {
  config: {
    name: "flux",
    author: "UPoL",
    version: "3.2",
    cooldowns: 5,
    role: 0,
    category: "media",
    guide: { 
       en: "{pn} <modelName> <prompt>"
       + "\n Model's Name:\n" +
       "\n1.dev" +
       "\n2.schnell" + 
       "\n3.realismlora"
      }
  },
  
  onStart: async function ({ message, args, api, event }) {
    const userId = event.senderID;

    if (!usageData[userId]) {
      usageData[userId] = 0;
    }

    if (args.length < 2) {
      return message.reply("provide modelName or prompt.", event.threadID);
    }
    const category = args.shift().toLowerCase();
    const prompt = args.join(" ");

    if (!prompt) {
      return message.reply("add prompt.", event.threadID);
    }

    let apiUrl;
    let categoryName;
    switch (category) {
      case "schnell":
        apiUrl = `https://upol-meaw-meaw-fluxx.onrender.com/flux?prompt=${encodeURIComponent(prompt)}`;
        categoryName = "SCHNELL";
        break;
      case "dev":
        apiUrl = `https://upol-meaw-newapi.onrender.com/flux/v2?prompt=${encodeURIComponent(prompt)}`;
        categoryName = "DEV";
        break;
      case "realismlora":
        apiUrl = `https://upol-flux-realismlora.onrender.com/flux/realismlora?prompt=${encodeURIComponent(prompt)}`;
        categoryName = "REALISMLORA";
        break;
      default:
        return api.sendMessage("please use one of the following: 'schnell', 'dev', 'realismlora'.", event.threadID);
    }

    const waitingMessage = await api.sendMessage("Please wait....⏳", event.threadID, event.messageID);
    
    const waitingMessageID = waitingMessage.messageID;

    try {
      const startTime = Date.now();
      const imagineResponse = await axios.get(apiUrl, {
        responseType: "arraybuffer"
      });

      const cacheFolderPath = path.join(__dirname, "cache");
      if (!fs.existsSync(cacheFolderPath)) {
        fs.mkdirSync(cacheFolderPath);
      }

      const imagePath = path.join(cacheFolderPath, `${Date.now()}_generated.png`);
      fs.writeFileSync(imagePath, Buffer.from(imagineResponse.data, "binary"));
      
      const stream = fs.createReadStream(imagePath);

      const generationTime = ((Date.now() - startTime) / 1000).toFixed(2);

      usageData[userId] += 1;
      fs.writeFileSync(usageDataPath, JSON.stringify(usageData));


      await message.unsend(waitingMessageID);

      await message.reply({
        body: `✅ | Generated image\n📂 Model: ${categoryName}\n⏱️ Time to gen: ${generationTime} seconds\n📊 Usage count: ${usageData[userId]}`,
        attachment: stream
      });
      fs.unlinkSync(imagePath);
    } catch (error) {
      console.error("Error:", error);
      await message.unsend(waitingMessageID);
      api.sendMessage("error", event.threadID);
    }
  }
};
