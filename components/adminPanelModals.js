const { EmbedBuilder } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');

async function handleAdminModals(interaction) {
    const customId = interaction.customId;
    console.log(`📝 Admin modal submitted: ${customId}`);

    try {
        switch (customId) {
            case 'clear_warnings_modal':
                await handleClearWarningsModal(interaction);
                break;
            case 'unban_user_modal':
                await handleUnbanUserModal(interaction);
                break;
            case 'user_lookup_modal':
                await handleUserLookupModal(interaction);
                break;
            case 'admin_feedback_modal':
                await handleAdminFeedbackModal(interaction);
                break;
            default:
                console.warn(`⚠️ Unknown admin modal: ${customId}`);
                await interaction.reply({
                    content: `❌ Unknown modal action: ${customId}`,
                    ephemeral: true
                });
        }
    } catch (error) {
        console.error('Error handling admin modal:', error);
        if (!interaction.replied) {
            await interaction.reply({
                content: '❌ An error occurred while processing your request.',
                ephemeral: true
            });
        }
    }
}

async function handleClearWarningsModal(interaction) {
    try {
        const userInput = interaction.fields.getTextInputValue('user_id');
        const guild = interaction.guild;

        // Find user
        let userId = userInput;

        // Handle mentions
        if (userInput.startsWith('<@') && userInput.endsWith('>')) {
            userId = userInput.slice(2, -1);
            if (userId.startsWith('!')) {
                userId = userId.slice(1);
            }
        }

        // Try to fetch the user
        const user = await interaction.client.users.fetch(userId).catch(() => null);
        if (!user) {
            return await interaction.reply({
                content: '❌ User not found. Please provide a valid user ID or mention.',
                ephemeral: true
            });
        }

        // Clear warnings
        const warningsPath = path.join(__dirname, '../config/warnings.json');
        let warnings = {};

        try {
            warnings = JSON.parse(await fs.readFile(warningsPath, 'utf8'));
        } catch (e) {
            warnings = {};
        }

        const guildId = interaction.guild.id;
        const key = `${guildId}_${userId}`;
        const userWarnings = warnings[key] || [];
        const warningCount = userWarnings.length;

        if (warningCount === 0) {
            return await interaction.reply({
                content: `❌ ${user.username} has no warnings to clear.`,
                ephemeral: true
            });
        }

        // Clear warnings
        delete warnings[key];
        await fs.writeFile(warningsPath, JSON.stringify(warnings, null, 2));

        const embed = new EmbedBuilder()
            .setTitle('✅ Warnings Cleared Successfully')
            .setColor('#00FF00')
            .setDescription(`All warnings for **${user.username}** have been cleared.`)
            .addFields(
                { name: '👤 User', value: `${user.username} (${user.id})`, inline: true },
                { name: '⚠️ Warnings Cleared', value: `${warningCount}`, inline: true },
                { name: '🔨 Cleared By', value: `${interaction.user.username}`, inline: true }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });

        // Log the action
        try {
            const { logAction } = require('../utils/loggingSystem');
            await logAction(interaction.guild, 'warnings_cleared', {
                admin: interaction.user,
                target: user,
                warningsCleared: warningCount,
                clearedAt: new Date().toISOString()
            });
        } catch (logError) {
            console.warn('Warning: Failed to log warning clear action:', logError.message);
        }

    } catch (error) {
        console.error('Error clearing warnings:', error);
        await interaction.reply({
            content: '❌ Error clearing warnings. Please try again.',
            ephemeral: true
        });
    }
}

async function handleUnbanUserModal(interaction) {
    try {
        const userId = interaction.fields.getTextInputValue('user_id');
        const reason = interaction.fields.getTextInputValue('reason') || 'No reason provided';

        // Check if user is actually banned
        const bans = await interaction.guild.bans.fetch();
        const bannedUser = bans.get(userId);

        if (!bannedUser) {
            return await interaction.reply({
                content: '❌ User not found in ban list. Please check the user ID.',
                ephemeral: true
            });
        }

        // Unban the user
        await interaction.guild.members.unban(userId, `Unbanned by ${interaction.user.tag}: ${reason}`);

        const embed = new EmbedBuilder()
            .setTitle('✅ User Unbanned Successfully')
            .setColor('#00FF00')
            .setDescription(`**${bannedUser.user.username}** has been unbanned from the server.`)
            .addFields(
                { name: '👤 User', value: `${bannedUser.user.username} (${bannedUser.user.id})`, inline: true },
                { name: '🔨 Unbanned By', value: `${interaction.user.username}`, inline: true },
                { name: '📝 Reason', value: reason, inline: false }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });

        // Log the action
        try {
            const { logAction } = require('../utils/loggingSystem');
            await logAction(interaction.guild, 'member_unbanned', {
                admin: interaction.user,
                target: bannedUser.user,
                reason: reason,
                unbannedAt: new Date().toISOString()
            });
        } catch (logError) {
            console.warn('Warning: Failed to log unban action:', logError.message);
        }

    } catch (error) {
        console.error('Error unbanning user:', error);
        await interaction.reply({
            content: '❌ Error unbanning user. Make sure I have the "Ban Members" permission and the user ID is correct.',
            ephemeral: true
        });
    }
}

