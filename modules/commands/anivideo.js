const axios = require("axios");

module.exports = {
  config: {
    name: "anivideo",
    aliases: ["av"],
    version: "0.0.2",
    author: "frnwot",
    countDown: 5,
    role: 0,
    shortDescription: { en: "🎬 Send a random anime video" },
    longDescription: { en: "✨ Fetches a random high-quality anime video from API and sends it to you" },
    category: "VIDEO",
    guide: { en: "{p}anivideo or {p}av" }
  },

  onStart: async function ({ message }) {
    try {
      // Fetch video URL from API
      const response = await axios.get("https://my-api-show.vercel.app/api/animevideo", { timeout: 20000 });
      if (!response.data || response.data.success !== true || !response.data.video) {
        return message.reply("❌ Oops! Failed to fetch anime video. Please try again.");
      }

      let videoURL = String(response.data.video).trim();
      if (!/^https?:\/\//i.test(videoURL)) {
        return message.reply("❌ Invalid video URL received from API.");
      }

      // Imgur direct download fix
      if (/i\.imgur\.com\/[^?]+\.mp4/i.test(videoURL) && !/\?/.test(videoURL)) {
        videoURL += "?download=1";
      }

      // Fetch the video stream
      const stream = await axios({
        url: videoURL,
        method: "GET",
        responseType: "stream",
        headers: {
          "User-Agent": "Mozilla/5.0",
          "Accept": "*/*",
          "Referer": "https://imgur.com/"
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        timeout: 30000
      });

      // Reply with the video
      return message.reply({
        body: `💝 Here’s your random anime video!\n🎥 Enjoy and share with friends!`,
        attachment: stream.data
      });

    } catch (err) {
      try {
        // Fallback API call if streaming fails
        const fallback = await axios.get("https://my-api-show.vercel.app/api/animevideo", { timeout: 15000 });
        const fallbackVideo = fallback.data && fallback.data.video ? fallback.data.video : null;
        if (fallbackVideo) {
          return message.reply("⚠️ Couldn't stream the video, but here’s the URL: " + fallbackVideo);
        }
      } catch (_) {}

      return message.reply("⚠️ Unexpected error occurred while fetching anime video. Try again later!");
    }
  }
};
