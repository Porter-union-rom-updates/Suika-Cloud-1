const axios = require('axios');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const crypto = require('crypto');

const API_BASE = 'https://speedydl.hridoy.top/api';

module.exports = {
  name: "socialMediaDownloader",
  handle: async function({ api, event }) {
    const { threadID, messageID, body } = event;

    const urlMatch = body.match(/(https?:\/\/[^\s]+)/);
    if (!urlMatch) return;

    const url = urlMatch[0];
    let platform = null;
    let apiEndpoint = null;
    let videoKeys = [];
    let titleKey = null;
    let fallbackTitle = 'Video';

    if (url.startsWith('https://www.facebook.com/')) {
      platform = 'Facebook';
      apiEndpoint = `${API_BASE}/facebook?url=${encodeURIComponent(url)}`;
      videoKeys = ['hd', 'sd'];
      titleKey = 'title';
      fallbackTitle = 'Facebook Video';
    } else if (url.startsWith('https://www.instagram.com/')) {
      platform = 'Instagram';
      apiEndpoint = `${API_BASE}/instagram?url=${encodeURIComponent(url)}`;
      videoKeys = ['video[0]'];
      fallbackTitle = 'Instagram Video';
    } else if (url.startsWith('https://www.tiktok.com/')) {
      platform = 'TikTok';
      apiEndpoint = `${API_BASE}/tiktok?url=${encodeURIComponent(url)}`;
      videoKeys = ['video'];
      titleKey = 'title';
      fallbackTitle = 'TikTok Video';
    } else if (url.startsWith('https://x.com/') || url.startsWith('https://twitter.com/')) {
      platform = 'Twitter/X';
      apiEndpoint = `${API_BASE}/twitter?url=${encodeURIComponent(url)}`;
      videoKeys = ['HD', 'SD'];
      fallbackTitle = 'Twitter/X Video';
    } else if (url.startsWith('https://youtu.be/') || url.startsWith('https://www.youtube.com/')) {
      platform = 'YouTube';
      apiEndpoint = `${API_BASE}/youtube?url=${encodeURIComponent(url)}`;
      videoKeys = ['video_hd', 'video'];
      titleKey = 'title';
      fallbackTitle = 'YouTube Video';
    } else {
      return;
    }

    try {
      api.sendMessage(`🔍 Searching for ${platform} video...`, threadID, messageID);

      const response = await axios.get(apiEndpoint);
      const data = response.data;
      
      // Debug logging
      console.log(chalk.yellow(`[SocialMediaDownloader Debug] ${platform} Response:`, JSON.stringify(data, null, 2)));

      let videoUrl = null;
      
      for (const key of videoKeys) {
        if (key.includes('[')) {
          const [arrayKey, index] = key.split(/\[|\]/).filter(Boolean);
          if (data[arrayKey] && data[arrayKey][parseInt(index)]) {
            videoUrl = data[arrayKey][parseInt(index)];
            console.log(chalk.green(`[SocialMediaDownloader Debug] Found video URL using key ${arrayKey}[${index}]`));
            break;
          }
        } else if (data[key]) {
          videoUrl = data[key];
          console.log(chalk.green(`[SocialMediaDownloader Debug] Found video URL using key ${key}`));
          break;
        }
      }

      if (!videoUrl) {
        console.log(chalk.red(`[SocialMediaDownloader Debug] Available keys in response:`, Object.keys(data)));
        throw new Error(`No video URL found in response for keys: ${videoKeys.join(', ')}`);
      }

      const title = titleKey && data[titleKey] ? data[titleKey] : fallbackTitle;

      api.sendMessage(`⏳ Downloading ${platform} video...`, threadID, messageID);

      const fileName = `video_${crypto.randomBytes(8).toString('hex')}.mp4`;
      const filePath = path.join(__dirname, '..', '..', fileName);
      const writer = fs.createWriteStream(filePath);

      console.log(chalk.blue(`[SocialMediaDownloader Debug] Downloading from URL: ${videoUrl}`));
      
      const videoResponse = await axios.get(videoUrl, { responseType: 'stream' });
      videoResponse.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });

      const stats = fs.statSync(filePath);
      if (stats.size === 0) throw new Error("Downloaded video is empty");

      api.sendMessage(`📤 Sending ${platform} video...`, threadID, messageID);

      const msg = {
        body: `${title}`,
        attachment: fs.createReadStream(filePath)
      };

      api.sendMessage(msg, threadID, (err) => {
        if (err) {
          console.log(chalk.red(`[SocialMediaDownloader Error] Failed to send ${platform} video: ${err.message}`));
          api.sendMessage(`⚠️ Failed to send ${platform} video.`, threadID, messageID);
        }

        fs.unlink(filePath, (unlinkErr) => {
          if (unlinkErr) {
            console.log(chalk.red(`[SocialMediaDownloader Cleanup Error] ${unlinkErr.message}`));
          } else {
            console.log(chalk.cyan(`[SocialMediaDownloader] Successfully sent ${platform} video in Thread: ${threadID}`));
          }
        });
      });
    } catch (error) {
      api.sendMessage(`⚠️ Failed to process ${platform} video: ${error.message}`, threadID, messageID);
      console.log(chalk.red(`[SocialMediaDownloader Error] ${platform} - ${error.message}`));
    }
  }
};
