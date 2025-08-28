
const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    PermissionFlagsBits,
    AttachmentBuilder,
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
    processAutoEscalation
} = require('../components/warningSystem');
const fs = require('fs');

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
        .setName('warnings')
        .setDescription('Manage user warnings')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add a warning to a user')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to warn')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List warnings for a user')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to check warnings for')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove a warning')
                .addStringOption(option =>
                    option.setName('warning_id')
                        .setDescription('Warning ID to remove')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('clear')
                .setDescription('Clear all warnings for a user')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to clear warnings for')
                        .setRequired(true))),

    async execute(interaction) {
        // Check if interaction is still valid
        if (!interaction.isRepliable()) {
            console.log(`ℹ️ Interaction expired for ${interaction.user.tag} - command: warnings`);
            return;
        }

        // Check interaction age
        const interactionAge = Date.now() - interaction.createdTimestamp;
        if (interactionAge > 2500) {
            console.log(`ℹ️ Interaction too old (${interactionAge}ms) for ${interaction.user.tag} - command: warnings`);
            return;
        }

        // Defer the reply immediately
        try {
            await interaction.deferReply({ ephemeral: true });
        } catch (error) {
            if (error.code === 10062 || error.code === 40060) {
                console.log(`ℹ️ Cannot defer reply - interaction expired`);
                return;
            }
            throw error;
        }

        // Permission check
        if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return await interaction.editReply({
                content: '❌ **Error**: You need the "Moderate Members" permission to use warning commands.'
            });
        }

        try {
            const subcommand = interaction.options.getSubcommand();
            const user = interaction.options.getUser('user');

            switch (subcommand) {
                case 'add':
                    await handleAddWarning(interaction, user);
                    break;
                case 'list':
                    await handleListWarnings(interaction, user);
                    break;
                case 'remove':
                    await handleRemoveWarning(interaction);
                    break;
                case 'clear':
                    await handleClearWarnings(interaction, user);
                    break;
                default:
                    await interaction.editReply({
                        content: '❌ **Error**: Invalid subcommand.'
                    });
            }
        } catch (error) {
            console.error('❌ Error in warnings command:', error);

            // Skip error reply for expired/unknown interactions
            if (error.code === 10062 || error.code === 40060) {
                console.log(`ℹ️ Skipping error reply due to interaction state (code: ${error.code})`);
                return;
            }

            if (interaction.deferred && interaction.isRepliable()) {
                await interaction.editReply({
                    content: '❌ **Error**: An unexpected error occurred while processing your warning command.'
                });
            }
        }
    }
};

// Handler functions for subcommands
async function handleAddWarning(interaction, user) {
    // This will show a modal for adding a warning
    const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

    const modal = new ModalBuilder()
        .setCustomId(`warn_modal_${user.id}`)
        .setTitle(`Add Warning - ${user.displayName}`);

    const reasonInput = new TextInputBuilder()
        .setCustomId('warn_reason')
        .setLabel('Warning Reason')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMaxLength(500)
        .setPlaceholder('Enter the reason for this warning...');

    const severityInput = new TextInputBuilder()
        .setCustomId('warn_severity')
        .setLabel('Severity (minor, moderate, severe)')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setValue('minor')
        .setMaxLength(10);

    const expiresInput = new TextInputBuilder()
        .setCustomId('warn_expires')
        .setLabel('Expires in days (0 for permanent)')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setValue('0')
        .setMaxLength(3);

    const firstRow = new ActionRowBuilder().addComponents(reasonInput);
    const secondRow = new ActionRowBuilder().addComponents(severityInput);
    const thirdRow = new ActionRowBuilder().addComponents(expiresInput);

    modal.addComponents(firstRow, secondRow, thirdRow);

    await interaction.showModal(modal);
}

async function handleListWarnings(interaction, user) {
    const warnings = await getUserWarnings(interaction.guild.id, user.id);

    if (warnings.length === 0) {
        return await interaction.editReply({
            content: `📋 **${user.displayName}** has no warnings.`
        });
    }

    const activeWarnings = warnings.filter(w => !w.expired && !w.removed);
    const embed = new EmbedBuilder()
        .setTitle(`📋 Warnings for ${user.displayName}`)
        .setColor('#4A90E2')
        .setThumbnail(user.displayAvatarURL({ dynamic: true }))
        .addFields(
            { name: '📊 Summary', value: `**${activeWarnings.length}** Active | **${warnings.length}** Total`, inline: false }
        );

    // Show up to 5 most recent warnings
    const recentWarnings = warnings.slice(0, 5);
    recentWarnings.forEach((warning, index) => {
        const moderator = interaction.guild.members.cache.get(warning.moderatorId);
        const status = warning.removed ? '🗑️ Removed' : warning.expired ? '⏰ Expired' : '🚨 Active';
        
        embed.addFields({
            name: `${index + 1}. ${SEVERITY_EMOJIS[warning.severity]} ${warning.id} - ${status}`,
            value: `**Reason:** ${warning.reason}\n**Moderator:** ${moderator ? moderator.user.username : 'Unknown'}\n**Date:** <t:${Math.floor(warning.timestamp / 1000)}:R>`,
            inline: false
        });
    });

    if (warnings.length > 5) {
        embed.setFooter({ text: `Showing 5 of ${warnings.length} warnings` });
    }

    await interaction.editReply({ embeds: [embed] });
}

async function handleRemoveWarning(interaction) {
    const warningId = interaction.options.getString('warning_id');
    const { removeWarning } = require('../components/warningSystem');

    // Find the warning first to get user info
    const allWarnings = await getAllWarnings(interaction.guild.id);
    const warning = allWarnings.find(w => w.id === warningId && !w.removed);

    if (!warning) {
        return await interaction.editReply({
            content: '❌ **Error**: Warning not found or already removed.'
        });
    }

    const success = await removeWarning(
        interaction.guild.id,
        warning.userId,
        warningId,
        interaction.user.id,
        'Removed via warnings command'
    );

    if (success) {
        const user = await interaction.client.users.fetch(warning.userId).catch(() => null);
        await interaction.editReply({
            content: `✅ **Warning Removed**\n\nWarning \`${warningId}\` has been removed from ${user ? user.tag : 'Unknown User'}.`
        });
    } else {
        await interaction.editReply({
            content: '❌ **Error**: Failed to remove warning. It may have already been removed.'
        });
    }
}

async function handleClearWarnings(interaction, user) {
    const { clearWarnings } = require('../components/warningSystem');

    const clearedCount = await clearWarnings(
        interaction.guild.id,
        user.id,
        interaction.user.id,
        'Cleared via warnings command'
    );

    if (clearedCount > 0) {
        await interaction.editReply({
            content: `✅ **Warnings Cleared**\n\n${clearedCount} warning(s) have been cleared for ${user.tag}.`
        });
    } else {
        await interaction.editReply({
            content: `📋 **${user.displayName}** has no active warnings to clear.`
        });
    }
}
