const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    StringSelectMenuBuilder
} = require('discord.js');
const {
    addWarning,
    removeWarning,
    clearWarnings,
    getUserWarnings,
    getAllWarnings,
    getWarningStats,
    exportWarningData,
    processAutoEscalation,
    editWarning
} = require('./warningSystem');

const SEVERITY_COLORS = {
    minor: '#FFA500',
    moderate: '#FF6B35',
    severe: '#DC143C'
};

const SEVERITY_EMOJIS = {
    minor: '⚠️',
    moderate: '🚨',
    severe: '🔴'
};

// Global interaction tracking
const processedInteractions = new Map();
const INTERACTION_TIMEOUT = 30000; // 30 seconds

// Clean up expired interactions every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [id, timestamp] of processedInteractions.entries()) {
        if (now - timestamp > INTERACTION_TIMEOUT) {
            processedInteractions.delete(id);
        }
    }
}, 300000);

function isInteractionProcessed(interactionId) {
    return processedInteractions.has(interactionId);
}

function markInteractionProcessed(interactionId) {
    processedInteractions.set(interactionId, Date.now());
}

function validateInteraction(interaction) {
    // Check if already processed
    if (isInteractionProcessed(interaction.id)) {
        return { valid: false, reason: 'already_processed' };
    }

    // Check if already handled first (most important check)
    if (interaction.replied || interaction.deferred) {
        return { valid: false, reason: 'already_handled' };
    }

    // Check if interaction is still repliable
    if (!interaction.isRepliable()) {
        return { valid: false, reason: 'not_repliable' };
    }

    // More aggressive timeout check
    const age = Date.now() - interaction.createdTimestamp;
    if (age > 2800) {
        return { valid: false, reason: 'too_old' };
    }

    return { valid: true };
}

module.exports = {
    async handleWarningButtons(interaction) {
        const validation = validateInteraction(interaction);
        if (!validation.valid) {
            console.log(`⚠️ Skipping button interaction: ${validation.reason} (${interaction.id})`);
            return;
        }

        // Mark as processed immediately
        markInteractionProcessed(interaction.id);

        const customId = interaction.customId;

        try {
            // Permission check - only for moderation actions, not appeals
            if (!customId.startsWith('warning_appeal|')) {
                const { hasModerationPermissions } = require('../utils/adminPermissions');
                if (!await hasModerationPermissions(interaction.member)) {
                    return await interaction.reply({
                        content: '❌ You need moderation permissions to manage warnings.',
                        ephemeral: true
                    });
                }
            }

            // Handle different button types
            if (customId === 'warn_add_user') {
                await showAddWarningModal(interaction);
            } else if (customId === 'warn_view_all') {
                await interaction.deferReply({ ephemeral: true });
                await showAllWarnings(interaction);
            } else if (customId === 'warn_stats') {
                await interaction.deferReply({ ephemeral: true });
                await showWarningStats(interaction);
            } else if (customId === 'warn_export') {
                await showExportOptions(interaction);
            } else if (customId === 'warn_cleanup') {
                await interaction.deferReply({ ephemeral: true });
                await runCleanupTask(interaction);
            } else if (customId.startsWith('warn_add_')) {
                const userId = customId.split('_')[2];
                await showAddWarningModal(interaction, userId);
            } else if (customId.startsWith('warn_view_')) {
                await interaction.deferReply({ ephemeral: true });
                if (customId === 'warn_view_all') {
                    await showAllWarnings(interaction);
                } else {
                    const parts = customId.split('_');
                    const userId = parts[2] === 'all' && parts[3] ? parts[3] : parts[2];
                    if (userId && userId !== 'all') {
                        await showUserWarnings(interaction, userId);
                    } else {
                        await interaction.editReply({
                            content: '❌ **Error**: Invalid user ID in button interaction.'
                        });
                    }
                }
            } else if (customId.startsWith('warn_remove_')) {
                const userId = customId.split('_')[2];
                await showRemoveWarningOptions(interaction, userId);
            } else if (customId.startsWith('warn_clear_')) {
                const userId = customId.split('_')[2];
                await showClearWarningsModal(interaction, userId);
            } else if (customId === 'warn_back_dashboard') {
                await showGeneralDashboard(interaction);
            } else if (customId === 'export_json') {
                await handleExportFormat(interaction, 'json');
            } else if (customId === 'export_csv') {
                await handleExportFormat(interaction, 'csv');
            } else {
                await interaction.reply({
                    content: '❌ Unknown button action.',
                    ephemeral: true
                });
            }
        } catch (error) {
            console.error('❌ Error handling warning button:', error);

            if (error.code === 10062 || error.code === 40060) {
                return;
            }

            if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ **Error**: Something went wrong processing your request.',
                    ephemeral: true
                }).catch(() => {});
            }
        }
    },

    async handleWarningModals(interaction) {
        const validation = validateInteraction(interaction);
        if (!validation.valid) {
            console.log(`⚠️ Skipping modal interaction: ${validation.reason} (${interaction.id})`);
            return;
        }

        // Mark as processed immediately
        markInteractionProcessed(interaction.id);

        const customId = interaction.customId;

        try {
            if (customId.startsWith('warn_modal_add')) {
                await handleAddWarningModal(interaction);
            } else if (customId.startsWith('warn_modal_remove_')) {
                await handleRemoveWarningModal(interaction);
            } else if (customId.startsWith('warn_modal_clear_')) {
                await handleClearWarningModal(interaction);
            } else if (customId.startsWith('warn_modal_edit_')) {
                await handleEditWarningModal(interaction);
            }
        } catch (error) {
            console.error('❌ Error handling warning modal:', error);

            if (error.code === 10062 || error.code === 40060) {
                return;
            }

            if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ **Error**: Failed to process your request.',
                    ephemeral: true
                }).catch(() => {});
            }
        }
    },

    // Export individual functions for direct access
    showAddWarningModal,
    handleAddWarningModal,
    showAllWarnings,
    showWarningStats,
    showExportOptions,
    handleExportFormat,
    runCleanupTask,
    showUserWarnings,
    showRemoveWarningOptions,
    showClearWarningsModal,
    handleRemoveWarningModal,
    handleClearWarningModal,
    showEditWarningModal,
    handleEditWarningModal,
    showGeneralDashboard
};

