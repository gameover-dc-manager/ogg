const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getModLogChannel } = require('../utils/helpers');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('moderation')
        .setDescription('Moderation commands')
        .addSubcommand(subcommand =>
            subcommand
                .setName('purge')
                .setDescription('Delete multiple messages')
                .addIntegerOption(option =>
                    option.setName('limit')
                        .setDescription('Number of messages to delete (1-100)')
                        .setRequired(false)
                        .setMinValue(1)
                        .setMaxValue(100))
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Channel to purge messages from')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('warn')
                .setDescription('Issue an enhanced warning to a user')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to warn')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('Detailed reason for the warning')
                        .setRequired(true)
                        .setMaxLength(500))
                .addStringOption(option =>
                    option.setName('severity')
                        .setDescription('Warning severity level (auto-detected if not specified)')
                        .setRequired(false)
                        .addChoices(
                            { name: '⚠️ Minor - Low-level infraction', value: 'minor' },
                            { name: '🚨 Moderate - Notable violation', value: 'moderate' },
                            { name: '🔴 Severe - Serious breach', value: 'severe' }
                        ))
                .addStringOption(option =>
                    option.setName('punishment')
                        .setDescription('Immediate punishment to apply (optional)')
                        .setRequired(false)
                        .addChoices(
                            { name: '⏰ Timeout (10 minutes)', value: 'timeout_10m' },
                            { name: '⏰ Timeout (1 hour)', value: 'timeout_1h' },
                            { name: '⏰ Timeout (6 hours)', value: 'timeout_6h' },
                            { name: '⏰ Timeout (24 hours)', value: 'timeout_24h' },
                            { name: '👢 Kick from server', value: 'kick' },
                            { name: '🔇 Mute for 30 minutes', value: 'mute_30m' },
                            { name: '🔇 Mute for 2 hours', value: 'mute_2h' },
                            { name: '🚫 Remove specific role', value: 'remove_role' }
                        ))
                .addIntegerOption(option =>
                    option.setName('expires')
                        .setDescription('Warning expires after X days (0 = permanent)')
                        .setRequired(false)
                        .setMinValue(0)
                        .setMaxValue(365))
                .addBooleanOption(option =>
                    option.setName('silent')
                        .setDescription('Skip sending DM to user (default: false)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('warnconfig')
                .setDescription('Configure warning system settings')
                .addStringOption(option =>
                    option.setName('action')
                        .setDescription('Configuration action')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Set Warning Thresholds', value: 'thresholds' },
                            { name: 'Auto-Punishment Settings', value: 'autopunish' },
                            { name: 'View Current Config', value: 'view' },
                            { name: 'Reset to Defaults', value: 'reset' }
                        ))
                .addIntegerOption(option =>
                    option.setName('timeout_threshold')
                        .setDescription('Number of warnings before auto-timeout')
                        .setRequired(false)
                        .setMinValue(1)
                        .setMaxValue(20))
                .addIntegerOption(option =>
                    option.setName('kick_threshold')
                        .setDescription('Number of warnings before auto-kick')
                        .setRequired(false)
                        .setMinValue(1)
                        .setMaxValue(20))
                .addIntegerOption(option =>
                    option.setName('ban_threshold')
                        .setDescription('Number of warnings before auto-ban')
                        .setRequired(false)
                        .setMinValue(1)
                        .setMaxValue(20)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('kick')
                .setDescription('Kick a user')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to kick')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('Reason for kick')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('ban')
                .setDescription('Ban a user')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to ban')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('Reason for ban')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('timeout')
                .setDescription('Timeout a user')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to timeout')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('duration')
                        .setDescription('Duration in minutes')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(40320))
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('Reason for timeout')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('warnings')
                .setDescription('View warnings for a user')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to view warnings for')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('clearwarnings')
                .setDescription('Clear warnings for a user')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to clear warnings for')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('setlogchannel')
                .setDescription('Set the moderation log channel')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Channel for moderation logs')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('lockdown')
                .setDescription('Lock down a channel or the entire server')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Channel to lock (leave empty for server-wide)')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('Reason for lockdown')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('unlock')
                .setDescription('Unlock a channel or the entire server')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Channel to unlock (leave empty for server-wide)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('slowmode')
                .setDescription('Set slowmode for a channel')
                .addIntegerOption(option =>
                    option.setName('seconds')
                        .setDescription('Slowmode duration in seconds (0 to disable)')
                        .setRequired(true)
                        .setMinValue(0)
                        .setMaxValue(21600))
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Channel to apply slowmode to')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('massban')
                .setDescription('Ban multiple users by ID')
                .addStringOption(option =>
                    option.setName('userids')
                        .setDescription('User IDs separated by spaces or commas')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('Reason for mass ban')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('nickname')
                .setDescription('Change a user\'s nickname')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to change nickname for')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('nickname')
                        .setDescription('New nickname (leave empty to reset)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('unban')
                .setDescription('Unban a user from the server')
                .addStringOption(option =>
                    option.setName('userid')
                        .setDescription('User ID to unban')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('Reason for unban')
                        .setRequired(false)))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction) {
        const { hasModerationPermissions } = require('../utils/adminPermissions');

        // Check if user has moderation permissions
        if (!await hasModerationPermissions(interaction.member)) {
            return await interaction.reply({
                content: '❌ You need moderation permissions to use this command. You need either admin role or specific moderation permissions (Manage Messages, Moderate Members, Kick Members, or Ban Members).',
                ephemeral: true
            });
        }

        const subcommand = interaction.options.getSubcommand();
        const { logAction } = require('../utils/loggingSystem');

        switch (subcommand) {
            case 'purge':
                await handlePurge(interaction);
                break;
            case 'warn':
                await handleWarn(interaction);
                break;
            case 'kick':
                await handleKick(interaction);
                break;
            case 'ban':
                await handleBan(interaction);
                break;
            case 'timeout':
                await handleTimeout(interaction);
                break;
            case 'warnings':
                await handleWarnings(interaction);
                break;
            case 'clearwarnings':
                await handleClearWarnings(interaction);
                break;
            case 'setlogchannel':
                await handleSetLogChannel(interaction);
                break;
            case 'lockdown':
                await handleLockdown(interaction);
                break;
            case 'unlock':
                await handleUnlock(interaction);
                break;
            case 'slowmode':
                await handleSlowmode(interaction);
                break;
            case 'massban':
                await handleMassban(interaction);
                break;
            case 'nickname':
                await handleNickname(interaction);
                break;
            case 'unban':
                await handleUnban(interaction);
                break;
            case 'warnconfig':
                await handleWarnConfig(interaction);
                break;
        }
    }
};

