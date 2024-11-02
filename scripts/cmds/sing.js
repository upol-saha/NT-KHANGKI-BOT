const axios = require('axios');
const https = require('https');

module.exports = {
    config: {
        name: "sing",
        version: "1.1",
        author: "UPoL SAHA",
        countDown: 5,
        role: 0,
        shortDescription:{
            en: "Search for a song and play audio."           
          },
        description: "Fetch and play audio based on the provided song name.",
        category: "Music",
        guide: {
            en: "{pn} <song name>"
         }
    },

    onStart: async function ({ message, args, api }) {
        if (!args.length) return message.reply("Please provide a song name to search.");

        const songName = args.join(' ');

        const searchingMessage = await message.reply(`Searching for "${songName}"...`);

        try {
            const response = await axios.get(`https://upol-search.onrender.com/yt-audio?name=${encodeURIComponent(songName)}`);
            const songData = response.data;

            await message.unsend(searchingMessage.messageID);
            const updatedSearchingMessage = await message.reply(`🎶 Found: ${songData.title}\nPlay Time: ${songData.duration}`);

            const songInfoMessage = `🎶 Now playing: ${songData.title}\n`
                + `Artist: ${songData.artist}\n`
                + `Album: ${songData.album}\n`
                + `Channel Name: ${songData.channelName}\n`
                + `Views: ${songData.views}\n`;

            const audioStream = await axios({
                url: songData.downloadUrl,
                method: 'GET',
                responseType: 'stream',
                httpsAgent: new https.Agent({ rejectUnauthorized: false }) 
            });

            await message.unsend(updatedSearchingMessage.messageID);
            return message.reply({
                body: songInfoMessage,
                attachment: audioStream.data
            });
        } catch (error) {
            console.error(error);
            return message.reply("api issue.");
        }
    }
};