async function showAddWarningModal(interaction, userId = null) {
    try {
        const modal = new ModalBuilder()
            .setCustomId(`warn_modal_add${userId ? '_' + userId : ''}`)
            .setTitle('⚠️ Add Warning');

        if (!userId) {
            const userInput = new TextInputBuilder()
                .setCustomId('warn_user_id')
                .setLabel('User ID or Mention')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Enter user ID or @mention')
                .setRequired(true);

            const userRow = new ActionRowBuilder().addComponents(userInput);
            modal.addComponents(userRow);
        }

        const reasonInput = new TextInputBuilder()
            .setCustomId('warn_reason')
            .setLabel('Warning Reason')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Describe what the user did wrong...')
            .setRequired(true)
            .setMaxLength(500);

        const severityInput = new TextInputBuilder()
            .setCustomId('warn_severity')
            .setLabel('Severity (minor/moderate/severe)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('minor')
            .setRequired(false)
            .setValue('minor');

        const expiresInput = new TextInputBuilder()
            .setCustomId('warn_expires')
            .setLabel('Expires in days (0 = permanent)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('0')
            .setRequired(false)
            .setValue('0');

        const reasonRow = new ActionRowBuilder().addComponents(reasonInput);
        const severityRow = new ActionRowBuilder().addComponents(severityInput);
        const expiresRow = new ActionRowBuilder().addComponents(expiresInput);

        modal.addComponents(reasonRow, severityRow, expiresRow);

        await interaction.showModal(modal);
    } catch (error) {
        console.error('❌ Error showing add warning modal:', error);

        if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: '❌ **Error**: Failed to show warning modal.',
                ephemeral: true
            }).catch(() => {});
        }
    }
}

