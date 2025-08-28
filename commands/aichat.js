const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const fs = require('fs');
const path = require('path');

// AI Chat configuration file path
const AI_CHAT_CONFIG_PATH = path.join(__dirname, '../config/ai_chat_config.json');

// Load AI chat configuration
function loadAIChatConfig() {
    try {
        if (fs.existsSync(AI_CHAT_CONFIG_PATH)) {
            return JSON.parse(fs.readFileSync(AI_CHAT_CONFIG_PATH, 'utf8'));
        }
    } catch (error) {
        console.error('❌ Error loading AI chat config:', error);
    }
    return {};
}

// Save AI chat configuration
function saveAIChatConfig(config) {
    try {
        fs.writeFileSync(AI_CHAT_CONFIG_PATH, JSON.stringify(config, null, 2));
        return true;
    } catch (error) {
        console.error('❌ Error saving AI chat config:', error);
        return false;
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('aichat')
        .setDescription('Manage AI chat system')
        .addSubcommand(subcommand =>
            subcommand
                .setName('start')
                .setDescription('Enable AI chat in current or specified channel')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Channel to enable AI chat (defaults to current channel)')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('stop')
                .setDescription('Disable AI chat in current or specified channel')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Channel to disable AI chat (defaults to current channel)')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('setchannel')
                .setDescription('Set dedicated AI chat channel')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Channel for AI chat')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('personality')
                .setDescription('Configure AI personality')
                .addStringOption(option =>
                    option.setName('name')
                        .setDescription('AI name')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('traits')
                        .setDescription('AI personality traits (comma separated)')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('interests')
                        .setDescription('AI interests (comma separated)')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('style')
                        .setDescription('Response style')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('settings')
                .setDescription('Configure AI chat settings')
                .addNumberOption(option =>
                    option.setName('response_chance')
                        .setDescription('Random response chance (0-100%)')
                        .setMinValue(0)
                        .setMaxValue(100)
                        .setRequired(false))
                .addNumberOption(option =>
                    option.setName('cooldown')
                        .setDescription('Cooldown between responses in seconds')
                        .setMinValue(1)
                        .setMaxValue(60)
                        .setRequired(false))
                .addBooleanOption(option =>
                    option.setName('mention_required')
                        .setDescription('Require mention to respond')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('View AI chat status and configuration'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'start':
                await handleStart(interaction);
                break;
            case 'stop':
                await handleStop(interaction);
                break;
            case 'setchannel':
                await handleSetChannel(interaction);
                break;
            case 'personality':
                await handlePersonality(interaction);
                break;
            case 'settings':
                await handleSettings(interaction);
                break;
            case 'status':
                await handleStatus(interaction);
                break;
        }
    },
};

async function handleStart(interaction) {
    const channel = interaction.options.getChannel('channel') || interaction.channel;
    const guildId = interaction.guild.id;

    const config = loadAIChatConfig();
    if (!config[guildId]) {
        config[guildId] = {
            enabled: false,
            channels: [],
            dedicatedChannel: null,
            settings: {
                responseChance: 5,
                cooldown: 3,
                mentionRequired: false
            }
        };
    }

    if (!config[guildId].channels.includes(channel.id)) {
        config[guildId].channels.push(channel.id);
    }
    config[guildId].enabled = true;

    if (saveAIChatConfig(config)) {
        // Update the AI personality instance
        if (interaction.client.aiPersonality) {
            interaction.client.aiPersonality.updateConfig(guildId, config[guildId]);
        }

        const embed = new EmbedBuilder()
            .setTitle('🤖 AI Chat Enabled')
            .setDescription(`AI chat has been enabled in ${channel}`)
            .addFields(
                { name: '📍 Channel', value: channel.toString(), inline: true },
                { name: '🎲 Response Chance', value: `${config[guildId].settings.responseChance}%`, inline: true },
                { name: '⏱️ Cooldown', value: `${config[guildId].settings.cooldown}s`, inline: true }
            )
            .setColor('#00FF00')
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });

        // Send a welcome message to the channel
        await channel.send('🤖 AI chat is now active in this channel! Feel free to chat with me naturally.');
    } else {
        await interaction.reply({ content: '❌ Failed to save AI chat configuration.', flags: 64 });
    }
}

async function handleStop(interaction) {
    const channel = interaction.options.getChannel('channel') || interaction.channel;
    const guildId = interaction.guild.id;

    const config = loadAIChatConfig();
    if (!config[guildId]) {
        return await interaction.reply({ content: '❌ AI chat is not configured for this server.', flags: 64 });
    }

    config[guildId].channels = config[guildId].channels.filter(id => id !== channel.id);

    if (config[guildId].channels.length === 0) {
        config[guildId].enabled = false;
    }

    if (saveAIChatConfig(config)) {
        const embed = new EmbedBuilder()
            .setTitle('🔇 AI Chat Disabled')
            .setDescription(`AI chat has been disabled in ${channel}`)
            .addFields(
                { name: '📍 Channel', value: channel.toString(), inline: true },
                { name: '📊 Active Channels', value: config[guildId].channels.length.toString(), inline: true }
            )
            .setColor('#FF0000')
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    } else {
        await interaction.reply({ content: '❌ Failed to save AI chat configuration.', flags: 64 });
    }
}

async function handleSetChannel(interaction) {
    const channel = interaction.options.getChannel('channel');
    const guildId = interaction.guild.id;

    const config = loadAIChatConfig();
    if (!config[guildId]) {
        config[guildId] = {
            enabled: true,
            channels: [],
            dedicatedChannel: null,
            settings: {
                responseChance: 15, // Higher chance in dedicated channel
                cooldown: 2,
                mentionRequired: false
            }
        };
    }

    config[guildId].dedicatedChannel = channel.id;
    if (!config[guildId].channels.includes(channel.id)) {
        config[guildId].channels.push(channel.id);
    }
    config[guildId].enabled = true;

    if (saveAIChatConfig(config)) {
        const embed = new EmbedBuilder()
            .setTitle('🎯 Dedicated AI Chat Channel Set')
            .setDescription(`${channel} is now the dedicated AI chat channel`)
            .addFields(
                { name: '📍 Channel', value: channel.toString(), inline: true },
                { name: '🎲 Response Chance', value: '15% (Enhanced)', inline: true },
                { name: '⏱️ Cooldown', value: '2s (Reduced)', inline: true }
            )
            .setColor('#FFD700')
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });

        // Send setup message to dedicated channel
        const setupEmbed = new EmbedBuilder()
            .setTitle('🤖 Welcome to AI Chat!')
            .setDescription('This channel is now dedicated for AI conversations. I\'ll be more active here!')
            .addFields(
                { name: '💬 How to Chat', value: 'Just type naturally! I respond to questions, greetings, and random messages.', inline: false },
                { name: '🎯 Enhanced Features', value: '• Higher response rate\n• Faster cooldown\n• Natural conversation flow', inline: false },
                { name: '🔧 Commands', value: 'Use `/aichat personality` to customize my personality!', inline: false }
            )
            .setColor('#00BFFF')
            .setTimestamp();

        await channel.send({ embeds: [setupEmbed] });
    } else {
        await interaction.reply({ content: '❌ Failed to save AI chat configuration.', flags: 64 });
    }
}

