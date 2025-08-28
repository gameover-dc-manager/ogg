
const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder } = require('discord.js');

function createEnhancedVerificationModal(verificationId, verification) {
    const modal = new ModalBuilder()
        .setCustomId(`captcha_submit_${verificationId}`)
        .setTitle('🔐 Security Verification');

    const answerInput = new TextInputBuilder()
        .setCustomId('captcha_answer')
        .setLabel('Enter your answer')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Type your answer here...')
        .setRequired(true)
        .setMaxLength(50);

    const row = new ActionRowBuilder().addComponents(answerInput);
    modal.addComponents(row);

    return modal;
}

async function handleEnhancedCaptchaSubmission(interaction, verificationId, client, pendingVerifications) {
    try {
        if (!interaction.isModalSubmit()) return;

        const verification = pendingVerifications.get(verificationId);
        if (!verification) {
            return await interaction.reply({
                content: '❌ **Error**: Verification session not found or expired.',
                ephemeral: true
            });
        }

        if (verification.memberId !== interaction.user.id) {
            return await interaction.reply({
                content: '❌ **Error**: This verification does not belong to you.',
                ephemeral: true
            });
        }

        if (Date.now() > verification.expiresAt) {
            pendingVerifications.delete(verificationId);
            return await interaction.reply({
                content: '❌ **Error**: Verification session has expired.',
                ephemeral: true
            });
        }

        const userAnswer = interaction.fields.getTextInputValue('captcha_answer').toLowerCase().trim();
        const correctAnswer = verification.answer.toLowerCase().trim();

        verification.attempts++;

        if (userAnswer === correctAnswer) {
            // Success
            const { handleEnhancedSuccessfulVerification } = require('./captchaSystem');
            await handleEnhancedSuccessfulVerification(verificationId, interaction.member, client, Date.now() - verification.createdAt);
            
            await interaction.reply({
                content: '✅ **Verification successful!** Welcome to the server!',
                ephemeral: true
            });
        } else {
            // Failed attempt
            if (verification.attempts >= verification.maxAttempts) {
                pendingVerifications.delete(verificationId);
                await interaction.reply({
                    content: `❌ **Verification failed!** You've used all ${verification.maxAttempts} attempts. Please contact a moderator for assistance.`,
                    ephemeral: true
                });
            } else {
                const attemptsLeft = verification.maxAttempts - verification.attempts;
                await interaction.reply({
                    content: `❌ **Incorrect answer.** You have ${attemptsLeft} attempt${attemptsLeft === 1 ? '' : 's'} remaining.`,
                    ephemeral: true
                });
            }
        }

    } catch (error) {
        console.error('❌ Error in enhanced captcha submission:', error);
        try {
            if (!interaction.replied) {
                await interaction.reply({
                    content: '❌ **Error**: Failed to process verification. Please try again.',
                    ephemeral: true
                });
            }
        } catch (replyError) {
            console.error('❌ Failed to send error reply:', replyError);
        }
    }
}

module.exports = {
    createEnhancedVerificationModal,
    handleEnhancedCaptchaSubmission
};


const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');

/**
 * Create enhanced verification modal with improved security
 */
function createEnhancedVerificationModal(verificationId, verificationData) {
    const modal = new ModalBuilder()
        .setCustomId(`captcha_submit_${verificationId}`)
        .setTitle('🛡️ Enhanced Security Verification');

    const answerInput = new TextInputBuilder()
        .setCustomId('captcha_answer')
        .setLabel(verificationData.captchaType === 'math' ? 'Enter the numeric answer:' : 'Enter the text from the image:')
        .setPlaceholder(verificationData.captchaType === 'math' ? 'Example: 42' : 'Example: ABC123')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(50)
        .setMinLength(1);

    const firstRow = new ActionRowBuilder().addComponents(answerInput);
    modal.addComponents(firstRow);

    return modal;
}

/**
 * Handle enhanced captcha submission with improved validation
 */
