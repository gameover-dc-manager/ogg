const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    EmbedBuilder
} = require('discord.js');

function getModLogChannel(guild) {
    const fs = require('fs');
    let logChannels = {};

    try {
        logChannels = JSON.parse(fs.readFileSync('./config/log_channels.json', 'utf8'));
    } catch (error) {
        logChannels = {};
    }

    const channelId = logChannels[guild.id];
    return channelId ? guild.channels.cache.get(channelId) : null;
}

// Enhanced global state management
const appealStates = new Map();
const processingLocks = new Set();

function createAppealId() {
    return `APPEAL_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function isAppealProcessing(processingKey) {
    return processingLocks.has(processingKey);
}

function lockAppealProcessing(processingKey) {
    processingLocks.add(processingKey);
    // Auto-cleanup after 15 seconds for better reliability
    setTimeout(() => processingLocks.delete(processingKey), 15000);
}

function unlockAppealProcessing(processingKey) {
    processingLocks.delete(processingKey);
}

async function validateAndPrepareInteraction(interaction, type = 'general') {
    // Check basic interaction validity first
    if (!interaction.isRepliable()) {
        console.log(`❌ Interaction not repliable: ${interaction.id}`);
        return { valid: false, reason: 'not_repliable' };
    }

    if (interaction.replied || interaction.deferred) {
        console.log(`❌ Interaction already handled: ${interaction.id}`);
        return { valid: false, reason: 'already_handled' };
    }

    // Check age - more lenient timing for better reliability
    const age = Date.now() - interaction.createdTimestamp;
    const maxAge = type === 'modal' ? 1000 : type === 'button' ? 2800 : 2800; // Reduced timeouts

    if (age > maxAge) {
        console.log(`⏰ Interaction too old for ${type}: ${age}ms (max: ${maxAge}ms)`);
        return { valid: false, reason: 'expired' };
    }

    // Check if already processing with unique key
    const processingKey = `${interaction.id}_${interaction.customId}`;
    if (isAppealProcessing(processingKey)) {
        console.log(`⏸️ Appeal already processing: ${processingKey}`);
        return { valid: false, reason: 'processing' };
    }

    return { valid: true };
}

async function safeInteractionReply(interaction, options, type = 'reply') {
    const processingKey = `${interaction.id}_${interaction.customId || 'no_custom_id'}`;

    try {
        // Check interaction age first for all types
        const age = Date.now() - interaction.createdTimestamp;
        const maxAge = type === 'modal' ? 800 : 2500; // Even stricter timing

        if (age > maxAge) {
            console.log(`⏰ Interaction too old for ${type}: ${age}ms (max: ${maxAge}ms)`);
            return { success: false, reason: 'expired' };
        }

        // Check if already processing
        if (isAppealProcessing(processingKey)) {
            console.log(`⚠️ Interaction already processing: ${processingKey}`);
            return { success: false, reason: 'already_processing' };
        }

        lockAppealProcessing(processingKey);

        let result;
        if (type === 'modal') {
            // For modals, check if interaction is still valid with stricter checks
            if (!interaction.isRepliable() || interaction.replied || interaction.deferred) {
                return { success: false, reason: 'interaction_invalid' };
            }
            result = await interaction.showModal(options);
        } else if (type === 'update') {
            if (!interaction.isRepliable() || interaction.replied) {
                return { success: false, reason: 'interaction_invalid' };
            }
            result = await interaction.update(options);
        } else {
            if (!interaction.isRepliable() || interaction.replied || interaction.deferred) {
                return { success: false, reason: 'interaction_invalid' };
            }
            result = await interaction.reply(options);
        }

        return { success: true, result };
    } catch (error) {
        console.error(`❌ Interaction error (${type}):`, error);

        if (error.code === 10062 || error.code === 40060 || error.code === 'InteractionAlreadyReplied') {
            console.log(`ℹ️ Expected interaction error: ${error.code || error.message}`);
            return { success: false, reason: 'discord_error', error };
        }

        return { success: false, reason: 'error', error };
    } finally {
        unlockAppealProcessing(processingKey);
    }
}

async function getServerDetails(client, guildId) {
    try {
        const guild = await client.guilds.fetch(guildId);
        const owner = await client.users.fetch(guild.ownerId).catch(() => null);

        return {
            name: guild.name,
            id: guild.id,
            memberCount: guild.memberCount,
            owner: owner ? `${owner.tag} (${owner.id})` : 'Unknown',
            createdAt: guild.createdAt,
            icon: guild.iconURL({ dynamic: true }),
            description: guild.description || 'No description available',
            verificationLevel: guild.verificationLevel,
            region: guild.preferredLocale || 'Unknown'
        };
    } catch (error) {
        console.error(`❌ Error fetching server details for ${guildId}:`, error);
        return {
            name: 'Unknown Server',
            id: guildId,
            memberCount: 'Unknown',
            owner: 'Unknown',
            createdAt: null,
            icon: null,
            description: 'Server details unavailable',
            verificationLevel: 'Unknown',
            region: 'Unknown'
        };
    }
}

async function handleWarningAppealButton(interaction) {
    console.log(`🔘 Warning appeal button: ${interaction.user.tag} - ${interaction.customId}`);

    // Parse custom ID with new format: appeal|warning|guildId|warningId|userId
    const parts = interaction.customId.split('|');
    if (parts.length !== 5 || parts[0] !== 'appeal' || parts[1] !== 'warning') {
        try {
            await interaction.reply({
                content: '❌ **Error**: Invalid appeal button format. Please contact a moderator.',
                flags: 64
            });
        } catch (error) {
            console.error('❌ Failed to reply with format error:', error);
        }
        return;
    }

    const [, , guildId, warningId, originalUserId] = parts;

    try {
        // Verify user can appeal this warning
        if (originalUserId !== interaction.user.id) {
            await interaction.reply({
                content: '❌ **Error**: You can only appeal your own warnings.',
                flags: 64
            });
            return;
        }

        // Get server details
        const serverDetails = await getServerDetails(interaction.client, guildId);

        const appealId = createAppealId();
        const modalCustomId = `warning_appeal_modal|${guildId}|${warningId}|${interaction.user.id}|${appealId}`;

        const appealModal = new ModalBuilder()
            .setCustomId(`warning_appeal_modal|${guildId}|${warningId}|${interaction.user.id}|${appealId}`)
            .setTitle('🔔 Warning Appeal Form');

        const appealReasonInput = new TextInputBuilder()
            .setCustomId('appeal_reason')
            .setLabel('Why should this warning be removed?')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Provide a detailed explanation (20-500 characters)...')
            .setRequired(true)
            .setMinLength(20)
            .setMaxLength(500);

        const appealEvidenceInput = new TextInputBuilder()
            .setCustomId('appeal_evidence')
            .setLabel('Evidence (Optional)')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Screenshots, chat logs, or other supporting evidence...')
            .setRequired(false)
            .setMaxLength(300);

        const row1 = new ActionRowBuilder().addComponents(appealReasonInput);
        const row2 = new ActionRowBuilder().addComponents(appealEvidenceInput);
        appealModal.addComponents(row1, row2);

        await interaction.showModal(appealModal);

        console.log(`✅ Appeal modal shown: ${interaction.user.tag} for warning ${warningId} in ${serverDetails.name}`);

        // Store appeal state
        appealStates.set(appealId, {
            userId: interaction.user.id,
            guildId,
            warningId,
            serverDetails,
            timestamp: Date.now()
        });

    } catch (error) {
        console.error('❌ Error handling warning appeal button:', error);

        try {
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ **Error**: Failed to process your appeal request. Please try again.',
                    flags: 64
                });
            }
        } catch (replyError) {
            console.error('❌ Failed to send error reply:', replyError);
        }
    }
}

async function handleWarningAppealModal(interaction) {
    console.log(`📝 Warning appeal modal: ${interaction.user.tag} - ${interaction.customId}`);

    // Enhanced duplicate processing check with faster response
    const modalHash = `${interaction.id}_${interaction.customId}`;
    if (!global.processedModalInteractions) {
        global.processedModalInteractions = new Map();
    }

    const lastProcessed = global.processedModalInteractions.get(modalHash);
    if (lastProcessed && Date.now() - lastProcessed < 30000) {
        console.log(`⚠️ Appeal modal already processed recently: ${modalHash}`);
        return;
    }

    // Mark as processed immediately to prevent duplicates
    global.processedModalInteractions.set(modalHash, Date.now());

    // Auto-cleanup old entries every 2 minutes
    if (global.processedModalInteractions.size > 100) {
        const cutoff = Date.now() - (120 * 1000); // 2 minutes
        for (const [key, timestamp] of global.processedModalInteractions.entries()) {
            if (timestamp < cutoff) {
                global.processedModalInteractions.delete(key);
            }
        }
    }

    // Check for basic interaction validity first
    if (interaction.replied || interaction.deferred) {
        console.log(`⚠️ Appeal modal already handled: ${interaction.id}`);
        return;
    }

    // Check interaction age immediately with stricter timeout
    const interactionAge = Date.now() - interaction.createdTimestamp;
    if (interactionAge > 2500) { // Increased timeout for better reliability
        console.log(`⏰ Modal interaction too old (${interactionAge}ms), skipping: ${interaction.id}`);
        return;
    }

    // Check if interaction is repliable
    if (!interaction.isRepliable()) {
        console.log(`❌ Modal interaction not repliable: ${interaction.id}`);
        return;
    }

    // Parse modal custom ID: warning_appeal_modal|guildId|warningId|userId|appealId
    const parts = interaction.customId.split('|');
    if (parts.length !== 5) {
        try {
            await interaction.reply({
                content: '❌ **Error**: Invalid appeal modal format.',
                flags: 64
            });
        } catch (error) {
            console.error('❌ Failed to reply with format error:', error);
        }
        return;
    }

    const [, guildId, warningId, userId, appealId] = parts;

    // Verify user
    if (userId !== interaction.user.id) {
        try {
            await interaction.reply({
                content: '❌ **Error**: User verification failed.',
                flags: 64
            });
        } catch (error) {
            console.error('❌ Failed to reply with user verification error:', error);
        }
        return;
    }

    // Get stored appeal state or fetch server details
    let serverDetails = appealStates.get(appealId)?.serverDetails;
    if (!serverDetails) {
        serverDetails = await getServerDetails(interaction.client, guildId);
    }

    let appealReason, appealEvidence;
    try {
        appealReason = interaction.fields.getTextInputValue('appeal_reason');
        appealEvidence = interaction.fields.getTextInputValue('appeal_evidence') || 'None provided';
    } catch (error) {
        try {
            await interaction.reply({
                content: '❌ **Error**: Failed to process appeal form data.',
                flags: 64
            });
        } catch (replyError) {
            console.error('❌ Failed to reply with form data error:', replyError);
        }
        return;
    }

    const { appealWarning } = require('./warningSystem');

    try {
        // Submit the appeal
        const { appealWarning } = require('./warningSystem');
        const result = await appealWarning(guildId, userId, warningId, appealReason, appealEvidence);

        if (result.success) {
            // Success response to user
            const userEmbed = new EmbedBuilder()
                .setTitle('✅ Warning Appeal Submitted Successfully')
                .setColor('#00FF00')
                .setDescription(`Your appeal has been submitted and will be reviewed by the moderation team.`)
                .addFields(
                    { name: '🏠 Server', value: `**${serverDetails.name}**\n${serverDetails.description}`, inline: false },
                    { name: '📊 Server Info', value: `👥 ${serverDetails.memberCount} members\n👑 Owner: ${serverDetails.owner}\n🌍 Region: ${serverDetails.region}`, inline: true },
                    { name: '⚖️ Appeal Details', value: `🆔 Warning ID: \`${warningId}\`\n📝 Appeal ID: \`${appealId}\`\n⏰ Submitted: <t:${Math.floor(Date.now() / 1000)}:f>`, inline: true },
                    { name: '📝 Your Reason', value: `\`\`\`${appealReason.length > 200 ? appealReason.substring(0, 200) + '...' : appealReason}\`\`\``, inline: false }
                )
                .setThumbnail(serverDetails.icon)
                .setFooter({ 
                    text: `Appeal System v3.0 • Server ID: ${guildId}`,
                    iconURL: interaction.client.user.displayAvatarURL()
                })
                .setTimestamp();

            if (appealEvidence !== 'None provided') {
                userEmbed.addFields({ 
                    name: '📋 Evidence', 
                    value: `\`\`\`${appealEvidence.length > 150 ? appealEvidence.substring(0, 150) + '...' : appealEvidence}\`\`\``, 
                    inline: false 
                });
            }

            const response = await safeInteractionReply(interaction, { 
                embeds: [userEmbed], 
                flags: 64 
            });

            if (response.success) {
                // Send to moderation team
                await sendAppealToModerators(interaction.client, {
                    appealId,
                    guildId,
                    warningId,
                    userId,
                    user: interaction.user,
                    appealReason,
                    appealEvidence,
                    serverDetails,
                    warning: result.warning
                });

                console.log(`✅ Warning appeal submitted successfully: ${appealId} by ${interaction.user.tag} in ${serverDetails.name}`);
            } else if (response.reason === 'discord_error' || response.reason === 'expired') {
                // Still send to moderators even if user response failed
                await sendAppealToModerators(interaction.client, {
                    appealId,
                    guildId,
                    warningId,
                    userId,
                    user: interaction.user,
                    appealReason,
                    appealEvidence,
                    serverDetails,
                    warning: result.warning
                });

                console.log(`✅ Warning appeal submitted successfully (user notification failed): ${appealId} by ${interaction.user.tag} in ${serverDetails.name}`);
            }
        } else {
            const response = await safeInteractionReply(interaction, {
                content: `❌ **Appeal Failed**: ${result.message}`,
                flags: 64
            });
        }
    } catch (error) {
        console.error('❌ Error processing warning appeal:', error);

        const response = await safeInteractionReply(interaction, {
            content: '❌ **Error**: Failed to process your appeal. Please try again later or contact a moderator.',
            flags: 64
        });
    } finally {
        // Cleanup appeal state
        if (appealId) {
            appealStates.delete(appealId);
        }
    }
}