async function handlePersonality(interaction) {
    const guildId = interaction.guild.id;
    const name = interaction.options.getString('name');
    const traits = interaction.options.getString('traits');
    const interests = interaction.options.getString('interests');
    const style = interaction.options.getString('style');

    const config = loadAIChatConfig();
    if (!config[guildId]) {
        config[guildId] = {
            enabled: false,
            channels: [],
            dedicatedChannel: null,
            settings: {
                responseChance: 5,
                cooldown: 3,
                mentionRequired: false
            }
        };
    }

    if (!config[guildId].personality) {
        config[guildId].personality = {
            name: "Manager",
            traits: ["friendly and helpful", "slightly sarcastic but caring", "knowledgeable about Discord and gaming"],
            interests: ["gaming", "technology", "Discord moderation", "helping users"],
            responseStyle: "casual but informative"
        };
    }

    let updated = false;
    if (name) {
        config[guildId].personality.name = name;
        updated = true;
    }
    if (traits) {
        config[guildId].personality.traits = traits.split(',').map(t => t.trim());
        updated = true;
    }
    if (interests) {
        config[guildId].personality.interests = interests.split(',').map(i => i.trim());
        updated = true;
    }
    if (style) {
        config[guildId].personality.responseStyle = style;
        updated = true;
    }

    if (updated && saveAIChatConfig(config)) {
        // Update the AI personality instance
        if (interaction.client.aiPersonality) {
            interaction.client.aiPersonality.updatePersonality(guildId, config[guildId].personality);
        }

        const embed = new EmbedBuilder()
            .setTitle('🤖 AI Personality Updated')
            .setDescription('AI personality configuration has been updated successfully!')
            .addFields(
                { name: 'Name', value: config[guildId].personality.name, inline: true },
                { name: 'Style', value: config[guildId].personality.responseStyle, inline: true },
                { name: 'Traits', value: config[guildId].personality.traits.join(', '), inline: false },
                { name: 'Interests', value: config[guildId].personality.interests.join(', '), inline: false }
            )
            .setColor('#00ff00')
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    } else if (!updated) {
        const embed = new EmbedBuilder()
            .setTitle('🎭 Current AI Personality')
            .addFields(
                { name: '🏷️ Name', value: config[guildId].personality.name, inline: true },
                { name: '🎨 Style', value: config[guildId].personality.responseStyle, inline: true },
                { name: '✨ Traits', value: config[guildId].personality.traits.join(', '), inline: false },
                { name: '💡 Interests', value: config[guildId].personality.interests.join(', '), inline: false }
            )
            .setColor('#9932CC')
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    } else {
        await interaction.reply({ content: '❌ Failed to save personality configuration.', flags: 64 });
    }
}