async function handleEnhancedCaptchaSubmission(interaction, verificationId, client, pendingVerifications) {
    try {
        const verification = pendingVerifications.get(verificationId);
        
        if (!verification) {
            return await interaction.reply({
                embeds: [createErrorEmbed('❌ Session Expired', 'This verification session has expired or is invalid.')],
                flags: MessageFlags.Ephemeral
            });
        }

        if (verification.memberId !== interaction.user.id) {
            await logSuspiciousActivity(interaction.user.id, 'UNAUTHORIZED_SUBMISSION', client);
            return await interaction.reply({
                embeds: [createErrorEmbed('🚫 Access Denied', 'This verification session does not belong to you.')],
                flags: MessageFlags.Ephemeral
            });
        }

        if (Date.now() > verification.expiresAt) {
            pendingVerifications.delete(verificationId);
            return await interaction.reply({
                embeds: [createErrorEmbed('⏰ Session Expired', 'This verification session has timed out.')],
                flags: MessageFlags.Ephemeral
            });
        }

        const userAnswer = interaction.fields.getTextInputValue('captcha_answer');
        const startTime = verification.createdAt;
        const timeTaken = Date.now() - startTime;

        // Enhanced answer validation
        const { validateCaptchaAnswer } = require('./captchaGenerator');
        const isCorrect = validateCaptchaAnswer(userAnswer, verification.answer, verification.captchaType);

        verification.attempts++;

        if (isCorrect) {
            // Successful verification
            await interaction.reply({
                embeds: [createSuccessEmbed(timeTaken)],
                flags: MessageFlags.Ephemeral
            });

            // Handle successful verification
            const member = interaction.member;
            const { handleSuccessfulVerification } = require('./captchaSystem');
            await handleSuccessfulVerification(verificationId, member, client, timeTaken);

            return;
        }

        // Failed attempt
        const attemptsRemaining = verification.maxAttempts - verification.attempts;
        
        if (attemptsRemaining <= 0) {
            // Max attempts reached
            pendingVerifications.delete(verificationId);
            
            await interaction.reply({
                embeds: [createFailureEmbed(true)],
                flags: MessageFlags.Ephemeral
            });

            await handleMaxAttemptsReached(interaction.member, verification, client);
            return;
        }

        // Show retry option
        await interaction.reply({
            embeds: [createFailureEmbed(false, attemptsRemaining)],
            components: [createRetryButton(verificationId)],
            flags: MessageFlags.Ephemeral
        });

        await logVerificationAttempt(interaction.member, verification, false, client);

    } catch (error) {
        console.error('❌ Error in enhanced captcha submission:', error);
        
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                embeds: [createErrorEmbed('❌ System Error', 'An error occurred while processing your verification.')],
                flags: MessageFlags.Ephemeral
            });
        }
    }
}

/**
 * Handle enhanced retry request
 */
async function handleEnhancedRetryRequest(interaction, verificationId, client, pendingVerifications) {
    try {
        const verification = pendingVerifications.get(verificationId);
        
        if (!verification) {
            return await interaction.reply({
                embeds: [createErrorEmbed('❌ Session Expired', 'This verification session has expired.')],
                flags: MessageFlags.Ephemeral
            });
        }

        if (verification.memberId !== interaction.user.id) {
            return await interaction.reply({
                embeds: [createErrorEmbed('🚫 Access Denied', 'This verification session does not belong to you.')],
                flags: MessageFlags.Ephemeral
            });
        }

        // Show the verification modal again
        const modal = createEnhancedVerificationModal(verificationId, verification);
        await interaction.showModal(modal);

        await logVerificationEvent('RETRY_REQUESTED', interaction.member, verification, client);

    } catch (error) {
        console.error('❌ Error handling enhanced retry request:', error);
        
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                embeds: [createErrorEmbed('❌ System Error', 'An error occurred while processing your retry.')],
                flags: MessageFlags.Ephemeral
            });
        }
    }
}

/**
 * Create success embed
 */
function createSuccessEmbed(timeTaken) {
    const timeInSeconds = Math.round(timeTaken / 1000);
    
    return new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('✅ Verification Successful!')
        .setDescription('🎉 Congratulations! You have successfully completed the security verification.')
        .addFields(
            { name: '⏱️ Completion Time', value: `${timeInSeconds} seconds`, inline: true },
            { name: '🔓 Access Status', value: 'Granted', inline: true },
            { name: '🎯 Result', value: 'Welcome to the server!', inline: false }
        )
        .setFooter({ text: 'You now have full access to the server' })
        .setTimestamp();
}

/**
 * Create failure embed
 */
function createFailureEmbed(maxAttemptsReached, attemptsRemaining = 0) {
    if (maxAttemptsReached) {
        return new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Verification Failed')
            .setDescription('You have exceeded the maximum number of verification attempts.')
            .addFields(
                { name: '🚫 Status', value: 'Access Denied', inline: true },
                { name: '⏰ Next Steps', value: 'Contact a moderator for assistance', inline: true },
                { name: '📝 Note', value: 'Multiple failed attempts have been logged for security purposes', inline: false }
            )
            .setFooter({ text: 'Security verification system' })
            .setTimestamp();
    }

    return new EmbedBuilder()
        .setColor('#FFA500')
        .setTitle('❌ Incorrect Answer')
        .setDescription('The answer you provided was incorrect. Please try again carefully.')
        .addFields(
            { name: '🎯 Attempts Remaining', value: `${attemptsRemaining}`, inline: true },
            { name: '💡 Tips', value: 'Double-check your answer and try again', inline: true },
            { name: '📝 Note', value: 'Take your time and read the challenge carefully', inline: false }
        )
        .setFooter({ text: 'Click the retry button to try again' })
        .setTimestamp();
}

/**
 * Create error embed
 */
function createErrorEmbed(title, description) {
    return new EmbedBuilder()
        .setColor('#FF4444')
        .setTitle(title)
        .setDescription(description)
        .setFooter({ text: 'Enhanced Security System' })
        .setTimestamp();
}

