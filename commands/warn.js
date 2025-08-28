const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    PermissionFlagsBits,
    StringSelectMenuBuilder
} = require('discord.js');
const { 
    addWarning, 
    getUserWarnings, 
    getWarningStats,
    processAutoEscalation
} = require('../components/warningSystem');

const SEVERITY_COLORS = {
    minor: '#FFA500',    // Orange
    moderate: '#FF6B35', // Red-Orange  
    severe: '#DC143C'    // Crimson
};

const SEVERITY_EMOJIS = {
    minor: '⚠️',
    moderate: '🚨',
    severe: '🔴'
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Advanced warning system management')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to warn or manage warnings for')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the warning')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('severity')
                .setDescription('Warning severity level')
                .setRequired(false)
                .addChoices(
                    { name: 'Minor', value: 'minor' },
                    { name: 'Moderate', value: 'moderate' },
                    { name: 'Severe', value: 'severe' }
                ))
        .addIntegerOption(option =>
            option.setName('expires')
                .setDescription('Days until warning expires (0 for permanent)')
                .setRequired(false)
                .setMinValue(0)
                .setMaxValue(365)),

    async execute(interaction) {
        // Permission check first
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return await interaction.reply({
                content: '❌ **Error**: You need the "Manage Messages" permission to use warning commands.',
                ephemeral: true
            });
        }

        // Defer the reply early to prevent timeout
        // Check if interaction is still valid before deferring
        if (!interaction.isRepliable()) {
            console.log('❌ Interaction not repliable, skipping warn command');
            return;
        }

        try {
            await interaction.deferReply({ ephemeral: true });
        } catch (error) {
            console.error('Failed to defer reply:', error);
            // If defer fails, try to reply directly
            if (!interaction.replied && !interaction.deferred) {
                try {
                    await interaction.reply({ 
                        content: '❌ **Error**: Failed to process warning command. Please try again.',
                        ephemeral: true 
                    });
                } catch (replyError) {
                    console.error('Failed to send error reply:', replyError);
                }
            }
            return;
        }

        try {
            const user = interaction.options.getUser('user');
            const reason = interaction.options.getString('reason');
            const severity = interaction.options.getString('severity') || 'minor';
            const expires = interaction.options.getInteger('expires') || 0;

            // If user and reason provided, add warning directly
            if (user && reason) {
                await handleDirectWarning(interaction, user, reason, severity, expires);
            } else if (user) {
                // Show user-specific dashboard
                await showUserWarningDashboard(interaction, user);
            } else {
                // Show main warning dashboard
                await showMainWarningDashboard(interaction);
            }

        } catch (error) {
            console.error('❌ Error in warn command:', error);

            try {
                await interaction.editReply({
                    content: '❌ **Error**: An unexpected error occurred while processing your warning command. Please try again later.'
                });
            } catch (editError) {
                console.log('Could not edit reply, interaction may have expired');
            }
        }
    }
};

