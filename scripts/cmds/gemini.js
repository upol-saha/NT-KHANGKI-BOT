const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports = {
  config: {
    name: "gemini",
    version: "1.1",
    author: "UPoL Apis 🐔",
    role: 0,
    category: "ai"
  },

  onStart: async function({ message, event, args, commandName }) {
    const prompt = args.join(' ');

    if (!prompt) {
      return message.reply("👀 Please provide a prompt.");
    }

    await message.reply("⏳ Please wait.....");

    try {
      if (prompt.toLowerCase().includes('imagine')) {
        await handleImageGeneration(prompt, message);
      } else {
        await handleTextResponse(prompt, message, commandName, event);
      }
    } catch (error) {
      console.error("Error:", error.message);
      message.reply("An error occurred, please try again later.");
    }
  },

  onReply: async function({ message, event, Reply, args }) {
    const { author, commandName } = Reply;
    if (event.senderID !== author) return;

    const text = args.join(' ');

    try {
      const response = await axios.get(`https://upol-piu.onrender.com/gemini?prompt=${encodeURIComponent(text)}`);
        const answer = response.data.answer;
        message.reply({
          body: answer,
        }, (err, info) => {
          if (!err) {
            global.GoatBot.onReply.set(info.messageID, {
              commandName,
              messageID: info.messageID,
              author: event.senderID
            });
          }
        });
    } catch (error) {
      console.error("Error:", error.message);
      message.reply("An error occurred, please try again later.");
    }
  }
};

async function handleImageGeneration(prompt, message) {
  try {
    const apikey = 'UPoLxyzFM-69vsg';
    const imagineApiUrl = `https://upol-ai-docs.onrender.com/imagine?prompt=${encodeURIComponent(prompt)}&apikey=${apikey}`;
    
    const imagineResponse = await axios.get(imagineApiUrl, { responseType: "arraybuffer" });

    const cacheFolderPath = path.join(__dirname, "cache");
    if (!fs.existsSync(cacheFolderPath)) {
      fs.mkdirSync(cacheFolderPath);
    }

    const imagePath = path.join(cacheFolderPath, `${Date.now()}_generated_image.png`);
    fs.writeFileSync(imagePath, Buffer.from(imagineResponse.data, "binary"));

    const stream = fs.createReadStream(imagePath);
    message.reply({
      body: "Imagination complete!",
      attachment: stream
    }, () => {
      fs.unlinkSync(imagePath); 
    });
  } catch (error) {
    console.error("Image generation error:", error.message);
    message.reply("Failed to generate the image. Please try again later.");
  }
}

async function handleTextResponse(prompt, message, commandName, event) {
  try {
    const response = await axios.get(`https://upol-piu.onrender.com/gemini?prompt=${encodeURIComponent(prompt)}`);
      const answer = response.data.answer;
      message.reply({
        body: answer,
      }, (err, info) => {
        if (!err) {
          global.GoatBot.onReply.set(info.messageID, {
            commandName,
            messageID: info.messageID,
            author: event.senderID
          });
        }
      });
  } catch (error) {
    console.error("Text response error:", error.message);
    message.reply("Failed to retrieve the response. Please try again later.");
  }
}
