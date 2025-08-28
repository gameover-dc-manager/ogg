const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const fs = require('fs');
const path = require('path');

const COUNTING_FILE = path.join(__dirname, '..', 'config', 'counting.json');

function loadCountingData() {
    try {
        if (!fs.existsSync(COUNTING_FILE)) {
            fs.writeFileSync(COUNTING_FILE, JSON.stringify({}, null, 2));
        }
        const data = fs.readFileSync(COUNTING_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error loading counting data:', error);
        return {};
    }
}

function saveCountingData(data) {
    try {
        fs.writeFileSync(COUNTING_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error saving counting data:', error);
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('counting')
        .setDescription('Manage counting game channels')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .addSubcommand(subcommand =>
            subcommand
                .setName('setup')
                .setDescription('Setup a counting channel')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Channel for counting game')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('start')
                        .setDescription('Starting number (default: 1)')
                        .setMinValue(0)
                        .setRequired(false))
                .addBooleanOption(option =>
                    option.setName('delete_wrong')
                        .setDescription('Delete wrong numbers (default: true)')
                        .setRequired(false))
                .addBooleanOption(option =>
                    option.setName('streak_notifications')
                        .setDescription('Send streak milestone notifications (default: true)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('reset')
                .setDescription('Reset counting in a channel')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Channel to reset')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('disable')
                .setDescription('Disable counting in a channel')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Channel to disable counting')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('stats')
                .setDescription('View counting statistics')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Channel to view stats for')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('leaderboard')
                .setDescription('View counting leaderboard')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Channel to view leaderboard for')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(false))),

    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
            return await interaction.reply({
                content: '❌ **Error**: You need the **Manage Channels** permission to use this command.',
                ephemeral: true
            });
        }

        // Defer reply to prevent timeout
        await interaction.deferReply();

        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'setup':
                await handleSetup(interaction);
                break;
            case 'reset':
                await handleReset(interaction);
                break;
            case 'disable':
                await handleDisable(interaction);
                break;
            case 'stats':
                await handleStats(interaction);
                break;
            case 'leaderboard':
                await handleLeaderboard(interaction);
                break;
        }
    }
};

async function handleSetup(interaction) {
    const channel = interaction.options.getChannel('channel');
    const startNumber = interaction.options.getInteger('start') || 1;
    const deleteWrong = interaction.options.getBoolean('delete_wrong') ?? true;
    const streakNotifications = interaction.options.getBoolean('streak_notifications') ?? true;

    const data = loadCountingData();
    if (!data[interaction.guild.id]) {
        data[interaction.guild.id] = {};
    }

    data[interaction.guild.id][channel.id] = {
        enabled: true,
        currentNumber: startNumber,
        lastUser: null,
        highestReached: startNumber,
        totalMessages: 0,
        mistakes: 0,
        contributors: {},
        startedAt: Date.now(),
        lastResetAt: Date.now(),
        deleteWrong: deleteWrong,
        streakNotifications: streakNotifications,
        customReactions: ['🎯', '✅', '👍', '🔢', '⭐'],
        punishments: {},
        streakMilestones: [10, 25, 50, 100, 250, 500, 1000]
    };

    saveCountingData(data);

    const embed = new EmbedBuilder()
        .setTitle('🔢 Counting Game Setup')
        .setDescription(`Counting game has been set up in ${channel}!`)
        .addFields(
            { name: 'Starting Number', value: startNumber.toString(), inline: true },
            { name: 'Delete Wrong Numbers', value: deleteWrong ? '✅ Enabled' : '❌ Disabled', inline: true },
            { name: 'Streak Notifications', value: streakNotifications ? '✅ Enabled' : '❌ Disabled', inline: true },
            { name: 'Rules', value: '• Count in order (1, 2, 3...)\n• One person cannot count twice in a row\n• Wrong numbers reset the count!\n• Reach milestones for special rewards!', inline: false },
            { name: 'Features', value: '• Custom reactions on correct numbers\n• Streak tracking and milestones\n• Leaderboard system\n• Detailed statistics', inline: false }
        )
        .setColor('#00FF00')
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

    // Send initial message to the counting channel
    await channel.send({
        embeds: [new EmbedBuilder()
            .setTitle('🔢 Counting Game Started!')
            .setDescription(`The counting game has begun! Start with **${startNumber}**\n\n**Rules:**\n• Count in order\n• Don't count twice in a row\n• Have fun!`)
            .setColor('#FFD700')]
    });
}

async function handleReset(interaction) {
    const channel = interaction.options.getChannel('channel') || interaction.channel;
    const data = loadCountingData();

    if (!data[interaction.guild.id] || !data[interaction.guild.id][channel.id]) {
        return interaction.editReply({
            content: '❌ No counting game found in this channel.',
            ephemeral: true
        });
    }

    const channelData = data[interaction.guild.id][channel.id];
    const oldHighest = channelData.highestReached;

    channelData.currentNumber = 1;
    channelData.lastUser = null;
    channelData.lastResetAt = Date.now();
    channelData.mistakes++;

    saveCountingData(data);

    const embed = new EmbedBuilder()
        .setTitle('🔄 Counting Reset')
        .setDescription(`The counting game in ${channel} has been reset!`)
        .addFields(
            { name: 'Previous Highest', value: oldHighest.toString(), inline: true },
            { name: 'New Starting Number', value: '1', inline: true },
            { name: 'Total Resets', value: channelData.mistakes.toString(), inline: true }
        )
        .setColor('#FF6600')
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}

async function handleDisable(interaction) {
    const channel = interaction.options.getChannel('channel') || interaction.channel;
    const data = loadCountingData();

    if (!data[interaction.guild.id] || !data[interaction.guild.id][channel.id]) {
        return interaction.editReply({
            content: '❌ No counting game found in this channel.',
            ephemeral: true
        });
    }

    delete data[interaction.guild.id][channel.id];
    saveCountingData(data);

    const embed = new EmbedBuilder()
        .setTitle('❌ Counting Game Disabled')
        .setDescription(`Counting game has been disabled in ${channel}.`)
        .setColor('#FF0000')
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}

async function handleStats(interaction) {
    const channel = interaction.options.getChannel('channel') || interaction.channel;
    const data = loadCountingData();

    if (!data[interaction.guild.id] || !data[interaction.guild.id][channel.id]) {
        return interaction.editReply({
            content: '❌ No counting game found in this channel.',
            ephemeral: true
        });
    }

    const channelData = data[interaction.guild.id][channel.id];
    const daysSinceStart = Math.floor((Date.now() - channelData.startedAt) / (1000 * 60 * 60 * 24));
    const daysSinceReset = Math.floor((Date.now() - channelData.lastResetAt) / (1000 * 60 * 60 * 24));

    const embed = new EmbedBuilder()
        .setTitle(`📊 Counting Stats - ${channel.name}`)
        .addFields(
            { name: '🔢 Current Number', value: channelData.currentNumber.toString(), inline: true },
            { name: '🏆 Highest Reached', value: channelData.highestReached.toString(), inline: true },
            { name: '💬 Total Messages', value: channelData.totalMessages.toString(), inline: true },
            { name: '❌ Mistakes/Resets', value: channelData.mistakes.toString(), inline: true },
            { name: '👥 Contributors', value: Object.keys(channelData.contributors).length.toString(), inline: true },
            { name: '📅 Days Running', value: daysSinceStart.toString(), inline: true },
            { name: '📅 Days Since Reset', value: daysSinceReset.toString(), inline: true }
        )
        .setColor('#0099FF')
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}

async function handleLeaderboard(interaction) {
    const channel = interaction.options.getChannel('channel') || interaction.channel;
    const data = loadCountingData();

    if (!data[interaction.guild.id] || !data[interaction.guild.id][channel.id]) {
        return interaction.editReply({
            content: '❌ No counting game found in this channel.',
            ephemeral: true
        });
    }

    const channelData = data[interaction.guild.id][channel.id];
    const contributors = Object.entries(channelData.contributors)
        .sort(([,a], [,b]) => b.count - a.count)
        .slice(0, 10);

    if (contributors.length === 0) {
        return interaction.editReply({
            content: '📊 No contributors yet! Start counting to appear on the leaderboard.',
            ephemeral: true
        });
    }

    let description = '';
    const medals = ['🥇', '🥈', '🥉'];

    for (let i = 0; i < contributors.length; i++) {
        const [userId, userData] = contributors[i];
        const user = await interaction.client.users.fetch(userId).catch(() => null);
        const username = user ? user.username : 'Unknown User';
        const medal = i < 3 ? medals[i] : `**${i + 1}.**`;

        description += `${medal} **${username}** - ${userData.count} numbers\n`;
    }

    const embed = new EmbedBuilder()
        .setTitle(`🏆 Counting Leaderboard - ${channel.name}`)
        .setDescription(description)
        .setColor('#FFD700')
        .setFooter({ text: `Total contributors: ${Object.keys(channelData.contributors).length}` })
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}

// Export functions for use in message handling
module.exports.loadCountingData = loadCountingData;
module.exports.saveCountingData = saveCountingData;