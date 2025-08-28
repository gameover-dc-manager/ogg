const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getModLogChannel, getServerDetails } = require('../components/appealView');
const fs = require('fs').promises;
const path = require('path');

function isValidSnowflake(id) {
    return /^\d+$/.test(id) && id.length >= 17 && id.length <= 19;
}

/**
 * Enhanced timeout appeal system with comprehensive server details
 */
async function sendTimeoutAppealButton(user, guildId, violation, client) {
    try {
        console.log(`📤 Sending timeout appeal button to ${user.tag} for ${violation} in guild ${guildId}`);

        // Get detailed server information
        const serverDetails = await getServerDetails(client, guildId);
        console.log(`📊 Server details loaded: ${serverDetails.name} (${serverDetails.memberCount} members)`);

        const violationDisplayName = violation.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());

        const appealEmbed = new EmbedBuilder()
            .setTitle('🔇 Automatic Moderation Action')
            .setDescription(`You have been automatically timed out in **${serverDetails.name}** for: **${violationDisplayName}**`)
            .addFields(
                { 
                    name: '🏠 Server Information', 
                    value: `**${serverDetails.name}**\n${serverDetails.description}\n👥 ${serverDetails.memberCount} members\n👑 Owner: ${serverDetails.owner}`, 
                    inline: false 
                },
                { 
                    name: '📊 Server Details', 
                    value: `**Created:** <t:${Math.floor(serverDetails.createdAt?.getTime() / 1000 || Date.now() / 1000)}:R>\n**Region:** ${serverDetails.region}\n**Verification:** ${serverDetails.verificationLevel}`, 
                    inline: true 
                },
                { 
                    name: '🚫 Violation Details', 
                    value: `**Type:** ${violationDisplayName}\n**Action:** Automatic Timeout\n**Time:** <t:${Math.floor(Date.now() / 1000)}:f>`, 
                    inline: true 
                },
                { 
                    name: '⚖️ Appeal Process', 
                    value: 'If you believe this action was taken in error, you can appeal by clicking the button below. Please be honest and respectful in your appeal.', 
                    inline: false 
                },
                { 
                    name: '📝 Appeal Guidelines', 
                    value: '• Explain why you think the action was incorrect\n• Provide any relevant context or evidence\n• Be respectful and honest in your explanation\n• Appeals are reviewed within 24 hours by human moderators', 
                    inline: false 
                },
                {
                    name: '⏰ Appeal Deadline',
                    value: 'You have **7 days** from the time of this action to submit an appeal.',
                    inline: false
                }
            )
            .setColor('#FF6B35')
            .setThumbnail(serverDetails.icon)
            .setFooter({ 
                text: `Appeal System v3.0 • ${serverDetails.name} • Guild ID: ${guildId}`,
                iconURL: client.user.displayAvatarURL()
            })
            .setTimestamp();

        // Create appeal button with new format
        const appealButton = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`appeal|timeout|${guildId}|${violation}|${user.id}`)
                    .setLabel('📝 Appeal This Timeout')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('⚖️')
            );

        let canReceiveDM = false; // Initialize to false
        try {
            // Check if user can receive DMs more thoroughly
            const dmChannel = await user.createDM();
            await dmChannel.send({ 
                embeds: [appealEmbed], 
                components: [appealButton] 
            });

            console.log(`✅ Appeal button sent successfully to ${user.tag}`);

            // Log successful appeal button delivery
            await logAppealAction(guildId, user.id, 'timeout_appeal_button_sent', {
                violation,
                violationDisplayName,
                method: 'dm',
                success: true,
                serverName: serverDetails.name,
                serverMemberCount: serverDetails.memberCount
            });

            canReceiveDM = true; // Set to true only if DM was sent successfully
            return true;
        } catch (dmError) {
            console.error(`❌ Failed to send DM to ${user.tag}:`, dmError);
            // canReceiveDM remains false
        }

        // Enhanced fallback system
        if (!canReceiveDM) {
            try {
                console.log(`🔄 Attempting fallback delivery for ${user.tag}`);
                const guild = await client.guilds.fetch(guildId);
                const logChannel = getModLogChannel(guild);

                if (logChannel) {
                    const fallbackEmbed = new EmbedBuilder()
                        .setTitle('📬 Timeout Appeal Button - Delivery Failed')
                        .setDescription(`Unable to send appeal notification to ${user.toString()} via DM`)
                        .addFields(
                            { name: '👤 User Information', value: `**Tag:** ${user.tag}\n**ID:** ${userId}\n**Account:** <t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
                            { name: '🏠 Server Details', value: `**${serverDetails.name}**\n**Members:** ${serverDetails.memberCount}\n**Owner:** ${serverDetails.owner}`, inline: true },
                            { name: '🚫 Timeout Information', value: `**Violation:** ${violationDisplayName}\n**Reason:** DMs disabled or bot blocked\n**Action:** Automatic timeout appeal notification failed`, inline: false },
                            { name: '📊 Server Context', value: `**Created:** <t:${Math.floor(serverDetails.createdAt?.getTime() / 1000 || Date.now() / 1000)}:R>\n**Region:** ${serverDetails.region}\n**Verification:** ${serverDetails.verificationLevel}`, inline: true }
                        )
                        .setColor('#FFA500')
                        .setThumbnail(user.displayAvatarURL({ dynamic: true }))
                        .setImage(serverDetails.icon)
                        .setFooter({ 
                            text: `Appeal Delivery Failed • ${serverDetails.name}`,
                            iconURL: client.user.displayAvatarURL()
                        })
                        .setTimestamp();

                    const notifyButton = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId(`appeal_fallback|${guildId}|${user.id}|${violation}`)
                                .setLabel('🔔 Notify User Manually')
                                .setStyle(ButtonStyle.Secondary)
                                .setEmoji('📢')
                        );

                    await logChannel.send({
                        content: `⚠️ **Appeal Button Delivery Failed** - ${user.toString()}\n\n**Server:** ${serverDetails.name}\n**Violation:** ${violationDisplayName}\n**User:** ${user.tag} (${user.id})`,
                        embeds: [fallbackEmbed],
                        components: [notifyButton]
                    });

                    await logAppealAction(guildId, user.id, 'timeout_appeal_button_fallback', {
                        violation,
                        violationDisplayName,
                        method: 'log_channel_fallback',
                        reason: 'dm_failed',
                        serverName: serverDetails.name,
                        logChannelId: logChannel.id
                    });

                    console.log(`📋 Fallback notification posted to log channel for ${user.tag}`);
                }

                return false;
            } catch (fallbackError) {
                console.error(`❌ Fallback delivery also failed for ${user.tag}:`, fallbackError);

                await logAppealAction(guildId, user.id, 'timeout_appeal_button_total_failure', {
                    violation,
                    violationDisplayName,
                    error: fallbackError.message,
                    serverName: serverDetails.name
                });

                return false;
            }
        }

        return false; // Should not reach here if DM was successful, but as a safeguard
    } catch (error) {
        console.error(`❌ Critical error in sendTimeoutAppealButton for ${user.tag}:`, error);

        try {
            await logAppealAction(guildId, user.id, 'timeout_appeal_button_critical_error', {
                violation,
                error: error.message,
                stack: error.stack
            });
        } catch (logError) {
            console.error(`❌ Failed to log critical error:`, logError);
        }

        return false;
    }
}

/**
 * Enhanced warning appeal system with detailed server information
 */
async function sendWarningAppealButton(user, guildId, warningId, reason, severity, client) {
    try {
        console.log(`📤 Sending warning appeal button to ${user.tag} for warning ${warningId} in guild ${guildId}`);

        const serverDetails = await getServerDetails(client, guildId);
        console.log(`📊 Server details loaded: ${serverDetails.name} (${serverDetails.memberCount} members)`);

        const severityConfig = {
            minor: { emoji: '🟡', color: '#FFFF00', name: 'Minor', urgency: 'Low' },
            moderate: { emoji: '🟠', color: '#FFA500', name: 'Moderate', urgency: 'Medium' },
            severe: { emoji: '🔴', color: '#FF0000', name: 'Severe', urgency: 'High' }
        };

        const config = severityConfig[severity] || severityConfig.minor;

        const appealEmbed = new EmbedBuilder()
            .setTitle(`${config.emoji} Warning Issued`)
            .setDescription(`You have received a **${config.name}** warning in **${serverDetails.name}**.`)
            .addFields(
                { name: '⚠️ Warning Details', value: `**Reason:** ${reason}\n**Severity:** ${config.name} (${config.urgency} Priority)\n**Warning ID:** \`${warningId}\`\n**Issued:** <t:${Math.floor(Date.now() / 1000)}:f>`, inline: false },
                { name: '🏠 Server Information', value: `**${serverDetails.name}**\n${serverDetails.description}\n👥 ${serverDetails.memberCount} members\n👑 Owner: ${serverDetails.owner}`, inline: false },
                { name: '📊 Server Context', value: `**Created:** <t:${Math.floor(serverDetails.createdAt?.getTime() / 1000 || Date.now() / 1000)}:R>\n**Region:** ${serverDetails.region}\n**Verification:** ${serverDetails.verificationLevel}`, inline: true },
                { name: '⚖️ Appeal Process', value: 'If you believe this warning was issued in error, you can appeal using the button below. Please provide a clear explanation of why you think the warning should be removed.', inline: false },
                { name: '📝 Appeal Guidelines', value: '• Explain why the warning is incorrect\n• Be honest and respectful\n• Provide any relevant context\n• Appeals are reviewed by human moderators', inline: false },
                {
                    name: '⏰ Appeal Window',
                    value: 'You have **30 days** from the issue date to appeal this warning.',
                    inline: false
                }
            )
            .setColor(config.color)
            .setThumbnail(serverDetails.icon)
            .setFooter({ 
                text: `Warning Appeal System v3.0 • ${serverDetails.name} • Warning ID: ${warningId}`,
                iconURL: client.user.displayAvatarURL()
            })
            .setTimestamp();

        // Create appeal button with enhanced custom ID format
        const appealButton = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`appeal|warning|${guildId}|${warningId}|${user.id}`)
                    .setLabel('📝 Appeal This Warning')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('⚖️')
            );

        let canReceiveDM = false; // Initialize to false
        try {
            // Check if user can receive DMs more thoroughly
            const dmChannel = await user.createDM();
            await dmChannel.send({ 
                embeds: [appealEmbed], 
                components: [appealButton] 
            });

            console.log(`✅ Warning appeal button sent successfully to ${user.tag}`);

            await logAppealAction(guildId, user.id, 'warning_appeal_button_sent', {
                warningId,
                severity,
                reason,
                method: 'dm',
                success: true,
                serverName: serverDetails.name,
                serverMemberCount: serverDetails.memberCount
            });

            canReceiveDM = true; // Set to true only if DM was sent successfully
            return true;
        } catch (dmError) {
            console.error(`❌ Failed to send warning appeal to ${user.tag}:`, dmError);
            // canReceiveDM remains false

            // Log the failure with detailed context
            await logAppealAction(guildId, user.id, 'warning_appeal_button_failed', {
                warningId,
                severity,
                reason,
                error: dmError.message,
                serverName: serverDetails.name
            });

            return false;
        }

    } catch (error) {
        console.error(`❌ Critical error sending warning appeal button to ${user.tag}:`, error);

        try {
            await logAppealAction(guildId, user.id, 'warning_appeal_button_critical_error', {
                warningId,
                error: error.message,
                stack: error.stack
            });
        } catch (logError) {
            console.error(`❌ Failed to log critical error:`, logError);
        }

        return false;
    }
}

