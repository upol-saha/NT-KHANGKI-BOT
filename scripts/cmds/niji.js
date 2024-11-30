const { createCanvas, loadImage } = require('canvas');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

module.exports = {
    config: {
        name: "niji",
        version: "1.4",
        author: "UPoL 🐔",
        category: "image",
        shortDescription: "Generate a collage and upload to Imgbb",
        longDescription: "Fetches 4 images from an API, creates a collage, uploads it to Imgbb, and allows users to select images by code (U1-U4).",
        guide: {
            en: "{p}niji <prompt>"
        }
    },

    onStart: async function ({ message, args, event, api }) {
        const prompt = args.join(" ");
        if (!prompt) {
            return message.reply("❌ Please provide a prompt.");
        }

        const apiUrl = `https://upol-nijizx-4img.onrender.com/nijizx?prompt=${encodeURIComponent(prompt)}`;
        const imgbbApiKey = "cc7534287e3141c514a70ff04d316190"; // Imgbb API Key
        const waitMessage = await message.reply("⏳ Generating your images...");

        try {
            const { data } = await axios.get(apiUrl);
            if (!data.imageUrls || data.imageUrls.length !== 4) {
                throw new Error("API response does not contain 4 valid image URLs.");
            }

            const imageUrls = data.imageUrls;

            // Load images and create a collage
            const images = await Promise.all(imageUrls.map(url => loadImage(url)));
            const canvas = createCanvas(800, 800); // 800x800 canvas
            const ctx = canvas.getContext('2d');

            const positions = [
                { x: 0, y: 0 },
                { x: 400, y: 0 },
                { x: 0, y: 400 },
                { x: 400, y: 400 }
            ];

            positions.forEach((pos, i) => {
                ctx.drawImage(images[i], pos.x, pos.y, 400, 400);
                // Add numbering to each image
                ctx.font = "30px Arial";
                ctx.fillStyle = "white";
                ctx.fillText(`U${i + 1}`, pos.x + 10, pos.y + 40);
            });

            // Save the collage locally
            const cachePath = path.join(__dirname, 'cache');
            if (!fs.existsSync(cachePath)) fs.mkdirSync(cachePath);
            const collagePath = path.join(cachePath, `collage.png`);

            const out = fs.createWriteStream(collagePath);
            const stream = canvas.createPNGStream();
            stream.pipe(out);

            out.on('finish', async () => {
                // Upload the collage to Imgbb
                const formData = new FormData();
                formData.append('image', fs.createReadStream(collagePath));
                const imgbbResponse = await axios.post('https://api.imgbb.com/1/upload', formData, {
                    headers: formData.getHeaders(),
                    params: { key: imgbbApiKey }
                });

                const imgbbUrl = imgbbResponse.data.data.url;

                await api.deleteMessage(waitMessage.messageID);
                await message.reply({
                    body: `Here is your collage: ${imgbbUrl}\n\nReply with a code (U1-U4) to select an image:\n${imageUrls.map((url, i) => `U${i + 1}: ${url}`).join('\n')}`,
                    attachment: fs.createReadStream(collagePath)
                });

                global.GoatBot.onReply.set(waitMessage.messageID, {
                    commandName: "niji",
                    author: event.senderID,
                    imageUrls
                });
            });

        } catch (error) {
            console.error(error);
            await api.deleteMessage(waitMessage.messageID);
            message.reply(`❌ An error occurred: ${error.message}`);
        }
    },

    onReply: async function ({ message, Reply, event, api }) {
        const { author, imageUrls } = Reply;
        const userSelection = event.body;

        if (event.senderID !== author) {
            return message.reply("🚫 Only the user who requested the collage can select an image.");
        }

        if (!/^U[1-4]$/i.test(userSelection)) {
            return message.reply("❌ Please reply with a valid code (U1-U4).");
        }

        const selectedIndex = parseInt(userSelection.substring(1), 10) - 1;
        const selectedImageUrl = imageUrls[selectedIndex];

        try {
            const response = await axios.get(selectedImageUrl, { responseType: 'stream' });
            message.reply({
                body: `Here is your selected image (${userSelection.toUpperCase()}):`,
                attachment: response.data
            });
        } catch (error) {
            console.error("Error fetching selected image:", error);
            message.reply("❌ Failed to fetch the selected image.");
        }
    }
};