async function handleAddWarningModal(interaction) {
    // Extract userId from customId if present
    let targetUserId = null;
    if (interaction.customId.includes('_')) {
        const parts = interaction.customId.split('_');
        if (parts.length > 3) {
            targetUserId = parts[3];
        }
    }

    const warningReason = interaction.fields.getTextInputValue('warn_reason');
    const severity = (interaction.fields.getTextInputValue('warn_severity') || 'minor').toLowerCase();
    const expires = parseInt(interaction.fields.getTextInputValue('warn_expires')) || 0;

    // Validate severity
    if (!['minor', 'moderate', 'severe'].includes(severity)) {
        return await interaction.reply({
            content: '❌ **Error**: Invalid severity. Use "minor", "moderate", or "severe".',
            ephemeral: true
        });
    }

    let targetUser;
    if (targetUserId) {
        try {
            targetUser = await interaction.guild.members.fetch(targetUserId);
        } catch (error) {
            return await interaction.reply({
                content: '❌ **Error**: User not found in this server.',
                ephemeral: true
            });
        }
    } else {
        const userInput = interaction.fields.getTextInputValue('warn_user_id');
        const userIdMatch = userInput.match(/\d+/);

        if (!userIdMatch) {
            return await interaction.reply({
                content: '❌ **Error**: Please provide a valid user ID or mention.',
                ephemeral: true
            });
        }

        try {
            targetUser = await interaction.guild.members.fetch(userIdMatch[0]);
        } catch (error) {
            return await interaction.reply({
                content: '❌ **Error**: User not found in this server.',
                ephemeral: true
            });
        }
    }

    // Check for recent duplicate warnings (prevent spam)
    const existingWarnings = await getUserWarnings(interaction.guild.id, targetUser.id);
    const recentWarning = existingWarnings.find(w =>
        w.reason === warningReason &&
        w.moderatorId === interaction.user.id &&
        w.severity === severity &&
        (Date.now() - w.timestamp) < 10000 // Within last 10 seconds
    );

    if (recentWarning) {
        return await interaction.reply({
            content: `⚠️ **Warning Already Added**\n\nA similar warning was just added (ID: ${recentWarning.id}).`,
            ephemeral: true
        });
    }

    try {
        // Add the warning
        const warning = await addWarning(
            interaction.guild.id,
            targetUser.id,
            warningReason,
            interaction.user.id,
            severity,
            expires,
            interaction.client
        );

        if (!warning) {
            return await interaction.reply({
                content: '❌ **Error**: Warning could not be added (possible duplicate detected).',
                ephemeral: true
            });
        }

        // Get current warning count
        const userWarnings = await getUserWarnings(interaction.guild.id, targetUser.id);
        const activeWarnings = userWarnings.filter(w => !w.expired && !w.removed);

        // Create response embed
        const embed = new EmbedBuilder()
            .setTitle(`${SEVERITY_EMOJIS[severity]} Warning Added`)
            .setColor(SEVERITY_COLORS[severity])
            .addFields(
                { name: '👤 User', value: `${targetUser.toString()} (${targetUser.user.tag})`, inline: true },
                { name: '🛡️ Moderator', value: `${interaction.user.toString()}`, inline: true },
                { name: '📝 Reason', value: warningReason, inline: false },
                { name: '⚡ Severity', value: severity.charAt(0).toUpperCase() + severity.slice(1), inline: true },
                { name: '🆔 Warning ID', value: warning.id, inline: true },
                { name: '📊 Total Warnings', value: `${activeWarnings.length}`, inline: true },
                { name: '📅 Expires', value: expires > 0 ? `<t:${Math.floor((Date.now() + expires * 24 * 60 * 60 * 1000) / 1000)}:R>` : 'Never', inline: true }
            )
            .setTimestamp()
            .setFooter({ text: `Warning ${warning.id}` });

        await interaction.reply({ embeds: [embed], ephemeral: true });

        // Process auto-escalation
        const escalationResult = await processAutoEscalation(interaction.guild, targetUser.user, targetUser);

        if (escalationResult.action !== 'none') {
            const escalationEmbed = new EmbedBuilder()
                .setTitle('🔄 Auto-Escalation Triggered')
                .setColor('#FF0000')
                .setDescription(`**${escalationResult.action.toUpperCase()}** applied to ${targetUser.toString()}`)
                .addFields(
                    { name: '📊 Total Warnings', value: escalationResult.totalWarnings.toString(), inline: true },
                    { name: '⚖️ Action Taken', value: escalationResult.action, inline: true },
                    { name: '📝 Reason', value: escalationResult.reason, inline: false }
                )
                .setTimestamp();

            await interaction.followUp({ embeds: [escalationEmbed] });
        }
    } catch (error) {
        console.error('❌ Error in handleAddWarningModal:', error);

        if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: '❌ **Error**: Failed to add warning.',
                ephemeral: true
            }).catch(() => {});
        }
    }
}