/**
 * Enhanced appeal fallback notification with server details
 */
async function sendAppealFallback(interaction) {
    try {
        const parts = interaction.customId.split('|');
        if (parts.length !== 4) {
            await interaction.reply({
                content: '❌ **Error**: Invalid fallback notification format.',
                ephemeral: true
            });
            return;
        }

        const [, guildId, userId, violation] = parts;

        const user = await interaction.client.users.fetch(userId);
        const serverDetails = await getServerDetails(interaction.client, guildId);
        const violationName = violation.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());

        const fallbackEmbed = new EmbedBuilder()
            .setTitle('📢 Manual Appeal Notification')
            .setDescription(`${user.toString()}, you have been notified that you can appeal your recent timeout.`)
            .addFields(
                { name: '🏠 Server Information', value: `**${serverDetails.name}**\n👥 ${serverDetails.memberCount} members\n👑 ${serverDetails.owner}`, inline: true },
                { name: '🚫 Action Details', value: `**Violation:** ${violationName}\n**Type:** Automatic Timeout\n**Notified By:** ${interaction.user.tag}`, inline: true },
                { name: '⚖️ How to Appeal', value: 'Since you couldn\'t receive the appeal button via DM, please:\n• Use the `/appeal` command in this server\n• Contact a moderator directly\n• Ask for assistance in appealing your timeout', inline: false },
                { name: '⏰ Important Deadline', value: 'You have **7 days** from the original action to submit your appeal.', inline: false },
                { name: '📊 Server Context', value: `**Region:** ${serverDetails.region}\n**Created:** <t:${Math.floor(serverDetails.createdAt?.getTime() / 1000 || Date.now() / 1000)}:R>\n**Verification:** ${serverDetails.verificationLevel}`, inline: true }
            )
            .setColor('#3498DB')
            .setThumbnail(user.displayAvatarURL({ dynamic: true }))
            .setImage(serverDetails.icon)
            .setFooter({ 
                text: `Manual Appeal Notification • ${serverDetails.name}`,
                iconURL: interaction.client.user.displayAvatarURL()
            })
            .setTimestamp();

        await interaction.reply({
            content: `${user.toString()} - **Timeout Appeal Notification**\n\n**Server:** ${serverDetails.name}\n**Violation:** ${violationName}\n**Notified By:** ${interaction.user.tag}`,
            embeds: [fallbackEmbed]
        });

        await logAppealAction(guildId, userId, 'appeal_fallback_notification_sent', {
            violation,
            violationName,
            notifiedBy: interaction.user.id,
            notifierTag: interaction.user.tag,
            method: 'manual_ping',
            serverName: serverDetails.name,
            channelId: interaction.channel.id
        });

        console.log(`📢 Manual appeal notification sent for ${user.tag} in ${serverDetails.name} by ${interaction.user.tag}`);

    } catch (error) {
        console.error(`❌ Error in fallback notification:`, error);
        await interaction.reply({
            content: '❌ **Error**: Failed to notify user. Please contact them manually or try again later.',
            ephemeral: true
        });
    }
}