async function handlePurge(interaction) {
    const limit = interaction.options.getInteger('limit') || 10;
    const channel = interaction.options.getChannel('channel') || interaction.channel;

    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
        return interaction.reply({ content: 'You need the Manage Messages permission to use this command.', ephemeral: true });
    }

    try {
        // Defer reply to prevent timeout
        await interaction.deferReply({ ephemeral: true });

        const messages = await channel.messages.fetch({ limit: limit + 1 });
        const deletableMessages = messages.filter(msg => Date.now() - msg.createdTimestamp < 1209600000); // 14 days

        if (deletableMessages.size === 0) {
            return interaction.editReply({ content: 'No deletable messages found (messages must be less than 14 days old).' });
        }

        await channel.bulkDelete(deletableMessages);
        const actualDeleted = Math.min(deletableMessages.size, limit);

        const embed = new EmbedBuilder()
            .setTitle('🗑️ Messages Purged')
            .setDescription(`Successfully deleted ${actualDeleted} messages from ${channel}.`)
            .addFields(
                { name: 'Channel', value: channel.toString(), inline: true },
                { name: 'Moderator', value: interaction.user.toString(), inline: true },
                { name: 'Messages Deleted', value: actualDeleted.toString(), inline: true }
            )
            .setColor('#00FF00')
            .setTimestamp();

        const actionRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('view_log')
                    .setLabel('View Mod Log')
                    .setStyle(ButtonStyle.Primary),
            );

        await interaction.editReply({ embeds: [embed], components: [actionRow] });

        // Enhanced logging using the logging system
        const { logAction } = require('../utils/loggingSystem');
        await logAction(interaction.guild, 'purge', {
            channel: channel,
            moderator: interaction.user,
            messageCount: actualDeleted,
            originalLimit: limit
        }, interaction.user);

    } catch (error) {
        console.error('Error purging messages:', error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: 'An error occurred while purging messages.', ephemeral: true });
        } else {
            await interaction.editReply({ content: 'An error occurred while purging messages.' });
        }
    }
}