async function showAllWarnings(interaction) {
    const allWarnings = await getAllWarnings(interaction.guild.id);

    if (allWarnings.length === 0) {
        return await interaction.editReply({
            content: '✅ **No warnings found** in this server.'
        });
    }

    const embed = new EmbedBuilder()
        .setTitle('📋 All Server Warnings')
        .setColor('#4A90E2')
        .setDescription(`Showing all warnings for **${interaction.guild.name}**`)
        .setTimestamp();

    // Group warnings by user
    const warningsByUser = {};
    allWarnings.forEach(warning => {
        if (!warningsByUser[warning.userId]) {
            warningsByUser[warning.userId] = [];
        }
        warningsByUser[warning.userId].push(warning);
    });

    const userEntries = Object.entries(warningsByUser).slice(0, 10);

    for (const [userId, warnings] of userEntries) {
        const user = await interaction.guild.members.fetch(userId).catch(() => null);
        const userName = user ? user.user.tag : `User ${userId}`;
        const activeWarnings = warnings.filter(w => !w.expired && !w.removed);

        const warningText = warnings.slice(0, 3).map(w =>
            `${SEVERITY_EMOJIS[w.severity]} ${w.reason} *- ${new Date(w.timestamp).toLocaleDateString()}*`
        ).join('\n');

        embed.addFields({
            name: `👤 ${userName} (${activeWarnings.length}/${warnings.length})`,
            value: warningText + (warnings.length > 3 ? `\n*... and ${warnings.length - 3} more*` : ''),
            inline: false
        });
    }

    if (Object.keys(warningsByUser).length > 10) {
        embed.setFooter({ text: `Showing 10 of ${Object.keys(warningsByUser).length} users with warnings` });
    }

    await interaction.editReply({ embeds: [embed] });
}

async function showWarningStats(interaction) {
    try {
        const stats = await getWarningStats(interaction.guild.id);

        const safeStats = {
            total: stats?.total || 0,
            uniqueUsers: stats?.uniqueUsers || 0,
            active: stats?.active || 0,
            severities: {
                minor: stats?.severities?.minor || 0,
                moderate: stats?.severities?.moderate || 0,
                severe: stats?.severities?.severe || 0
            },
            topOffenders: stats?.topOffenders || []
        };

        const embed = new EmbedBuilder()
            .setTitle('📊 Warning Statistics')
            .setColor('#4A90E2')
            .addFields(
                { name: '📈 Total Warnings', value: safeStats.total.toString(), inline: true },
                { name: '👥 Users Warned', value: safeStats.uniqueUsers.toString(), inline: true },
                { name: '⚡ Active Warnings', value: safeStats.active.toString(), inline: true },
                { name: '⚠️ Minor Warnings', value: safeStats.severities.minor.toString(), inline: true },
                { name: '🚨 Moderate Warnings', value: safeStats.severities.moderate.toString(), inline: true },
                { name: '🔴 Severe Warnings', value: safeStats.severities.severe.toString(), inline: true }
            )
            .setTimestamp()
            .setFooter({ text: `${interaction.guild.name} Warning Statistics` });

        if (safeStats.topOffenders.length > 0) {
            const topOffendersText = safeStats.topOffenders.slice(0, 5).map((offender, index) => {
                const user = interaction.guild.members.cache.get(offender.userId);
                return `${index + 1}. ${user ? user.user.tag : `User ${offender.userId}`} - ${offender.count} warnings`;
            }).join('\n');

            embed.addFields({ name: '🎯 Top Offenders', value: topOffendersText, inline: false });
        }

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        console.error('❌ Error showing warning stats:', error);
        await interaction.editReply({
            content: '❌ **Error**: Unable to load warning statistics.'
        });
    }
}

