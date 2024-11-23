const axios = require('axios');
const https = require('https');
const fs = require('fs');
const path = require('path');

const SONGS_FILE = path.join(__dirname, 'songs.json');

module.exports = {
    config: {
        name: "music",
        version: "2.1",
        author: "UPoL SAHA",
        countDown: 5,
        role: 0,
        shortDescription: {
            en: "Search, manage, and play songs."
        },
        longDescription: {
            en: "Search for songs, play audio, and manage your custom song list."
        },
        category: "Music",
        guide: {
            en: "{pn} <songName> - Search and play a song\n"
                + "{pn} add <songName> - Add a song to your list\n"
                + "{pn} edit <songName/listNumber> to <newSongName> - Edit a song in your list\n"
                + "{pn} remove <songName/listNumber> - Remove a song from your list\n"
                + "{pn} list - View your added songs\n"
                + "Reply to the song list with the number to play the song."
        }
    },

    onStart: async function ({ message, args, api }) {
        const userID = message.senderID;

        // Ensure the songs.json file exists
        if (!fs.existsSync(SONGS_FILE)) fs.writeFileSync(SONGS_FILE, JSON.stringify({}));

        // Load user-specific songs
        const songsData = JSON.parse(fs.readFileSync(SONGS_FILE, 'utf8'));
        const userSongs = songsData[userID] || [];

        const subCommand = args[0]?.toLowerCase();

        switch (subCommand) {
            case 'add': {
                const songName = args.slice(1).join(' ');
                if (!songName) return message.reply("Please provide a song name to add.");
                userSongs.push(songName);
                songsData[userID] = userSongs;
                fs.writeFileSync(SONGS_FILE, JSON.stringify(songsData, null, 2));
                return message.reply(`✅ Added "${songName}" to your song list.`);
            }
            case 'edit': {
                const toIndex = args.indexOf('to');
                if (toIndex === -1) return message.reply('Invalid syntax. Use: "edit <songName/listNumber> to <newSongName>".');
                const identifier = args.slice(1, toIndex).join(' ');
                const newSongName = args.slice(toIndex + 1).join(' ');

                const index = isNaN(identifier) ? userSongs.indexOf(identifier) : Number(identifier) - 1;
                if (index < 0 || index >= userSongs.length) return message.reply('The specified song was not found.');
                const oldSongName = userSongs[index];

                userSongs[index] = newSongName;
                songsData[userID] = userSongs;
                fs.writeFileSync(SONGS_FILE, JSON.stringify(songsData, null, 2));
                return message.reply(`✅ Edited "${oldSongName}" to "${newSongName}".`);
            }
            case 'remove': {
                const identifier = args.slice(1).join(' ');
                const index = isNaN(identifier) ? userSongs.indexOf(identifier) : Number(identifier) - 1;
                if (index < 0 || index >= userSongs.length) return message.reply('The specified song was not found.');
                const removedSong = userSongs.splice(index, 1);
                songsData[userID] = userSongs;
                fs.writeFileSync(SONGS_FILE, JSON.stringify(songsData, null, 2));
                return message.reply(`✅ Removed "${removedSong}" from your song list.`);
            }
            case 'list': {
                if (userSongs.length === 0) return message.reply("Your song list is empty.");
                const listMessage = userSongs
                    .map((song, index) => `${index + 1}. ${song}`)
                    .join('\n');
                return message.reply(`🎵 Your Song List:\n${listMessage}\n\nReply with the number to play a song.`, (error, info) => {
                    if (error) return console.error(error);
                    global.GoatBot.onReply.set(info.messageID, {
                        type: 'list',
                        commandName: this.config.name,
                        userID,
                        songs: userSongs
                    });
                });
            }
            default: {
                const songName = args.join(' ');
                if (!songName) return message.reply("Please provide a song name to search.");
                return playSong(songName, message);
            }
        }
    },

    onReply: async function ({ event, message, Reply }) {
        const { type, songs, userID } = Reply;

        if (type === 'list') {
            const selection = Number(event.body) - 1;
            if (isNaN(selection) || selection < 0 || selection >= songs.length) {
                return message.reply('Invalid selection. Please choose a valid number from the list.');
            }
            const songName = songs[selection];
            return playSong(songName, message);
        }
    }
};

async function playSong(songName, message) {
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
        return message.reply("An error occurred while searching for the song.");
    }
}