async function handleWarn(interaction) {
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const customSeverity = interaction.options.getString('severity');
    const customPunishment = interaction.options.getString('punishment');
    const expiresInDays = interaction.options.getInteger('expires') || 0;
    const silent = interaction.options.getBoolean('silent') || false;

    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
        return interaction.reply({ content: '❌ You need the Manage Messages permission to use this command.', flags: 64 });
    }

    // Check if user can be warned
    const targetMember = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!targetMember) {
        return interaction.reply({ content: '❌ User not found in this server.', flags: 64 });
    }

    if (targetMember.permissions.has(PermissionFlagsBits.ManageMessages)) {
        return interaction.reply({ content: '❌ You cannot warn a user with moderation permissions.', flags: 64 });
    }

    // Check if target user is bot owner or higher role
    if (targetMember.roles.highest.position >= interaction.member.roles.highest.position) {
        return interaction.reply({ content: '❌ You cannot warn a user with equal or higher role position.', flags: 64 });
    }

    try {
        await interaction.deferReply();

        const { addWarning, processAutoEscalation, getUserWarnings } = require('../components/warningSystem');

        // Check existing warnings before adding new one
        const existingWarnings = await getUserWarnings(interaction.guild.id, user.id);
        const activeWarnings = existingWarnings.filter(w => !w.expired && !w.removed);

        // Determine severity based on custom input or warning history
        let severity = customSeverity || 'minor';
        if (!customSeverity) {
            // Auto-detect severity based on history
            if (activeWarnings.length >= 4) {
                severity = 'severe';
            } else if (activeWarnings.length >= 2) {
                severity = 'moderate';
            }
        }

        // Add the warning with dynamic severity and expiration
        const warning = await addWarning(
            interaction.guild.id,
            user.id,
            reason,
            interaction.user.id,
            severity,
            expiresInDays,
            interaction.client
        );

        if (!warning) {
            return await interaction.editReply({ content: '❌ Failed to add warning. This may be a duplicate or system error.' });
        }

        // Get updated warning count
        const updatedWarnings = await getUserWarnings(interaction.guild.id, user.id);
        const updatedActiveWarnings = updatedWarnings.filter(w => !w.expired && !w.removed);

        // Calculate risk level
        const riskLevel = updatedActiveWarnings.length >= 5 ? 'Critical' :
                         updatedActiveWarnings.length >= 3 ? 'High' :
                         updatedActiveWarnings.length >= 2 ? 'Medium' : 'Low';

        const riskColors = {
            'Critical': '#8B0000',
            'High': '#FF4444',
            'Medium': '#FFA500',
            'Low': '#90EE90'
        };

        const severityEmojis = {
            'minor': '⚠️',
            'moderate': '🚨',
            'severe': '🔴'
        };

        const embed = new EmbedBuilder()
            .setTitle(`${severityEmojis[severity]} Enhanced Warning Issued`)
            .setDescription(`**${user.tag}** has been warned with enhanced tracking.`)
            .addFields(
                { name: '👤 Target User', value: `${user.toString()}\n\`${user.id}\``, inline: true },
                { name: '🛡️ Moderator', value: `${interaction.user.toString()}\n\`${interaction.user.id}\``, inline: true },
                { name: '📊 Warning Statistics', value: `**Current:** ${updatedActiveWarnings.length} active\n**Risk Level:** ${riskLevel}\n**Total Ever:** ${updatedWarnings.length}`, inline: true },
                { name: '📝 Warning Details', value: `**Reason:** ${reason}\n**Severity:** ${severity.charAt(0).toUpperCase() + severity.slice(1)}\n**ID:** \`${warning.id}\`\n**Expires:** ${expiresInDays > 0 ? `<t:${Math.floor((warning.timestamp + expiresInDays * 24 * 60 * 60 * 1000) / 1000)}:R>` : 'Never'}`, inline: false },
                { name: '📅 Timestamp', value: `<t:${Math.floor(warning.timestamp / 1000)}:F>\n<t:${Math.floor(warning.timestamp / 1000)}:R>`, inline: true },
                { name: '⚖️ Auto-Actions', value: `**Threshold Monitoring:** ${updatedActiveWarnings.length >= 3 ? '🔴 Active' : '🟢 Normal'}\n**Next Action:** ${getNextEscalationAction(updatedActiveWarnings.length)}`, inline: true }
            )
            .setColor(riskColors[riskLevel])
            .setTimestamp()
            .setFooter({
                text: `Warning ${warning.id} • Enhanced Moderation System`,
                iconURL: interaction.guild.iconURL()
            })
            .setThumbnail(user.displayAvatarURL({ dynamic: true }));

        // Enhanced action buttons
        const actionRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`warn_view_history_${user.id}`)
                    .setLabel('View History')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📋'),
                new ButtonBuilder()
                    .setCustomId(`warn_manage_${user.id}`)
                    .setLabel('Manage Warnings')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('⚙️'),
                new ButtonBuilder()
                    .setCustomId(`warn_appeal_info_${warning.id}`)
                    .setLabel('Appeal Info')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('⚖️'),
                new ButtonBuilder()
                    .setCustomId(`user_profile_${user.id}`)
                    .setLabel('User Profile')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('👤')
            );

        await interaction.editReply({ embeds: [embed], components: [actionRow] });

        // Send DM to warned user (unless silent mode)
        if (!silent) {
            try {
            const dmEmbed = new EmbedBuilder()
                .setTitle(`⚠️ You've received a warning`)
                .setColor(riskColors[riskLevel])
                .setDescription(`You have received a **${severity}** warning in **${interaction.guild.name}**.`)
                .addFields(
                    { name: '📝 Reason', value: reason, inline: false },
                    { name: '🆔 Warning ID', value: warning.id, inline: true },
                    { name: '📊 Your Status', value: `${updatedActiveWarnings.length} active warnings\nRisk Level: ${riskLevel}`, inline: true },
                    { name: '⚖️ Appeal Process', value: `You can appeal this warning using the server's appeal system.\nWarning ID: \`${warning.id}\``, inline: false }
                )
                .setTimestamp()
                .setFooter({ text: `${interaction.guild.name} Moderation Team` });

            await user.send({ embeds: [dmEmbed] });
            console.log(`✅ Warning DM sent to ${user.tag}`);
            } catch (dmError) {
                console.log(`⚠️ Could not send DM to ${user.tag}: ${dmError.message}`);
            }
        } else {
            console.log(`🔇 Silent warning - No DM sent to ${user.tag}`);
        }

        // Apply immediate punishment if specified
        if (customPunishment) {
            try {
                const punishmentResult = await applyImmediatePunishment(interaction.guild, targetMember, customPunishment, `Manual punishment with warning: ${reason}`, interaction.user);

                if (punishmentResult.success) {
                    const punishmentEmbed = new EmbedBuilder()
                        .setTitle('⚖️ Immediate Punishment Applied')
                        .setColor('#FF6600')
                        .setDescription(`**${punishmentResult.action.toUpperCase()}** has been applied to ${user.toString()}`)
                        .addFields(
                            { name: '🎯 Punishment Type', value: punishmentResult.description, inline: true },
                            { name: '⏱️ Duration', value: punishmentResult.duration || 'Permanent', inline: true },
                            { name: '📝 Combined with Warning', value: `Warning ID: ${warning.id}`, inline: true }
                        )
                        .setTimestamp();

                    await interaction.followUp({ embeds: [punishmentEmbed] });
                } else {
                    await interaction.followUp({
                        content: `⚠️ Warning added successfully, but punishment failed: ${punishmentResult.error}`,
                        ephemeral: true
                    });
                }
            } catch (punishmentError) {
                console.error('❌ Immediate punishment error:', punishmentError);
                await interaction.followUp({
                    content: '⚠️ Warning added successfully, but punishment failed. Please apply manually if needed.',
                    ephemeral: true
                });
            }
        }

        // Process auto-escalation and log if it occurred
        const escalationResult = await processAutoEscalation(interaction.guild, user, targetMember);
        if (escalationResult && escalationResult.action !== 'none') {
            await logAction(interaction.guild, 'warning_escalation', {
                user: user,
                moderator: interaction.user,
                warningId: warning.id,
                escalationAction: escalationResult.action,
                totalWarnings: escalationResult.totalWarnings,
                reason: escalationResult.reason,
                description: `Auto-escalation triggered: ${escalationResult.action}`
            }, interaction.user);
        } else if (updatedActiveWarnings.length >= 2) {
            // Send escalation warning even if no action taken
            const warningEmbed = new EmbedBuilder()
                .setTitle('⚠️ Escalation Warning')
                .setColor('#FFA500')
                .setDescription(`${user.toString()} is approaching auto-escalation thresholds.`)
                .addFields(
                    { name: '📊 Current Status', value: `**Active Warnings:** ${updatedActiveWarnings.length}\n**Risk Level:** ${riskLevel}`, inline: true },
                    { name: '🎯 Next Threshold', value: getNextThresholdInfo(updatedActiveWarnings.length), inline: true }
                )
                .setTimestamp();

            await interaction.followUp({ embeds: [warningEmbed] });
        }

        // Enhanced logging
        try {
            const { logAction } = require('../utils/loggingSystem');
            await logAction(interaction.guild, 'enhanced_warning', {
                user: user,
                moderator: interaction.user,
                warningId: warning.id,
                reason: reason,
                severity: severity,
                totalActiveWarnings: updatedActiveWarnings.length,
                totalWarnings: updatedWarnings.length,
                riskLevel: riskLevel,
                autoEscalationTriggered: escalationResult?.action !== 'none',
                description: `**Enhanced Warning System:** ${interaction.user.tag} warned ${user.tag} (${severity}) - Total: ${updatedActiveWarnings.length} active warnings`
            }, user);
        } catch (logError) {
            console.error('❌ Failed to log enhanced warning:', logError);
        }

    } catch (error) {
        console.error('❌ Error in enhanced warn command:', error);

        const errorEmbed = new EmbedBuilder()
            .setTitle('❌ Warning System Error')
            .setColor('#FF0000')
            .setDescription('An error occurred while processing the warning.')
            .addFields(
                { name: 'Error Details', value: `\`\`\`${error.message}\`\`\``, inline: false },
                { name: 'Recommended Action', value: '• Try the command again\n• Check user permissions\n• Contact system administrator if issue persists', inline: false }
            )
            .setTimestamp();

        if (interaction.deferred) {
            await interaction.editReply({ embeds: [errorEmbed] });
        } else {
            await interaction.reply({ embeds: [errorEmbed], flags: 64 });
        }
    }
}

