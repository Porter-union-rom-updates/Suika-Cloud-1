const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '..', '..', 'config', 'config.json');
const commandsPath = path.join(__dirname, '..', 'commands');

function readDB(filePath) {
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`Error reading file at ${filePath}:`, error);
        return {};
    }
}

module.exports = {
    config: {
        name: 'help',
        version: '1.0',
        author: 'Farhan',
        countDown: 5,
        prefix: true,
        groupAdminOnly: false,
        description: 'Shows a list of commands or details about a specific command.',
        category: 'utility',
        guide: {
            en: '   {pn}' +
                '\n   {pn} <command_name>'
        },
    },
    onStart: async ({ api, event, args }) => {
        const config = readDB(configPath);
        const commandName = args[0];

        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
        const commands = {};

        for (const file of commandFiles) {
            try {
                const command = require(path.join(commandsPath, file));
                if (command.config) {
                    commands[command.config.name] = command.config;
                    if (command.config.aliases) {
                        for (const alias of command.config.aliases) {
                            commands[alias] = command.config;
                        }
                    }
                }
            } catch (error) {
                console.error(`Error loading command from file ${file}:`, error);
            }
        }

        if (!commandName) {
            const ownerName = config.ownerName || 'Unknown';
            const botName = config.botName || 'Bot';


            const categories = {};
            for (const cmd in commands) {
                const c = commands[cmd];
                if (!categories[c.category]) categories[c.category] = new Map();
                if (!categories[c.category].has(c.name)) categories[c.category].set(c.name, c);
            }

           
            let totalCommands = 0;
            for (const cat of Object.values(categories)) totalCommands += cat.size;

        
            let helpMessage = '';
            helpMessage += `╔═════☆ ${botName.toUpperCase()} HELP ☆═════╗\n\n`;
            helpMessage += `👑 Owner: ${ownerName}  \n`;
            helpMessage += `💻 Commands: ${totalCommands}  \n\n`;

            for (const [category, cmdsMap] of Object.entries(categories)) {
                const cmds = Array.from(cmdsMap.values());
                helpMessage += `𐙚  ✦ ${category.toUpperCase()} ✦  ❀  \n`;

                let line1 = '';
                let line2 = '';
                cmds.forEach((command, idx) => {
                    const formattedName = command.name.padEnd(8, ' ');
                    if (idx < Math.ceil(cmds.length / 2)) {
                        line1 += formattedName + '   |   ';
                    } else {
                        line2 += formattedName + '   |   ';
                    }
                });

                helpMessage += (line1.trim().replace(/\|$/, '') || '') + '\n';
                if (line2.trim()) helpMessage += (line2.trim().replace(/\|$/, '') || '') + '\n';
                helpMessage += '\n';
            }

            helpMessage += `╚═════☆ Stay sussy, stay smart ☆═════╝  \n`;
            helpMessage += `💬 Tip: Use !help <command> for details`;

            return api.sendMessage(helpMessage, event.threadID);

        } else {
            const commandConfig = commands[commandName.toLowerCase()];
            if (commandConfig) {
                let detailMessage = '';
                detailMessage += `╔═════☆ COMMAND INFO ☆═════╗\n\n`;
                detailMessage += `𐙚  ✦ NAME ✦  ❀\n${commandConfig.name}\n\n`;
                detailMessage += `𐙚  ✦ DESCRIPTION ✦  ❀\n${commandConfig.description}\n\n`;
                detailMessage += `𐙚  ✦ AUTHOR ✦  ❀\n${commandConfig.author}\n\n`;
                detailMessage += `𐙚  ✦ VERSION ✦  ❀\n${commandConfig.version}\n\n`;
                if (commandConfig.aliases && commandConfig.aliases.length > 0) {
                    detailMessage += `𐙚  ✦ ALIASES ✦  ❀\n${commandConfig.aliases.join(', ')}\n\n`;
                }
                if (commandConfig.guide && commandConfig.guide.en) {
                    detailMessage += `𐙚  ✦ USAGE ✦  ❀\n${commandConfig.guide.en.replace(/{pn}/g, config.prefix + commandConfig.name)}\n\n`;
                }
                detailMessage += `╚═════☆ Stay sussy, stay smart ☆═════╝`;
                return api.sendMessage(detailMessage, event.threadID);
            } else {
                return api.sendMessage(`Command "${commandName}" not found.`, event.threadID);
            }
        }
    },
};
