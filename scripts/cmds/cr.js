const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { promises: fsp } = fs;

const usageDataPath = path.join(__dirname, "usageData.json");
const unlimitedUserId = "61561104339228"; 
const dailyLimit = 5; 

async function loadUsageData() {
  if (fs.existsSync(usageDataPath)) {
    return JSON.parse(await fsp.readFile(usageDataPath, "utf8"));
  }
  return { totalCount: 0 };
}

async function saveUsageData(data) {
  await fsp.writeFile(usageDataPath, JSON.stringify(data, null, 2));
}

module.exports = {
  config: {
    name: "cr",
    aliases: ["am", "an"],
    author: "UPoL🐔",
    version: "1.0",
    cooldowns: 5,
    role: 0,
    category: "image",
    guide: "{pn} <model> <prompt> --ar 16:9",
  },
  onStart: async function ({ message, args, api, event }) {
    const userId = event.senderID;
    const model = args[0];
    const prompt = args.slice(1).join(" ");

    if (!prompt) {
      return api.sendMessage("Add model & prompt\nAvailable models: aniv2, dai, dal, niy, xl", event.threadID);
    }

    let usageData = await loadUsageData();

    if (!usageData[userId]) {
      usageData[userId] = { count: 0, lastUsed: null };
    }

    const now = Date.now();
    if (usageData[userId].lastUsed && now - usageData[userId].lastUsed > 24 * 60 * 60 * 1000) {
      usageData[userId].count = 0; 
    }

    if (userId !== unlimitedUserId && usageData[userId].count >= dailyLimit) {
      return api.sendMessage("❌ | You have reached the 5 times limit for today.", event.threadID);
    }

    usageData[userId].count += 1;
    usageData[userId].lastUsed = now;

    usageData.totalCount = (usageData.totalCount || 0) + 1;
    const remainingUsage = userId === unlimitedUserId ? "Unlimited" : (dailyLimit - usageData[userId].count);
    await saveUsageData(usageData);

    const startTime = Date.now();
    const wait = message.reply(`Please wait....⏳\n⏱️ Generating with model "(${model.toUpperCase()})".. `, event.threadID, event.messageID);

    let apiUrl;
    switch (model) {
      case "xl":
        apiUrl = `https://upol-anime-xl.onrender.com/xl?prompt=${encodeURIComponent(prompt)}`;
        break;
      case "niy":
        apiUrl = `https://upol-nijiy.onrender.com/xl31?prompt=${encodeURIComponent(prompt)}`;
        break;
      case "aniv2":
        apiUrl = `https://upol-aniv2.onrender.com/aniv2?prompt=${encodeURIComponent(prompt)}`;
        break;
      case "dai":
        apiUrl = `https://upol-dai-v2.onrender.com/dai?prompt=${encodeURIComponent(prompt)}`;
        break;
      case "dal":
        apiUrl = `https://upol-crazy.onrender.com/dal?prompt=${encodeURIComponent(prompt)}`;
        break;
      default:
        return api.sendMessage("This model is'nt available.\nAvailable models: xl, niy, aniv2, dai, dal.", event.threadID);
    }

    try {
      const response = await axios.get(apiUrl);
      const imageUrl = response.data.imageUrl;

      if (!imageUrl) {
        return api.sendMessage("Failed to generate image.", event.threadID);
      }

      const imageResponse = await axios.get(imageUrl, { responseType: "arraybuffer" });
      const cacheFolderPath = path.join(__dirname, "cache");
      if (!fs.existsSync(cacheFolderPath)) {
        await fsp.mkdir(cacheFolderPath);
      }

      const imagePath = path.join(cacheFolderPath, `${Date.now()}_generated_image.png`);
      await fsp.writeFile(imagePath, Buffer.from(imageResponse.data, "binary"));
      const stream = fs.createReadStream(imagePath);
      const generationTime = ((Date.now() - startTime) / 1000).toFixed(2);

      message.reply({
        body: `✅ | Model: ${model.toUpperCase()} | Here is your image!\n\n🕒 Image generated in ${generationTime} seconds.\n📊 Remaining usage: ${remainingUsage} times for today.\n🌍 Total usage by all users: ${usageData.totalCount} times.`,
        attachment: stream
      });
      
      stream.on("close", () => fs.unlinkSync(imagePath)); 
    } catch (error) {
      console.error("Error:", error);
      return api.sendMessage("An error occurred. Please try again later.", event.threadID);
    }
  }
};