function getNextEscalationAction(currentWarnings) {
    if (currentWarnings >= 7) return 'Ban (Threshold Reached)';
    if (currentWarnings >= 5) return 'Ban (2 warnings away)';
    if (currentWarnings >= 3) return 'Kick (2 warnings away)';
    if (currentWarnings >= 2) return 'Timeout (1 warning away)';
    return 'Timeout (1 warning away)';
}

function getNextThresholdInfo(currentWarnings) {
    if (currentWarnings >= 5) return '🔨 **Ban at 7 warnings**\n2 warnings remaining';
    if (currentWarnings >= 3) return '👢 **Kick at 5 warnings**\n2 warnings remaining';
    if (currentWarnings >= 2) return '⏰ **Timeout at 3 warnings**\n1 warning remaining';
    return '⏰ **Timeout at 3 warnings**\n1 warning remaining';
}

async function handleKick(interaction) {
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const member = interaction.guild.members.cache.get(user.id);

    if (!interaction.member.permissions.has(PermissionFlagsBits.KickMembers)) {
        return interaction.reply({ content: 'You need the Kick Members permission to use this command.', flags: 64 });
    }

    if (!member) {
        return interaction.reply({ content: 'User not found in this guild.', flags: 64 });
    }

    if (!member.kickable) {
        return interaction.reply({ content: 'Cannot kick this user.', flags: 64 });
    }

    try {
        await member.kick(reason);

        const embed = new EmbedBuilder()
            .setTitle('👢 User Kicked')
            .setDescription(`${user.tag} has been kicked from the server.`)
            .addFields(
                { name: '📝 Reason', value: reason, inline: false },
                { name: '🛡️ Moderator', value: interaction.user.toString(), inline: true }
            )
            .setColor('#FF4500')
            .setTimestamp();

        const actionRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('view_user_profile')
                    .setLabel('View User Profile')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.reply({ embeds: [embed], components: [actionRow] });

        // Enhanced logging using the logging system
        const { logAction } = require('../utils/loggingSystem');
        await logAction(interaction.guild, 'kick', {
            user: user,
            moderator: interaction.user,
            reason: reason
        }, interaction.user);
    } catch (error) {
        console.error('Error kicking user:', error);
        await interaction.reply({ content: 'An error occurred while kicking the user.', flags: 64 });
    }
}

async function handleBan(interaction) {
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const deleteMessages = interaction.options.getInteger('delete_messages') || 0; // Assuming you might add this option later
    const member = interaction.guild.members.cache.get(user.id);

    if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
        return interaction.reply({ content: 'You need the Ban Members permission to use this command.', flags: 64 });
    }

    if (member && !member.bannable) {
        return interaction.reply({ content: 'Cannot ban this user.', flags: 64 });
    }

    try {
        await interaction.guild.bans.create(user.id, { reason: reason, deleteMessagesDays: deleteMessages });

        const embed = new EmbedBuilder()
            .setTitle('🔨 User Banned')
            .setDescription(`${user.tag} has been banned from the server.`)
            .addFields(
                { name: '📝 Reason', value: reason, inline: false },
                { name: '🛡️ Moderator', value: interaction.user.toString(), inline: true },
                { name: '🗑️ Delete Messages', value: `${deleteMessages} days`, inline: true }
            )
            .setColor('#DC143C')
            .setTimestamp();

        const actionRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('view_user_profile')
                    .setLabel('View User Profile')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.reply({ embeds: [embed], components: [actionRow] });

        // Enhanced logging using the logging system
        const { logAction } = require('../utils/loggingSystem');
        await logAction(interaction.guild, 'ban', {
            user: user,
            moderator: interaction.user,
            reason: reason,
            deleteMessages: deleteMessages,
            duration: 'Permanent'
        }, interaction.user);
    } catch (error) {
        console.error('Error banning user:', error);
        await interaction.reply({ content: 'An error occurred while banning the user.', flags: 64 });
    }
}

async function handleTimeout(interaction) {
    const user = interaction.options.getUser('user');
    const durationMinutes = interaction.options.getInteger('duration');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const member = interaction.guild.members.cache.get(user.id);
    const timeInMilliseconds = durationMinutes * 60 * 1000;
    const timeoutDuration = `${durationMinutes} minutes`;

    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
        return interaction.reply({ content: 'You need the Manage Messages permission to use this command.', flags: 64 });
    }

    if (!member) {
        return interaction.reply({ content: 'User not found in this guild.', flags: 64 });
    }

    if (!member.moderatable) {
        return interaction.reply({ content: 'Cannot timeout this user.', flags: 64 });
    }

    try {
        await member.timeout(timeInMilliseconds, reason);

        const embed = new EmbedBuilder()
            .setTitle('⏳ User Timed Out')
            .setDescription(`${user.tag} has been timed out for ${timeoutDuration}.`)
            .addFields(
                { name: '📝 Reason', value: reason, inline: false },
                { name: '🛡️ Moderator', value: interaction.user.toString(), inline: true }
            )
            .setColor('#FF8C00')
            .setTimestamp();

        const actionRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('view_user_profile')
                    .setLabel('View User Profile')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.reply({ embeds: [embed], components: [actionRow] });

        // Enhanced logging using the logging system
        const { logAction } = require('../utils/loggingSystem');
        await logAction(interaction.guild, 'timeout', {
            user: user,
            moderator: interaction.user,
            reason: reason,
            duration: timeoutDuration,
            expiresAt: new Date(Date.now() + (timeInMilliseconds))
        }, interaction.user);
    } catch (error) {
        console.error('Error timing out user:', error);
        await interaction.reply({ content: 'An error occurred while timing out the user.', flags: 64 });
    }
}

