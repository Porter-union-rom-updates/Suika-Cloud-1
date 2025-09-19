const moment = require("moment-timezone");

module.exports.config = {
  name: "acp",
  version: "1.0.0",
  hasPermssion: 2,
  credits: "Mirai Team",
  description: "Accept or delete Facebook friend requests",
  commandCategory: "bot id",
  usages: "Reply: add/del <number|all>",
  cooldowns: 0
};

module.exports.languages = {
  en: {
    noRequests: "No friend requests available.",
    action: `Reply to this message with:\n» add <num|all>\n» del <num|all>\nto accept or delete friend requests.`
  }
};

module.exports.run = async ({ event, api, getText }) => {
  const form = {
    av: api.getCurrentUserID(),
    fb_api_req_friendly_name: "FriendingCometFriendRequestsRootQueryRelayPreloader",
    fb_api_caller_class: "RelayModern",
    doc_id: "4499164963466303",
    variables: JSON.stringify({ input: { scale: 3 } })
  };

  const res = await api.httpPost("https://www.facebook.com/api/graphql/", form);
  const listRequest = JSON.parse(res)?.data?.viewer?.friending_possibilities?.edges;

  if (!listRequest || listRequest.length === 0)
    return api.sendMessage(getText("noRequests"), event.threadID, event.messageID);

  let msg = "=== 𝗙𝗿𝗶𝗲𝗻𝗱 𝗥𝗲𝗾𝘂𝗲𝘀𝘁𝘀 ===";
  let i = 0;

  for (const user of listRequest) {
    i++;
    const time = moment(user.time * 1000).tz("Asia/Dhaka").format("DD/MM/YYYY HH:mm:ss");
    msg += `\n\n${i}. 👤 𝗡𝗮𝗺𝗲: ${user.node.name}\n🆔 UID: ${user.node.id}\n🌐 Link: ${user.node.url.replace("www.facebook", "fb")}\n🕒 Sent: ${time}`;
  }

  msg += `\n\n${getText("action")}`;

  api.sendMessage(msg, event.threadID, (err, info) => {
    if (err) return;
    global.client.handleReply.push({
      name: module.exports.config.name,
      messageID: info.messageID,
      listRequest,
      author: event.senderID
    });
  }, event.messageID);
};

module.exports.handleReply = async ({ handleReply, event, api }) => {
  const { author, listRequest } = handleReply;
  if (event.senderID !== author) return;

  const args = event.body.trim().split(/\s+/);
  const action = args[0].toLowerCase();
  let targets = args.slice(1);

  if (!["add", "del"].includes(action)) {
    return api.sendMessage("❗ Please use `add` or `del` followed by number(s) or `all`.", event.threadID, event.messageID);
  }

  if (targets[0] === "all") {
    targets = listRequest.map((_, index) => (index + 1).toString());
  }

  const form = {
    av: api.getCurrentUserID(),
    fb_api_caller_class: "RelayModern",
    variables: {},
  };

  if (action === "add") {
    form.fb_api_req_friendly_name = "FriendingCometFriendRequestConfirmMutation";
    form.doc_id = "3147613905362928";
  } else {
    form.fb_api_req_friendly_name = "FriendingCometFriendRequestDeleteMutation";
    form.doc_id = "4108254489275063";
  }

  const success = [];
  const failed = [];

  for (const index of targets) {
    const pos = parseInt(index) - 1;
    const user = listRequest[pos];
    if (!user) {
      failed.push(`❌ STT ${index} not found`);
      continue;
    }

    form.variables = JSON.stringify({
      input: {
        source: "friends_tab",
        actor_id: api.getCurrentUserID(),
        client_mutation_id: Math.round(Math.random() * 999999).toString(),
        friend_requester_id: user.node.id
      },
      scale: 3,
      refresh_num: 0
    });

    try {
      const response = await api.httpPost("https://www.facebook.com/api/graphql/", form);
      const json = JSON.parse(response);
      if (json.errors) failed.push(`❌ ${user.node.name}`);
      else success.push(`✅ ${user.node.name}`);
    } catch (e) {
      failed.push(`❌ ${user.node.name}`);
    }
  }

  api.sendMessage(
    `🎯 Action: ${action === "add" ? "Accepted" : "Deleted"}\n\n✅ Success (${success.length}):\n${success.join("\n")}\n\n❌ Failed (${failed.length}):\n${failed.join("\n")}`,
    event.threadID,
    event.messageID
  );
};
