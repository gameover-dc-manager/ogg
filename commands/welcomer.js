
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

const WELCOME_FILE = path.join(__dirname, '..', 'config', 'welcome_config.json');

function loadWelcomeConfig() {
    try {
        if (!fs.existsSync(WELCOME_FILE)) {
            fs.writeFileSync(WELCOME_FILE, JSON.stringify({}, null, 2));
        }
        const data = fs.readFileSync(WELCOME_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error loading welcome config:', error);
        return {};
    }
}

function saveWelcomeConfig(data) {
    try {
        fs.writeFileSync(WELCOME_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error saving welcome config:', error);
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('welcomer')
        .setDescription('Configure welcome and goodbye messages')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(subcommand =>
            subcommand
                .setName('setup')
                .setDescription('Setup welcome messages')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Channel to send welcome messages')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('message')
                        .setDescription('Welcome message (use {user}, {server}, {membercount})')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('title')
                        .setDescription('Welcome embed title')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('color')
                        .setDescription('Embed color (hex code)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('goodbye')
                .setDescription('Setup goodbye messages')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Channel to send goodbye messages')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('message')
                        .setDescription('Goodbye message (use {user}, {server}, {membercount})')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('title')
                        .setDescription('Goodbye embed title')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('color')
                        .setDescription('Embed color (hex code)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('autorole')
                .setDescription('Setup auto role for new members')
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('Role to give new members')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('dm')
                .setDescription('Setup DM welcome messages')
                .addStringOption(option =>
                    option.setName('message')
                        .setDescription('DM message (use {user}, {server})')
                        .setRequired(true))
                .addBooleanOption(option =>
                    option.setName('enabled')
                        .setDescription('Enable/disable DM messages')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('test')
                .setDescription('Test welcome/goodbye messages'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('disable')
                .setDescription('Disable welcome/goodbye system')
                .addStringOption(option =>
                    option.setName('type')
                        .setDescription('What to disable')
                        .addChoices(
                            { name: 'Welcome Messages', value: 'welcome' },
                            { name: 'Goodbye Messages', value: 'goodbye' },
                            { name: 'Auto Role', value: 'autorole' },
                            { name: 'DM Messages', value: 'dm' },
                            { name: 'Everything', value: 'all' }
                        )
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('View current welcome configuration')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'setup':
                await handleSetup(interaction);
                break;
            case 'goodbye':
                await handleGoodbye(interaction);
                break;
            case 'autorole':
                await handleAutoRole(interaction);
                break;
            case 'dm':
                await handleDM(interaction);
                break;
            case 'test':
                await handleTest(interaction);
                break;
            case 'disable':
                await handleDisable(interaction);
                break;
            case 'view':
                await handleView(interaction);
                break;
        }
    }
};

async function handleSetup(interaction) {
    const channel = interaction.options.getChannel('channel');
    const message = interaction.options.getString('message') || 'Welcome to {server}, {user}! You are member #{membercount}!';
    const title = interaction.options.getString('title') || 'Welcome!';
    const color = interaction.options.getString('color') || '#00FF00';

    const config = loadWelcomeConfig();
    if (!config[interaction.guild.id]) {
        config[interaction.guild.id] = {};
    }

    config[interaction.guild.id].welcome = {
        enabled: true,
        channelId: channel.id,
        message: message,
        title: title,
        color: color,
        embedEnabled: true
    };

    saveWelcomeConfig(config);

    const embed = new EmbedBuilder()
        .setTitle('✅ Welcome System Configured')
        .setDescription(`Welcome messages will be sent to ${channel}`)
        .addFields(
            { name: 'Message', value: message, inline: false },
            { name: 'Title', value: title, inline: true },
            { name: 'Color', value: color, inline: true }
        )
        .setColor(color)
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handleGoodbye(interaction) {
    const channel = interaction.options.getChannel('channel');
    const message = interaction.options.getString('message') || 'Goodbye {user}! Thanks for being part of {server}!';
    const title = interaction.options.getString('title') || 'Goodbye!';
    const color = interaction.options.getString('color') || '#FF0000';

    const config = loadWelcomeConfig();
    if (!config[interaction.guild.id]) {
        config[interaction.guild.id] = {};
    }

    config[interaction.guild.id].goodbye = {
        enabled: true,
        channelId: channel.id,
        message: message,
        title: title,
        color: color,
        embedEnabled: true
    };

    saveWelcomeConfig(config);

    const embed = new EmbedBuilder()
        .setTitle('✅ Goodbye System Configured')
        .setDescription(`Goodbye messages will be sent to ${channel}`)
        .addFields(
            { name: 'Message', value: message, inline: false },
            { name: 'Title', value: title, inline: true },
            { name: 'Color', value: color, inline: true }
        )
        .setColor(color)
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handleAutoRole(interaction) {
    const role = interaction.options.getRole('role');

    // Check if bot can assign the role
    if (role.position >= interaction.guild.members.me.roles.highest.position) {
        return interaction.reply({
            content: '❌ I cannot assign this role as it is higher than or equal to my highest role.',
            ephemeral: true
        });
    }

    const config = loadWelcomeConfig();
    if (!config[interaction.guild.id]) {
        config[interaction.guild.id] = {};
    }

    config[interaction.guild.id].autoRole = {
        enabled: true,
        roleId: role.id
    };

    saveWelcomeConfig(config);

    const embed = new EmbedBuilder()
        .setTitle('✅ Auto Role Configured')
        .setDescription(`New members will automatically receive the ${role} role`)
        .setColor('#00FF00')
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handleDM(interaction) {
    const message = interaction.options.getString('message');
    const enabled = interaction.options.getBoolean('enabled');

    const config = loadWelcomeConfig();
    if (!config[interaction.guild.id]) {
        config[interaction.guild.id] = {};
    }

    config[interaction.guild.id].dm = {
        enabled: enabled,
        message: message
    };

    saveWelcomeConfig(config);

    const embed = new EmbedBuilder()
        .setTitle(enabled ? '✅ DM Welcome Enabled' : '❌ DM Welcome Disabled')
        .setDescription(enabled ? `New members will receive: "${message}"` : 'DM welcome messages have been disabled')
        .setColor(enabled ? '#00FF00' : '#FF0000')
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handleTest(interaction) {
    const config = loadWelcomeConfig();
    const guildConfig = config[interaction.guild.id];

    if (!guildConfig || (!guildConfig.welcome && !guildConfig.goodbye)) {
        return interaction.reply({
            content: '❌ No welcome/goodbye system configured. Use `/welcomer setup` first.',
            ephemeral: true
        });
    }

    const member = interaction.member;
    
    // Test welcome message
    if (guildConfig.welcome && guildConfig.welcome.enabled) {
        const welcomeChannel = interaction.guild.channels.cache.get(guildConfig.welcome.channelId);
        if (welcomeChannel) {
            const welcomeMessage = formatMessage(guildConfig.welcome.message, member, interaction.guild);
            const welcomeEmbed = new EmbedBuilder()
                .setTitle(guildConfig.welcome.title)
                .setDescription(welcomeMessage)
                .setColor(guildConfig.welcome.color)
                .setThumbnail(member.user.displayAvatarURL())
                .setFooter({ text: 'This is a test message' })
                .setTimestamp();

            await welcomeChannel.send({ embeds: [welcomeEmbed] });
        }
    }

    // Test goodbye message
    if (guildConfig.goodbye && guildConfig.goodbye.enabled) {
        const goodbyeChannel = interaction.guild.channels.cache.get(guildConfig.goodbye.channelId);
        if (goodbyeChannel) {
            const goodbyeMessage = formatMessage(guildConfig.goodbye.message, member, interaction.guild);
            const goodbyeEmbed = new EmbedBuilder()
                .setTitle(guildConfig.goodbye.title)
                .setDescription(goodbyeMessage)
                .setColor(guildConfig.goodbye.color)
                .setThumbnail(member.user.displayAvatarURL())
                .setFooter({ text: 'This is a test message' })
                .setTimestamp();

            await goodbyeChannel.send({ embeds: [goodbyeEmbed] });
        }
    }

    await interaction.reply({
        content: '✅ Test messages sent! Check the configured channels.',
        ephemeral: true
    });
}

async function handleDisable(interaction) {
    const type = interaction.options.getString('type');
    const config = loadWelcomeConfig();

    if (!config[interaction.guild.id]) {
        return interaction.reply({
            content: '❌ No welcome system configured.',
            ephemeral: true
        });
    }

    switch (type) {
        case 'welcome':
            if (config[interaction.guild.id].welcome) {
                config[interaction.guild.id].welcome.enabled = false;
            }
            break;
        case 'goodbye':
            if (config[interaction.guild.id].goodbye) {
                config[interaction.guild.id].goodbye.enabled = false;
            }
            break;
        case 'autorole':
            if (config[interaction.guild.id].autoRole) {
                config[interaction.guild.id].autoRole.enabled = false;
            }
            break;
        case 'dm':
            if (config[interaction.guild.id].dm) {
                config[interaction.guild.id].dm.enabled = false;
            }
            break;
        case 'all':
            delete config[interaction.guild.id];
            break;
    }

    saveWelcomeConfig(config);

    const embed = new EmbedBuilder()
        .setTitle('✅ Welcome System Updated')
        .setDescription(`${type === 'all' ? 'All welcome features' : type.charAt(0).toUpperCase() + type.slice(1)} disabled`)
        .setColor('#FF0000')
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handleView(interaction) {
    const config = loadWelcomeConfig();
    const guildConfig = config[interaction.guild.id];

    if (!guildConfig) {
        return interaction.reply({
            content: '❌ No welcome system configured. Use `/welcomer setup` to get started.',
            ephemeral: true
        });
    }

    const embed = new EmbedBuilder()
        .setTitle('⚙️ Welcome Configuration')
        .setColor('#0099FF')
        .setTimestamp();

    let description = '';

    if (guildConfig.welcome) {
        const welcomeChannel = interaction.guild.channels.cache.get(guildConfig.welcome.channelId);
        description += `🎉 **Welcome Messages:** ${guildConfig.welcome.enabled ? '✅ Enabled' : '❌ Disabled'}\n`;
        description += `📍 **Channel:** ${welcomeChannel || 'Channel not found'}\n`;
        description += `💬 **Message:** ${guildConfig.welcome.message}\n\n`;
    }

    if (guildConfig.goodbye) {
        const goodbyeChannel = interaction.guild.channels.cache.get(guildConfig.goodbye.channelId);
        description += `👋 **Goodbye Messages:** ${guildConfig.goodbye.enabled ? '✅ Enabled' : '❌ Disabled'}\n`;
        description += `📍 **Channel:** ${goodbyeChannel || 'Channel not found'}\n`;
        description += `💬 **Message:** ${guildConfig.goodbye.message}\n\n`;
    }

    if (guildConfig.autoRole) {
        const autoRole = interaction.guild.roles.cache.get(guildConfig.autoRole.roleId);
        description += `🎭 **Auto Role:** ${guildConfig.autoRole.enabled ? '✅ Enabled' : '❌ Disabled'}\n`;
        description += `📍 **Role:** ${autoRole || 'Role not found'}\n\n`;
    }

    if (guildConfig.dm) {
        description += `📨 **DM Messages:** ${guildConfig.dm.enabled ? '✅ Enabled' : '❌ Disabled'}\n`;
        if (guildConfig.dm.enabled) {
            description += `💬 **Message:** ${guildConfig.dm.message}\n\n`;
        }
    }

    embed.setDescription(description || 'No features configured');

    await interaction.reply({ embeds: [embed] });
}

function formatMessage(message, member, guild) {
    return message
        .replace(/{user}/g, `<@${member.id}>`)
        .replace(/{username}/g, member.user.username)
        .replace(/{server}/g, guild.name)
        .replace(/{membercount}/g, guild.memberCount.toString());
}

// Export functions for use in member events
module.exports.loadWelcomeConfig = loadWelcomeConfig;
module.exports.formatMessage = formatMessage;
