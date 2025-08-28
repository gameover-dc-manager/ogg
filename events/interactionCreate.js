const { Events, EmbedBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { handleCustomCommands } = require('../components/customCommandHandler');
const { handleEditProfileModal, handleThemeModal, handleEditNoteModal } = require('./modalHandlers');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        // Initialize global interaction tracking with timestamps
        if (!global.processedInteractions) {
            global.processedInteractions = new Map();
        }

        // Check for duplicate interaction processing
        const interactionId = interaction.id;
        if (global.processedInteractions.has(interactionId)) {
            console.log(`ℹ️ Interaction already processed: ${interactionId}`);
            return;
        }

        // Mark interaction as processed with timestamp
        global.processedInteractions.set(interactionId, Date.now());

        // Clean up old interaction IDs periodically (older than 5 minutes)
        if (global.processedInteractions.size > 200) {
            const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
            for (const [id, timestamp] of global.processedInteractions.entries()) {
                if (timestamp < fiveMinutesAgo) {
                    global.processedInteractions.delete(id);
                }
            }
        }

        // Handle different types of interactions
        try {
            // Handle submission interactions
            if (interaction.customId && interaction.customId.startsWith('submission_')) {
                const submissionHandler = require('../components/submissionHandler');
                return await submissionHandler.handleSubmissionInteraction(interaction);
            }

            // Handle slash commands
            if (interaction.isChatInputCommand()) {
                // Additional validation for interaction state
                const interactionAge = Date.now() - interaction.createdTimestamp;
                if (interactionAge > 2000) { // Reduced from 2500ms to 2000ms
                    console.log(`⏰ Slash command interaction too old (${interactionAge}ms) for ${interaction.user.tag} - command: ${interaction.commandName}`);
                    return;
                }

                if (!interaction.isRepliable()) {
                    console.log(`ℹ️ Slash command interaction not repliable for ${interaction.user.tag} - command: ${interaction.commandName}`);
                    return;
                }

                const command = interaction.client.commands.get(interaction.commandName);

                if (!command) {
                    // Check for custom slash commands
                    const CustomCommandHandler = require('../components/customCommandHandler');
                    const { loadCustomCommands } = require('../commands/customcommands');

                    try {
                        const customCommandsData = await loadCustomCommands();
                        const guildCommands = customCommandsData[interaction.guild?.id] || {};
                        const customCommand = guildCommands[interaction.commandName.toLowerCase()];

                        if (customCommand && customCommand.enabled && (customCommand.commandType === 'both' || customCommand.commandType === 'slash')) {
                            // Create a mock message object for the custom command handler
                            const mockMessage = {
                                author: interaction.user,
                                member: interaction.member,
                                guild: interaction.guild,
                                channel: interaction.channel,
                                content: `/${interaction.commandName}`,
                                reply: async (content) => {
                                    if (interaction.replied || interaction.deferred) {
                                        return await interaction.followUp(typeof content === 'string' ? { content } : content);
                                    } else {
                                        return await interaction.reply(typeof content === 'string' ? { content } : content);
                                    }
                                }
                            };

                            await CustomCommandHandler.handleCustomCommand(mockMessage, interaction.commandName, true);
                            return;
                        }
                    } catch (error) {
                        console.error('❌ Error handling custom slash command:', error);
                    }

                    // Unknown command
                    if (!interaction.replied && !interaction.deferred) {
                        await interaction.reply({
                            content: '❌ Unknown command!',
                            flags: 64
                        });
                    }
                    return; // Exit if command is not found and not a custom command
                }

                try {
                    // Check if interaction is still valid before executing
                    if (!interaction.isRepliable()) {
                        console.log(`ℹ️ Interaction expired for ${interaction.user.tag} - command: ${interaction.commandName}`);
                        return;
                    }

                    // Check if interaction is too old (Discord interactions expire after 3 seconds)
                    const interactionAge = Date.now() - interaction.createdTimestamp;
                    if (interactionAge > 2800) { // More strict timeout check
                        console.log(`ℹ️ Interaction too old (${interactionAge}ms) for ${interaction.user.tag} - command: ${interaction.commandName}`);
                        return;
                    }

                    // Additional check - ensure interaction hasn't been replied to already
                    if (interaction.replied || interaction.deferred) {
                        console.log(`ℹ️ Interaction already handled for ${interaction.user.tag} - command: ${interaction.commandName}`);
                        return;
                    }

                    const startTime = Date.now();
                    try {
                        // Add timeout wrapper for long-running commands
                        const commandTimeout = new Promise((_, reject) =>
                            setTimeout(() => reject(new Error('Command execution timeout')), 8000)
                        );

                        await Promise.race([
                            command.execute(interaction),
                            commandTimeout
                        ]);

                        // Track successful command execution
                        const responseTime = Date.now() - startTime;
                        const analyticsTracker = require('../utils/analyticsTracker');
                        await analyticsTracker.trackCommand(interaction.guild, command.data.name, interaction.user, responseTime);

                    } catch (error) {
                        if (error.message === 'Command execution timeout') {
                            console.error(`❌ Command timeout [${command.data.name}] after 8s for ${interaction.user.tag}`);
                        } else {
                            console.error(`❌ Command execution error [${command.data.name}]:`, error);
                        }

                        // Only reply if interaction is still valid and hasn't been handled
                        if (!interaction.replied && !interaction.deferred && interaction.isRepliable()) {
                            const currentAge = Date.now() - interaction.createdTimestamp;
                            if (currentAge < 2000) { // Reduced timeout for error replies
                                try {
                                    const reply = {
                                        content: error.message === 'Command execution timeout'
                                            ? '⏰ Command timed out! Please try again.'
                                            : 'There was an error while executing this command!',
                                        flags: 64
                                    };
                                    await interaction.reply(reply);
                                } catch (replyError) {
                                    console.error('Failed to send command error reply:', replyError);
                                }
                            }
                        } else if (interaction.deferred && !interaction.replied && interaction.isRepliable()) {
                            const currentAge = Date.now() - interaction.createdTimestamp;
                            if (currentAge < 2500) {
                                try {
                                    const errorMsg = error.message === 'Command execution timeout'
                                        ? '⏰ Command timed out! Please try again.'
                                        : 'There was an error while executing this command!';
                                    await interaction.editReply({ content: errorMsg });
                                } catch (editError) {
                                    console.error('Failed to edit deferred reply with error:', editError);
                                }
                            }
                        }
                    }
                } catch (error) {
                    console.error(`❌ Error executing command ${interaction.commandName}:`, error);

                    // Skip error reply for expired/unknown interactions
                    if (error.code === 10062 || error.code === 40060 || error.message?.includes('Unknown interaction')) {
                        console.log(`ℹ️ Skipping error reply due to interaction state (code: ${error.code}, message: ${error.message})`);
                        return;
                    }

                    const errorMessage = '❌ **Error**: Something went wrong processing your request. Please try again later.';

                    try {
                        // Only reply if we haven't already responded and interaction is still valid
                        if (!interaction.replied && !interaction.deferred && interaction.isRepliable()) {
                            await interaction.reply({ content: errorMessage, flags: 64 });
                        } else if (interaction.deferred && !interaction.replied && interaction.isRepliable()) {
                            await interaction.editReply({ content: errorMessage });
                        }
                    } catch (replyError) {
                        console.error('❌ Failed to send error message:', replyError);
                    }
                }
            }

            // Handle autocomplete
            if (interaction.isAutocomplete()) {
                const command = interaction.client.commands.get(interaction.commandName);

                if (!command) return;

                try {
                    await command.autocomplete(interaction);
                } catch (error) {
                    console.error(error);
                }
            }

            // Handle component interactions (buttons, selects, etc.)
            if (interaction.isButton() || interaction.isAnySelectMenu()) {
                const customId = interaction.customId;

                // Check for duplicate button processing
                const buttonId = `${interaction.id}_${interaction.customId}`;
                if (!global.processedButtons) {
                    global.processedButtons = new Set();
                }

                if (global.processedButtons.has(buttonId)) {
                    console.log(`⚠️ Skipping button interaction: already_processed (${interaction.id})`);
                    return;
                }

                global.processedButtons.add(buttonId);
                setTimeout(() => global.processedButtons.delete(buttonId), 30000);

                // Add a small delay for button interactions to prevent spam
                await new Promise(resolve => setTimeout(resolve, 100));

                console.log(`🔘 Button interaction: ${interaction.customId} from ${interaction.user.tag}`);

                // Handle warning system buttons
                if (customId.startsWith('warn_') || customId.startsWith('warning_')) {
                    const { handleWarningButtons } = require('../components/warningButtons');
                    return await handleWarningButtons(interaction);
                }

                // Handle appeal-related interactions
                if (customId.startsWith('appeal|')) {
                    // Handle warning/timeout appeal buttons
                    if (customId.includes('|warning|') || customId.includes('|timeout|')) {
                        const { handleWarningAppealButton, handleTimeoutAppealButton } = require('../components/appealView');
                        if (customId.includes('|warning|')) {
                            return await handleWarningAppealButton(interaction);
                        } else {
                            return await handleTimeoutAppealButton(interaction);
                        }
                    }
                } else if (customId.startsWith('appeal_')) {
                    // Handle other appeal buttons like feedback
                    const { handleAppealFeedbackButton } = require('../components/appealView');
                    return await handleAppealFeedbackButton(interaction);
                }

                // Handle warning appeal decision buttons
                if (customId.startsWith('warning_appeal_approve|') || customId.startsWith('warning_appeal_deny|')) {
                    const { handleWarningAppealDecision } = require('../components/appealView');
                    return await handleWarningAppealDecision(interaction);
                }

                // Handle custom command help buttons
                if (customId.startsWith('cchelp_')) {
                    const { EmbedBuilder } = require('discord.js');
                    const topic = customId.replace('cchelp_', '');

                    let embed;
                    if (topic === 'basics') {
                        embed = new EmbedBuilder()
                            .setColor('#00FF00')
                            .setTitle('🚀 Getting Started with Custom Commands')
                            .setDescription('Learn the basics of creating custom commands!')
                            .addFields(
                                {
                                    name: '1️⃣ Create Your First Command',
                                    value: '```\n/customcommands create\nname: hello\nresponse: Hello there, {user}!\n```\nThis creates a simple greeting command.',
                                    inline: false
                                },
                                {
                                    name: '2️⃣ Using Your Command',
                                    value: 'Once created, users can trigger it with:\n• `!hello` (prefix)\n• `/hello` (slash command)\n• Or both, depending on your settings!',
                                    inline: false
                                },
                                {
                                    name: '3️⃣ Command Options',
                                    value: '• **Name**: What users type to trigger it\n• **Response**: What the bot says back\n• **Description**: Helpful info about the command\n• **Embed**: Make it look fancy with colors\n• **Permissions**: Control who can use it',
                                    inline: false
                                },
                                {
                                    name: '💡 Pro Tips',
                                    value: '• Keep names simple and memorable\n• Test your commands after creating them\n• Use variables to make them dynamic\n• Check `/customcommands list` to see all your commands',
                                    inline: false
                                }
                            )
                            .setFooter({ text: 'Next: Learn about Variables with /customcommandhelp variables' });
                    } else if (topic === 'variables') {
                        embed = new EmbedBuilder()
                            .setColor('#FF6B6B')
                            .setTitle('🔧 Variables & Placeholders')
                            .setDescription('Make your commands dynamic with these special variables!')
                            .addFields(
                                {
                                    name: '👤 User Variables',
                                    value: '`{user}` - Mentions the user\n`{username}` - User\'s name\n`{usernickname}` - Server nickname\n`{userid}` - User\'s ID number',
                                    inline: true
                                },
                                {
                                    name: '🏠 Server Variables',
                                    value: '`{server}` - Server name\n`{membercount}` - Total members\n`{channelcount}` - Total channels\n`{serverid}` - Server ID',
                                    inline: true
                                },
                                {
                                    name: '📱 Channel Variables',
                                    value: '`{channel}` - Current channel\n`{channelname}` - Channel name\n`{channelid}` - Channel ID',
                                    inline: true
                                },
                                {
                                    name: '⏰ Time Variables',
                                    value: '`{date}` - Current date\n`{time}` - Current time\n`{timestamp}` - Unix timestamp',
                                    inline: true
                                },
                                {
                                    name: '🎲 Random Variables',
                                    value: '`{random:1-100}` - Random number\n`{choice:yes,no,maybe}` - Random choice\n`{choice:pizza,burgers,tacos}` - Pick food',
                                    inline: true
                                },
                                {
                                    name: '✨ Example Usage',
                                    value: '```\nWelcome {user} to {server}!\nYou are member #{membercount}.\nIt\'s {time} on {date}.\nYour lucky number is {random:1-100}!\n```',
                                    inline: false
                                }
                            )
                            .setFooter({ text: 'Try: {choice:red,blue,green} or {random:1-10} in your commands!' });
                    } else if (topic === 'examples') {
                        embed = new EmbedBuilder()
                            .setColor('#00FFFF')
                            .setTitle('💡 Custom Command Examples')
                            .setDescription('Ready-to-use command ideas you can copy!')
                            .addFields(
                                {
                                    name: '🎉 Welcome Command',
                                    value: '```\nName: welcome\nResponse: Welcome {user} to {server}! 🎉\nWe now have {membercount} members!\nEnjoy your stay in {channel}!\n```',
                                    inline: false
                                },
                                {
                                    name: '🎲 Random Picker',
                                    value: '```\nName: pick\nResponse: 🎯 I choose: {choice:option1,option2,option3}\nReplace options with your choices!\n```',
                                    inline: false
                                },
                                {
                                    name: '🍕 Food Suggestion',
                                    value: '```\nName: food\nResponse: 🍽️ How about {choice:pizza,burgers,sushi,tacos,pasta,salad}?\nPerfect for {time} on {date}!\n```',
                                    inline: false
                                },
                                {
                                    name: '📊 Server Info',
                                    value: '```\nName: serverinfo\nResponse: 📈 {server} Stats:\n👥 Members: {membercount}\n💬 Channels: {channelcount}\n📅 Today: {date}\n```',
                                    inline: false
                                },
                                {
                                    name: '🎲 Dice Roll',
                                    value: '```\nName: roll\nResponse: 🎲 {user} rolled: {random:1-6}\n🍀 Lucky number: {random:1-100}\n```',
                                    inline: false
                                }
                            )
                            .setFooter({ text: 'Copy these examples and customize them for your server!' });
                    }

                    if (embed) {
                        await interaction.update({ embeds: [embed], components: [] });
                    }
                    return;
                }
                // Handle timeout appeal buttons
                else if (customId.startsWith('timeout_appeal_approve|') || customId.startsWith('timeout_appeal_deny|')) {
                    const { handleTimeoutAppealDecision } = require('../components/appealView');
                    return await handleTimeoutAppealDecision(interaction);
                } else if (customId.startsWith('appeal_feedback|')) {
                    const { handleAppealFeedbackButton } = require('../components/appealView');
                    return await handleAppealFeedbackButton(interaction);
                } else if (customId.startsWith('admin_')) {
                    const { handleAdminPanelInteraction } = require('../components/adminPanelHandlers');
                    return await handleAdminPanelInteraction(interaction);
                } else if (customId.startsWith('voting_')) {
                    const { handleVotingButton } = require('../components/votingHandlers');
                    return await handleVotingButton(interaction);
                } else if (customId.startsWith('rr_')) {
                    const { handleReactionRoleButton } = require('../components/reactionRoleHandler');
                    return await handleReactionRoleButton(interaction);
                } else if (customId.startsWith('bj_')) {
                    const { GameHandlers } = require('../components/gameHandlers');
                    const gameHandlers = new GameHandlers();
                    return await gameHandlers.handleBlackjackAction(interaction);
                } else if (customId.startsWith('trivia_')) {
                    const { GameHandlers } = require('../components/gameHandlers');
                    const gameHandlers = new GameHandlers();
                    return await gameHandlers.handleTriviaAnswer(interaction);
                }
                // Handle social interactions
                if (customId.startsWith('social_') || customId.startsWith('profile_') || customId.startsWith('friend_') || customId === 'profile_setup_menu') {
                    const { handleSocialInteraction } = require('../components/socialHandlers');

                    try {
                        return await handleSocialInteraction(interaction);
                    } catch (error) {
                        console.error('Error handling social interaction:', error);
                        if (!interaction.replied && !interaction.deferred) {
                            await interaction.reply({
                                content: '❌ An error occurred while processing your request.',
                                flags: 64
                            });
                        }
                    }
                }
                // Handle leaderboard-specific button interactions
                if (interaction.customId?.startsWith('leaderboard_')) {
                    const { handleLeaderboardButton } = require('../commands/leaderboard.js');
                    await handleLeaderboardButton(interaction);
                    return;
                }

                // Handle server management interactions
                if (interaction.customId?.startsWith('apply_template_') ||
                    interaction.customId?.startsWith('restore_backup_') ||
                    interaction.customId === 'cancel_template' ||
                    interaction.customId === 'cancel_backup' ||
                    interaction.customId === 'analytics_detailed' ||
                    interaction.customId === 'analytics_export') {
                    const { handleServerManagementInteractions } = require('../components/serverManagementHandler');
                    return await handleServerManagementInteractions(interaction);
                }

                // Analytics interactions
                if (customId.startsWith('analytics_')) {
                    const { handleAnalyticsInteraction } = require('../components/analyticsHandler');
                    return await handleAnalyticsInteraction(interaction);
                }

                // Professional tools interactions
                if (customId.startsWith('professional_') ||
                    customId.startsWith('meeting_') ||
                    customId.startsWith('task_') ||
                    customId.startsWith('project_') ||
                    customId.startsWith('timer_')) {
                    const { handleProfessionalInteraction } = require('../components/professionalHandler');
                    return await handleProfessionalInteraction(interaction);
                }

                // Handle education interactions
                if (interaction.customId && (
                    interaction.customId.startsWith('study_') ||
                    interaction.customId.startsWith('flashcard_') ||
                    interaction.customId.startsWith('language_') ||
                    interaction.customId.startsWith('coding_') ||
                    interaction.customId.startsWith('quiz_') ||
                    interaction.customId.startsWith('session_') ||
                    interaction.customId.startsWith('translate_')
                )) {
                    const educationHandler = require('../components/educationHandler');
                    return await educationHandler.handleEducationInteraction(interaction);
                }
            }

            // Handle captcha interactions (only if it's actually a captcha interaction)
            if (interaction.customId && interaction.customId.startsWith('captcha_')) {
                try {
                    const { handleCaptchaInteraction } = require('../components/captchaSystem');
                    if (await handleCaptchaInteraction(interaction, client)) {
                        return;
                    }
                } catch (error) {
                    console.error('❌ Error handling captcha interaction:', error);
                    if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
                        try {
                            await interaction.reply({
                                content: '❌ An error occurred while processing your verification. Please try again.',
                                flags: 64
                            });
                        } catch (replyError) {
                            console.error('❌ Failed to send error reply:', replyError);
                        }
                    }
                    return;
                }
            }

            // Handle modals
            if (interaction.isModalSubmit()) {
                const customId = interaction.customId;
                console.log(`📝 Modal submitted: ${customId}`);

                // Enhanced modal deduplication with stricter timing
                if (!global.processedModalInteractions) {
                    global.processedModalInteractions = new Map();
                }

                const modalHash = `${interaction.id}_${customId}`;
                const lastProcessed = global.processedModalInteractions.get(modalHash);
                if (lastProcessed && Date.now() - lastProcessed < 30000) {
                    console.log(`ℹ️ Modal interaction already processed: ${modalHash}`);
                    return;
                }

                // Check if interaction is already handled
                if (interaction.replied || interaction.deferred) {
                    console.log(`ℹ️ Modal interaction already handled: ${interaction.id}`);
                    return;
                }

                // Stricter interaction age check for modals
                const interactionAge = Date.now() - interaction.createdTimestamp;
                if (interactionAge > 1500) { // Reduced from 2000ms to 1500ms
                    console.log(`ℹ️ Modal interaction too old (${interactionAge}ms), skipping: ${interaction.id}`);
                    return;
                }

                // Check if interaction is repliable
                if (!interaction.isRepliable()) {
                    console.log(`ℹ️ Modal interaction not repliable: ${interaction.id}`);
                    return;
                }

                global.processedModalInteractions.set(modalHash, Date.now());
                console.log(`🔄 Processing modal: ${modalHash}`);

                // Clean up old entries
                if (global.processedModalInteractions.size > 50) {
                    const cutoff = Date.now() - (5 * 60 * 1000); // 5 minutes
                    for (const [hash, timestamp] of global.processedModalInteractions.entries()) {
                        if (timestamp < cutoff) {
                            global.processedModalInteractions.delete(hash);
                        }
                    }
                }

                // Handle warning appeal modals first
                if (customId.startsWith('warning_appeal_modal')) {
                    console.log(`🔄 Processing modal: ${interaction.id}_${interaction.customId}`);
                    const { handleWarningAppealModal } = require('../components/appealView');
                    return await handleWarningAppealModal(interaction);
                }
                // Handle warning modals
                else if (customId.startsWith('warn_modal_') || customId.startsWith('export_')) {
                    const { handleWarningModals } = require('../components/warningModals');
                    await handleWarningModals(interaction);
                }
                // Handle other modals
                else if (customId.startsWith('edit_profile')) {
                    await handleEditProfileModal(interaction);
                } else if (customId.startsWith('theme_modal')) {
                    await handleThemeModal(interaction);
                } else if (customId.startsWith('edit_note_')) {
                    await handleEditNoteModal(interaction);
                } else if (customId.startsWith('timeout_appeal_modal')) {
                    const { handleTimeoutAppealModal } = require('../components/appealView');
                    await handleTimeoutAppealModal(interaction);
                } else if (customId.startsWith('appeal_feedback_modal')) {
                    const { handleAppealFeedbackModal } = require('../components/appealView');
                    return await handleAppealFeedbackModal(interaction);
                } else if (customId.startsWith('leaderboard_goto_modal_')) {
                    const { handleGoToPageModalSubmit } = require('../commands/leaderboard.js');
                    await handleGoToPageModalSubmit(interaction);
                    return;
                }
                // Handle social modals
                if (customId.startsWith('social_') || customId.startsWith('profile_')) {
                    const { handleSocialInteraction } = require('../components/socialHandlers');

                    try {
                        return await handleSocialInteraction(interaction);
                    } catch (error) {
                        console.error('Error handling social interaction:', error);
                        if (!interaction.replied && !interaction.deferred) {
                            await interaction.reply({
                                content: '❌ An error occurred while processing your request.',
                                flags: 64
                            });
                        }
                    }
                }
                else if (customId.includes('_modal') && !customId.startsWith('warning_appeal_modal') && !customId.startsWith('timeout_appeal_modal') && !customId.startsWith('appeal_feedback_modal')) {
                    const { handleAdminModals } = require('../components/adminPanelModals');
                    return await handleAdminModals(interaction);
                } else if (customId.startsWith('edit_custom_command_')) {
                    await handleCustomCommandEdit(interaction);
                }
            }
        } catch (error) {
            console.error('Global interaction handling error:', error);

            // Only try to inform user if interaction is still valid
            if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
                try {
                    await interaction.reply({
                        content: '❌ An unexpected error occurred. Please try again later.',
                        flags: 64
                    });
                } catch (replyError) {
                    console.error('❌ Failed to send global error reply:', replyError);
                }
            }
        }
    }
};