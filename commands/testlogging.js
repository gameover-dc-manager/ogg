
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('testlogging')
        .setDescription('Test the logging system configuration')
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('Check logging system status'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('initialize')
                .setDescription('Initialize logging configuration for this server'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('test')
                .setDescription('Send a test log message'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        const { hasModerationPermissions } = require('../utils/adminPermissions');
        
        if (!await hasModerationPermissions(interaction.member)) {
            return await interaction.reply({
                content: '❌ You need moderation permissions to use this command.',
                ephemeral: true
            });
        }

        const subcommand = interaction.options.getSubcommand();
        const { getLoggingConfig, initializeGuildLogging, logAction } = require('../utils/loggingSystem');
        const { getModLogChannel } = require('../utils/helpers');

        switch (subcommand) {
            case 'status':
                await handleStatus(interaction);
                break;
            case 'initialize':
                await handleInitialize(interaction);
                break;
            case 'test':
                await handleTest(interaction);
                break;
        }
    }
};

async function handleStatus(interaction) {
    try {
        const { getLoggingConfig } = require('../utils/loggingSystem');
        const { getModLogChannel } = require('../utils/helpers');
        
        const config = getLoggingConfig(interaction.guild.id);
        const logChannel = getModLogChannel(interaction.guild);

        const embed = new EmbedBuilder()
            .setTitle('🔍 Logging System Status')
            .setColor(config.enabled ? '#00FF00' : '#FF0000')
            .addFields(
                { name: '📊 Configuration Status', value: config ? '✅ Loaded' : '❌ Missing', inline: true },
                { name: '🔧 Logging Enabled', value: config?.enabled ? '✅ Yes' : '❌ No', inline: true },
                { name: '📝 Log Channel', value: logChannel ? `✅ ${logChannel.toString()}` : '❌ Not configured', inline: true },
                { name: '📈 Active Features', value: getActiveFeatures(config), inline: false }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
        console.error('Error checking logging status:', error);
        await interaction.reply({ content: '❌ Error checking logging status.', ephemeral: true });
    }
}

async function handleInitialize(interaction) {
    try {
        const { initializeGuildLogging } = require('../utils/loggingSystem');
        
        await interaction.deferReply({ ephemeral: true });
        
        const success = initializeGuildLogging(interaction.guild.id);
        
        const embed = new EmbedBuilder()
            .setTitle('🔧 Logging Initialization')
            .setColor(success ? '#00FF00' : '#FF0000')
            .setDescription(success ? 
                '✅ Logging configuration has been initialized successfully.' : 
                '❌ Failed to initialize logging configuration.')
            .addFields(
                { name: 'Guild', value: interaction.guild.name, inline: true },
                { name: 'Status', value: success ? 'Initialized' : 'Failed', inline: true }
            )
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        console.error('Error initializing logging:', error);
        await interaction.editReply({ content: '❌ Error initializing logging configuration.' });
    }
}

async function handleTest(interaction) {
    try {
        const { logAction } = require('../utils/loggingSystem');
        
        await interaction.deferReply({ ephemeral: true });
        
        const success = await logAction(interaction.guild, 'command_usage', {
            commandName: 'testlogging test',
            user: interaction.user,
            channelId: interaction.channel.id,
            options: null
        }, interaction.user);

        const embed = new EmbedBuilder()
            .setTitle('🧪 Test Log Message')
            .setColor(success ? '#00FF00' : '#FF0000')
            .setDescription(success ? 
                '✅ Test log message sent successfully!' : 
                '❌ Failed to send test log message.')
            .addFields(
                { name: 'Result', value: success ? 'Success' : 'Failed', inline: true },
                { name: 'Timestamp', value: `<t:${Math.floor(Date.now() / 1000)}:f>`, inline: true }
            )
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        console.error('Error testing logging:', error);
        await interaction.editReply({ content: '❌ Error testing logging system.' });
    }
}

function getActiveFeatures(config) {
    if (!config) return 'No configuration found';
    
    const features = [];
    if (config.log_message_edits) features.push('Message Edits');
    if (config.log_message_deletes) features.push('Message Deletes');
    if (config.log_member_joins) features.push('Member Joins');
    if (config.log_member_leaves) features.push('Member Leaves');
    if (config.log_warnings) features.push('Warnings');
    if (config.log_bans) features.push('Bans');
    if (config.log_kicks) features.push('Kicks');
    if (config.log_timeouts) features.push('Timeouts');
    
    return features.length > 0 ? features.slice(0, 8).join(', ') + (features.length > 8 ? '...' : '') : 'None active';
}
