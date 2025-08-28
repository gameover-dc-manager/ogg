
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getRaidStats, activateLockdown, raidData } = require('../components/raidProtection');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('raid')
        .setDescription('Manage raid protection system')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('Check raid protection status and statistics')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('config')
                .setDescription('Configure raid protection settings')
                .addStringOption(option =>
                    option.setName('setting')
                        .setDescription('Setting to configure')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Join Threshold', value: 'join_threshold' },
                            { name: 'Join Window (seconds)', value: 'join_window' },
                            { name: 'Message Threshold', value: 'message_threshold' },
                            { name: 'Message Window (seconds)', value: 'message_window' },
                            { name: 'Auto Lockdown', value: 'auto_lockdown' },
                            { name: 'Auto Kick', value: 'auto_kick' }
                        )
                )
                .addStringOption(option =>
                    option.setName('value')
                        .setDescription('New value for the setting')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('lockdown')
                .setDescription('Manually activate server lockdown')
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('Reason for lockdown')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('unlock')
                .setDescription('Remove server lockdown')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('whitelist')
                .setDescription('Manage raid protection whitelist')
                .addStringOption(option =>
                    option.setName('action')
                        .setDescription('Whitelist action')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Add User', value: 'add_user' },
                            { name: 'Remove User', value: 'remove_user' },
                            { name: 'List Users', value: 'list_users' }
                        )
                )
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to add/remove from whitelist')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('test')
                .setDescription('Test raid detection (for development)')
                .addStringOption(option =>
                    option.setName('type')
                        .setDescription('Type of test')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Join Simulation', value: 'join_test' },
                            { name: 'Message Simulation', value: 'message_test' }
                        )
                )
        ),

    async execute(interaction) {
        try {
            const subcommand = interaction.options.getSubcommand();

            switch (subcommand) {
                case 'status':
                    await handleStatus(interaction);
                    break;
                case 'config':
                    await handleConfig(interaction);
                    break;
                case 'lockdown':
                    await handleLockdown(interaction);
                    break;
                case 'unlock':
                    await handleUnlock(interaction);
                    break;
                case 'whitelist':
                    await handleWhitelist(interaction);
                    break;
                case 'test':
                    await handleTest(interaction);
                    break;
                default:
                    await interaction.reply({ content: '❌ Unknown subcommand.', ephemeral: true });
            }

        } catch (error) {
            console.error('❌ Error in raid command:', error);
            const errorMessage = '❌ An error occurred while processing the raid command.';
            if (interaction.replied || interaction.deferred) {
                await interaction.editReply({ content: errorMessage });
            } else {
                await interaction.reply({ content: errorMessage, ephemeral: true });
            }
        }
    }
};

async function handleStatus(interaction) {
    const stats = getRaidStats(interaction.client, interaction.guild.id);

    const embed = new EmbedBuilder()
        .setColor('#00BFFF')
        .setTitle('🛡️ Raid Protection Status')
        .setDescription(`Raid protection status for **${interaction.guild.name}**`)
        .addFields(
            { 
                name: '📊 Global Statistics', 
                value: `• Total raids detected: ${stats.global.totalRaidsDetected || 0}\n• Raiders kicked: ${stats.global.totalRaidersKicked || 0}\n• Raiders banned: ${stats.global.totalRaidersBanned || 0}\n• Lockdowns activated: ${stats.global.lockdownsActivated || 0}\n• False positives: ${stats.global.falsePositives || 0}`, 
                inline: true 
            },
            {
                name: '🎯 Current Monitoring',
                value: `• Guilds monitored: ${stats.activeMonitoring}\n• Suspicious activities: ${stats.currentSuspiciousActivity}`,
                inline: true
            }
        )
        .setTimestamp()
        .setFooter({ text: `Guild: ${interaction.guild.name}`, iconURL: interaction.guild.iconURL() });

    if (stats.guild) {
        embed.addFields({
            name: '🏠 Guild Statistics',
            value: `• Recent joins: ${stats.guild.recentJoins}\n• Recent messages: ${stats.guild.recentMessages}\n• Suspicious users: ${stats.guild.suspiciousUsers}\n• Lockdown active: ${stats.guild.lockdownActive ? '🔒 Yes' : '✅ No'}\n• Last raid: ${stats.guild.lastRaidTime ? new Date(stats.guild.lastRaidTime).toLocaleString() : 'Never'}`,
            inline: false
        });
    }

    // Load current config
    let config;
    try {
        const configPath = path.join(__dirname, '../config/raid_protection.json');
        if (fs.existsSync(configPath)) {
            config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        } else {
            config = interaction.client.raidConfig;
        }
    } catch (error) {
        config = interaction.client.raidConfig;
    }

    if (config) {
        embed.addFields({
            name: '⚙️ Configuration',
            value: `• Join threshold: ${config.JOIN_THRESHOLD} users\n• Join window: ${config.JOIN_WINDOW} seconds\n• Message threshold: ${config.MESSAGE_THRESHOLD} messages\n• Message window: ${config.MESSAGE_WINDOW} seconds\n• Auto lockdown: ${config.AUTO_LOCKDOWN ? '✅' : '❌'}\n• Auto kick: ${config.AUTO_KICK_RAIDERS ? '✅' : '❌'}`,
            inline: false
        });
    }

    const actionRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('raid_refresh_status')
                .setLabel('🔄 Refresh')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`raid_lockdown_${interaction.guild.id}`)
                .setLabel('🔒 Emergency Lockdown')
                .setStyle(ButtonStyle.Danger)
        );

    await interaction.reply({ embeds: [embed], components: [actionRow], ephemeral: true });
}

