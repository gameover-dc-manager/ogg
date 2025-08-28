const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

module.exports = {
    async handleSubmissionInteraction(interaction) {
        if (interaction.isButton()) {
            await this.handleSubmissionButton(interaction);
        } else if (interaction.isStringSelectMenu()) {
            await this.handleSubmissionStatusChange(interaction);
        } else if (interaction.isModalSubmit()) {
            await this.handleSubmissionModal(interaction);
        }
    },

    async handleSubmissionButton(interaction) {
        const [action, actionType, submissionId] = interaction.customId.split('_');

        if (action !== 'submission') return;

        const submission = interaction.client.submissions?.[submissionId];
        if (!submission) {
            return interaction.reply({ content: '❌ Submission not found.', ephemeral: true });
        }

        switch (actionType) {
            case 'approve':
                await this.updateSubmissionStatus(interaction, submissionId, 'approved', '✅ Approved');
                break;
            case 'reject':
                await this.updateSubmissionStatus(interaction, submissionId, 'rejected', '❌ Rejected');
                break;
            case 'inprogress':
                await this.updateSubmissionStatus(interaction, submissionId, 'inprogress', '🔄 In Progress');
                break;
            case 'feedback':
                await this.showFeedbackModal(interaction, submissionId);
                break;
            case 'reveal':
                await this.revealIdentity(interaction, submissionId);
                break;
        }
    },

    async handleSubmissionStatusChange(interaction) {
        const [action, actionType, submissionId] = interaction.customId.split('_');

        if (action !== 'submission' || actionType !== 'status') return;

        const newStatus = interaction.values[0];
        const statusLabels = {
            'pending': '⏳ Pending Review',
            'reviewing': '👀 Under Review',
            'inprogress': '🔄 In Progress',
            'completed': '✅ Completed',
            'rejected': '❌ Rejected',
            'moreinfo': '❓ Need More Info'
        };

        await this.updateSubmissionStatus(interaction, submissionId, newStatus, statusLabels[newStatus]);
    },

    async updateSubmissionStatus(interaction, submissionId, status, statusLabel) {
        const submission = interaction.client.submissions[submissionId];
        if (!submission) {
            return interaction.reply({ content: '❌ Submission not found.', ephemeral: true });
        }

        submission.status = status;
        submission.lastUpdated = Date.now();
        submission.updatedBy = interaction.user.id;

        // Update the embed
        const embed = interaction.message.embeds[0];
        const newEmbed = new EmbedBuilder(embed.data);

        // Update status field
        const fields = newEmbed.data.fields;
        const statusFieldIndex = fields.findIndex(field => field.name === '🏷️ Status');
        if (statusFieldIndex !== -1) {
            fields[statusFieldIndex].value = statusLabel;
        }

        // Add updated by field
        const updatedByFieldIndex = fields.findIndex(field => field.name === '🔄 Last Updated By');
        if (updatedByFieldIndex !== -1) {
            fields[updatedByFieldIndex].value = `${interaction.user.tag}\n<t:${Math.floor(Date.now() / 1000)}:R>`;
        } else {
            newEmbed.addFields({ name: '🔄 Last Updated By', value: `${interaction.user.tag}\n<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true });
        }

        // Update color based on status
        const statusColors = {
            'pending': '#FFA500',
            'reviewing': '#0099FF',
            'inprogress': '#FFFF00',
            'completed': '#00FF00',
            'rejected': '#FF0000',
            'moreinfo': '#800080'
        };
        newEmbed.setColor(statusColors[status] || '#0099FF');

        await interaction.update({ embeds: [newEmbed] });

        // Notify the user
        try {
            const user = await interaction.client.users.fetch(submission.user);
            const notificationEmbed = new EmbedBuilder()
                .setTitle('📋 Submission Update')
                .setDescription(`Your submission **${submission.title}** has been updated.`)
                .addFields(
                    { name: '🆔 Submission ID', value: submissionId, inline: true },
                    { name: '🏷️ New Status', value: statusLabel, inline: true },
                    { name: '👤 Updated By', value: interaction.user.tag, inline: true }
                )
                .setColor(statusColors[status])
                .setTimestamp();

            await user.send({ embeds: [notificationEmbed] });
        } catch (error) {
            console.error('Failed to send notification to user:', error);
        }

        // Save submissions
        global.saveSubmissions();
    },

    async showFeedbackModal(interaction, submissionId) {
        const modal = new ModalBuilder()
            .setCustomId(`submission_feedback_modal_${submissionId}`)
            .setTitle('Send Feedback to User');

        const feedbackInput = new TextInputBuilder()
            .setCustomId('feedback_content')
            .setLabel('Feedback Message')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Enter your feedback for the user...')
            .setRequired(true)
            .setMaxLength(1000);

        const anonymousInput = new TextInputBuilder()
            .setCustomId('anonymous_feedback')
            .setLabel('Send Anonymously? (yes/no)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('no')
            .setRequired(false)
            .setMaxLength(3);

        const actionRow1 = new ActionRowBuilder().addComponents(feedbackInput);
        const actionRow2 = new ActionRowBuilder().addComponents(anonymousInput);
        modal.addComponents(actionRow1, actionRow2);

        await interaction.showModal(modal);
    },

    async handleSubmissionModal(interaction) {
        const [action, actionType, modalType, submissionId] = interaction.customId.split('_');

        if (action !== 'submission' || actionType !== 'feedback' || modalType !== 'modal') return;

        const feedbackContent = interaction.fields.getTextInputValue('feedback_content');
        const anonymousFeedback = interaction.fields.getTextInputValue('anonymous_feedback')?.toLowerCase() === 'yes';
        const submission = interaction.client.submissions[submissionId];

        if (!submission) {
            return interaction.reply({ content: '❌ Submission not found.', ephemeral: true });
        }

        try {
            const user = await interaction.client.users.fetch(submission.user);
            const feedbackEmbed = new EmbedBuilder()
                .setTitle('💬 Feedback on Your Submission')
                .setDescription(`You received feedback on your submission: **${submission.title}**`)
                .addFields(
                    { name: '🆔 Submission ID', value: submissionId, inline: true },
                    { name: '👤 From', value: anonymousFeedback ? '🕵️ Anonymous Moderator' : interaction.user.tag, inline: true },
                    { name: '💬 Feedback', value: feedbackContent, inline: false }
                )
                .setColor('#0099FF')
                .setTimestamp()
                .setFooter({ 
                    text: anonymousFeedback ? 'This feedback was sent anonymously by a moderator' : `Feedback from ${interaction.user.tag}` 
                });

            await user.send({ embeds: [feedbackEmbed] });

            await interaction.reply({ 
                content: `✅ Feedback sent successfully to the user!${anonymousFeedback ? ' (Anonymous)' : ''}`, 
                ephemeral: true 
            });

            // Add feedback to submission record
            if (!submission.feedback) submission.feedback = [];
            submission.feedback.push({
                from: anonymousFeedback ? 'anonymous' : interaction.user.id,
                fromTag: anonymousFeedback ? 'Anonymous Moderator' : interaction.user.tag,
                content: feedbackContent,
                timestamp: Date.now(),
                anonymous: anonymousFeedback
            });

            global.saveSubmissions();

        } catch (error) {
            console.error('Failed to send feedback:', error);
            await interaction.reply({ 
                content: '❌ Failed to send feedback. The user may have DMs disabled.', 
                ephemeral: true 
            });
        }
    },

    async revealIdentity(interaction, submissionId) {
        const submission = interaction.client.submissions[submissionId];
        if (!submission) {
            return interaction.reply({ content: '❌ Submission not found.', ephemeral: true });
        }

        if (!submission.anonymous) {
            return interaction.reply({ content: '❌ This submission is not anonymous.', ephemeral: true });
        }

        try {
            const user = await interaction.client.users.fetch(submission.user);

            const revealEmbed = new EmbedBuilder()
                .setTitle('🕵️ Identity Revealed')
                .setDescription('The anonymous user\'s identity has been revealed.')
                .addFields(
                    { name: '👤 User', value: `${user.tag} (${user.id})`, inline: true },
                    { name: '🆔 Submission ID', value: submissionId, inline: true },
                    { name: '📋 Title', value: submission.title, inline: true },
                    { name: '⚠️ Revealed By', value: interaction.user.tag, inline: true },
                    { name: '📅 Revealed At', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
                )
                .setColor('#FF6600')
                .setThumbnail(user.displayAvatarURL())
                .setTimestamp();

            // Update the original embed
            const originalEmbed = interaction.message.embeds[0];
            const updatedEmbed = new EmbedBuilder(originalEmbed.data);

            // Update user field
            const fields = updatedEmbed.data.fields;
            const userFieldIndex = fields.findIndex(field => field.name === '👤 User');
            if (userFieldIndex !== -1) {
                fields[userFieldIndex].value = `${user.tag} (${user.id})`;
            }

            // Update title to remove anonymous tag
            updatedEmbed.setTitle(originalEmbed.title.replace(' (Anonymous)', ' (Identity Revealed)'));
            updatedEmbed.setAuthor({ name: user.tag, iconURL: user.displayAvatarURL() });
            updatedEmbed.setFooter({ text: `Submission ID: ${submissionId} • Identity Revealed` });

            // Remove the reveal button
            const actionRows = interaction.message.components;
            const updatedActionRows = actionRows.map(row => {
                const newRow = new ActionRowBuilder();
                row.components.forEach(component => {
                    if (!component.customId.includes('reveal')) {
                        newRow.addComponents(ButtonBuilder.from(component));
                    }
                });
                return newRow;
            });

            // Update submission record
            submission.anonymous = false;
            submission.identityRevealedBy = interaction.user.id;
            submission.identityRevealedAt = Date.now();
            global.saveSubmissions();

            await interaction.update({ 
                embeds: [updatedEmbed], 
                components: updatedActionRows 
            });

            // Send reveal notification
            await interaction.followUp({ 
                embeds: [revealEmbed], 
                ephemeral: true 
            });

            // Notify the user that their identity was revealed
            try {
                const notificationEmbed = new EmbedBuilder()
                    .setTitle('🕵️ Identity Revealed')
                    .setDescription(`Your anonymous submission **${submission.title}** has had its identity revealed by a moderator.`)
                    .addFields(
                        { name: '🆔 Submission ID', value: submissionId, inline: true },
                        { name: '👤 Revealed By', value: interaction.user.tag, inline: true },
                        { name: '📅 Time', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
                    )
                    .setColor('#FF6600')
                    .setTimestamp();

                await user.send({ embeds: [notificationEmbed] });
            } catch (error) {
                console.error('Failed to notify user about identity reveal:', error);
            }

        } catch (error) {
            console.error('Error revealing identity:', error);
            await interaction.reply({ 
                content: '❌ Failed to reveal identity. Please try again.', 
                ephemeral: true 
            });
        }
    }
};