async function sendAppealToModerators(client, appealData) {
    try {
        const { appealId, guildId, warningId, userId, user, appealReason, appealEvidence, serverDetails, warning } = appealData;

        const guild = await client.guilds.fetch(guildId);
        const moderator = warning?.moderatorId ? await client.users.fetch(warning.moderatorId).catch(() => null) : null;

        const appealEmbed = new EmbedBuilder()
            .setTitle('📢 New Warning Appeal Received')
            .setColor('#FF6B35')
            .setDescription(`**${user.tag}** has appealed a warning in **${serverDetails.name}**`)
            .addFields(
                { name: '👤 Appealing User', value: `${user.toString()}\n**Tag:** ${user.tag}\n**ID:** ${userId}\n**Account Created:** <t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
                { name: '🏠 Server Details', value: `**Name:** ${serverDetails.name}\n**ID:** ${guildId}\n**Members:** ${serverDetails.memberCount}\n**Owner:** ${serverDetails.owner}`, inline: true },
                { name: '⚖️ Appeal Information', value: `**Warning ID:** \`${warningId}\`\n**Appeal ID:** \`${appealId}\`\n**Submitted:** <t:${Math.floor(Date.now() / 1000)}:F>\n**Status:** 🟡 Pending Review`, inline: false }
            )
            .setThumbnail(user.displayAvatarURL({ dynamic: true }))
            .setImage(serverDetails.icon)
            .setTimestamp();

        if (warning) {
            const warningInfo = `**Original Reason:** ${warning.reason}\n**Severity:** ${warning.severity}\n**Issued By:** ${moderator ? `${moderator.tag} (${moderator.id})` : 'Unknown Moderator'}\n**Date:** <t:${Math.floor(warning.timestamp / 1000)}:F>\n**Expires:** ${warning.expiresAt ? `<t:${Math.floor(warning.expiresAt / 1000)}:R>` : 'Never'}`;
            appealEmbed.addFields({ name: '⚠️ Original Warning Details', value: warningInfo, inline: false });
        }

        appealEmbed.addFields(
            { name: '📝 Appeal Reason', value: `\`\`\`${appealReason}\`\`\``, inline: false },
            { name: '📋 Evidence', value: `\`\`\`${appealEvidence}\`\`\``, inline: false },
            { name: '📊 Server Statistics', value: `**Verification Level:** ${serverDetails.verificationLevel}\n**Region:** ${serverDetails.region}\n**Created:** <t:${Math.floor(serverDetails.createdAt?.getTime() / 1000 || Date.now() / 1000)}:R>`, inline: true }
        );

        const actionRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`warning_appeal_approve|${warningId}|${appealId}`)
                .setLabel('✅ Approve Appeal')
                .setStyle(ButtonStyle.Success)
                .setEmoji('⚖️'),
            new ButtonBuilder()
                .setCustomId(`warning_appeal_deny|${warningId}|${appealId}`)
                .setLabel('❌ Deny Appeal')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('🚫'),
            new ButtonBuilder()
                .setCustomId(`appeal_feedback|${guildId}|${userId}|${appealId}`)
                .setLabel('📝 Write Feedback')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('💭')
        );

        const logChannel = getModLogChannel(guild);
        if (logChannel) {
            await logChannel.send({
                content: `🔔 **New Warning Appeal** from ${user.tag} in **${serverDetails.name}**\n${user.toString()}`,
                embeds: [appealEmbed],
                components: [actionRow]
            });

            // Log the appeal submission
            const { logAction } = require('../utils/loggingSystem');
            await logAction(guild, 'warning_appeal_submitted', {
                user: user,
                warningId: warningId,
                appealId: appealId,
                appealReason: appealReason,
                serverName: serverDetails.name,
                originalReason: warning?.reason || 'Unknown',
                description: `**${user.tag}** submitted appeal **${appealId}** for warning **${warningId}**`
            }, user);
        } else {
            console.warn(`⚠️ No mod log channel configured for ${guild.name} (${guild.id})`);
        }

    } catch (error) {
        console.error('❌ Error sending appeal to moderators:', error);
    }
}

