const { createCanvas, loadImage } = require('canvas');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

module.exports = {
  config: {
    name: "niji",
    aliases: [],
    version: "1.1",
    author: "UPoL 🐔",
    shortDescription: "Fetch and display images from the API in a collage",
    longDescription: "Fetches 4 images from the API, uploads them to Imgbb, and allows the user to select one by number.",
    category: "image",
    guide: {
      en: "{p}nijiz <prompt>"
    }
  },
  onStart: async function ({ message, event, args, api }) {
    const imgbbApiKey = "cc7534287e3141c514a70ff04d316190"; // Your Imgbb API key
    
    // Send wait message
    const waitMessage = await message.reply("⏳ Please wait, generating your images...");

    try {
      // Get the prompt from the user's arguments
      const prompt = args.join(" ");
      
      // Check if prompt is provided
      if (!prompt) {
        return message.reply("❌ Please provide a prompt. Example: `/nijiz a cat`");
      }

      const apiUrl = `https://upol-nijizx-4img.onrender.com/nijizx?prompt=${encodeURIComponent(prompt)}`;

      // Fetch data from the API
      const { data } = await axios.get(apiUrl);

      // Check if imageUrls is returned correctly
      if (!data.imageUrls || data.imageUrls.length !== 4) {
        throw new Error("API response does not contain 4 images.");
      }

      const imageUrls = data.imageUrls;

      // Function to upload image to Imgbb
      const uploadToImgbb = async (url) => {
        try {
          const response = await axios.get(url, { responseType: 'arraybuffer' });
          const formData = new FormData();
          formData.append('image', Buffer.from(response.data, 'binary'), { filename: 'image.png' });
          const res = await axios.post('https://api.imgbb.com/1/upload', formData, {
            headers: formData.getHeaders(),
            params: { key: imgbbApiKey }
          });
          return res.data.data.url; // Return the Imgbb URL
        } catch (error) {
          console.log(error);
          throw new Error("Failed to upload image to Imgbb");
        }
      };

      // Upload all images to Imgbb
      const imgbbUrls = await Promise.all(imageUrls.map(url => uploadToImgbb(url)));

      // Load images for collage
      const images = await Promise.all(imgbbUrls.map(url => loadImage(url)));
      const canvasWidth = 600;
      const canvasHeight = 400;
      const cellWidth = canvasWidth / 2;
      const cellHeight = canvasHeight / 2;

      const collageCanvas = createCanvas(canvasWidth, canvasHeight);
      const ctx = collageCanvas.getContext('2d');

      images.forEach((img, index) => {
        const x = (index % 2) * cellWidth;
        const y = Math.floor(index / 2) * cellHeight;
        ctx.drawImage(img, x, y, cellWidth, cellHeight);
      });

      // Save and send collage
      const cacheFolderPath = path.join(__dirname, 'cache');
      if (!fs.existsSync(cacheFolderPath)) fs.mkdirSync(cacheFolderPath);
      const collagePath = path.join(cacheFolderPath, `collage.png`);
      const out = fs.createWriteStream(collagePath);
      const stream = collageCanvas.createPNGStream();
      stream.pipe(out);

      out.on('finish', async () => {
        // Delete wait message, send collage
        await api.deleteMessage(waitMessage.messageID);
        await message.reply({
          body: "Choose an image (1-4) by replying with the number.",
          attachment: fs.createReadStream(collagePath)
        });

        // Handle user's selection after they reply
        const selectionListener = async (event) => {
          if (event.senderID === message.senderID && /^[1-4]$/.test(event.body)) {
            const choice = parseInt(event.body, 10) - 1;

            try {
              // Send the selected image from Imgbb
              const selectedImageUrl = imgbbUrls[choice];
              await message.reply({
                body: `Here's image ${event.body}:`,
                attachment: selectedImageUrl
              });
              // Remove the listener after the image is sent
              api.removeListener("message", selectionListener);
            } catch (error) {
              console.error("Error fetching selected image:", error);
              message.reply("❌ Failed to retrieve the selected image.");
            }
          } else {
            // In case the user replies with an invalid selection
            message.reply("❌ Invalid selection! Please reply with a number between 1 and 4.");
          }
        };

        // Listen for the user's reply (1-4 selection)
        api.listenMqtt((err, replyEvent) => {
          if (err) return console.error(err);
          if (replyEvent.type === 'message' && replyEvent.threadID === message.threadID) {
            selectionListener(replyEvent);
          }
        });

      });
    } catch (error) {
      console.error("Error:", error);
      // Send more specific error message
      message.reply(`❌ | An error occurred: ${error.message || error}`);
    }
  }
};