async function showExportOptions(interaction) {
    try {
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('export_json')
                    .setLabel('📄 Export JSON')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('export_csv')
                    .setLabel('📊 Export CSV')
                    .setStyle(ButtonStyle.Secondary)
            );

        const embed = new EmbedBuilder()
            .setTitle('📤 Export Warning Data')
            .setColor('#4A90E2')
            .setDescription('Choose the format for exporting warning data:')
            .addFields(
                { name: '📄 JSON', value: 'Structured data format, good for backups', inline: true },
                { name: '📊 CSV', value: 'Spreadsheet format, good for analysis', inline: true }
            );

        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    } catch (error) {
        console.error('❌ Error showing export options:', error);

        if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: '❌ **Error**: Failed to show export options.',
                ephemeral: true
            }).catch(() => {});
        }
    }
}

async function handleExportFormat(interaction, format) {
    try {
        await interaction.deferReply({ ephemeral: true });

        const exportData = await exportWarningData(interaction.guild.id, format);

        if (!exportData) {
            return await interaction.editReply({
                content: '❌ **Error**: No warning data found to export.'
            });
        }

        const filename = `warnings_${interaction.guild.id}_${Date.now()}.${format}`;
        const { AttachmentBuilder } = require('discord.js');
        const attachment = new AttachmentBuilder(Buffer.from(exportData), { name: filename });

        await interaction.editReply({
            content: `✅ **Export Complete**\n\nWarning data exported in ${format.toUpperCase()} format.`,
            files: [attachment]
        });
    } catch (error) {
        console.error('❌ Error exporting warnings:', error);
        await interaction.editReply({
            content: '❌ **Error**: Failed to export warning data.'
        }).catch(() => {});
    }
}

async function runCleanupTask(interaction) {
    try {
        const { cleanupExpiredWarnings } = require('./warningSystem');
        const cleanupResult = await cleanupExpiredWarnings();

        const embed = new EmbedBuilder()
            .setTitle('🧹 Cleanup Complete')
            .setColor('#00FF00')
            .addFields(
                { name: '✅ Warnings Processed', value: cleanupResult ? 'Updated' : 'No changes needed', inline: true },
                { name: '📊 Status', value: 'Cleanup completed successfully', inline: true }
            )
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        console.error('❌ Error running cleanup:', error);
        await interaction.editReply({
            content: '❌ **Error**: Failed to run cleanup task.'
        });
    }
}

async function showUserWarnings(interaction, userId) {
    try {
        const userWarnings = await getUserWarnings(interaction.guild.id, userId);

        if (!userWarnings || userWarnings.length === 0) {
            return await interaction.editReply({
                content: '📝 **No Warnings Found**\n\nThis user has no warnings on record.'
            });
        }

        let user;
        try {
            user = await interaction.client.users.fetch(userId);
        } catch (fetchError) {
            user = { tag: `Unknown User (${userId})`, displayAvatarURL: () => null };
        }

        const embed = new EmbedBuilder()
            .setTitle(`⚠️ Warning History - ${user.tag}`)
            .setColor('#FFA500');

        if (user.displayAvatarURL) {
            embed.setThumbnail(user.displayAvatarURL());
        }

        const activeWarnings = userWarnings.filter(w => !w.expired && !w.removed);
        const expiredWarnings = userWarnings.filter(w => w.expired);

        embed.setDescription(`**${activeWarnings.length}** active, **${expiredWarnings.length}** expired`);

        const recentWarnings = userWarnings.slice(0, 10);
        for (const warning of recentWarnings) {
            const moderator = await interaction.guild.members.fetch(warning.moderatorId).catch(() => null);
            const moderatorName = moderator ? moderator.user.tag : 'Unknown Moderator';

            const warningDate = new Date(warning.timestamp);
            const formattedDate = warningDate.toLocaleDateString();

            let statusText = warning.removed ? ' *(Removed)*' : warning.expired ? ' *(Expired)*' : ' *(Active)*';

            embed.addFields({
                name: `${SEVERITY_EMOJIS[warning.severity]} ${warning.severity.toUpperCase()} Warning - ${warning.id}`,
                value: `**Reason:** ${warning.reason}\n**Moderator:** ${moderatorName}\n**Date:** ${formattedDate}${statusText}`,
                inline: false
            });
        }

        if (userWarnings.length > 10) {
            embed.setFooter({ text: `Showing 10 of ${userWarnings.length} warnings` });
        }

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        console.error('❌ Error showing user warnings:', error);
        await interaction.editReply({
            content: '❌ **Error**: Could not retrieve user warnings.'
        });
    }
}

