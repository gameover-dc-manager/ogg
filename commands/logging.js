
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getLoggingConfig, updateLoggingConfig } = require('../utils/loggingSystem');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('logging')
        .setDescription('Manage server logging settings')
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('View current logging configuration')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('toggle')
                .setDescription('Toggle specific logging features')
                .addStringOption(option =>
                    option
                        .setName('feature')
                        .setDescription('The logging feature to toggle')
                        .setRequired(true)
                        .addChoices(
                            { name: 'All Logging', value: 'enabled' },
                            { name: 'Bot Messages', value: 'log_bot_messages' },
                            { name: 'Message Edits', value: 'log_message_edits' },
                            { name: 'Message Deletes', value: 'log_message_deletes' },
                            { name: 'Member Joins', value: 'log_member_joins' },
                            { name: 'Member Leaves', value: 'log_member_leaves' },
                            { name: 'Warnings', value: 'log_warnings' },
                            { name: 'Bans', value: 'log_bans' },
                            { name: 'Kicks', value: 'log_kicks' },
                            { name: 'Timeouts', value: 'log_timeouts' },
                            { name: 'Role Changes', value: 'log_role_changes' },
                            { name: 'Channel Changes', value: 'log_channel_changes' },
                            { name: 'Admin Actions', value: 'log_admin_actions' },
                            { name: 'Auto-Mod Actions', value: 'log_automod_actions' },
                            { name: 'Voice Events', value: 'log_voice_events' },
                            { name: 'Command Usage', value: 'log_command_usage' },
                            { name: 'Ignore Admin Actions', value: 'ignore_admin_actions' },
                            { name: 'Ignore Owner Actions', value: 'ignore_owner_actions' }
                        )
                )
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        const { hasAdminPermissions } = require('../utils/adminPermissions');

        // Check if user has admin permissions
        if (!await hasAdminPermissions(interaction.member)) {
            return await interaction.reply({
                content: '❌ You need admin permissions to manage logging settings. Contact a server administrator to get the required role.',
                ephemeral: true
            });
        }

        const subcommand = interaction.options.getSubcommand();

        try {
            await interaction.deferReply({ ephemeral: true });

            if (subcommand === 'status') {
                await handleStatus(interaction);
            } else if (subcommand === 'toggle') {
                await handleToggle(interaction);
            }
        } catch (error) {
            console.error('❌ Error in logging command:', error);
            const content = '❌ An error occurred while managing logging settings.';
            
            if (interaction.deferred) {
                await interaction.editReply({ content });
            } else {
                await interaction.reply({ content, ephemeral: true });
            }
        }
    }
};

async function handleStatus(interaction) {
    try {
        const config = getLoggingConfig(interaction.guild.id);

        const embed = new EmbedBuilder()
            .setTitle('📋 Logging Configuration')
            .setDescription(`Current logging settings for **${interaction.guild.name}**`)
            .addFields(
                { 
                    name: '🔧 General', 
                    value: `Enabled: ${config.enabled ? '✅' : '❌'}\nBot Messages: ${config.log_bot_messages ? '✅' : '❌'}`, 
                    inline: true 
                },
                { 
                    name: '💬 Messages', 
                    value: `Edits: ${config.log_message_edits ? '✅' : '❌'}\nDeletes: ${config.log_message_deletes ? '✅' : '❌'}`, 
                    inline: true 
                },
                { 
                    name: '👥 Members', 
                    value: `Joins: ${config.log_member_joins ? '✅' : '❌'}\nLeaves: ${config.log_member_leaves ? '✅' : '❌'}`, 
                    inline: true 
                },
                { 
                    name: '⚖️ Moderation', 
                    value: `Warnings: ${config.log_warnings ? '✅' : '❌'}\nBans: ${config.log_bans ? '✅' : '❌'}\nKicks: ${config.log_kicks ? '✅' : '❌'}\nTimeouts: ${config.log_timeouts ? '✅' : '❌'}`, 
                    inline: true 
                },
                { 
                    name: '🎭 Server', 
                    value: `Roles: ${config.log_role_changes ? '✅' : '❌'}\nChannels: ${config.log_channel_changes ? '✅' : '❌'}`, 
                    inline: true 
                },
                { 
                    name: '👑 Special', 
                    value: `Admin Actions: ${config.log_admin_actions ? '✅' : '❌'}\nAuto-Mod: ${config.log_automod_actions ? '✅' : '❌'}`, 
                    inline: true 
                },
                { 
                    name: '🔊 Activity', 
                    value: `Voice: ${config.log_voice_events ? '✅' : '❌'}\nCommands: ${config.log_command_usage ? '✅' : '❌'}`, 
                    inline: true 
                },
                { 
                    name: '🚫 Ignore Settings', 
                    value: `Admins: ${config.ignore_admin_actions ? '✅' : '❌'}\nOwner: ${config.ignore_owner_actions ? '✅' : '❌'}`, 
                    inline: true 
                }
            )
            .setColor('#0099FF')
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        console.error('❌ Error in handleStatus:', error);
        await interaction.editReply({ content: '❌ Failed to retrieve logging status.' });
    }
}

async function handleToggle(interaction) {
    try {
        const feature = interaction.options.getString('feature');
        const config = getLoggingConfig(interaction.guild.id);

        const currentValue = config[feature];
        const newValue = !currentValue;

        const success = updateLoggingConfig(interaction.guild.id, { [feature]: newValue });

        if (success) {
            const featureName = feature.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

            const embed = new EmbedBuilder()
                .setTitle('✅ Logging Updated')
                .setDescription(`**${featureName}** has been ${newValue ? 'enabled' : 'disabled'}.`)
                .setColor(newValue ? '#00FF00' : '#FF0000')
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

            console.log(`📝 Logging setting ${feature} ${newValue ? 'enabled' : 'disabled'} for ${interaction.guild.name}`);
        } else {
            await interaction.editReply({
                content: '❌ Failed to update logging configuration. Please try again.'
            });
        }
    } catch (error) {
        console.error('❌ Error in handleToggle:', error);
        await interaction.editReply({ content: '❌ Failed to toggle logging setting.' });
    }
}