async function handleWarnings(interaction) {
    const user = interaction.options.getUser('user');

    try {
        await interaction.deferReply();

        const { getUserWarnings } = require('../components/warningSystem');
        const warnings = await getUserWarnings(interaction.guild.id, user.id);

        if (warnings.length === 0) {
            return await interaction.editReply({ content: `${user} has no warnings.` });
        }

        const activeWarnings = warnings.filter(w => !w.expired && !w.removed);
        const expiredWarnings = warnings.filter(w => w.expired);
        const removedWarnings = warnings.filter(w => w.removed);

        const embed = new EmbedBuilder()
            .setTitle(`⚠️ Warning History for ${user.tag}`)
            .setColor('#FFA500')
            .setThumbnail(user.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: '📊 Summary', value: `🚨 **${activeWarnings.length}** Active\n⏰ **${expiredWarnings.length}** Expired\n🗑️ **${removedWarnings.length}** Removed\n📈 **${warnings.length}** Total`, inline: true },
                { name: '👤 User Info', value: `🆔 ${user.id}\n📅 Account Created: <t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true }
            )
            .setTimestamp();

        // Show recent active warnings
        if (activeWarnings.length > 0) {
            const recentActive = activeWarnings.slice(0, 5).map((w, i) => {
                const moderator = interaction.client.users.cache.get(w.moderatorId);
                return `**${i + 1}.** \`${w.id}\` - ${w.severity.toUpperCase()}\n📝 ${w.reason.substring(0, 80)}${w.reason.length > 80 ? '...' : ''}\n🛡️ ${moderator ? moderator.username : 'Unknown'} • <t:${Math.floor(w.timestamp / 1000)}:R>`;
            }).join('\n\n');

            embed.addFields({ name: `🚨 Active Warnings (${activeWarnings.length})`, value: recentActive, inline: false });
        }

        // Show appeal status
        const pendingAppeals = activeWarnings.filter(w => w.appealed && w.appealStatus === 'pending');
        if (pendingAppeals.length > 0) {
            embed.addFields({ name: '⚖️ Pending Appeals', value: `${pendingAppeals.length} warnings have pending appeals`, inline: true });
        }

        const actionRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('appeal_warning')
                    .setLabel('Appeal Warning')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(activeWarnings.length === 0),
                new ButtonBuilder()
                    .setCustomId('view_user_profile')
                    .setLabel('View User Profile')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.editReply({ embeds: [embed], components: [actionRow] });

    } catch (error) {
        console.error('❌ Error fetching warnings:', error);

        if (interaction.deferred) {
            await interaction.editReply({ content: '❌ An error occurred while fetching warnings.' });
        } else {
            await interaction.reply({ content: '❌ An error occurred while fetching warnings.', flags: 64 });
        }
    }
}

async function handleClearWarnings(interaction) {
    const user = interaction.options.getUser('user');

    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
        return interaction.reply({ content: 'You need the Manage Messages permission to use this command.', flags: 64 });
    }

    try {
        await interaction.deferReply();

        const { clearWarnings, getUserWarnings } = require('../components/warningSystem');

        // Check if user has warnings first
        const existingWarnings = await getUserWarnings(interaction.guild.id, user.id);
        const activeWarnings = existingWarnings.filter(w => !w.expired && !w.removed);

        if (activeWarnings.length === 0) {
            return await interaction.editReply({ content: `${user} has no active warnings to clear.` });
        }

        const clearedCount = await clearWarnings(interaction.guild.id, user.id, interaction.user.id, 'Cleared by moderator');

        if (clearedCount === 0) {
            return await interaction.editReply({ content: `❌ Failed to clear warnings for ${user}.` });
        }

        const embed = new EmbedBuilder()
            .setTitle('🗑️ Warnings Cleared')
            .setDescription(`All active warnings for ${user} have been cleared.`)
            .addFields(
                { name: '👤 User', value: `${user.toString()} (${user.tag})`, inline: true },
                { name: '🛡️ Moderator', value: interaction.user.toString(), inline: true },
                { name: '📊 Warnings Cleared', value: clearedCount.toString(), inline: true }
            )
            .setColor('#00FF00')
            .setTimestamp();

        const actionRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('view_user_profile')
                    .setLabel('View User Profile')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.editReply({ embeds: [embed], components: [actionRow] });

        // Enhanced logging using the logging system
        const { logAction } = require('../utils/loggingSystem');
        await logAction(interaction.guild, 'warnings_cleared', {
            user: user,
            moderator: interaction.user,
            clearedCount: clearedCount,
            description: `**${interaction.user.tag}** cleared ${clearedCount} warnings from **${user.tag}**`
        }, interaction.user);

    } catch (error) {
        console.error('❌ Error clearing warnings:', error);

        if (interaction.deferred) {
            await interaction.editReply({ content: '❌ An error occurred while clearing warnings.' });
        } else {
            await interaction.reply({ content: '❌ An error occurred while clearing warnings.', flags: 64 });
        }
    }
}