async function showRemoveWarningOptions(interaction, userId) {
    const warnings = await getUserWarnings(interaction.guild.id, userId);
    const activeWarnings = warnings.filter(w => !w.expired && !w.removed);

    if (activeWarnings.length === 0) {
        return await interaction.reply({
            content: '❌ **Error**: No active warnings found for this user.',
            ephemeral: true
        });
    }

    const modal = new ModalBuilder()
        .setCustomId(`warn_modal_remove_${userId}`)
        .setTitle('🗑️ Remove Warning');

    const warningIdInput = new TextInputBuilder()
        .setCustomId('warning_id')
        .setLabel('Warning ID to Remove')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Enter warning ID (e.g., ABC123)')
        .setRequired(true);

    const row = new ActionRowBuilder().addComponents(warningIdInput);
    modal.addComponents(row);

    await interaction.showModal(modal);
}

async function showClearWarningsModal(interaction, userId) {
    const modal = new ModalBuilder()
        .setCustomId(`warn_modal_clear_${userId}`)
        .setTitle('🧹 Clear All Warnings');

    const reasonInput = new TextInputBuilder()
        .setCustomId('clear_reason')
        .setLabel('Reason for Clearing Warnings')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Why are you clearing all warnings for this user?')
        .setRequired(true)
        .setMaxLength(300);

    const row = new ActionRowBuilder().addComponents(reasonInput);
    modal.addComponents(row);

    await interaction.showModal(modal);
}

async function handleRemoveWarningModal(interaction) {
    const userId = interaction.customId.split('_')[3];
    const warningId = interaction.fields.getTextInputValue('warning_id');

    const success = await removeWarning(interaction.guild.id, userId, warningId, interaction.user.id);

    if (!success) {
        return await interaction.reply({
            content: '❌ **Error**: Warning not found or already removed.',
            ephemeral: true
        });
    }

    const user = await interaction.guild.members.fetch(userId).catch(() => null);
    const embed = new EmbedBuilder()
        .setTitle('✅ Warning Removed')
        .setColor('#00FF00')
        .addFields(
            { name: '👤 User', value: user ? `${user.toString()} (${user.user.tag})` : `User ID: ${userId}`, inline: true },
            { name: '🛡️ Removed by', value: interaction.user.toString(), inline: true },
            { name: '🆔 Warning ID', value: warningId, inline: true }
        )
        .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleClearWarningModal(interaction) {
    const userId = interaction.customId.split('_')[3];
    const reason = interaction.fields.getTextInputValue('clear_reason');

    const clearedCount = await clearWarnings(interaction.guild.id, userId, interaction.user.id, reason);

    if (clearedCount === 0) {
        return await interaction.reply({
            content: '❌ **Error**: No warnings found for this user.',
            ephemeral: true
        });
    }

    const user = await interaction.guild.members.fetch(userId).catch(() => null);
    const embed = new EmbedBuilder()
        .setTitle('🧹 Warnings Cleared')
        .setColor('#00FF00')
        .addFields(
            { name: '👤 User', value: user ? `${user.toString()} (${user.user.tag})` : `User ID: ${userId}`, inline: true },
            { name: '🛡️ Cleared by', value: interaction.user.toString(), inline: true },
            { name: '📊 Warnings Cleared', value: clearedCount.toString(), inline: true },
            { name: '📝 Reason', value: reason, inline: false }
        )
        .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function showEditWarningModal(interaction, userId) {
    try {
        const warnings = await getUserWarnings(interaction.guild.id, userId);
        const activeWarnings = warnings.filter(w => !w.expired && !w.removed);

        if (activeWarnings.length === 0) {
            return await interaction.reply({
                content: '❌ **Error**: No active warnings found for this user to edit.',
                ephemeral: true
            });
        }

        const modal = new ModalBuilder()
            .setCustomId(`warn_modal_edit_${userId}`)
            .setTitle('✏️ Edit Warning');

        const warningIdInput = new TextInputBuilder()
            .setCustomId('edit_warning_id')
            .setLabel('Warning ID to Edit')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Enter warning ID (e.g., ABC123)')
            .setRequired(true);

        const newReasonInput = new TextInputBuilder()
            .setCustomId('edit_new_reason')
            .setLabel('New Reason')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Enter the new warning reason...')
            .setRequired(true)
            .setMaxLength(500);

        const newSeverityInput = new TextInputBuilder()
            .setCustomId('edit_new_severity')
            .setLabel('New Severity (minor/moderate/severe)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('minor')
            .setRequired(false);

        const row1 = new ActionRowBuilder().addComponents(warningIdInput);
        const row2 = new ActionRowBuilder().addComponents(newReasonInput);
        const row3 = new ActionRowBuilder().addComponents(newSeverityInput);

        modal.addComponents(row1, row2, row3);
        await interaction.showModal(modal);
    } catch (error) {
        console.error('❌ Error showing edit warning modal:', error);
        if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: '❌ **Error**: Failed to show edit warning modal. Please try again.',
                ephemeral: true
            });
        }
    }
}