async function handleSettings(interaction) {
    const guildId = interaction.guild.id;
    const responseChance = interaction.options.getNumber('response_chance');
    const cooldown = interaction.options.getNumber('cooldown');
    const mentionRequired = interaction.options.getBoolean('mention_required');

    const config = loadAIChatConfig();
    if (!config[guildId]) {
        return await interaction.reply({ content: '❌ AI chat is not configured for this server. Use `/aichat start` first.', flags: 64 });
    }

    let updated = false;
    if (responseChance !== null) {
        config[guildId].settings.responseChance = responseChance;
        updated = true;
    }
    if (cooldown !== null) {
        config[guildId].settings.cooldown = cooldown;
        updated = true;
    }
    if (mentionRequired !== null) {
        config[guildId].settings.mentionRequired = mentionRequired;
        updated = true;
    }

    if (updated && saveAIChatConfig(config)) {
        const embed = new EmbedBuilder()
            .setTitle('⚙️ AI Chat Settings Updated')
            .setDescription('AI chat settings have been successfully updated!')
            .addFields(
                { name: '🎲 Response Chance', value: `${config[guildId].settings.responseChance}%`, inline: true },
                { name: '⏱️ Cooldown', value: `${config[guildId].settings.cooldown}s`, inline: true },
                { name: '📢 Mention Required', value: config[guildId].settings.mentionRequired ? 'Yes' : 'No', inline: true }
            )
            .setColor('#00BFFF')
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    } else if (!updated) {
        const embed = new EmbedBuilder()
            .setTitle('⚙️ Current AI Chat Settings')
            .addFields(
                { name: '🎲 Response Chance', value: `${config[guildId].settings.responseChance}%`, inline: true },
                { name: '⏱️ Cooldown', value: `${config[guildId].settings.cooldown}s`, inline: true },
                { name: '📢 Mention Required', value: config[guildId].settings.mentionRequired ? 'Yes' : 'No', inline: true }
            )
            .setColor('#00BFFF')
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    } else {
        await interaction.reply({ content: '❌ Failed to save settings configuration.', flags: 64 });
    }
}

async function handleStatus(interaction) {
    const guildId = interaction.guild.id;
    const config = loadAIChatConfig();

    if (!config[guildId]) {
        const embed = new EmbedBuilder()
            .setTitle('🤖 AI Chat Status')
            .setDescription('❌ AI chat is not configured for this server.')
            .addFields(
                { name: '🚀 Getting Started', value: 'Use `/aichat start` to enable AI chat in a channel', inline: false }
            )
            .setColor('#FF0000')
            .setTimestamp();

        return await interaction.reply({ embeds: [embed] });
    }

    const guildConfig = config[guildId];
    const channels = guildConfig.channels.map(id => `<#${id}>`).join(', ') || 'None';
    const dedicatedChannel = guildConfig.dedicatedChannel ? `<#${guildConfig.dedicatedChannel}>` : 'None';

    const embed = new EmbedBuilder()
        .setTitle('🤖 AI Chat Status')
        .setDescription(`AI chat is ${guildConfig.enabled ? '✅ **Enabled**' : '❌ **Disabled**'}`)
        .addFields(
            { name: '📍 Active Channels', value: channels, inline: false },
            { name: '🎯 Dedicated Channel', value: dedicatedChannel, inline: true },
            { name: '📊 Total Channels', value: guildConfig.channels.length.toString(), inline: true },
            { name: '🎲 Response Chance', value: `${guildConfig.settings.responseChance}%`, inline: true },
            { name: '⏱️ Cooldown', value: `${guildConfig.settings.cooldown}s`, inline: true },
            { name: '📢 Mention Required', value: guildConfig.settings.mentionRequired ? 'Yes' : 'No', inline: true }
        )
        .setColor(guildConfig.enabled ? '#00FF00' : '#FF0000')
        .setTimestamp();

    if (guildConfig.personality) {
        embed.addFields(
            { name: '🎭 AI Name', value: guildConfig.personality.name, inline: true },
            { name: '🎨 Response Style', value: guildConfig.personality.responseStyle, inline: true }
        );
    }

    await interaction.reply({ embeds: [embed] });
}