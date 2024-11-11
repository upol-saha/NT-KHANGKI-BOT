const fs = require("fs");
const path = require("path");
const axios = require("axios");

// Path for saving usage data
const usageDataPath = path.join(__dirname, "usageData.json");

// List of users with unlimited access
let unlimitedUserId = ["100012198960574", "61561104339228"];
const dailyLimit = 5;

// Function to add a user to the unlimited access list
function addUnlimitedUser(uid) {
  if (!unlimitedUserId.includes(uid)) {
    unlimitedUserId.push(uid);
  }
}

// Load usage data from file if it exists
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
      return message.reply("Add model & prompt\nAvailable models: aniv2, dai, dal, niy, xl", event.threadID);
    }

    const category = args[0].toLowerCase();
    const prompt = args.slice(1).join(" ");

    if (!prompt) {
      return message.reply("Please provide a prompt.", event.threadID);
    }

    const userId = event.senderID;

    // Fetch user info
    const userInfo = await api.getUserInfo(userId);
    const userName = userInfo[userId]?.name || "Unknown User";

    // Initialize user usage data if not present
    if (!usageData[userId]) {
      usageData[userId] = { count: 0, lastUsed: null };
    }

    const now = Date.now();
    // Reset daily usage if 24 hours have passed since last use
    if (usageData[userId].lastUsed && now - usageData[userId].lastUsed > 24 * 60 * 60 * 1000) {
      usageData[userId].count = 0;
    }

    // Check if user has reached the daily limit
    if (!unlimitedUserId.includes(userId) && usageData[userId].count >= dailyLimit) {
      return message.reply("You have reached the daily limit of 5 image generations.", event.threadID);
    }

    // Increment usage count and update last used timestamp
    usageData[userId].count += 1;
    usageData[userId].lastUsed = now;
    const remainingUsage = unlimitedUserId.includes(userId) ? "Unlimited" : (dailyLimit - usageData[userId].count);
    fs.writeFileSync(usageDataPath, JSON.stringify(usageData));

    // Send a "waiting" message and enable typing indicator
    const startTime = Date.now();
    const waitingMessage = await api.sendMessage(
      `Please wait... ⏳\nGenerating image with model (${category.toUpperCase()})...`,
      event.threadID,
      (err, info) => {
        if (err) console.error("Error sending waiting message:", err);
      }
    );

    // Set typing indicator
    api.sendTypingIndicator(event.threadID);

    try {
      let apiUrl;

      // Determine the correct API URL based on category
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
          break;
        case "dai":
          apiUrl = `https://upol-dai-v2.onrender.com/dai?prompt=${encodeURIComponent(prompt)}`;
          break;
        default:
          return api.sendMessage("❌ | Invalid category. Please use one of the following: aniv2, dai, dal, xl, niy.", event.threadID);
      }

      // Send request to the selected API
      const response = await axios.get(apiUrl);
      const imageUrl = response.data.imageUrl;
      if (!imageUrl) {
        return api.sendMessage("❌ | Failed to generate image. Please try again later.", event.threadID);
      }

      // Download the generated image
      const imageResponse = await axios.get(imageUrl, { responseType: "arraybuffer" });
      const cacheFolderPath = path.join(__dirname, "cache");
      if (!fs.existsSync(cacheFolderPath)) {
        fs.mkdirSync(cacheFolderPath);
      }

      // Save image to cache folder
      const imagePath = path.join(cacheFolderPath, `${Date.now()}_generated_image.png`);
      fs.writeFileSync(imagePath, Buffer.from(imageResponse.data, "binary"));
      const stream = fs.createReadStream(imagePath);
      const generationTime = ((Date.now() - startTime) / 1000).toFixed(2);

      // Unsend the waiting message
      api.unsendMessage(waitingMessage.messageID);

      // Send the generated image to the user
      message.reply({
        body: `✅ | Here is your image, requested by: ${userName}!\n\n🕒 Image generated in ${generationTime} seconds.\n📊 Remaining usage: ${remainingUsage} times for today.`,
        attachment: stream
      });
    } catch (error) {
      console.error("Error:", error);
      api.unsendMessage(waitingMessage.messageID); // Unsend waiting message on error
      return api.sendMessage("An error occurred. Please try again later.", event.threadID);
    }
  }
};