async function handleWarningAppealDecision(interaction) {
    console.log(`⚖️ Appeal decision: ${interaction.user.tag} - ${interaction.customId}`);

    const validation = await validateAndPrepareInteraction(interaction, 'button');
    if (!validation.valid) {
        return;
    }

    // Parse custom ID: warning_appeal_approve|warningId|appealId OR warning_appeal_deny|warningId|appealId
    const parts = interaction.customId.split('|');
    if (parts.length !== 3) {
        const response = await safeInteractionReply(interaction, {
            content: '❌ **Error**: Invalid appeal decision format.',
            flags: 64
        });
        return;
    }

    const [action, warningId, appealId] = parts;
    const isApprove = action === 'warning_appeal_approve';

    // Check permissions
    if (!interaction.member.permissions.has('ManageMessages')) {
        const response = await safeInteractionReply(interaction, {
            content: '❌ **Error**: You need the "Manage Messages" permission to handle appeals.',
            flags: 64
        });
        return;
    }

    // Check if already processed
    const originalEmbed = interaction.message.embeds[0];
    if (originalEmbed && originalEmbed.title &&
        (originalEmbed.title.includes('APPROVED') || originalEmbed.title.includes('DENIED'))) {
        const response = await safeInteractionReply(interaction, {
            content: '❌ **Error**: This appeal has already been processed.',
            flags: 64
        });
        return;
    }

    // Extract user ID from embed
    let userId;
    try {
        const userField = originalEmbed.fields.find(field => field.name === '👤 Appealing User');
        if (userField) {
            const idMatch = userField.value.match(/\*\*ID:\*\* (\d+)/);
            if (idMatch) {
                userId = idMatch[1];
            }
        }

        if (!userId) {
            throw new Error("User ID not found in embed");
        }
    } catch (e) {
        console.error('❌ Error retrieving user ID:', e);
        const response = await safeInteractionReply(interaction, {
            content: '❌ **Error**: Could not retrieve user information to process the appeal.',
            flags: 64
        });
        return;
    }

    const { processWarningAppeal } = require('./warningSystem');

    try {
        const result = await processWarningAppeal(
            interaction.guild.id, 
            warningId, 
            isApprove ? 'Appeal approved by moderator' : 'Appeal denied by moderator', 
            interaction.user.id
        );

        const serverDetails = await getServerDetails(interaction.client, interaction.guild.id);
        const user = await interaction.client.users.fetch(userId).catch(() => null);

        let embed = new EmbedBuilder()
            .setTimestamp()
            .setFooter({ 
                text: `Appeal Decision • Appeal ID: ${appealId}`,
                iconURL: interaction.client.user.displayAvatarURL()
            });

        if (result.success) {
            const appealReason = result.warning?.appealReason || 'No appeal reason available';

            if (isApprove) {
                // Lift any active punishments since the warning was approved for removal
                try {
                    const { liftWarningPunishments } = require('./warningSystem');
                    await liftWarningPunishments(interaction.guild, userId, result.warning, interaction.user);
                    console.log(`🔓 Punishments lifted for ${user ? user.tag : userId} after appeal approval`);
                } catch (liftError) {
                    console.error('❌ Error lifting punishments after appeal approval:', liftError);
                }

                embed.setTitle('✅ Warning Appeal - APPROVED')
                    .setColor('#00FF00')
                    .setDescription(`**Appeal approved by ${interaction.user.tag}**\nThe warning has been removed from the user's record and any related punishments have been lifted.`)
                    .addFields(
                        { name: '🏠 Server Details', value: `**${serverDetails.name}**\n👥 ${serverDetails.memberCount} members\n👑 ${serverDetails.owner}`, inline: true },
                        { name: '👤 User Information', value: user ? `**${user.tag}**\n${user.toString()}\nID: ${userId}` : `**Unknown User**\nID: ${userId}`, inline: true },
                        { name: '⚖️ Decision Details', value: `**Warning ID:** \`${warningId}\`\n**Appeal ID:** \`${appealId}\`\n**Approved By:** ${interaction.user.tag}\n**Decision Time:** <t:${Math.floor(Date.now() / 1000)}:F>`, inline: false },
                        { name: '⚠️ Original Warning', value: `**Reason:** ${result.warning?.reason || 'Unknown'}\n**Severity:** ${result.warning?.severity || 'minor'}\n**Status:** ✅ Removed`, inline: true },
                        { name: '📝 Appeal Reason', value: `\`\`\`${appealReason}\`\`\``, inline: false }
                    );

                // Log approval
                try {
                    const { logAction } = require('../utils/loggingSystem');
                    await logAction(interaction.guild, 'warning_appeal_approved', {
                        user: user || { id: userId, tag: 'Unknown User' },
                        moderator: interaction.user,
                        warningId: warningId,
                        appealId: appealId,
                        serverName: serverDetails.name,
                        description: `**${interaction.user.tag}** approved appeal **${appealId}** - Warning removed`
                    }, user);
                } catch (logError) {
                    console.error('❌ Failed to log appeal approval:', logError);
                }
            } else {
                embed.setTitle('❌ Warning Appeal - DENIED')
                    .setColor('#FF0000')
                    .setDescription(`**Appeal denied by ${interaction.user.tag}**\nThe warning will remain on the user's record.`)
                    .addFields(
                        { name: '🏠 Server Details', value: `**${serverDetails.name}**\n👥 ${serverDetails.memberCount} members\n👑 ${serverDetails.owner}`, inline: true },
                        { name: '👤 User Information', value: user ? `**${user.tag}**\n${user.toString()}\nID: ${userId}` : `**Unknown User**\nID: ${userId}`, inline: true },
                        { name: '⚖️ Decision Details', value: `**Warning ID:** \`${warningId}\`\n**Appeal ID:** \`${appealId}\`\n**Denied By:** ${interaction.user.tag}\n**Decision Time:** <t:${Math.floor(Date.now() / 1000)}:F>`, inline: false },
                        { name: '⚠️ Original Warning', value: `**Reason:** ${result.warning?.reason || 'Unknown'}\n**Severity:** ${result.warning?.severity || 'minor'}\n**Status:** ❌ Upheld`, inline: true },
                        { name: '📝 Appeal Reason', value: `\`\`\`${appealReason}\`\`\``, inline: false }
                    );

                // Log denial
                try {
                    const { logAction } = require('../utils/loggingSystem');
                    await logAction(interaction.guild, 'warning_appeal_denied', {
                        user: user || { id: userId, tag: 'Unknown User' },
                        moderator: interaction.user,
                        warningId: warningId,
                        appealId: appealId,
                        serverName: serverDetails.name,
                        description: `**${interaction.user.tag}** denied appeal **${appealId}** - Warning upheld`
                    }, user);
                } catch (logError) {
                    console.error('❌ Failed to log appeal denial:', logError);
                }
            }
        } else {
            embed.setTitle('❌ Error Processing Appeal')
                .setColor('#FF0000')
                .setDescription(`**Failed to process appeal:** ${result.message}`)
                .addFields(
                    { name: '🏠 Server', value: serverDetails.name, inline: true },
                    { name: '⚖️ Appeal ID', value: appealId, inline: true },
                    { name: '🆔 Warning ID', value: warningId, inline: true }
                );
        }

        // Update the message first
        await interaction.message.edit({
            embeds: [embed],
            components: []
        });

        // Acknowledge the interaction immediately to prevent timeout
        try {
            await interaction.deferUpdate();
        } catch (deferError) {
            // Interaction might already be handled, which is fine
            console.log(`ℹ️ Interaction defer skipped: ${deferError.message}`);
        }

        // Send decision to user via DM
        if (user && result.success) {
            try {
                const dmEmbed = new EmbedBuilder()
                    .setTitle(isApprove ? '✅ Your Appeal Was Approved' : '❌ Your Appeal Was Denied')
                    .setColor(isApprove ? '#00FF00' : '#FF0000')
                    .setDescription(`Your warning appeal in **${serverDetails.name}** has been ${isApprove ? 'approved' : 'denied'}.`)
                    .addFields(
                        { name: '🏠 Server', value: `**${serverDetails.name}**\nID: ${serverDetails.id}`, inline: true },
                        { name: '⚖️ Decision', value: `**Moderator:** ${interaction.user.tag}\n**Time:** <t:${Math.floor(Date.now() / 1000)}:f>`, inline: true },
                        { name: '🆔 Reference', value: `**Warning ID:** \`${warningId}\`\n**Appeal ID:** \`${appealId}\``, inline: false }
                    )
                    .setThumbnail(serverDetails.icon)
                    .setFooter({ 
                        text: `Appeal Decision • ${serverDetails.name}`,
                        iconURL: interaction.client.user.displayAvatarURL()
                    })
                    .setTimestamp();

                if (isApprove) {
                    dmEmbed.addFields({ 
                        name: '✅ Result', 
                        value: 'Your warning has been removed from your record. Thank you for your patience.', 
                        inline: false 
                    });
                } else {
                    dmEmbed.addFields({ 
                        name: '❌ Result', 
                        value: 'The warning will remain on your record. If you have further concerns, please contact server staff.', 
                        inline: false 
                    });
                }

                const feedbackButton = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`appeal_feedback|${interaction.guild.id}|${userId}|${appealId}`)
                        .setLabel('📝 Share Feedback')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('💭')
                );

                await user.send({
                    embeds: [dmEmbed],
                    components: [feedbackButton]
                });
                console.log(`📧 Appeal decision DM sent to ${user.tag}`);
            } catch (dmError) {
                console.error('❌ Could not send appeal decision DM:', dmError);
            }
        }

        // Don't send a response if the appeal was processed successfully
        // The embed update already shows the decision
        console.log(`✅ Appeal decision processed: ${appealId} ${isApprove ? 'approved' : 'denied'} by ${interaction.user.tag} in ${serverDetails.name}`);

    } catch (error) {
        console.error('❌ Error processing appeal decision:', error);

        // Only show error if the appeal processing actually failed
        if (!result || !result.success) {
            try {
                if (!interaction.replied && !interaction.deferred && interaction.isRepliable()) {
                    await interaction.reply({
                        content: '❌ **Error**: Failed to process the appeal decision. Please try again.',
                        flags: 64
                    });
                }
            } catch (replyError) {
                console.error('❌ Failed to send error reply:', replyError);
            }
        }
    }
}