async function handleSetLogChannel(interaction) {
    const channel = interaction.options.getChannel('channel');

    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
        return interaction.reply({ content: 'You need the Manage Guild permission to use this command.', flags: 64 });
    }

    interaction.client.logChannels[interaction.guild.id] = channel.id;
    global.saveLogChannels();

    const embed = new EmbedBuilder()
        .setTitle('📝 Log Channel Set')
        .setDescription(`Moderation log channel has been set to ${channel}.`)
        .setColor('#00FF00')
        .setTimestamp();

    const actionRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setLabel('View Channel')
                .setStyle(ButtonStyle.Link)
                .setURL(channel.url)
        );

    await interaction.reply({ embeds: [embed], components: [actionRow] });
}

async function handleLockdown(interaction) {
    const channel = interaction.options.getChannel('channel');
    const reason = interaction.options.getString('reason') || 'Lockdown initiated by moderator';

    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
        return interaction.reply({ content: 'You need the Manage Channels permission to use this command.', flags: 64 });
    }

    try {
        if (channel) {
            // Lock specific channel
            await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
                SendMessages: false,
                AddReactions: false,
                CreatePublicThreads: false,
                CreatePrivateThreads: false
            });

            const embed = new EmbedBuilder()
                .setTitle('🔒 Channel Locked')
                .setDescription(`${channel} has been locked down.`)
                .addFields(
                    { name: 'Reason', value: reason, inline: true },
                    { name: 'Moderator', value: interaction.user.toString(), inline: true }
                )
                .setColor('#FF0000')
                .setTimestamp();

            const actionRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setLabel('View Channel')
                        .setStyle(ButtonStyle.Link)
                        .setURL(channel.url),
                );

            await interaction.reply({ embeds: [embed], components: [actionRow] });

            // Log to mod channel
            const logChannel = getModLogChannel(interaction.guild);
            if (logChannel) {
                await logChannel.send({ embeds: [embed] });
            }
        } else {
            // Server-wide lockdown
            const textChannels = interaction.guild.channels.cache.filter(ch => ch.type === 0);
            let lockedCount = 0;

            for (const [id, ch] of textChannels) {
                try {
                    await ch.permissionOverwrites.edit(interaction.guild.roles.everyone, {
                        SendMessages: false,
                        AddReactions: false,
                        CreatePublicThreads: false,
                        CreatePrivateThreads: false
                    });
                    lockedCount++;
                } catch (error) {
                    console.error(`Failed to lock channel ${ch.name}:`, error);
                }
            }

            const embed = new EmbedBuilder()
                .setTitle('🔒 Server Lockdown')
                .setDescription(`Server has been locked down. ${lockedCount} channels affected.`)
                .addFields(
                    { name: 'Reason', value: reason, inline: true },
                    { name: 'Moderator', value: interaction.user.toString(), inline: true }
                )
                .setColor('#FF0000')
                .setTimestamp();

            const actionRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('unlock_server')
                        .setLabel('Unlock Server')
                        .setStyle(ButtonStyle.Success),
                );

            await interaction.reply({ embeds: [embed], components: [actionRow] });

            // Log to mod channel
            const logChannel = getModLogChannel(interaction.guild);
            if (logChannel) {
                await logChannel.send({ embeds: [embed] });
            }
        }
    } catch (error) {
        console.error('Error during lockdown:', error);
        await interaction.reply({ content: 'An error occurred during lockdown.', flags: 64 });
    }
}

async function handleUnlock(interaction) {
    const channel = interaction.options.getChannel('channel');

    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
        return interaction.reply({ content: 'You need the Manage Channels permission to use this command.', flags: 64 });
    }

    try {
        if (channel) {
            // Unlock specific channel
            await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
                SendMessages: null,
                AddReactions: null,
                CreatePublicThreads: null,
                CreatePrivateThreads: null
            });

            const embed = new EmbedBuilder()
                .setTitle('🔓 Channel Unlocked')
                .setDescription(`${channel} has been unlocked.`)
                .addFields({ name: 'Moderator', value: interaction.user.toString(), inline: true })
                .setColor('#00FF00')
                .setTimestamp();

            const actionRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setLabel('View Channel')
                        .setStyle(ButtonStyle.Link)
                        .setURL(channel.url),
                );

            await interaction.reply({ embeds: [embed], components: [actionRow] });

            // Log to mod channel
            const logChannel = getModLogChannel(interaction.guild);
            if (logChannel) {
                await logChannel.send({ embeds: [embed] });
            }
        } else {
            // Server-wide unlock
            const textChannels = interaction.guild.channels.cache.filter(ch => ch.type === 0);
            let unlockedCount = 0;

            for (const [id, ch] of textChannels) {
                try {
                    await ch.permissionOverwrites.edit(interaction.guild.roles.everyone, {
                        SendMessages: null,
                        AddReactions: null,
                        CreatePublicThreads: null,
                        CreatePrivateThreads: null
                    });
                    unlockedCount++;
                } catch (error) {
                    console.error(`Failed to unlock channel ${ch.name}:`, error);
                }
            }

            const embed = new EmbedBuilder()
                .setTitle('🔓 Server Unlocked')
                .setDescription(`Server has been unlocked. ${unlockedCount} channels affected.`)
                .addFields({ name: 'Moderator', value: interaction.user.toString(), inline: true })
                .setColor('#00FF00')
                .setTimestamp();

            const actionRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('lockdown_server')
                        .setLabel('Lockdown Server')
                        .setStyle(ButtonStyle.Danger),
                );

            await interaction.reply({ embeds: [embed], components: [actionRow] });

            // Log to mod channel
            const logChannel = getModLogChannel(interaction.guild);
            if (logChannel) {
                await logChannel.send({ embeds: [embed] });
            }
        }
    } catch (error) {
        console.error('Error during unlock:', error);
        await interaction.reply({ content: 'An error occurred during unlock.', flags: 64 });
    }
}

