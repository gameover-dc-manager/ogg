
const { 
    EmbedBuilder,
    PermissionFlagsBits
} = require('discord.js');
const { 
    addWarning, 
    removeWarning, 
    clearWarnings,
    exportWarningData,
    processAutoEscalation
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

// Simple interaction tracking
const processedModals = new Set();

function isModalProcessed(interactionId) {
    return processedModals.has(interactionId);
}

function markModalProcessed(interactionId) {
    processedModals.add(interactionId);
    // Clean up after 30 seconds
    setTimeout(() => {
        processedModals.delete(interactionId);
    }, 30000);
}

module.exports = {
    async handleWarningModals(interaction) {
        // Check if already processed
        if (isModalProcessed(interaction.id)) {
            console.log(`⚠️ Modal already processed: ${interaction.id}`);
            return;
        }

        // Check if interaction is valid
        if (!interaction.isRepliable() || interaction.replied || interaction.deferred) {
            console.log(`⚠️ Modal interaction not valid: ${interaction.id}`);
            return;
        }

        // Check interaction age
        const age = Date.now() - interaction.createdTimestamp;
        if (age > 2000) {
            console.log(`⚠️ Modal interaction too old: ${age}ms`);
            return;
        }

        // Mark as processed
        markModalProcessed(interaction.id);

        const customId = interaction.customId;

        try {
            if (customId.startsWith('warn_modal_add')) {
                await handleAddWarningModal(interaction);
            } else if (customId.startsWith('warn_modal_remove')) {
                await handleRemoveWarningModal(interaction);
            } else if (customId.startsWith('warn_modal_clear')) {
                await handleClearWarningsModal(interaction);
            } else if (customId.startsWith('export_')) {
                await handleExport(interaction);
            }
        } catch (error) {
            console.error('❌ Error handling warning modal:', error);
            
            if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ **Error**: Failed to process your request.',
                    ephemeral: true
                }).catch(() => {});
            }
        }
    }
};

async function handleAddWarningModal(interaction) {
    try {
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

        // Check if user can be warned
        if (targetUser.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return await interaction.reply({
                content: '❌ **Error**: You cannot warn a user with moderation permissions.',
                ephemeral: true
            });
        }

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

        // Always show success if warning was added (even if duplicate cache triggered)
        const { getUserWarnings } = require('./warningSystem');
        const userWarnings = await getUserWarnings(interaction.guild.id, targetUser.id);
        const recentWarning = userWarnings.find(w => 
            w.reason === warningReason && 
            w.moderatorId === interaction.user.id &&
            w.severity === severity &&
            (Date.now() - w.timestamp) < 30000 // Within last 30 seconds
        );

        if (!warning && !recentWarning) {
            return await interaction.reply({
                content: '❌ **Error**: Failed to add warning.',
                ephemeral: true
            });
        }

        const actualWarning = warning || recentWarning;

        // Create response embed
        const embed = new EmbedBuilder()
            .setTitle(`${SEVERITY_EMOJIS[severity]} Warning Added`)
            .setColor(SEVERITY_COLORS[severity])
            .addFields(
                { name: '👤 User', value: `${targetUser.toString()} (${targetUser.user.tag})`, inline: true },
                { name: '🛡️ Moderator', value: `${interaction.user.toString()}`, inline: true },
                { name: '📝 Reason', value: warningReason, inline: false },
                { name: '⚡ Severity', value: severity.charAt(0).toUpperCase() + severity.slice(1), inline: true },
                { name: '🆔 Warning ID', value: actualWarning.id, inline: true },
                { name: '📅 Expires', value: expires > 0 ? `<t:${Math.floor((Date.now() + expires * 24 * 60 * 60 * 1000) / 1000)}:R>` : 'Never', inline: true }
            )
            .setTimestamp()
            .setFooter({ text: `Warning ${actualWarning.id}` });

        // Only reply if we haven't already replied
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }

        // Process auto-escalation only if we actually added a new warning
        if (warning) {
            try {
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
            } catch (escalationError) {
                console.error('❌ Auto-escalation error:', escalationError);
            }
        }

    } catch (error) {
        console.error('❌ Error adding warning:', error);
        
        if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: '❌ **Error**: Failed to add warning.',
                ephemeral: true
            }).catch(() => {});
        }
    }
}

async function handleRemoveWarningModal(interaction) {
    try {
        await interaction.deferReply({ ephemeral: true });

        const userId = interaction.customId.split('_')[3];
        const warningId = interaction.fields.getTextInputValue('warning_id');

        const success = await removeWarning(interaction.guild.id, userId, warningId, interaction.user.id);

        if (!success) {
            return await interaction.editReply({
                content: '❌ **Error**: Warning not found or already removed.'
            });
        }

        const user = await interaction.client.users.fetch(userId).catch(() => null);
        const embed = new EmbedBuilder()
            .setTitle('✅ Warning Removed')
            .setColor('#00FF00')
            .addFields(
                { name: '👤 User', value: user ? `${user.toString()} (${user.tag})` : `User ${userId}`, inline: true },
                { name: '🛡️ Removed by', value: interaction.user.toString(), inline: true },
                { name: '🆔 Warning ID', value: warningId, inline: true }
            )
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });

    } catch (error) {
        console.error('❌ Error removing warning:', error);
        
        if (interaction.deferred) {
            await interaction.editReply({
                content: '❌ **Error**: Failed to remove warning.'
            });
        }
    }
}

async function handleClearWarningsModal(interaction) {
    try {
        await interaction.deferReply({ ephemeral: true });

        const userId = interaction.customId.split('_')[3];
        const reason = interaction.fields.getTextInputValue('clear_reason');

        const clearedCount = await clearWarnings(interaction.guild.id, userId, interaction.user.id, reason);

        if (clearedCount === 0) {
            return await interaction.editReply({
                content: '❌ **Error**: No warnings found to clear for this user.'
            });
        }

        const user = await interaction.client.users.fetch(userId).catch(() => null);
        const embed = new EmbedBuilder()
            .setTitle('🧹 Warnings Cleared')
            .setColor('#00FF00')
            .addFields(
                { name: '👤 User', value: user ? `${user.toString()} (${user.tag})` : `User ${userId}`, inline: true },
                { name: '🛡️ Cleared by', value: interaction.user.toString(), inline: true },
                { name: '📊 Warnings Cleared', value: clearedCount.toString(), inline: true },
                { name: '📝 Reason', value: reason, inline: false }
            )
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });

    } catch (error) {
        console.error('❌ Error clearing warnings:', error);
        
        if (interaction.deferred) {
            await interaction.editReply({
                content: '❌ **Error**: Failed to clear warnings.'
            });
        }
    }
}

async function handleExport(interaction) {
    const format = interaction.customId.split('_')[1];

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
        
        if (interaction.deferred) {
            await interaction.editReply({
                content: '❌ **Error**: Failed to export warning data.'
            });
        }
    }
}