/**
 * Enhanced appeal action logging with detailed context
 */
async function logAppealAction(guildId, userId, action, data = {}) {
    try {
        const logPath = path.join(__dirname, '../config/appeal_logs.json');
        let logs = { actions: [], statistics: {} };

        try {
            const logData = await fs.readFile(logPath, 'utf8');
            logs = JSON.parse(logData);
        } catch (e) {
            // File doesn't exist or is empty, use default
        }

        if (!logs.actions) logs.actions = [];
        if (!logs.statistics) logs.statistics = {};

        const logEntry = {
            id: `${Date.now()}_${Math.random().toString(36).substr(2, 12)}`,
            guildId,
            userId,
            action,
            data: {
                ...data,
                timestamp: Date.now(),
                date: new Date().toISOString()
            },
            timestamp: Date.now()
        };

        logs.actions.push(logEntry);

        // Update statistics
        if (!logs.statistics[guildId]) {
            logs.statistics[guildId] = {
                totalActions: 0,
                successfulDeliveries: 0,
                failedDeliveries: 0,
                appeals: 0,
                feedback: 0
            };
        }

        logs.statistics[guildId].totalActions++;

        if (action.includes('sent') || action.includes('success')) {
            logs.statistics[guildId].successfulDeliveries++;
        } else if (action.includes('failed') || action.includes('error')) {
            logs.statistics[guildId].failedDeliveries++;
        } else if (action.includes('appeal')) {
            logs.statistics[guildId].appeals++;
        } else if (action.includes('feedback')) {
            logs.statistics[guildId].feedback++;
        }

        // Keep only last 2000 log entries for performance
        if (logs.actions.length > 2000) {
            logs.actions = logs.actions.slice(-2000);
        }

        await fs.writeFile(logPath, JSON.stringify(logs, null, 2));
        console.log(`📝 Appeal action logged: ${action} for user ${userId} in guild ${guildId}`);

    } catch (error) {
        console.error(`❌ Error logging appeal action:`, error);
    }
}

