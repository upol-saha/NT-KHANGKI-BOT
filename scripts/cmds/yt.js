const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "yt",
    version: "1.2",
    author: "UPoL 🐔",
    countDown: 5,
    role: 0,
    description: {
      en: "Search and download video or audio from YouTube."
    },
    category: "media",
    guide: {
      en: "   {pn} -v [<video name>]: search and download video\n   {pn} -a [<video name>]: search and download audio"
    }
  },

  langs: {
    en: {
      searching: "🔎 Searching for your request...",
      choose: "%1\n\nReply with a number to choose or any other text to cancel.",
      downloading: "⬇️ Downloading your %1, please wait...",
      error: "❌ An error occurred: %1",
      noResult: "⭕ No search results found for %1"
    }
  },

  onStart: async function ({ args, message, event, getLang }) {
    let format;
    switch (args[0]) {
      case "-v":
        format = "video";
        break;
      case "-a":
        format = "audio";
        break;
      default:
        return message.SyntaxError();
    }

    const query = args.slice(1).join(" ");
    if (!query) return message.SyntaxError();

    const searchUrl = `https://upol-ytbv2-x.onrender.com/search?query=${encodeURIComponent(query)}&format=${format}`;

    try {
      await message.reply(getLang("searching"));
      const searchResponse = await axios.get(searchUrl);

      if (!searchResponse.data || searchResponse.data.length === 0) {
        return message.reply(getLang("noResult", query));
      }

      const results = searchResponse.data;
      let responseMessage = "🔎 Search Results:\n";
      const thumbnails = [];

      results.forEach((result, index) => {
        responseMessage += `${index + 1}. ${result.title} - ${result.channel}\n\n`;
        thumbnails.push(result.thumbnail);
      });

      const thumbnailPaths = await Promise.all(
        thumbnails.map((url, index) => downloadThumbnail(url, index))
      );

      const replyMessage = await message.reply({
        body: getLang("choose", responseMessage),
        attachment: thumbnailPaths.map(path => fs.createReadStream(path))
      });

      // Cleanup downloaded thumbnails
      thumbnailPaths.forEach(path => fs.unlinkSync(path));

      global.GoatBot.onReply.set(replyMessage.messageID, {
        commandName: this.config.name,
        messageID: replyMessage.messageID,
        author: event.senderID,
        format,
        results
      });
    } catch (error) {
      console.error(error);
      return message.reply(getLang("error", error.message));
    }
  },

  onReply: async function ({ message, event, Reply, getLang }) {
    const { results, format, messageID } = Reply;
    const choice = parseInt(event.body);

    if (isNaN(choice) || choice < 1 || choice > results.length) {
      return message.reply(getLang("error", "Invalid choice"));
    }

    const selected = results[choice - 1];
    const videoUrl = `https://youtube.com/watch?v=${selected.id}`;

    await message.unsend(messageID);
    await message.reply(getLang("downloading", format));

    try {
      // Fetch the stream directly from YouTube URL
      const stream = await global.utils.getStreamFromURL(videoUrl);

      // Determine the file extension based on format
      const extension = format === "video" ? "mp4" : "mp3";
      const filePath = path.join(__dirname, `download.${extension}`);

      // Write the stream to a file
      const fileStream = fs.createWriteStream(filePath);
      stream.pipe(fileStream);

      await new Promise((resolve, reject) => {
        fileStream.on("finish", resolve);
        fileStream.on("error", reject);
      });

      // Reply with the downloaded file
      await message.reply({
        body: `🎉 Here's your ${format}: ${selected.title}`,
        attachment: fs.createReadStream(filePath)
      });

      // Cleanup the file after sending
      fs.unlinkSync(filePath);
    } catch (error) {
      console.error(error);
      return message.reply(getLang("error", error.message));
    }
  }
};

async function downloadThumbnail(url, index) {
  try {
    const thumbnailPath = path.join(__dirname, `thumb_${index}.jpg`);
    const response = await axios.get(url, { responseType: "stream" });
    const writer = fs.createWriteStream(thumbnailPath);
    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", reject);
    });

    return thumbnailPath;
  } catch (error) {
    throw new Error(`Failed to download thumbnail: ${error.message}`);
  }
}
