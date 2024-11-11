const fs = require("fs");
const path = require("path");
const axios = require("axios");

const usageDataPath = path.join(__dirname, "usageData.json");

let unlimitedUserId = ["100012198960574", "61561104339228"];
const dailyLimit = 5;

function addUnlimitedUser(uid) {
  if (!unlimitedUserId.includes(uid)) {
    unlimitedUserId.push(uid);
  }
}

let usageData = {};
if (fs.existsSync(usageDataPath)) {
  usageData = JSON.parse(fs.readFileSync(usageDataPath));
}

module.exports = {
  config: {
    name: "cr",
    author: "UPoL🐔",
    version: "1.0",
    role: 0,
    category: "AI",
    guide: "{pn} <category> <prompt> --ar 16:9\nCategories: aniv2, dai, dal, xl, niy",
  },
  onStart: async function ({ message, args, api, event }) {
    if (args.length < 2) {
      return message.reply("add model & prompt\n Available models: aniv2, dai, dal, niy, xl", event.threadID);
    }

    const category = args[0].toLowerCase();
    const prompt = args.slice(1).join(" ");

    if (!prompt) {
      return message.reply("give prompt.", event.threadID);
    }

    const userId = event.senderID;

    const userInfo = await api.getUserInfo(userId);
    const userName = userInfo[userId]?.name || "Unknown User";

    if (!usageData[userId]) {
      usageData[userId] = { count: 0, lastUsed: null };
    }

    const now = Date.now();
    if (usageData[userId].lastUsed && now - usageData[userId].lastUsed > 24 * 60 * 60 * 1000) {
      usageData[userId].count = 0;
    }

    if (!unlimitedUserId.includes(userId) && usageData[userId].count >= dailyLimit) {
      return message.reply("You have reached the daily limit of 5 image generations.", event.threadID);
    }

    usageData[userId].count += 1;
    usageData[userId].lastUsed = now;

    const remainingUsage = unlimitedUserId.includes(userId) ? "Unlimited" : (dailyLimit - usageData[userId].count);
    fs.writeFileSync(usageDataPath, JSON.stringify(usageData));

    const startTime = Date.now();
    api.sendMessage(`Please wait... ⏳\nUsing model (${category})`, event.threadID, event.messageID);

    try {
      let apiUrl;

      switch (category) {
        case "aniv2":
          apiUrl = `https://upol-aniv2.onrender.com/aniv2?prompt=${encodeURIComponent(prompt)}`;
          break;
        case "xl":
          apiUrl = `https://upol-anime-xl.onrender.com/xl?prompt=${encodeURIComponent(prompt)}`;
          break;
        case "niy":
          apiUrl = `https://upol-nijiy.onrender.com/xl31?prompt=${encodeURIComponent(prompt)}`;
          break;
        case "dal":
          apiUrl = `https://upol-crazy.onrender.com/dal?prompt=${encodeURIComponent(prompt)}`;
        case "dai": 
          apiUrl = `https://upol-dai-v2.onrender.com/dai?prompt=${encodeURIComponent(prompt)}`;
        default:
          return api.sendMessage("❌ | Invalid category. Please use one of the following: aniv2, dai, dal, xl, niy.", event.threadID);
      }

      const response = await axios.get(apiUrl);
      const imageUrl = response.data.imageUrl;
      if (!imageUrl) {
        return api.sendMessage("❌ | Failed to generate image. Please try again later.", event.threadID);
      }

      const imageResponse = await axios.get(imageUrl, { responseType: "arraybuffer" });
      const cacheFolderPath = path.join(__dirname, "cache");
      if (!fs.existsSync(cacheFolderPath)) {
        fs.mkdirSync(cacheFolderPath);
      }

      const imagePath = path.join(cacheFolderPath, `${Date.now()}_generated_image.png`);
      fs.writeFileSync(imagePath, Buffer.from(imageResponse.data, "binary"));
      const stream = fs.createReadStream(imagePath);
      const generationTime = ((Date.now() - startTime) / 1000).toFixed(2);

      message.reply({
        body: `✅ | Here is your image, requested by: ${userName}!\n\n🕒 Image generated in ${generationTime} seconds.\n📊 Remaining usage: ${remainingUsage} times for today.`,
        attachment: stream
      });
    } catch (error) {
      console.error("Error:", error);
      return api.sendMessage("An error occurred. Please try again later.", event.threadID);
    }
  }
};
