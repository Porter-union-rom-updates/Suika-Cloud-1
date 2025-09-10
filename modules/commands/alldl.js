const axios = require('axios');

module.exports = {
  config: {
    name: 'alldl',
    version: '1.0',
    author: 'Farhan',
    countDown: 5,
    prefix: true,
    adminOnly: false,
    aliases: [],
    description: '',
    category: 'media',
    guide: {
      en: '{pn} [url] or reply to a message with url'
    }
  },

  onStart: async function({ message, args, event, threadsData, role }) {
    let videoUrl = args.join(" ");

    // Handle auto-download toggle for admins
    if ((args[0] === 'chat' && (args[1] === 'on' || args[1] === 'off')) || args[0] === 'on' || args[0] === 'off') {
      if (role >= 1) {
        const choice = args[0] === 'on' || args[1] === 'on';
        // Properly structure the data storage
        await threadsData.set(event.threadID, { autoDownload: choice });
        return message.reply(`Auto-download has been turned ${choice ? 'on' : 'off'} for this group.`);
      } else {
        return message.reply("You don't have permission to toggle auto-download.");
      }
    }

    // Get URL from message reply if no URL provided as argument
    if (!videoUrl) {
      if (event.messageReply && event.messageReply.body) {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const foundURLs = event.messageReply.body.match(urlRegex);
        if (foundURLs && foundURLs.length > 0) {
          videoUrl = foundURLs[0];
        } else {
          return message.reply("No URL found. Please provide a valid URL.");
        }
      } else {
        return message.reply("Please provide a URL to start downloading.");
      }
    }

    // Validate URL format
    try {
      new URL(videoUrl);
    } catch (e) {
      return message.reply("Please provide a valid URL.");
    }

    message.reaction("⏳", event.messageID);
    await this.downloadVideo({ videoUrl, message, event });
  },

  onChat: async function({ event, message, threadsData }) {
    try {
      const threadData = await threadsData.get(event.threadID);
      // Fix data access pattern
      if (!threadData || !threadData.autoDownload || event.senderID === global.botID) return;
      
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const foundURLs = event.body.match(urlRegex);

      if (foundURLs && foundURLs.length > 0) {
        const videoUrl = foundURLs[0];
        // Validate URL before processing
        try {
          new URL(videoUrl);
          message.reaction("⏳", event.messageID);
          await this.downloadVideo({ videoUrl, message, event });
        } catch (e) {
          // Invalid URL, skip processing
          console.error("Invalid URL in chat:", videoUrl);
        }
      }
    } catch (error) {
      console.error("onChat Error:", error);
    }
  },

  downloadVideo: async function({ videoUrl, message, event }) {
    try {
      const apiResponse = await axios.get(`https://noobs-api.top/dipto/alldl?url=${encodeURIComponent(videoUrl)}`);
      const videoData = apiResponse.data;

      if (!videoData || !videoData.result) {
        throw new Error("Invalid response from API.");
      }
      
      message.reaction("✅", event.messageID);
      message.reply({
        body: videoData.title || 'Downloaded video',
        attachment: await global.utils.getStreamFromURL(videoData.result, 'fb.mp4')
      });
    } catch (error) {
      message.reaction("❌", event.messageID);
      console.error("Download Error:", error);
      message.reply("Failed to download the video. Please check the URL and try again.");
    }
  }
};