async function handleConfig(interaction) {
    const setting = interaction.options.getString('setting');
    const value = interaction.options.getString('value');

    // Load existing config
    const configPath = path.join(__dirname, '../config/raid_protection.json');
    let config = {};
    
    try {
        if (fs.existsSync(configPath)) {
            config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        }
    } catch (error) {
        console.error('Error loading raid protection config:', error);
    }

    // Update config based on setting
    let updatedValue;
    let description;

    switch (setting) {
        case 'join_threshold':
            const joinThreshold = parseInt(value);
            if (isNaN(joinThreshold) || joinThreshold < 1 || joinThreshold > 50) {
                return await interaction.reply({ content: '❌ Join threshold must be a number between 1 and 50.', ephemeral: true });
            }
            config.JOIN_THRESHOLD = joinThreshold;
            updatedValue = joinThreshold;
            description = 'Number of users joining rapidly to trigger detection';
            break;

        case 'join_window':
            const joinWindow = parseInt(value);
            if (isNaN(joinWindow) || joinWindow < 5 || joinWindow > 300) {
                return await interaction.reply({ content: '❌ Join window must be between 5 and 300 seconds.', ephemeral: true });
            }
            config.JOIN_WINDOW = joinWindow;
            updatedValue = `${joinWindow} seconds`;
            description = 'Time window for detecting rapid joins';
            break;

        case 'message_threshold':
            const messageThreshold = parseInt(value);
            if (isNaN(messageThreshold) || messageThreshold < 5 || messageThreshold > 100) {
                return await interaction.reply({ content: '❌ Message threshold must be between 5 and 100.', ephemeral: true });
            }
            config.MESSAGE_THRESHOLD = messageThreshold;
            updatedValue = messageThreshold;
            description = 'Number of messages to trigger spam detection';
            break;

        case 'message_window':
            const messageWindow = parseInt(value);
            if (isNaN(messageWindow) || messageWindow < 5 || messageWindow > 120) {
                return await interaction.reply({ content: '❌ Message window must be between 5 and 120 seconds.', ephemeral: true });
            }
            config.MESSAGE_WINDOW = messageWindow;
            updatedValue = `${messageWindow} seconds`;
            description = 'Time window for detecting message raids';
            break;

        case 'auto_lockdown':
            const autoLockdown = value.toLowerCase() === 'true' || value === '1' || value.toLowerCase() === 'yes';
            config.AUTO_LOCKDOWN = autoLockdown;
            updatedValue = autoLockdown ? 'Enabled' : 'Disabled';
            description = 'Automatically lock down server when high-score raids are detected';
            break;

        case 'auto_kick':
            const autoKick = value.toLowerCase() === 'true' || value === '1' || value.toLowerCase() === 'yes';
            config.AUTO_KICK_RAIDERS = autoKick;
            updatedValue = autoKick ? 'Enabled' : 'Disabled';
            description = 'Automatically kick suspicious users during raids';
            break;

        default:
            return await interaction.reply({ content: '❌ Unknown setting.', ephemeral: true });
    }

    // Save config
    try {
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        // Update client config
        interaction.client.raidConfig = { ...interaction.client.raidConfig, ...config };
    } catch (error) {
        console.error('Error saving raid protection config:', error);
        return await interaction.reply({ content: '❌ Failed to save configuration.', ephemeral: true });
    }

    const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('⚙️ Configuration Updated')
        .setDescription(`Successfully updated raid protection setting`)
        .addFields(
            { name: '📝 Setting', value: setting.replace('_', ' ').toUpperCase(), inline: true },
            { name: '🔄 New Value', value: updatedValue.toString(), inline: true },
            { name: '📖 Description', value: description, inline: false }
        )
        .setTimestamp()
        .setFooter({ text: `Updated by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });

    await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleLockdown(interaction) {
    const reason = interaction.options.getString('reason') || `Manual lockdown by ${interaction.user.tag}`;

    await activateLockdown(interaction.guild, interaction.client);

    const embed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('🔒 Server Lockdown Activated')
        .setDescription(`Server has been locked down successfully`)
        .addFields(
            { name: '👮 Moderator', value: interaction.user.tag, inline: true },
            { name: '📝 Reason', value: reason, inline: true },
            { name: '⏰ Time', value: new Date().toLocaleString(), inline: true }
        )
        .setTimestamp()
        .setFooter({ text: 'Use /raid unlock to remove lockdown' });

    await interaction.reply({ embeds: [embed] });
}

async function handleUnlock(interaction) {
    const guild = interaction.guild;
    const botMember = guild.members.me;

    if (!botMember || !botMember.permissions.has(PermissionFlagsBits.ManageChannels)) {
        return await interaction.reply({ content: '❌ Bot lacks permissions to unlock channels.', ephemeral: true });
    }

    let unlockedChannels = 0;

    // Remove lockdown from all text channels
    for (const channel of guild.channels.cache.values()) {
        if (channel.isTextBased() && !channel.isThread()) {
            try {
                await channel.permissionOverwrites.edit(guild.id, {
                    SendMessages: null,
                    AddReactions: null,
                    CreatePublicThreads: null,
                    CreatePrivateThreads: null
                });
                unlockedChannels++;
            } catch (error) {
                console.error(`❌ Failed to unlock channel ${channel.name}:`, error.message);
            }
        }
    }

    // Update raid data
    if (raidData.has(guild.id)) {
        raidData.get(guild.id).lockdownActive = false;
    }

    const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('🔓 Server Lockdown Removed')
        .setDescription(`Server lockdown has been successfully removed`)
        .addFields(
            { name: '👮 Moderator', value: interaction.user.tag, inline: true },
            { name: '📊 Channels Unlocked', value: unlockedChannels.toString(), inline: true },
            { name: '⏰ Time', value: new Date().toLocaleString(), inline: true }
        )
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handleWhitelist(interaction) {
    const action = interaction.options.getString('action');
    const user = interaction.options.getUser('user');

    const whitelistPath = path.join(__dirname, '../config/raid_whitelist.json');
    let whitelist = [];

    try {
        if (fs.existsSync(whitelistPath)) {
            whitelist = JSON.parse(fs.readFileSync(whitelistPath, 'utf8'));
        }
    } catch (error) {
        console.error('Error loading whitelist:', error);
    }

    switch (action) {
        case 'add_user':
            if (!user) {
                return await interaction.reply({ content: '❌ Please specify a user to add to the whitelist.', ephemeral: true });
            }
            
            if (whitelist.includes(user.id)) {
                return await interaction.reply({ content: `❌ ${user.tag} is already on the whitelist.`, ephemeral: true });
            }

            whitelist.push(user.id);
            fs.writeFileSync(whitelistPath, JSON.stringify(whitelist, null, 2));
            
            await interaction.reply({ content: `✅ Added ${user.tag} to the raid protection whitelist.`, ephemeral: true });
            break;

        case 'remove_user':
            if (!user) {
                return await interaction.reply({ content: '❌ Please specify a user to remove from the whitelist.', ephemeral: true });
            }

            const index = whitelist.indexOf(user.id);
            if (index === -1) {
                return await interaction.reply({ content: `❌ ${user.tag} is not on the whitelist.`, ephemeral: true });
            }

            whitelist.splice(index, 1);
            fs.writeFileSync(whitelistPath, JSON.stringify(whitelist, null, 2));
            
            await interaction.reply({ content: `✅ Removed ${user.tag} from the raid protection whitelist.`, ephemeral: true });
            break;

        case 'list_users':
            if (whitelist.length === 0) {
                return await interaction.reply({ content: '📝 The raid protection whitelist is empty.', ephemeral: true });
            }

            const userList = [];
            for (const userId of whitelist.slice(0, 10)) { // Limit to 10 users
                try {
                    const whitelistedUser = await interaction.client.users.fetch(userId);
                    userList.push(`• ${whitelistedUser.tag} (${userId})`);
                } catch (error) {
                    userList.push(`• Unknown User (${userId})`);
                }
            }

            const embed = new EmbedBuilder()
                .setColor('#00BFFF')
                .setTitle('📝 Raid Protection Whitelist')
                .setDescription(userList.join('\n'))
                .addFields({
                    name: '📊 Statistics',
                    value: `Total whitelisted users: ${whitelist.length}`,
                    inline: true
                })
                .setTimestamp();

            await interaction.reply({ embeds: [embed], ephemeral: true });
            break;
    }
}

async function handleTest(interaction) {
    const testType = interaction.options.getString('type');
    
    const embed = new EmbedBuilder()
        .setColor('#FFA500')
        .setTitle('🧪 Raid Protection Test')
        .setDescription(`This is a **DEVELOPMENT FEATURE** and should not be used in production servers.`)
        .addFields({ name: '⚠️ Warning', value: 'Testing raid protection may trigger actual alerts and automated responses.', inline: false })
        .setTimestamp();

    switch (testType) {
        case 'join_test':
            embed.addFields({ name: '🔧 Test Type', value: 'Join Simulation - This would simulate rapid member joins', inline: false });
            break;
        case 'message_test':
            embed.addFields({ name: '🔧 Test Type', value: 'Message Simulation - This would simulate coordinated message spam', inline: false });
            break;
    }

    embed.addFields({ name: '🚫 Status', value: 'Test functionality is disabled in this version for safety', inline: false });

    await interaction.reply({ embeds: [embed], ephemeral: true });
}