// Timeout appeal handlers
async function handleTimeoutAppealButton(interaction) {
    console.log(`🔇 Timeout appeal button: ${interaction.user.tag} - ${interaction.customId}`);

    const validation = await validateAndPrepareInteraction(interaction, 'button');
    if (!validation.valid) {
        return;
    }

    // Parse custom ID: appeal|timeout|guildId|violation|userId
    const parts = interaction.customId.split('|');
    if (parts.length !== 5 || parts[0] !== 'appeal' || parts[1] !== 'timeout') {
        const response = await safeInteractionReply(interaction, {
            content: '❌ **Error**: Invalid timeout appeal button format.',
            flags: 64
        });
        return;
    }

    const [, , guildId, violation, originalUserId] = parts;

    if (originalUserId !== interaction.user.id) {
        const response = await safeInteractionReply(interaction, {
            content: '❌ **Error**: You can only appeal your own timeouts.',
            flags: 64
        });
        return;
    }

    const serverDetails = await getServerDetails(interaction.client, guildId);
    const appealId = createAppealId();
    const violationDisplayName = violation.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());

    const modal = new ModalBuilder()
        .setCustomId(`timeout_appeal_modal|${guildId}|${violation}|${interaction.user.id}|${appealId}`)
        .setTitle(`Appeal Timeout - ${serverDetails.name.substring(0, 30)}`);

    const reasonInput = new TextInputBuilder()
        .setCustomId('appeal_reason')
        .setLabel(`Why was the ${violationDisplayName} action incorrect?`)
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Explain clearly why you believe the timeout was issued in error...')
        .setRequired(true)
        .setMinLength(10)
        .setMaxLength(1000);

    const evidenceInput = new TextInputBuilder()
        .setCustomId('appeal_evidence')
        .setLabel('Supporting Evidence (Optional)')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Any screenshots, context, or additional information that supports your appeal...')
        .setRequired(false)
        .setMaxLength(500);

    const row1 = new ActionRowBuilder().addComponents(reasonInput);
    const row2 = new ActionRowBuilder().addComponents(evidenceInput);
    modal.addComponents(row1, row2);

    const response = await safeInteractionReply(interaction, modal, 'modal');
    if (response.success) {
        console.log(`✅ Timeout appeal modal shown: ${interaction.user.tag} for ${violation} in ${serverDetails.name}`);

        appealStates.set(appealId, {
            userId: interaction.user.id,
            guildId,
            violation,
            serverDetails,
            timestamp: Date.now()
        });
    }
}

