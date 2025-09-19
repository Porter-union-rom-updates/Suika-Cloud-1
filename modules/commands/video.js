const axios = require("axios");
const fetch = require("node-fetch");
const fs = require("fs");
const path = require("path");
const ytSearch = require("yt-search");

module.exports.config = {
  name: "video",
  version: "1.5.0",
  hasPermssion: 0,
  credits: "ArYAN - Decor by Aminul Sordar",
  description: "🎬 Download YouTube video or audio by name or URL",
  commandCategory: "media",
  usages: "/video <title>\n/video -v <URL>\n/video -a <URL>",
  cooldowns: 5,
  dependencies: {
    axios: "",
    "node-fetch": "",
    "yt-search": ""
  }
};

module.exports.languages = {
  en: {
    missingInput: "❌ Please enter a title or valid YouTube URL.",
    invalidURL: "❌ Invalid YouTube URL.",
    notFound: "❌ No results found.",
    longVideo: "⚠️ This video is too long (%1). Only videos under 10 minutes are supported.",
    downloading: "📥 Fetching your media...",
    timeout: "⚠️ Server timeout. Please try again later.",
    aborted: "⚠️ Request took too long and was aborted.",
    failedDownload: "❌ Download failed with status: %1",
    failedAPI: "❌ API Error: %1"
  },
  vi: {
    missingInput: "❌ Vui lòng nhập tiêu đề hoặc URL YouTube hợp lệ.",
    invalidURL: "❌ URL YouTube không hợp lệ.",
    notFound: "❌ Không tìm thấy kết quả nào.",
    longVideo: "⚠️ Video này quá dài (%1). Chỉ hỗ trợ video dưới 10 phút.",
    downloading: "📥 Đang tải phương tiện...",
    timeout: "⚠️ Máy chủ quá tải, vui lòng thử lại sau.",
    aborted: "⚠️ Yêu cầu mất quá nhiều thời gian và đã bị hủy.",
    failedDownload: "❌ Tải xuống thất bại với mã: %1",
    failedAPI: "❌ Lỗi API: %1"
  }
};

module.exports.run = async function ({ api, event, args, getText }) {
  const apiKey = "itzaryan";
  const threadID = event.threadID;
  const messageID = event.messageID;
  let videoId, topResult, type = "video";

  const processingMessage = await api.sendMessage(getText("downloading"), threadID, null, messageID);

  try {
    const mode = args[0];
    const inputArg = args[1];

    if ((mode === "-v" || mode === "-a") && inputArg) {
      type = mode === "-a" ? "audio" : "video";

      let urlObj;
      try {
        urlObj = new URL(inputArg);
      } catch {
        throw new Error(getText("invalidURL"));
      }

      if (urlObj.hostname === "youtu.be") {
        videoId = urlObj.pathname.slice(1);
      } else if (urlObj.hostname.includes("youtube.com")) {
        const urlParams = new URLSearchParams(urlObj.search);
        videoId = urlParams.get("v");
      }

      if (!videoId) throw new Error(getText("invalidURL"));

      const searchResults = await ytSearch(videoId);
      if (!searchResults || !searchResults.videos.length)
        throw new Error(getText("notFound"));

      topResult = searchResults.videos[0];
    } else {
      const query = args.join(" ");
      if (!query) throw new Error(getText("missingInput"));

      const searchResults = await ytSearch(query);
      if (!searchResults || !searchResults.videos.length)
        throw new Error(getText("notFound"));

      topResult = searchResults.videos[0];
      videoId = topResult.videoId;
    }

    const timestamp = topResult.timestamp;
    const parts = timestamp.split(":").map(Number);
    const durationSeconds = parts.length === 3
      ? parts[0] * 3600 + parts[1] * 60 + parts[2]
      : parts[0] * 60 + parts[1];

    if (durationSeconds > 600)
      throw new Error(getText("longVideo", timestamp));

    api.setMessageReaction("⌛", messageID, () => {}, true);

    const apiUrl = `https://www-xyz-free.vercel.app/aryan/youtube?id=${videoId}&type=${type}&apikey=${apiKey}`;
    let downloadResponse;
    try {
      downloadResponse = await axios.get(apiUrl, { timeout: 30000 });
    } catch (error) {
      if (error.response?.status === 504) {
        throw new Error(getText("timeout"));
      } else if (error.code === "ECONNABORTED") {
        throw new Error(getText("aborted"));
      } else {
        throw new Error(getText("failedAPI", error.message));
      }
    }

    const downloadUrl = downloadResponse.data.downloadUrl;
    const response = await fetch(downloadUrl);
    if (!response.ok) {
      throw new Error(getText("failedDownload", response.status));
    }

    const ext = type === "audio" ? "mp3" : "mp4";
    const safeTitle = topResult.title.replace(/[\\/:*?"<>|]/g, "").substring(0, 50);
    const filename = `${safeTitle}.${ext}`;
    const downloadPath = path.join(__dirname, filename);
    const buffer = await response.buffer();
    fs.writeFileSync(downloadPath, buffer);

    api.setMessageReaction("✅", messageID, () => {}, true);

    await api.sendMessage({
      attachment: fs.createReadStream(downloadPath),
      body:
        `${type === "audio" ? "🎵 AUDIO INFO" : "🎬 VIDEO INFO"}\n` +
        `━━━━━━━━━━━━━━━\n` +
        `📌 Title: ${topResult.title}\n` +
        `🎞 Duration: ${topResult.timestamp}\n` +
        `📺 Channel: ${topResult.author.name}\n` +
        `👁 Views: ${topResult.views.toLocaleString()}\n` +
        `📅 Uploaded: ${topResult.ago}`
    }, threadID, () => {
      fs.unlinkSync(downloadPath);
      api.unsendMessage(processingMessage.messageID);
    }, messageID);

  } catch (err) {
    console.error("Error:", err.message);
    api.setMessageReaction("❌", messageID, () => {}, true);
    return api.sendMessage("❌ " + err.message, threadID, messageID);
  }
};