async function handleSlowmode(interaction) {
    const seconds = interaction.options.getInteger('seconds');
    const channel = interaction.options.getChannel('channel') || interaction.channel;

    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
        return interaction.reply({ content: 'You need the Manage Channels permission to use this command.', flags: 64 });
    }

    try {
        await channel.setRateLimitPerUser(seconds);

        const embed = new EmbedBuilder()
            .setTitle('⏱️ Slowmode Updated')
            .setDescription(`Slowmode for ${channel} has been ${seconds === 0 ? 'disabled' : `set to ${seconds} seconds`}.`)
            .addFields({ name: 'Moderator', value: interaction.user.toString(), inline: true })
            .setColor(seconds === 0 ? '#00FF00' : '#FFA500')
            .setTimestamp();

        const actionRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('view_channel')
                    .setLabel('View Channel')
                    .setStyle(ButtonStyle.Link)
                    .setURL(channel.url),
            );

        await interaction.reply({ embeds: [embed], components: [actionRow] });

        // Log to mod channel
        const logChannel = getModLogChannel(interaction.guild);
        if (logChannel) {
            await logChannel.send({ embeds: [embed] });
        }
    } catch (error) {
        console.error('Error setting slowmode:', error);
        await interaction.reply({ content: 'An error occurred while setting slowmode.', flags: 64 });
    }
}

async function handleMassban(interaction) {
    const userIds = interaction.options.getString('userids');
    const reason = interaction.options.getString('reason') || 'Mass ban executed';

    if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
        return interaction.reply({ content: 'You need the Ban Members permission to use this command.', flags: 64 });
    }

    const ids = userIds.split(/[,\s]+/).filter(id => id.trim() && /^\d+$/.test(id.trim()));

    if (ids.length === 0) {
        return interaction.reply({ content: 'No valid user IDs provided.', flags: 64 });
    }

    if (ids.length > 20) {
        return interaction.reply({ content: 'Maximum 20 users can be banned at once.', flags: 64 });
    }

    await interaction.deferReply();

    let bannedCount = 0;
    let failedCount = 0;
    const results = [];

    for (const id of ids) {
        try {
            const user = await interaction.client.users.fetch(id).catch(() => null);
            if (!user) {
                results.push(`❌ User not found: ${id}`);
                failedCount++;
                continue;
            }

            await interaction.guild.bans.create(id, { reason: `Mass ban: ${reason}` });
            results.push(`✅ Banned: ${user.tag}`);
            bannedCount++;
        } catch (error) {
            results.push(`❌ Failed to ban: ${id} - ${error.message}`);
            failedCount++;
        }
    }

    const embed = new EmbedBuilder()
        .setTitle('🔨 Mass Ban Results')
        .setDescription(`**Banned:** ${bannedCount}\n**Failed:** ${failedCount}`)
        .addFields(
            { name: 'Results', value: results.slice(0, 10).join('\n') + (results.length > 10 ? `\n... and ${results.length - 10} more` : ''), inline: false },
            { name: 'Reason', value: reason, inline: true },
            { name: 'Moderator', value: interaction.user.toString(), inline: true }
        )
        .setColor('#FF0000')
        .setTimestamp();

    const actionRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('view_massban_results')
                .setLabel('View Full Results')
                .setStyle(ButtonStyle.Primary),
        );

    await interaction.editReply({ embeds: [embed], components: [actionRow] });

    // Log to mod channel
    const logChannel = getModLogChannel(interaction.guild);
    if (logChannel) {
        await logChannel.send({ embeds: [embed] });
    }
}

async function handleNickname(interaction) {
    const user = interaction.options.getUser('user');
    const nickname = interaction.options.getString('nickname');
    const member = interaction.guild.members.cache.get(user.id);

    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageNicknames)) {
        return interaction.reply({ content: 'You need the Manage Nicknames permission to use this command.', flags: 64 });
    }

    if (!member) {
        return interaction.reply({ content: 'User not found in this guild.', flags: 64 });
    }

    if (!member.manageable) {
        return interaction.reply({ content: 'Cannot manage this user\'s nickname.', flags: 64 });
    }

    try {
        const oldNickname = member.nickname || member.user.username;
        await member.setNickname(nickname);

        const embed = new EmbedBuilder()
            .setTitle('📝 Nickname Changed')
            .setDescription(`${user}'s nickname has been ${nickname ? 'changed' : 'reset'}.`)
            .addFields(
                { name: 'Old Nickname', value: oldNickname, inline: true },
                { name: 'New Nickname', value: nickname || user.username, inline: true },
                { name: 'Moderator', value: interaction.user.toString(), inline: true }
            )
            .setColor('#00FF00')
            .setTimestamp();

        const actionRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('view_user_profile')
                    .setLabel('View User Profile')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.reply({ embeds: [embed], components: [actionRow] });

        // Log to mod channel
        const logChannel = getModLogChannel(interaction.guild);
        if (logChannel) {
            await logChannel.send({ embeds: [embed] });
        }
    } catch (error) {
        console.error('Error changing nickname:', error);
        await interaction.reply({ content: 'An error occurred while changing the nickname.', flags: 64 });
    }
}

async function handleUnban(interaction) {
    const userId = interaction.options.getString('userid');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
        return interaction.reply({ content: 'You need the Ban Members permission to use this command.', flags: 64 });
    }

    try {
        // Check if user is actually banned
        const bans = await interaction.guild.bans.fetch();
        const bannedUser = bans.get(userId);

        if (!bannedUser) {
            return interaction.reply({ content: 'User not found in ban list. Please check the user ID.', flags: 64 });
        }

        // Unban the user
        await interaction.guild.members.unban(userId, `Unbanned by ${interaction.user.tag}: ${reason}`);

        const embed = new EmbedBuilder()
            .setTitle('✅ User Unbanned')
            .setDescription(`**${bannedUser.user.username}** has been unbanned from the server.`)
            .addFields(
                { name: '👤 User', value: `${bannedUser.user.username} (${bannedUser.user.id})`, inline: true },
                { name: '🔨 Unbanned By', value: `${interaction.user.username}`, inline: true },
                { name: '📝 Reason', value: reason, inline: false }
            )
            .setColor('#00FF00')
            .setTimestamp();

        const actionRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('view_user_profile')
                    .setLabel('View User Profile')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.reply({ embeds: [embed], components: [actionRow] });

        // Enhanced logging using the logging system
        const { logAction } = require('../utils/loggingSystem');
        await logAction(interaction.guild, 'unban', {
            user: bannedUser.user,
            moderator: interaction.user,
            reason: reason,
            unbannedAt: new Date().toISOString()
        }, interaction.user);

        // Log to mod channel
        const logChannel = getModLogChannel(interaction.guild);
        if (logChannel) {
            await logChannel.send({ embeds: [embed] });
        }

    } catch (error) {
        console.error('Error unbanning user:', error);
        await interaction.reply({ content: 'An error occurred while unbanning the user. Make sure I have the "Ban Members" permission and the user ID is correct.', flags: 64 });
    }
}