// Handle direct warning addition
async function handleDirectWarning(interaction, user, reason, severity, expires) {
    // Validate reason length
    if (reason.length < 5) {
        return await interaction.editReply({
            content: '❌ **Error**: Warning reason must be at least 5 characters long.'
        });
    }

    if (reason.length > 500) {
        return await interaction.editReply({
            content: '❌ **Error**: Warning reason must be less than 500 characters.'
        });
    }

    // Check if target user can be warned
    const targetMember = await interaction.guild.members.fetch(user.id).catch(() => null);

    if (!targetMember) {
        return await interaction.editReply({
            content: '❌ **Error**: User is not in this server.'
        });
    }

    // Check if user is trying to warn themselves
    if (user.id === interaction.user.id) {
        return await interaction.editReply({
            content: '❌ **Error**: You cannot warn yourself.'
        });
    }

    // Check if target is a bot
    if (user.bot) {
        return await interaction.editReply({
            content: '❌ **Error**: You cannot warn bots.'
        });
    }

    // Check permissions
    if (targetMember.permissions.has(PermissionFlagsBits.ManageMessages)) {
        return await interaction.editReply({
            content: '❌ **Error**: You cannot warn a user with moderation permissions.'
        });
    }

    // Check role hierarchy
    if (targetMember.roles.highest.position >= interaction.member.roles.highest.position) {
        return await interaction.editReply({
            content: '❌ **Error**: You cannot warn a user with equal or higher role position.'
        });
    }

    try {
        // Add the warning
        const warning = await addWarning(
            interaction.guild.id,
            user.id,
            reason,
            interaction.user.id,
            severity,
            expires,
            interaction.client
        );

        if (!warning) {
            return await interaction.editReply({
                content: '❌ **Error**: Failed to add warning. Please try again.'
            });
        }

        // Get updated warning count
        const userWarnings = await getUserWarnings(interaction.guild.id, user.id);
        const activeWarnings = userWarnings.filter(w => !w.expired && !w.removed);

        // Create success embed
        const embed = new EmbedBuilder()
            .setTitle(`${SEVERITY_EMOJIS[severity]} Warning Added`)
            .setColor(SEVERITY_COLORS[severity])
            .addFields(
                { name: '👤 User', value: `${user.toString()} (${user.tag})`, inline: true },
                { name: '🛡️ Moderator', value: `${interaction.user.toString()}`, inline: true },
                { name: '📝 Reason', value: reason, inline: false },
                { name: '⚡ Severity', value: severity.charAt(0).toUpperCase() + severity.slice(1), inline: true },
                { name: '🆔 Warning ID', value: warning.id, inline: true },
                { name: '📊 Total Warnings', value: `${activeWarnings.length}`, inline: true }
            )
            .setTimestamp()
            .setFooter({ text: `Warning ${warning.id}` });

        // Add expiration info if applicable
        if (expires > 0) {
            const expiresAt = Date.now() + (expires * 24 * 60 * 60 * 1000);
            embed.addFields({ 
                name: '⏰ Expires', 
                value: `<t:${Math.floor(expiresAt / 1000)}:R>`, 
                inline: true 
            });
        }

        await interaction.editReply({ embeds: [embed] });

        // Process auto-escalation in background
        setImmediate(async () => {
            try {
                const escalationResult = await processAutoEscalation(interaction.guild, user, targetMember);
                if (escalationResult && escalationResult.action !== 'none') {
                    console.log(`⚡ Auto-escalation triggered for ${user.tag}: ${escalationResult.action}`);
                }
            } catch (escalationError) {
                console.error('❌ Error in auto-escalation:', escalationError);
            }
        });

    } catch (error) {
        console.error('❌ Error adding warning:', error);
        await interaction.editReply({
            content: '❌ **Error**: Failed to add warning. Please try again later.'
        });
    }
}

