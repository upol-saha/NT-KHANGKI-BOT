const axios = require('axios');
const Jimp = require('jimp');

module.exports = {
  config: {
    name: "flux2",
    aliases: ["fluxv2"],
    version: "1.0",
    author: "UPoL 🐔",
    countDown: 5,
    role: 0,
    shortDescription: "Generate 4 images from different APIs",
    longDescription: "Generate images using multiple APIs, combine them into one image, and host with imgbb.",
    category: "ai",
    guide: {
      en: "{pn} <prompt>",
    }
  },

  onReply: async function ({ event, api, Reply }) {
    const { imageUrls, waitingMessageID } = Reply;

    const selectedNumber = parseInt(event.body.trim());
    if (isNaN(selectedNumber) || selectedNumber < 1 || selectedNumber > 4) {
      return api.sendMessage(
        "❌ Invalid input. Please reply with a number between 1 and 4.",
        event.threadID,
        event.messageID
      );
    }

    const selectedImage = imageUrls[selectedNumber - 1];
    api.unsendMessage(waitingMessageID); 
    return api.sendMessage(
      {
        body: `Here is the selected image (${selectedNumber}):`,
        attachment: await global.utils.getStreamFromURL(selectedImage),
      },
      event.threadID
    );
  },

  onStart: async function ({ event, api }) {
    const { threadID, messageID } = event;
    const prompt = event.body.trim().split(" ").slice(1).join(" ");
    const imgbbApiKey = "YOUR_IMGBB_API_KEY";

    if (!prompt) {
      return api.sendMessage("❌ Please provide a prompt for image generation.", threadID, messageID);
    }

    const waitingMessage = await api.sendMessage(
      "⏳ Generating images... Please wait a moment.",
      threadID
    );

    // API URLs for generating images
    const apiUrls = {
      dev: `https://upol-meaw-newapi.onrender.com/flux/v2?prompt=${encodeURIComponent(prompt)}`,
      schnell: `https://upol-meaw-meaw-fluxx.onrender.com/flux?prompt=${encodeURIComponent(prompt)}`,
      realismLora: `https://upol-flux-realismlora.onrender.com/flux/realismlora?prompt=${encodeURIComponent(prompt)}`,
      midjourneyMini: `https://huggifk-flux-extra.onrender.com/flux?prompt=${encodeURIComponent(prompt)}`,
    };

    try {
      // Fetch images concurrently
      const imagePromises = Object.values(apiUrls).map((url) => axios.get(url, { responseType: "arraybuffer" }));
      const imageResponses = await Promise.all(imagePromises);

      // Save images locally with Jimp
      const images = await Promise.all(imageResponses.map((res) => Jimp.read(res.data)));
      const canvasWidth = Math.max(...images.map((img) => img.bitmap.width)) * 2;
      const canvasHeight = Math.max(...images.map((img) => img.bitmap.height)) * 2;

      // Create a blank canvas for combining images
      const canvas = new Jimp(canvasWidth, canvasHeight, 0xffffffff);

      // Place images on the canvas
      images.forEach((img, idx) => {
        const x = (idx % 2) * img.bitmap.width;
        const y = Math.floor(idx / 2) * img.bitmap.height;
        canvas.composite(img, x, y);
      });

      // Save combined image
      const combinedImagePath = "./cache/combined_image.jpg";
      await canvas.writeAsync(combinedImagePath);

      // Upload images to imgbb
      const uploadPromises = imageResponses.map((res) =>
        axios.post("https://api.imgbb.com/1/upload", {
          image: Buffer.from(res.data).toString("base64"),
          key: imgbbApiKey,
        })
      );
      const imgbbResponses = await Promise.all(uploadPromises);
      const imageUrls = imgbbResponses.map((res) => res.data.data.url);

      // Upload combined image to imgbb
      const combinedImageBuffer = await canvas.getBufferAsync(Jimp.MIME_JPEG);
      const combinedUploadResponse = await axios.post("https://api.imgbb.com/1/upload", {
        image: combinedImageBuffer.toString("base64"),
        key: imgbbApiKey,
      });
      const combinedImageUrl = combinedUploadResponse.data.data.url;

      // Respond with combined and individual images
      api.unsendMessage(waitingMessage.messageID); // Remove waiting message
      return api.sendMessage(
        {
          body: `🖼️ Images generated successfully! Select a number (1-4) to view an individual image.\n\nCombined Image: ${combinedImageUrl}\n\nIndividual Images:\n1. ${imageUrls[0]}\n2. ${imageUrls[1]}\n3. ${imageUrls[2]}\n4. ${imageUrls[3]}`,
          attachment: await global.utils.getStreamFromURL(combinedImageUrl),
        },
        threadID,
        async (error, info) => {
          if (!error) {
            global.GoatBot.onReply.set(info.messageID, {
              type: "imageSelection",
              author: event.senderID,
              imageUrls,
              waitingMessageID: info.messageID,
            });
          }
        }
      );
    } catch (error) {
      console.error("Error generating images:", error);
      api.unsendMessage(waitingMessage.messageID); // Remove waiting message
      return api.sendMessage("❌ Failed to generate images. Please try again later.", threadID);
    }
  },
};