async function handleUserLookupModal(interaction) {
    try {
        const userInput = interaction.fields.getTextInputValue('user_id');

        let userId = userInput;

        // Handle mentions
        if (userInput.startsWith('<@') && userInput.endsWith('>')) {
            userId = userInput.slice(2, -1);
            if (userId.startsWith('!')) {
                userId = userId.slice(1);
            }
        }

        // Try to fetch the user
        const user = await interaction.client.users.fetch(userId).catch(() => null);
        if (!user) {
            return await interaction.reply({
                content: '❌ User not found. Please provide a valid user ID or mention.',
                ephemeral: true
            });
        }

        // Try to get guild member
        const member = await interaction.guild.members.fetch(userId).catch(() => null);

        // Get user warnings
        const warningsPath = path.join(__dirname, '../config/warnings.json');
        let warnings = {};

        try {
            warnings = JSON.parse(await fs.readFile(warningsPath, 'utf8'));
        } catch (e) {
            warnings = {};
        }

        const userWarnings = warnings[`${interaction.guild.id}_${userId}`] || [];

        const embed = new EmbedBuilder()
            .setTitle('👤 User Lookup Results')
            .setColor('#5865F2')
            .setDescription(`Comprehensive information for **${user.username}**`)
            .addFields(
                { 
                    name: '📋 Basic Information', 
                    value: `**Username:** ${user.username}\n**Display Name:** ${user.displayName || user.username}\n**User ID:** ${user.id}\n**Bot Account:** ${user.bot ? 'Yes' : 'No'}`, 
                    inline: true 
                },
                { 
                    name: '📅 Account Dates', 
                    value: `**Created:** <t:${Math.floor(user.createdTimestamp / 1000)}:R>\n**Joined Server:** ${member ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'Not in server'}`, 
                    inline: true 
                },
                { 
                    name: '⚠️ Moderation Info', 
                    value: `**Warnings:** ${userWarnings.length}\n**Status:** ${member?.communicationDisabledUntil && member.communicationDisabledUntil > new Date() ? 'Timed Out' : 'Normal'}\n**Roles:** ${member ? member.roles.cache.size - 1 : 'N/A'}`, 
                    inline: true 
                }
            )
            .setThumbnail(user.displayAvatarURL({ dynamic: true }))
            .setTimestamp();

        if (member && member.roles.cache.size > 1) {
            const roles = member.roles.cache
                .filter(role => role.name !== '@everyone')
                .sort((a, b) => b.position - a.position)
                .map(role => role.toString())
                .slice(0, 10);

            if (roles.length > 0) {
                embed.addFields({ 
                    name: '🎭 Roles', 
                    value: roles.join(', ') + (member.roles.cache.size > 11 ? '\n*...and more*' : ''), 
                    inline: false 
                });
            }
        }

        // Add presence information if available
        if (member && member.presence) {
            const statusEmojis = {
                online: '🟢',
                idle: '🟡',
                dnd: '🔴',
                offline: '⚫'
            };

            embed.addFields({
                name: '📊 Presence',
                value: `**Status:** ${statusEmojis[member.presence.status] || '⚫'} ${member.presence.status || 'offline'}\n**Activity:** ${member.presence.activities.length > 0 ? member.presence.activities[0].name : 'None'}`,
                inline: true
            });
        }

        await interaction.reply({ embeds: [embed], ephemeral: true });

    } catch (error) {
        console.error('Error looking up user:', error);
        await interaction.reply({
            content: '❌ Error looking up user. Please try again.',
            ephemeral: true
        });
    }
}

async function handleAdminFeedbackModal(interaction) {
    try {
        const category = interaction.fields.getTextInputValue('feedback_category');
        const content = interaction.fields.getTextInputValue('feedback_content');
        const severity = interaction.fields.getTextInputValue('feedback_severity') || 'Medium';

        // Save feedback to file
        const feedbackPath = path.join(__dirname, '../config/admin_feedback.json');
        let feedbackData = {};

        try {
            feedbackData = JSON.parse(await fs.readFile(feedbackPath, 'utf8'));
        } catch (e) {
            feedbackData = { feedback: [] };
        }

        if (!feedbackData.feedback) feedbackData.feedback = [];

        const feedbackEntry = {
            id: interaction.id,
            userId: interaction.user.id,
            username: interaction.user.tag,
            guildId: interaction.guild.id,
            guildName: interaction.guild.name,
            category,
            content,
            severity,
            timestamp: Date.now(),
            status: 'pending'
        };

        feedbackData.feedback.push(feedbackEntry);

        // Keep only last 100 feedback entries
        if (feedbackData.feedback.length > 100) {
            feedbackData.feedback = feedbackData.feedback.slice(-100);
        }

        await fs.writeFile(feedbackPath, JSON.stringify(feedbackData, null, 2));

        const embed = new EmbedBuilder()
            .setTitle('✅ Feedback Submitted Successfully!')
            .setColor('#00FF00')
            .setDescription('Thank you for helping us improve the admin panel!')
            .addFields(
                { name: '📋 Category', value: category, inline: true },
                { name: '🎯 Priority', value: severity, inline: true },
                { name: '🆔 Reference ID', value: `\`${interaction.id}\``, inline: true },
                { name: '📝 What happens next?', value: '• Your feedback will be reviewed by our team\n• Critical bugs are prioritized for immediate fixes\n• Feature requests are evaluated for future updates\n• You may receive follow-up if needed', inline: false }
            )
            .setFooter({ text: 'Admin Panel Feedback System • Your input drives our improvements' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });

        console.log(`📝 Admin feedback submitted by ${interaction.user.tag}: ${category} - ${severity}`);

    } catch (error) {
        console.error('Error handling admin feedback modal:', error);
        await interaction.reply({
            content: '❌ Error submitting feedback. Please try again later.',
            ephemeral: true
        });
    }
}

module.exports = {
    handleAdminModals
};