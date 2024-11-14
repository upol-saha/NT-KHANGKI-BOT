const axios = require('axios');
const Jimp = require('jimp');
const FormData = require('form-data');

module.exports = {
  config: {
    name: "niji",
    version: "1.0",
    author: "UPoL 🐔",
    role: 0,
    shortDescription: "Generate and combine 4 images",
    longDescription: "Generates 4 images based on a prompt, combines them into one image, and uploads it to imgbb.",
    category: "image",
    guide: "{pn} <prompt>"
  },

  onStart: async function ({ message, args, api, event }) {
    const prompt = args.join(" ");
    const imgbbApiKey = 'cc7534287e3141c514a70ff04d316190';

    if (!prompt) {
      return message.reply("Please provide a prompt for image generation.", event.threadID);
    }

    await message.reply("Generating images, please wait...⏳", event.threadID);

    try {
      const response = await axios.get(`https://upol-nijizx-4img.onrender.com/nijizx?prompt=${encodeURIComponent(prompt)}`);
      const { imageUrls } = response.data;

      if (imageUrls.length !== 4) {
        return message.reply("Failed to retrieve 4 images.", event.threadID);
      }
      
      const images = await Promise.all(imageUrls.map(url => Jimp.read(url)));
      const singleWidth = images[0].getWidth();
      const singleHeight = images[0].getHeight();
      const combinedImage = new Jimp(singleWidth * 2, singleHeight * 2);

      combinedImage.composite(images[0], 0, 0)
                   .composite(images[1], singleWidth, 0)
                   .composite(images[2], 0, singleHeight)
                   .composite(images[3], singleWidth, singleHeight);

      const buffer = await combinedImage.getBufferAsync(Jimp.MIME_PNG);

      const formData = new FormData();
      formData.append('image', buffer.toString('base64'));
      const imgbbResponse = await axios.post(`https://api.imgbb.com/1/upload?key=${imgbbApiKey}`, formData, {
        headers: formData.getHeaders()
      });

      const combinedImageUrl = imgbbResponse.data.data.url;

      const msg = {
        body: `Here is your combined image:\nSelect (1-4) images to display in full.`,
        attachment: images.map((img, index) => ({ attachment: img, caption: `Image ${index + 1}` }))
      };
      
      return message.reply(msg, event.threadID, (error, info) => {
        if (error) {
          console.error("Error sending message:", error);
          return;
        }

        global.GoatBot.onReply.set(info.messageID, {
          type: "reply",
          commandName: "nijizx",
          author: event.senderID,
          messageID: info.messageID,
          imageUrls,
          combinedImageUrl
        });
      });
    } catch (error) {
      console.error("Error during image generation or upload:", error);
      api.sendMessage("An error occurred while generating or uploading images. Please try again later.", event.threadID);
    }
  },

  onReply: async function ({ event, api, Reply }) {
    const { imageUrls, author } = Reply;
    if (event.senderID !== author) return;

    const selectedImageIndex = parseInt(event.body) - 1;
    if (isNaN(selectedImageIndex) || selectedImageIndex < 0 || selectedImageIndex >= imageUrls.length) {
      return message.reply("Invalid selection. Please enter a number from 1 to 4.", event.threadID);
    }

    const selectedImageUrl = imageUrls[selectedImageIndex];
    message.reply({
      body: `Here is your selected image:`,
      attachment: await global.utils.getStreamFromURL(selectedImageUrl)
    }, event.threadID);
  }
};

