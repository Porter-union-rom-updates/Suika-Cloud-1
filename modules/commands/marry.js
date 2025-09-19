module.exports.config = {
  name: "marry",
  version: "3.1.1",
  hasPermssion: 0,
  credits: "aminulsordar ",
  description: "Mention the love of your life 💍",
  commandCategory: "fun",
  usages: "@mention",
  cooldowns: 5,
  dependencies: {
    "axios": "",
    "fs-extra": "",
    "path": "",
    "jimp": ""
  }
};

module.exports.languages = {
  en: {
    noTag: "Please mention one person to marry 💍."
  },
  ar: {
    noTag: "منشن شخصاً لتزوجه 💍."
  },
  vi: {
    noTag: "Vui lòng tag một người để kết hôn 💍."
  }
};

module.exports.onLoad = async () => {
  const { resolve } = global.nodemodule["path"];
  const { existsSync, mkdirSync } = global.nodemodule["fs-extra"];
  const { downloadFile } = global.utils;

  const dirMaterial = __dirname + `/cache/canvas/`;
  const filePath = resolve(dirMaterial, 'married.png');

  if (!existsSync(dirMaterial)) mkdirSync(dirMaterial, { recursive: true });
  if (!existsSync(filePath)) {
    await downloadFile("https://i.ibb.co/mc9KNm1/1619885987-21-pibig-info-p-anime-romantika-svadba-anime-krasivo-24.jpg", filePath);
  }
};

async function makeImage({ one, two }) {
  const fs = global.nodemodule["fs-extra"];
  const path = global.nodemodule["path"];
  const axios = global.nodemodule["axios"];
  const jimp = global.nodemodule["jimp"];
  const __root = path.resolve(__dirname, "cache", "canvas");

  const background = await jimp.read(__root + "/married.png");
  const outputPath = __root + `/hayati_${two}_${one}.png`;
  const avatarOnePath = __root + `/avt_${one}.png`;
  const avatarTwoPath = __root + `/avt_${two}.png`;

  const avatarOneData = (await axios.get(
    `https://graph.facebook.com/${two}/picture?width=512&height=512&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`,
    { responseType: 'arraybuffer' }
  )).data;
  fs.writeFileSync(avatarOnePath, Buffer.from(avatarOneData, 'utf-8'));

  const avatarTwoData = (await axios.get(
    `https://graph.facebook.com/${one}/picture?width=512&height=512&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`,
    { responseType: 'arraybuffer' }
  )).data;
  fs.writeFileSync(avatarTwoPath, Buffer.from(avatarTwoData, 'utf-8'));

  const circleOne = await jimp.read(await circle(avatarOnePath));
  const circleTwo = await jimp.read(await circle(avatarTwoPath));

  background
    .composite(circleOne.resize(100, 100), 100, 90)
    .composite(circleTwo.resize(100, 100), 190, 40);

  const finalImage = await background.getBufferAsync("image/png");
  fs.writeFileSync(outputPath, finalImage);

  fs.unlinkSync(avatarOnePath);
  fs.unlinkSync(avatarTwoPath);

  return outputPath;
}

async function circle(imagePath) {
  const jimp = require("jimp");
  const image = await jimp.read(imagePath);
  image.circle();
  return await image.getBufferAsync("image/png");
}

module.exports.run = async function ({ event, api, getText }) {
  const fs = global.nodemodule["fs-extra"];
  const { threadID, messageID, senderID } = event;
  const mention = Object.keys(event.mentions);

  if (!mention[0]) {
    return api.sendMessage(getText("noTag"), threadID, messageID);
  } else {
    const one = senderID;
    const two = mention[0];

    try {
      const path = await makeImage({ one, two });
      return api.sendMessage(
        { body: "", attachment: fs.createReadStream(path) },
        threadID,
        () => fs.unlinkSync(path),
        messageID
      );
    } catch (err) {
      console.error(err);
      return api.sendMessage("Error creating image.", threadID, messageID);
    }
  }
};
