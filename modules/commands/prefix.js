const fs = require("fs");
const path = require("path");
const { Users, Threads } = require("../../database/database");

module.exports = {
  config: {
    name: "prefix",
    version: "2.5",
    author: "Farhan",
    countDown: 5,
    prefix: false,
    description: "Show bot information with logo and random video.",
    category: "Utility",
    guide: {
      en: "{pn}",
    },
  },

  run: async ({ api, event }) => {
    try {
      const botPrefix = global.client?.config?.prefix || "Not set";
      const threadData = Threads.get(event.threadID) || {};
      const groupPrefix =
        threadData.settings?.prefix || `Using bot default (${botPrefix})`;

      const totalUsers = Object.keys(Users.getAll?.() || {}).length;
      const totalThreads = Object.keys(Threads.getAll?.() || {}).length;

      const botName = global.client?.config?.botName || "FarhanBot";
      const botVersion = global.client?.config?.version || "1.0.0";
      const ownerName = global.client?.config?.ownerName || "Farhan";
      const uptime = process.uptime();
      const uptimeStr = new Date(uptime * 1000).toISOString().substr(11, 8);

      // --- 🎥 Random video system ---
      const videoDir = path.join(__dirname, "videos");
      let videoPath = null;

      if (fs.existsSync(videoDir)) {
        const files = fs.readdirSync(videoDir).filter(f =>
          f.endsWith(".mp4")
        );
        if (files.length > 0) {
          const randomFile = files[Math.floor(Math.random() * files.length)];
          videoPath = path.join(videoDir, randomFile);
        }
      }

      // --- 🖼️ Logo + Info Message ---
      const message = `

🤖 ${botName} - Bot Info

📌 Prefix Info:
• Bot Prefix: ${botPrefix}
• Group Prefix: ${groupPrefix}

📊 Statistics:
• Total Users: ${totalUsers}
• Total Threads: ${totalThreads}
• Uptime: ${uptimeStr}

⚙️ System:
• Bot Version: ${botVersion}
• Owner: ${ownerName}
• Node.js: ${process.version}
• Platform: ${process.platform}

💡 Tip: Use "${botPrefix}help" to see all commands.
`;

      // --- 📤 Send with or without video ---
      if (videoPath) {
        api.sendMessage(
          {
            body: message,
            attachment: fs.createReadStream(videoPath),
          },
          event.threadID,
          event.messageID
        );
      } else {
        api.sendMessage(message, event.threadID, event.messageID);
      }
    } catch (error) {
      console.error("Error in prefix command:", error);
      api.sendMessage(
        "❌ An error occurred while fetching prefix information.",
        event.threadID,
        event.messageID
      );
    }
  },
};