async function handleTimeoutAppealModal(interaction) {
    console.log(`📝 Timeout appeal modal: ${interaction.user.tag} - ${interaction.customId}`);

    const validation = await validateAndPrepareInteraction(interaction, 'modal');
    if (!validation.valid) {
        return;
    }

    const parts = interaction.customId.split('|');
    if (parts.length !== 5) {
        const response = await safeInteractionReply(interaction, {
            content: '❌ **Error**: Invalid timeout appeal modal format.',
            flags: 64
        });
        return;
    }

    const [, guildId, violation, userId, appealId] = parts;

    if (userId !== interaction.user.id) {
        const response = await safeInteractionReply(interaction, {
            content: '❌ **Error**: User verification failed.',
            flags: 64
        });
        return;
    }

    let appealReason, appealEvidence;
    try {
        appealReason = interaction.fields.getTextInputValue('appeal_reason');
        appealEvidence = interaction.fields.getTextInputValue('appeal_evidence') || 'None provided';
    } catch (error) {
        const response = await safeInteractionReply(interaction, {
            content: '❌ **Error**: Failed to process appeal form data.',
            flags: 64
        });
        return;
    }

    const serverDetails = appealStates.get(appealId)?.serverDetails || 
                          await getServerDetails(interaction.client, guildId);

    const violationDisplayName = violation.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());

    try {
        // Success response to user
        const userEmbed = new EmbedBuilder()
            .setTitle('✅ Timeout Appeal Submitted Successfully')
            .setColor('#00FF00')
            .setDescription(`Your timeout appeal has been submitted and will be reviewed by the moderation team.`)
            .addFields(
                { name: '🏠 Server Details', value: `**${serverDetails.name}**\n${serverDetails.description}\n👥 ${serverDetails.memberCount} members`, inline: false },
                { name: '🚫 Appeal Information', value: `**Violation:** ${violationDisplayName}\n**Appeal ID:** \`${appealId}\`\n**Submitted:** <t:${Math.floor(Date.now() / 1000)}:f>`, inline: true },
                { name: '📊 Server Info', value: `**Owner:** ${serverDetails.owner}\n**Created:** <t:${Math.floor(serverDetails.createdAt?.getTime() / 1000 || Date.now() / 1000)}:R>\n**Region:** ${serverDetails.region}`, inline: true },
                { name: '📝 Your Appeal Reason', value: `\`\`\`${appealReason.length > 200 ? appealReason.substring(0, 200) + '...' : appealReason}\`\`\``, inline: false }
            )
            .setThumbnail(serverDetails.icon)
            .setFooter({ 
                text: `Timeout Appeal System v3.0 • Server ID: ${guildId}`,
                iconURL: interaction.client.user.displayAvatarURL()
            })
            .setTimestamp();

        if (appealEvidence !== 'None provided') {
            userEmbed.addFields({ 
                name: '📋 Supporting Evidence', 
                value: `\`\`\`${appealEvidence.length > 150 ? appealEvidence.substring(0, 150) + '...' : appealEvidence}\`\`\``, 
                inline: false 
            });
        }

        const response = await safeInteractionReply(interaction, { 
            embeds: [userEmbed], 
            flags: 64 
        });

        if (response.success) {
            // Send to moderation team
            await sendTimeoutAppealToModerators(interaction.client, {
                appealId,
                guildId,
                violation,
                violationDisplayName,
                userId,
                user: interaction.user,
                appealReason,
                appealEvidence,
                serverDetails
            });

            console.log(`✅ Timeout appeal submitted: ${appealId} by ${interaction.user.tag} for ${violation} in ${serverDetails.name}`);
        }

    } catch (error) {
        console.error('❌ Error processing timeout appeal:', error);

        const response = await safeInteractionReply(interaction, {
            content: '❌ **Error**: Failed to process your timeout appeal. Please try again later or contact a moderator.',
            flags: 64
        });
    } finally {
        if (appealId) {
            appealStates.delete(appealId);
        }
    }
}