/**
 * Get comprehensive appeal statistics for a guild
 */
async function getAppealStats(guildId) {
    try {
        const logPath = path.join(__dirname, '../config/appeal_logs.json');
        const logData = await fs.readFile(logPath, 'utf8');
        const logs = JSON.parse(logData);

        if (!logs.actions || !logs.statistics) {
            return { 
                total: 0, 
                successful: 0, 
                failed: 0, 
                appeals: 0, 
                feedback: 0,
                successRate: 0,
                recentActivity: []
            };
        }

        const guildStats = logs.statistics[guildId] || {
            totalActions: 0,
            successfulDeliveries: 0,
            failedDeliveries: 0,
            appeals: 0,
            feedback: 0
        };

        // Get recent activity (last 50 actions for this guild)
        const guildActions = logs.actions
            .filter(action => action.guildId === guildId)
            .slice(-50)
            .reverse();

        const successRate = guildStats.totalActions > 0 
            ? Math.round((guildStats.successfulDeliveries / guildStats.totalActions) * 100)
            : 0;

        return {
            total: guildStats.totalActions,
            successful: guildStats.successfulDeliveries,
            failed: guildStats.failedDeliveries,
            appeals: guildStats.appeals,
            feedback: guildStats.feedback,
            successRate,
            recentActivity: guildActions
        };
    } catch (error) {
        console.error(`❌ Error getting appeal stats for guild ${guildId}:`, error);
        return { 
            total: 0, 
            successful: 0, 
            failed: 0, 
            appeals: 0, 
            feedback: 0,
            successRate: 0,
            recentActivity: []
        };
    }
}

/**
 * Clean up old appeal logs (run periodically)
 */
async function cleanupAppealLogs() {
    try {
        const logPath = path.join(__dirname, '../config/appeal_logs.json');
        const logs = JSON.parse(await fs.readFile(logPath, 'utf8'));

        if (!logs.actions) return;

        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        const originalLength = logs.actions.length;

        logs.actions = logs.actions.filter(action => action.timestamp > thirtyDaysAgo);

        if (logs.actions.length < originalLength) {
            await fs.writeFile(logPath, JSON.stringify(logs, null, 2));
            console.log(`🧹 Cleaned up ${originalLength - logs.actions.length} old appeal log entries`);
        }

    } catch (error) {
        console.error(`❌ Error cleaning up appeal logs:`, error);
    }
}

// Run cleanup every 6 hours
setInterval(cleanupAppealLogs, 6 * 60 * 60 * 1000);

module.exports = {
    sendTimeoutAppealButton,
    sendWarningAppealButton,
    sendAppealFallback,
    logAppealAction,
    getAppealStats,
    cleanupAppealLogs,
    isValidSnowflake
};