async function applyImmediatePunishment(guild, member, punishment, reason, moderator) {
    try {
        switch (punishment) {
            case 'timeout_10m':
                await member.timeout(10 * 60 * 1000, reason);
                return { success: true, action: 'timeout', description: '10 minute timeout', duration: '10 minutes' };

            case 'timeout_1h':
                await member.timeout(60 * 60 * 1000, reason);
                return { success: true, action: 'timeout', description: '1 hour timeout', duration: '1 hour' };

            case 'timeout_6h':
                await member.timeout(6 * 60 * 60 * 1000, reason);
                return { success: true, action: 'timeout', description: '6 hour timeout', duration: '6 hours' };

            case 'timeout_24h':
                await member.timeout(24 * 60 * 60 * 1000, reason);
                return { success: true, action: 'timeout', description: '24 hour timeout', duration: '24 hours' };

            case 'kick':
                await member.kick(reason);
                return { success: true, action: 'kick', description: 'Kicked from server', duration: 'Permanent' };

            case 'mute_30m':
                // Implementation would depend on your role system
                return { success: true, action: 'mute', description: '30 minute mute', duration: '30 minutes' };

            case 'mute_2h':
                // Implementation would depend on your role system
                return { success: true, action: 'mute', description: '2 hour mute', duration: '2 hours' };

            case 'remove_role':
                // Would need specific role selection - simplified for now
                return { success: true, action: 'role_removal', description: 'Role removed', duration: 'Permanent' };

            default:
                return { success: false, error: 'Unknown punishment type' };
        }
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function handleWarnConfig(interaction) {
    const action = interaction.options.getString('action');

    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
        return interaction.reply({ content: '❌ You need the Manage Server permission to configure warning settings.', flags: 64 });
    }

    try {
        const { getWarningConfig, setWarningConfig } = require('../utils/warningConfig');

        switch (action) {
            case 'thresholds':
                await handleThresholdConfig(interaction);
                break;
            case 'autopunish':
                await handleAutoPunishConfig(interaction);
                break;
            case 'view':
                await handleViewConfig(interaction);
                break;
            case 'reset':
                await handleResetConfig(interaction);
                break;
        }
    } catch (error) {
        console.error('❌ Error handling warning config:', error);
        await interaction.reply({ content: '❌ An error occurred while configuring warning settings.', flags: 64 });
    }
}

async function handleThresholdConfig(interaction) {
    const timeoutThreshold = interaction.options.getInteger('timeout_threshold');
    const kickThreshold = interaction.options.getInteger('kick_threshold');
    const banThreshold = interaction.options.getInteger('ban_threshold');

    if (!timeoutThreshold && !kickThreshold && !banThreshold) {
        return interaction.reply({ content: '❌ Please provide at least one threshold value to update.', flags: 64 });
    }

    const { getWarningConfig, setWarningConfig } = require('../utils/warningConfig');
    const config = await getWarningConfig(interaction.guild.id);

    if (timeoutThreshold) config.thresholds.timeout = timeoutThreshold;
    if (kickThreshold) config.thresholds.kick = kickThreshold;
    if (banThreshold) config.thresholds.ban = banThreshold;

    await setWarningConfig(interaction.guild.id, config);

    const embed = new EmbedBuilder()
        .setTitle('⚙️ Warning Thresholds Updated')
        .setColor('#00FF00')
        .addFields(
            { name: '⏰ Timeout Threshold', value: config.thresholds.timeout.toString(), inline: true },
            { name: '👢 Kick Threshold', value: config.thresholds.kick.toString(), inline: true },
            { name: '🔨 Ban Threshold', value: config.thresholds.ban.toString(), inline: true }
        )
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handleViewConfig(interaction) {
    const { getWarningConfig } = require('../utils/warningConfig');
    const config = await getWarningConfig(interaction.guild.id);

    const embed = new EmbedBuilder()
        .setTitle('⚙️ Current Warning Configuration')
        .setColor('#0099FF')
        .addFields(
            { name: '🎯 Auto-Escalation Thresholds', value: `⏰ Timeout: ${config.thresholds.timeout} warnings\n👢 Kick: ${config.thresholds.kick} warnings\n🔨 Ban: ${config.thresholds.ban} warnings`, inline: false },
            { name: '🔧 Auto-Punishment', value: config.autoPunishment.enabled ? '✅ Enabled' : '❌ Disabled', inline: true },
            { name: '📊 Warning Limits', value: `Max per user: ${config.limits.maxWarningsPerUser}\nExpiry: ${config.limits.defaultExpiry} days`, inline: true }
        )
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handleAutoPunishConfig(interaction) {
    // Implementation for auto-punishment configuration
    const embed = new EmbedBuilder()
        .setTitle('🔧 Auto-Punishment Configuration')
        .setColor('#FFA500')
        .setDescription('Use the buttons below to configure auto-punishment settings.')
        .setTimestamp();

    const actionRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('config_autopunish_enable')
                .setLabel('Enable Auto-Punishment')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('config_autopunish_disable')
                .setLabel('Disable Auto-Punishment')
                .setStyle(ButtonStyle.Danger)
        );

    await interaction.reply({ embeds: [embed], components: [actionRow] });
}

async function handleResetConfig(interaction) {
    const { resetWarningConfig } = require('../utils/warningConfig');
    await resetWarningConfig(interaction.guild.id);

    const embed = new EmbedBuilder()
        .setTitle('🔄 Configuration Reset')
        .setColor('#00FF00')
        .setDescription('Warning system configuration has been reset to default values.')
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}