// Show user-specific warning dashboard
async function showUserWarningDashboard(interaction, user) {
    try {
        const warnings = await getUserWarnings(interaction.guild.id, user.id);
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);

        if (!member) {
            return await interaction.editReply({
                content: '❌ **Error**: User is not in this server.'
            });
        }

        const activeWarnings = warnings.filter(w => !w.expired && !w.removed);
        const expiredWarnings = warnings.filter(w => w.expired);
        const removedWarnings = warnings.filter(w => w.removed);

        // Calculate risk level
        const riskLevel = activeWarnings.length >= 5 ? 'High' : activeWarnings.length >= 3 ? 'Medium' : 'Low';
        const riskColor = riskLevel === 'High' ? '#FF4444' : riskLevel === 'Medium' ? '#FFA500' : '#00FF00';

        const embed = new EmbedBuilder()
            .setTitle(`⚖️ Warning Dashboard: ${user.displayName}`)
            .setColor(riskColor)
            .setDescription(`**Warning management for ${user.toString()}**`)
            .addFields(
                { 
                    name: '📊 Warning Summary', 
                    value: `🚨 **${activeWarnings.length}** Active\n⏰ **${expiredWarnings.length}** Expired\n🗑️ **${removedWarnings.length}** Removed\n📈 **${warnings.length}** Total`, 
                    inline: true 
                },
                { 
                    name: '⚠️ Risk Assessment', 
                    value: `🎯 Risk Level: **${riskLevel}**\n🔄 Auto-escalation: **${activeWarnings.length >= 3 ? 'Active' : 'Inactive'}**`, 
                    inline: true 
                },
                { 
                    name: '👤 User Info', 
                    value: `🆔 ${user.id}\n📅 Joined: ${member.joinedAt ? member.joinedAt.toLocaleDateString() : 'Unknown'}`, 
                    inline: true 
                }
            )
            .setThumbnail(user.displayAvatarURL({ dynamic: true }))
            .setTimestamp();

        // Show recent warnings
        if (activeWarnings.length > 0) {
            const recentWarnings = activeWarnings.slice(0, 3).map(w => {
                const moderator = interaction.guild.members.cache.get(w.moderatorId);
                const timeAgo = Math.floor((Date.now() - w.timestamp) / 86400000);
                return `${SEVERITY_EMOJIS[w.severity]} **${w.severity.toUpperCase()}** - \`${w.id}\`\n📝 ${w.reason}\n🛡️ ${moderator ? moderator.user.username : 'Unknown'} • ${timeAgo} days ago`;
            }).join('\n\n');
            embed.addFields({ name: '⚠️ Recent Active Warnings', value: recentWarnings, inline: false });
        }

        // Action buttons
        const actionRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`warn_add_${user.id}`)
                    .setLabel('Add Warning')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('⚠️'),
                new ButtonBuilder()
                    .setCustomId(`warn_view_${user.id}`)
                    .setLabel('View History')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📋'),
                new ButtonBuilder()
                    .setCustomId(`warn_remove_${user.id}`)
                    .setLabel('Remove Warning')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🗑️')
                    .setDisabled(activeWarnings.length === 0),
                new ButtonBuilder()
                    .setCustomId(`warn_clear_${user.id}`)
                    .setLabel('Clear All')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🧹')
                    .setDisabled(activeWarnings.length === 0)
            );

        await interaction.editReply({ 
            embeds: [embed], 
            components: [actionRow]
        });

    } catch (error) {
        console.error('❌ Error showing user dashboard:', error);
        await interaction.editReply({
            content: '❌ **Error**: Failed to load user warning dashboard.'
        });
    }
}

// Show main warning dashboard
async function showMainWarningDashboard(interaction) {
    try {
        const stats = await getWarningStats(interaction.guild.id);

        const embed = new EmbedBuilder()
            .setTitle('⚖️ Warning System Dashboard')
            .setColor('#4A90E2')
            .setDescription('**Advanced warning management system**')
            .addFields(
                { 
                    name: '📊 Server Statistics', 
                    value: `🚨 **${stats.active || 0}** Active Warnings\n📈 **${stats.total || 0}** Total Warnings\n👥 **${stats.uniqueUsers || 0}** Users Warned`, 
                    inline: true 
                },
                { 
                    name: '📋 Severity Breakdown', 
                    value: `⚠️ Minor: **${stats.severities?.minor || 0}**\n🚨 Moderate: **${stats.severities?.moderate || 0}**\n🔴 Severe: **${stats.severities?.severe || 0}**`, 
                    inline: true 
                },
                { 
                    name: '🔄 System Status', 
                    value: `✅ Auto-escalation: **Enabled**\n📤 Export ready: **Available**`, 
                    inline: true 
                }
            )
            .setThumbnail(interaction.guild.iconURL())
            .setTimestamp()
            .setFooter({ 
                text: `${interaction.guild.name} Warning System`,
                iconURL: interaction.client.user.displayAvatarURL()
            });

        // Action buttons
        const actionRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('warn_add_user')
                    .setLabel('Add Warning')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('⚠️'),
                new ButtonBuilder()
                    .setCustomId('warn_view_all')
                    .setLabel('View All')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📋'),
                new ButtonBuilder()
                    .setCustomId('warn_search')
                    .setLabel('Search')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🔍'),
                new ButtonBuilder()
                    .setCustomId('warn_analytics')
                    .setLabel('Analytics')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📊')
            );

        await interaction.editReply({ 
            embeds: [embed], 
            components: [actionRow]
        });

    } catch (error) {
        console.error('❌ Error showing main dashboard:', error);
        await interaction.editReply({
            content: '❌ **Error**: Failed to load warning dashboard.'
        });
    }
}