async function handleEditWarningModal(interaction) {
    const userId = interaction.customId.split('_')[3];
    const warningId = interaction.fields.getTextInputValue('edit_warning_id');
    const newReason = interaction.fields.getTextInputValue('edit_new_reason');
    const newSeverity = interaction.fields.getTextInputValue('edit_new_severity') || null;

    // Validate severity if provided
    if (newSeverity && !['minor', 'moderate', 'severe'].includes(newSeverity.toLowerCase())) {
        return await interaction.reply({
            content: '❌ **Error**: Invalid severity. Use "minor", "moderate", or "severe".',
            ephemeral: true
        });
    }

    const result = await editWarning(interaction.guild.id, warningId, newReason, newSeverity?.toLowerCase(), interaction.user.id);

    if (!result.success) {
        return await interaction.reply({
            content: `❌ **Error**: ${result.message}`,
            ephemeral: true
        });
    }

    const user = await interaction.guild.members.fetch(userId).catch(() => null);
    const embed = new EmbedBuilder()
        .setTitle('✏️ Warning Edited')
        .setColor('#4A90E2')
        .addFields(
            { name: '👤 User', value: user ? `${user.toString()} (${user.user.tag})` : `User ID: ${userId}`, inline: true },
            { name: '🛡️ Edited by', value: interaction.user.toString(), inline: true },
            { name: '🆔 Warning ID', value: warningId, inline: true },
            { name: '📝 New Reason', value: newReason, inline: false }
        )
        .setTimestamp();

    if (newSeverity) {
        embed.addFields({ name: '⚡ New Severity', value: newSeverity.charAt(0).toUpperCase() + newSeverity.slice(1), inline: true });
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
}


async function showGeneralDashboard(interaction) {
    try {
        const stats = await getWarningStats(interaction.guild.id);

        const safeStats = {
            totalWarnings: stats?.total || 0,
            totalUsers: stats?.uniqueUsers || 0,
            activeWarnings: stats?.active || 0
        };

        const embed = new EmbedBuilder()
            .setTitle('⚖️ Warning System Dashboard')
            .setColor('#4A90E2')
            .setDescription('Choose an action below to manage warnings in this server.')
            .addFields(
                { name: '📊 Server Stats', value: `**${safeStats.totalWarnings}** total warnings\n**${safeStats.totalUsers}** users warned\n**${safeStats.activeWarnings}** active warnings`, inline: true }
            )
            .setTimestamp()
            .setFooter({ text: `${interaction.guild.name} Warning System` });

        const row1 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('warn_add_user')
                    .setLabel('⚠️ Warn User')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('warn_view_all')
                    .setLabel('📋 View All')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('warn_stats')
                    .setLabel('📊 Statistics')
                    .setStyle(ButtonStyle.Secondary)
            );

        const row2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('warn_export')
                    .setLabel('📤 Export Data')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('warn_cleanup')
                    .setLabel('🧹 Cleanup')
                    .setStyle(ButtonStyle.Secondary)
            );

        const updatePayload = {
            embeds: [embed],
            components: [row1, row2]
        };

        if (interaction.replied || interaction.deferred) {
            await interaction.editReply(updatePayload);
        } else {
            await interaction.update(updatePayload);
        }
    } catch (error) {
        console.error('❌ Error showing dashboard:', error);

        if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: '❌ **Error**: Unable to load warning dashboard.',
                ephemeral: true
            }).catch(() => {});
        }
    }
}