async function sendTimeoutAppealToModerators(client, appealData) {
    try {
        const { appealId, guildId, violation, violationDisplayName, userId, user, appealReason, appealEvidence, serverDetails } = appealData;

        const guild = await client.guilds.fetch(guildId);

        const appealEmbed = new EmbedBuilder()
            .setTitle('⏰ New Timeout Appeal Received')
            .setColor('#FFA500')
            .setDescription(`**${user.tag}** has appealed their timeout in **${serverDetails.name}**`)
            .addFields(
                { name: '👤 Appealing User', value: `${user.toString()}\n**Tag:** ${user.tag}\n**ID:** ${userId}\n**Account Created:** <t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
                { name: '🏠 Server Details', value: `**Name:** ${serverDetails.name}\n**ID:** ${guildId}\n**Members:** ${serverDetails.memberCount}\n**Owner:** ${serverDetails.owner}`, inline: true },
                { name: '🚫 Timeout Information', value: `**Violation:** ${violationDisplayName}\n**Appeal ID:** \`${appealId}\`\n**Submitted:** <t:${Math.floor(Date.now() / 1000)}:F>\n**Status:** 🟡 Pending Review`, inline: false },
                { name: '📝 Appeal Reason', value: `\`\`\`${appealReason}\`\`\``, inline: false },
                { name: '📋 Supporting Evidence', value: `\`\`\`${appealEvidence}\`\`\``, inline: false },
                { name: '📊 Additional Server Info', value: `**Verification Level:** ${serverDetails.verificationLevel}\n**Region:** ${serverDetails.region}\n**Created:** <t:${Math.floor(serverDetails.createdAt?.getTime() / 1000 || Date.now() / 1000)}:R>`, inline: true }
            )
            .setThumbnail(user.displayAvatarURL({ dynamic: true }))
            .setImage(serverDetails.icon)
            .setFooter({ 
                text: `Timeout Appeal • Appeal ID: ${appealId}`,
                iconURL: client.user.displayAvatarURL()
            })
            .setTimestamp();

        const actionRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`timeout_appeal_approve|${userId}|${violation}|${appealId}`)
                .setLabel('✅ Approve Appeal')
                .setStyle(ButtonStyle.Success)
                .setEmoji('⚖️'),
            new ButtonBuilder()
                .setCustomId(`timeout_appeal_deny|${userId}|${violation}|${appealId}`)
                .setLabel('❌ Deny Appeal')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('🚫'),
            new ButtonBuilder()
                .setCustomId(`appeal_feedback|${guildId}|${userId}|${appealId}`)
                .setLabel('📝 Write Feedback')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('💭')
        );

        const logChannel = getModLogChannel(guild);
        if (logChannel) {
            await logChannel.send({
                content: `🔔 **New Timeout Appeal** from ${user.tag} in **${serverDetails.name}**\n${user.toString()}`,
                embeds: [appealEmbed],
                components: [actionRow]
            });

            // Log the timeout appeal submission
            const { logAction } = require('../utils/loggingSystem');
            await logAction(guild, 'timeout_appeal_submitted', {
                user: user,
                appealId: appealId,
                violation: violationDisplayName,
                appealReason: appealReason,
                serverName: serverDetails.name,
                description: `**${user.tag}** submitted timeout appeal **${appealId}** for ${violationDisplayName}`
            }, user);
        } else {
            console.warn(`⚠️ No mod log channel configured for ${guild.name} (${guild.id})`);
        }

    } catch (error) {
        console.error('❌ Error sending timeout appeal to moderators:', error);
    }
}

