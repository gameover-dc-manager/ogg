const { Events } = require('discord.js');

module.exports = {
    name: Events.GuildCreate,
    async execute(guild) {
        console.log(`✅ Bot added to new guild: ${guild.name} (${guild.id})`);
        console.log(`👥 Member count: ${guild.memberCount}`);
        
        try {
            // Initialize configurations for the new guild
            const ConfigManager = require('../utils/configManager');
            const configManager = new ConfigManager();
            await configManager.initializeServerConfig(guild);
            
            console.log(`🔧 Configuration initialized for ${guild.name}`);
        } catch (error) {
            console.error(`❌ Error initializing config for ${guild.name}:`, error);
        }
    },
};
const ConfigManager = require('../utils/configManager');

module.exports = {
    name: Events.GuildCreate,
    async execute(guild) {
        console.log(`🎉 Bot joined new server: ${guild.name} (${guild.id}) - Members: ${guild.memberCount}`);

        try {
            // Initialize configuration for the new server
            const configManager = new ConfigManager();
            const success = await configManager.initializeServerConfig(guild);

            if (success) {
                console.log(`✅ Successfully set up ${guild.name} for bot usage`);

                // Try to send a welcome message to the system channel or first available text channel
                await sendWelcomeMessage(guild);
            } else {
                console.log(`❌ Failed to set up ${guild.name} - some features may not work`);
            }

        } catch (error) {
            console.error(`❌ Error setting up new server ${guild.name}:`, error);
        }
    }
};

async function sendWelcomeMessage(guild) {
    try {
        // Try to find a suitable channel to send welcome message
        let channel = guild.systemChannel;

        if (!channel) {
            // Find the first text channel the bot can send messages to
            channel = guild.channels.cache.find(ch => 
                ch.type === 0 && // Text channel
                ch.permissionsFor(guild.members.me)?.has(['SendMessages', 'ViewChannel'])
            );
        }

        if (channel) {
            const welcomeMessage = {
                embeds: [{
                    title: '🤖 Hello! Thanks for adding me to your server!',
                    description: `I'm ready to help manage **${guild.name}**! Here's how to get started:`,
                    color: 0x00ff00,
                    fields: [
                        {
                            name: '⚙️ Setup Commands',
                            value: '• `/setup dashboard` - Configure the web dashboard\n• `/admin config` - Access bot settings\n• `/logging setup` - Configure event logging',
                            inline: false
                        },
                        {
                            name: '🛡️ Moderation Features',
                            value: '• `/moderation` - Kick, ban, timeout members\n• `/warnings` - Warning system\n• `/captcha` - Anti-bot verification',
                            inline: false
                        },
                        {
                            name: '🎮 Fun Features',
                            value: '• `/reactionroles` - Reaction role system\n• `/games` - Mini-games\n• `/aichat` - AI chat integration',
                            inline: false
                        },
                        {
                            name: '📋 Get Help',
                            value: 'Use `/help` to see all available commands!',
                            inline: false
                        }
                    ],
                    footer: {
                        text: 'All configurations have been initialized automatically!'
                    },
                    timestamp: new Date().toISOString()
                }]
            };

            await channel.send(welcomeMessage);
            console.log(`📨 Sent welcome message to ${guild.name} in #${channel.name}`);
        }
    } catch (error) {
        console.error('Error sending welcome message:', error);
    }
}