/**
 * Create retry button
 */
function createRetryButton(verificationId) {
    return new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`captcha_retry_${verificationId}`)
                .setLabel('Try Again')
                .setEmoji('🔄')
                .setStyle(ButtonStyle.Primary)
        );
}

/**
 * Handle max attempts reached
 */
async function handleMaxAttemptsReached(member, verification, client) {
    try {
        // Log the incident
        await logVerificationEvent('MAX_ATTEMPTS_REACHED', member, verification, client);

        // Optionally apply temporary restrictions
        if (client.captchaConfig.enableTemporaryRestrictions) {
            await applyTemporaryRestrictions(member, client);
        }

        // Notify moderators if enabled
        if (client.captchaConfig.notifyModerators) {
            await notifyModeratorsOfFailure(member, verification, client);
        }

    } catch (error) {
        console.error('❌ Error handling max attempts reached:', error);
    }
}

/**
 * Apply temporary restrictions to user
 */
async function applyTemporaryRestrictions(member, client) {
    try {
        // This could include timeouts, role removals, etc.
        console.log(`🚫 Applying temporary restrictions to ${member.user.tag}`);
        
        // Example: Add a temporary restricted role
        if (client.captchaConfig.restrictedRoleId) {
            const restrictedRole = member.guild.roles.cache.get(client.captchaConfig.restrictedRoleId);
            if (restrictedRole && member.guild.members.me.permissions.has('ManageRoles')) {
                await member.roles.add(restrictedRole, 'Failed captcha verification multiple times');
            }
        }

    } catch (error) {
        console.error('❌ Error applying temporary restrictions:', error);
    }
}

/**
 * Notify moderators of verification failure
 */
async function notifyModeratorsOfFailure(member, verification, client) {
    try {
        const logChannel = client.channels.cache.get(client.logChannels?.[member.guild.id]);
        if (!logChannel) return;

        const embed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('🚨 Verification Failure Alert')
            .setDescription(`${member.user.tag} has failed captcha verification multiple times`)
            .addFields(
                { name: 'User', value: `${member.user.tag} (${member.user.id})`, inline: true },
                { name: 'Attempts Made', value: `${verification.attempts}/${verification.maxAttempts}`, inline: true },
                { name: 'Time Spent', value: `${Math.round((Date.now() - verification.createdAt) / 1000)}s`, inline: true },
                { name: 'Captcha Type', value: verification.captchaType || 'unknown', inline: true },
                { name: 'Action Required', value: 'Manual review recommended', inline: true }
            )
            .setThumbnail(member.user.displayAvatarURL())
            .setTimestamp();

        await logChannel.send({ embeds: [embed] });

    } catch (error) {
        console.error('❌ Error notifying moderators:', error);
    }
}

/**
 * Log verification attempt
 */
async function logVerificationAttempt(member, verification, success, client) {
    try {
        const event = success ? 'VERIFICATION_SUCCESS' : 'VERIFICATION_FAILED';
        
        // Import logging function to avoid circular dependency
        const { logVerificationEvent } = require('./captchaSystem');
        await logVerificationEvent(event, member, {
            ...verification,
            currentAttempt: verification.attempts
        }, client);

    } catch (error) {
        console.error('❌ Error logging verification attempt:', error);
    }
}

/**
 * Log suspicious activity
 */
async function logSuspiciousActivity(userId, activityType, client) {
    try {
        console.log(`🚨 Suspicious activity detected: ${activityType} from user ${userId}`);
        
        // Update statistics
        if (client.captchaStats) {
            client.captchaStats.suspiciousAttempts++;
            
            const today = new Date().toDateString();
            if (!client.captchaStats.dailyStats[today]) {
                client.captchaStats.dailyStats[today] = { attempts: 0, successful: 0, failed: 0, suspicious: 0 };
            }
            client.captchaStats.dailyStats[today].suspicious++;
        }

        // Additional logging could be implemented here

    } catch (error) {
        console.error('❌ Error logging suspicious activity:', error);
    }
}

// Original functions for backwards compatibility
function createVerificationHandler(verificationId, verification) {
    return createEnhancedVerificationModal(verificationId, verification);
}

function handleCaptchaSubmission(interaction, verificationId, client, pendingVerifications) {
    return handleEnhancedCaptchaSubmission(interaction, verificationId, client, pendingVerifications);
}

function handleRetryRequest(interaction, verificationId, client, pendingVerifications) {
    return handleEnhancedRetryRequest(interaction, verificationId, client, pendingVerifications);
}

module.exports = {
    createEnhancedVerificationModal,
    handleEnhancedCaptchaSubmission,
    handleEnhancedRetryRequest,
    createSuccessEmbed,
    createFailureEmbed,
    createErrorEmbed,
    handleMaxAttemptsReached,
    logSuspiciousActivity,
    
    // Backwards compatibility exports
    createVerificationHandler,
    handleCaptchaSubmission,
    handleRetryRequest
};