// Feedback system handlers
async function handleAppealFeedbackButton(interaction) {
    console.log(`💭 Appeal feedback button: ${interaction.user.tag} - ${interaction.customId}`);

    const validation = await validateAndPrepareInteraction(interaction, 'button');
    if (!validation.valid) {
        return;
    }

    const parts = interaction.customId.split('|');
    if (parts.length < 3) {
        const response = await safeInteractionReply(interaction, {
            content: '❌ **Error**: Invalid feedback button format.',
            flags: 64
        });
        return;
    }

    const [, guildId, userId, appealId = 'UNKNOWN'] = parts;
    const serverDetails = await getServerDetails(interaction.client, guildId);

    const modal = new ModalBuilder()
        .setCustomId(`appeal_feedback_modal|${guildId}|${userId}|${appealId}`)
        .setTitle(`Feedback - ${serverDetails.name.substring(0, 35)}`);

    const experienceInput = new TextInputBuilder()
        .setCustomId('feedback_experience')
        .setLabel('How was your appeal experience?')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Please describe your experience with the appeal process. What went well? What could be improved?')
        .setMaxLength(800)
        .setRequired(true);

    const ratingInput = new TextInputBuilder()
        .setCustomId('feedback_rating')
        .setLabel('Rate your experience (1-5 stars)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('5')
        .setMaxLength(1)
        .setRequired(true);

    const suggestionInput = new TextInputBuilder()
        .setCustomId('feedback_suggestions')
        .setLabel('Suggestions for improvement (Optional)')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Any specific suggestions to make the appeal process better?')
        .setMaxLength(400)
        .setRequired(false);

    const row1 = new ActionRowBuilder().addComponents(experienceInput);
    const row2 = new ActionRowBuilder().addComponents(ratingInput);
    const row3 = new ActionRowBuilder().addComponents(suggestionInput);

    modal.addComponents(row1, row2, row3);

    const response = await safeInteractionReply(interaction, modal, 'modal');
    if (response.success) {
        console.log(`✅ Feedback modal shown: ${interaction.user.tag} for appeal in ${serverDetails.name}`);
    }
}

async function handleAppealFeedbackModal(interaction) {
    console.log(`📝 Appeal feedback modal: ${interaction.user.tag} - ${interaction.customId}`);

    const validation = await validateAndPrepareInteraction(interaction, 'modal');
    if (!validation.valid) {
        return;
    }

    const parts = interaction.customId.split('|');
    if (parts.length !== 4) {
        const response = await safeInteractionReply(interaction, {
            content: '❌ **Error**: Invalid feedback modal format.',
            flags: 64
        });
        return;
    }

    const [, guildId, userId, appealId] = parts;

    let experience, rating, suggestions;
    try {
        experience = interaction.fields.getTextInputValue('feedback_experience');
        rating = interaction.fields.getTextInputValue('feedback_rating');
        suggestions = interaction.fields.getTextInputValue('feedback_suggestions') || 'None provided';
    } catch (error) {
        const response = await safeInteractionReply(interaction, {
            content: '❌ **Error**: Failed to get feedback data.',
            flags: 64
        });
        return;
    }

    const ratingNum = parseInt(rating);
    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
        const response = await safeInteractionReply(interaction, {
            content: '❌ **Error**: Please provide a valid rating between 1 and 5.',
            flags: 64
        });
        return;
    }

    try {
        const serverDetails = await getServerDetails(interaction.client, guildId);
        const guild = await interaction.client.guilds.fetch(guildId);

        // Save feedback data
        const fs = require('fs').promises;
        const path = require('path');
        const feedbackPath = path.join(__dirname, '../config/appeal_feedback.json');

        let feedbackData = { feedback: [] };
        try {
            feedbackData = JSON.parse(await fs.readFile(feedbackPath, 'utf8'));
        } catch (e) {
            // File doesn't exist, use default
        }

        if (!feedbackData.feedback) feedbackData.feedback = [];

        feedbackData.feedback.push({
            id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            appealId,
            userId: interaction.user.id,
            username: interaction.user.tag,
            guildId: guild.id,
            guildName: serverDetails.name,
            rating: ratingNum,
            experience,
            suggestions,
            timestamp: Date.now(),
            serverDetails: {
                memberCount: serverDetails.memberCount,
                owner: serverDetails.owner,
                region: serverDetails.region
            }
        });

        // Keep only last 200 feedback entries
        if (feedbackData.feedback.length > 200) {
            feedbackData.feedback = feedbackData.feedback.slice(-200);
        }

        await fs.writeFile(feedbackPath, JSON.stringify(feedbackData, null, 2));

        // Send feedback to log channel
        const feedbackEmbed = new EmbedBuilder()
            .setTitle('📝 New Appeal System Feedback')
            .setColor('#9B59B6')
            .setDescription(`**${interaction.user.tag}** shared feedback about the appeal process`)
            .addFields(
                { name: '👤 User Information', value: `**Tag:** ${interaction.user.tag}\n**ID:** ${interaction.user.id}\n**Account:** <t:${Math.floor(interaction.user.createdTimestamp / 1000)}:R>`, inline: true },
                { name: '🏠 Server Details', value: `**${serverDetails.name}**\n**ID:** ${guildId}\n**Members:** ${serverDetails.memberCount}`, inline: true },
                { name: '⭐ Rating & Appeal', value: `**Rating:** ${ratingNum}/5 ${'⭐'.repeat(ratingNum)}\n**Appeal ID:** \`${appealId}\`\n**Submitted:** <t:${Math.floor(Date.now() / 1000)}:f>`, inline: true },
                { name: '💭 Experience Feedback', value: `\`\`\`${experience}\`\`\``, inline: false },
                { name: '💡 Suggestions', value: `\`\`\`${suggestions}\`\`\``, inline: false },
                { name: '📊 Additional Context', value: `**Server Owner:** ${serverDetails.owner}\n**Server Region:** ${serverDetails.region}\n**Verification:** ${serverDetails.verificationLevel}`, inline: true }
            )
            .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
            .setImage(serverDetails.icon)
            .setFooter({ 
                text: `Appeal Feedback System • Feedback ID: ${feedbackData.feedback[feedbackData.feedback.length - 1].id}`,
                iconURL: interaction.client.user.displayAvatarURL()
            })
            .setTimestamp();

        const logChannel = getModLogChannel(guild);
        if (logChannel) {
            await logChannel.send({
                content: '📝 **New Appeal System Feedback**',
                embeds: [feedbackEmbed]
            });
        }

        // Success response
        const response = await safeInteractionReply(interaction, {
            content: `✅ **Thank you for your feedback!**\n\n**Your Experience Rating:** ${ratingNum}/5 ${'⭐'.repeat(ratingNum)}\n**Server:** ${serverDetails.name}\n**Appeal ID:** \`${appealId}\`\n\nYour feedback helps us improve the appeal process for everyone. We truly appreciate you taking the time to share your thoughts!`,
            flags: 64
        });

        console.log(`📝 Appeal feedback received: ${ratingNum}/5 stars from ${interaction.user.tag} in ${serverDetails.name}`);

    } catch (error) {
        console.error('❌ Error processing appeal feedback:', error);

        const response = await safeInteractionReply(interaction, {
            content: '❌ **Error**: Failed to submit your feedback. Please try again later.',
            flags: 64
        });
    }
}

async function handleTimeoutAppealDecision(interaction) {
    console.log(`⏰ Timeout appeal decision: ${interaction.user.tag} - ${interaction.customId}`);

    const validation = await validateAndPrepareInteraction(interaction, 'button');
    if (!validation.valid) {
        return;
    }

    // Parse custom ID: timeout_appeal_approve|userId|violation|appealId OR timeout_appeal_deny|userId|violation|appealId
    const parts = interaction.customId.split('|');
    if (parts.length !== 4) {
        const response = await safeInteractionReply(interaction, {
            content: '❌ **Error**: Invalid timeout appeal decision format.',
            flags: 64
        });
        return;
    }

    const [action, userId, violation, appealId] = parts;
    const isApprove = action === 'timeout_appeal_approve';

    // Check permissions
    if (!interaction.member.permissions.has('ManageMessages')) {
        const response = await safeInteractionReply(interaction, {
            content: '❌ **Error**: You need the "Manage Messages" permission to handle appeals.',
            flags: 64
        });
        return;
    }

    // Check if already processed
    const originalEmbed = interaction.message.embeds[0];
    if (originalEmbed && originalEmbed.title &&
        (originalEmbed.title.includes('APPROVED') || originalEmbed.title.includes('DENIED'))) {
        const response = await safeInteractionReply(interaction, {
            content: '❌ **Error**: This appeal has already been processed.',
            flags: 64
        });
        return;
    }

    try {
        const serverDetails = await getServerDetails(interaction.client, interaction.guild.id);
        const user = await interaction.client.users.fetch(userId).catch(() => null);
        const violationDisplayName = violation.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());

        let embed = new EmbedBuilder()
            .setTimestamp()
            .setFooter({ 
                text: `Timeout Appeal Decision • Appeal ID: ${appealId}`,
                iconURL: interaction.client.user.displayAvatarURL()
            });

        if (isApprove) {
            // Remove timeout from user
            const member = await interaction.guild.members.fetch(userId).catch(() => null);
            if (member && member.isCommunicationDisabled()) {
                await member.timeout(null, `Timeout appeal approved by ${interaction.user.tag}`);
            }

            embed.setTitle('✅ Timeout Appeal - APPROVED')
                .setColor('#00FF00')
                .setDescription(`**Appeal approved by ${interaction.user.tag}**\nThe user's timeout has been removed.`)
                .addFields(
                    { name: '🏠 Server Details', value: `**${serverDetails.name}**\n👥 ${serverDetails.memberCount} members\n👑 ${serverDetails.owner}`, inline: true },
                    { name: '👤 User Information', value: user ? `**${user.tag}**\n${user.toString()}\nID: ${userId}` : `**Unknown User**\nID: ${userId}`, inline: true },
                    { name: '⚖️ Decision Details', value: `**Violation:** ${violationDisplayName}\n**Appeal ID:** \`${appealId}\`\n**Approved By:** ${interaction.user.tag}\n**Decision Time:** <t:${Math.floor(Date.now() / 1000)}:F>`, inline: false },
                    { name: '🚫 Original Action', value: `**Type:** Automatic Timeout\n**Reason:** ${violationDisplayName}\n**Status:** ✅ Removed`, inline: true }
                );

            // Log approval
            try {
                const { logAction } = require('../utils/loggingSystem');
                await logAction(interaction.guild, 'timeout_appeal_approved', {
                    user: user || { id: userId, tag: 'Unknown User' },
                    moderator: interaction.user,
                    violation: violationDisplayName,
                    appealId: appealId,
                    serverName: serverDetails.name,
                    description: `**${interaction.user.tag}** approved timeout appeal **${appealId}** - Timeout removed`
                }, user);
            } catch (logError) {
                console.error('❌ Failed to log timeout appeal approval:', logError);
            }
        } else {
            embed.setTitle('❌ Timeout Appeal - DENIED')
                .setColor('#FF0000')
                .setDescription(`**Appeal denied by ${interaction.user.tag}**\nThe timeout will remain in effect.`)
                .addFields(
                    { name: '🏠 Server Details', value: `**${serverDetails.name}**\n👥 ${serverDetails.memberCount} members\n👑 ${serverDetails.owner}`, inline: true },
                    { name: '👤 User Information', value: user ? `**${user.tag}**\n${user.toString()}\nID: ${userId}` : `**Unknown User**\nID: ${userId}`, inline: true },
                    { name: '⚖️ Decision Details', value: `**Violation:** ${violationDisplayName}\n**Appeal ID:** \`${appealId}\`\n**Denied By:** ${interaction.user.tag}\n**Decision Time:** <t:${Math.floor(Date.now() / 1000)}:F>`, inline: false },
                    { name: '🚫 Original Action', value: `**Type:** Automatic Timeout\n**Reason:** ${violationDisplayName}\n**Status:** ❌ Upheld`, inline: true }
                );

            // Log denial
            try {
                const { logAction } = require('../utils/loggingSystem');
                await logAction(interaction.guild, 'timeout_appeal_denied', {
                    user: user || { id: userId, tag: 'Unknown User' },
                    moderator: interaction.user,
                    violation: violationDisplayName,
                    appealId: appealId,
                    serverName: serverDetails.name,
                    description: `**${interaction.user.tag}** denied timeout appeal **${appealId}** - Timeout upheld`
                }, user);
            } catch (logError) {
                console.error('❌ Failed to log timeout appeal denial:', logError);
            }
        }

        // Update the message
        await interaction.message.edit({
            embeds: [embed],
            components: []
        });

        // Send decision to user via DM
        if (user) {
            try {
                const dmEmbed = new EmbedBuilder()
                    .setTitle(isApprove ? '✅ Your Timeout Appeal Was Approved' : '❌ Your Timeout Appeal Was Denied')
                    .setColor(isApprove ? '#00FF00' : '#FF0000')
                    .setDescription(`Your timeout appeal in **${serverDetails.name}** has been ${isApprove ? 'approved' : 'denied'}.`)
                    .addFields(
                        { name: '🏠 Server', value: `**${serverDetails.name}**\nID: ${serverDetails.id}`, inline: true },
                        { name: '⚖️ Decision', value: `**Moderator:** ${interaction.user.tag}\n**Time:** <t:${Math.floor(Date.now() / 1000)}:f>`, inline: true },
                        { name: '🆔 Reference', value: `**Violation:** ${violationDisplayName}\n**Appeal ID:** \`${appealId}\``, inline: false }
                    )
                    .setThumbnail(serverDetails.icon)
                    .setFooter({ 
                        text: `Timeout Appeal Decision • ${serverDetails.name}`,
                        iconURL: interaction.client.user.displayAvatarURL()
                    })
                    .setTimestamp();

                if (isApprove) {
                    dmEmbed.addFields({ 
                        name: '✅ Result', 
                        value: 'Your timeout has been removed. You can now participate normally in the server.', 
                        inline: false 
                    });
                } else {
                    dmEmbed.addFields({ 
                        name: '❌ Result', 
                        value: 'Your timeout remains in effect. If you have further concerns, please contact server staff.', 
                        inline: false 
                    });
                }

                await user.send({ embeds: [dmEmbed] });
            } catch (dmError) {
                console.error('❌ Could not send timeout appeal decision DM:', dmError);
            }
        }

        const response = await safeInteractionReply(interaction, {
            content: `${embed.data.title}\n\n**Server:** ${serverDetails.name}\n**User:** ${user ? user.tag : `ID: ${userId}`} has been notified via DM.`,
            flags: 64
        });

        console.log(`✅ Timeout appeal decision processed: ${appealId} ${isApprove ? 'approved' : 'denied'} by ${interaction.user.tag} in ${serverDetails.name}`);

    } catch (error) {
        console.error('❌ Error processing timeout appeal decision:', error);

        const response = await safeInteractionReply(interaction, {
            content: `❌ **Error**: Failed to process the timeout appeal decision. Please try again.\n\n**Error Details:** ${error.message}`,
            flags: 64
        });
    }
}

// Cleanup function to clear old appeal states
setInterval(() => {
    const cutoff = Date.now() - (30 * 60 * 1000); // 30 minutes
    let cleaned = 0;

    for (const [appealId, state] of appealStates.entries()) {
        if (state.timestamp < cutoff) {
            appealStates.delete(appealId);
            cleaned++;
        }
    }

    if (cleaned > 0) {
        console.log(`🧹 Cleaned ${cleaned} expired appeal states`);
    }
}, 5 * 60 * 1000); // Run every 5 minutes

module.exports = {
    handleWarningAppealButton,
    handleWarningAppealModal,
    handleWarningAppealDecision,
    handleTimeoutAppealButton,
    handleTimeoutAppealModal,
    handleTimeoutAppealDecision,
    handleAppealFeedbackButton,
    handleAppealFeedbackModal,
    getModLogChannel,
    getServerDetails,
    createAppealId,
    safeInteractionReply
};