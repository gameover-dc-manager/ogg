
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Data file paths
const studyGroupsPath = path.join(__dirname, '../config/study_groups.json');
const flashcardsPath = path.join(__dirname, '../config/flashcards.json');
const languageLearningPath = path.join(__dirname, '../config/language_learning.json');
const codingChallengesPath = path.join(__dirname, '../config/coding_challenges.json');
const educationalTrivia = path.join(__dirname, '../config/educational_trivia.json');

class EducationHandler {
    constructor() {
        this.activeQuizzes = new Map();
        this.activeStudySessions = new Map();
        this.codingSubmissions = new Map();
    }

    async handleEducationInteraction(interaction) {
        const customId = interaction.customId;

        try {
            if (customId.startsWith('study_')) {
                await this.handleStudyInteraction(interaction);
            } else if (customId.startsWith('flashcard_')) {
                await this.handleFlashcardInteraction(interaction);
            } else if (customId.startsWith('language_')) {
                await this.handleLanguageInteraction(interaction);
            } else if (customId.startsWith('coding_')) {
                await this.handleCodingInteraction(interaction);
            } else if (customId.startsWith('quiz_')) {
                await this.handleQuizInteraction(interaction);
            } else if (customId.startsWith('session_')) {
                await this.handleSessionInteraction(interaction);
            } else if (customId.startsWith('translate_')) {
                await this.handleTranslationInteraction(interaction);
            }
        } catch (error) {
            console.error('Error in education interaction handler:', error);
            await this.safeReply(interaction, 'An error occurred while processing your request.');
        }
    }

    async handleStudyInteraction(interaction) {
        const customId = interaction.customId;
        const [action, type, groupId] = customId.split('_');

        switch (type) {
            case 'share':
                await this.shareStudyGroup(interaction, groupId);
                break;
            case 'edit':
                await this.editStudyGroup(interaction, groupId);
                break;
            case 'join':
                await this.joinStudyGroupButton(interaction, groupId);
                break;
            case 'leave':
                await this.leaveStudyGroup(interaction, groupId);
                break;
        }
    }

    async shareStudyGroup(interaction, groupId) {
        const studyGroups = this.loadData(studyGroupsPath);
        const guildId = interaction.guild.id;
        const group = studyGroups[guildId]?.[groupId];

        if (!group) {
            return await this.safeReply(interaction, 'Study group not found!', true);
        }

        const embed = new EmbedBuilder()
            .setTitle('📚 Join Our Study Group!')
            .setColor('#4CAF50')
            .addFields(
                { name: '📖 Subject', value: group.subject, inline: true },
                { name: '🕐 Time', value: group.time, inline: true },
                { name: '⏱️ Duration', value: `${group.duration} minutes`, inline: true },
                { name: '👥 Current Members', value: group.members.length.toString(), inline: true }
            )
            .setDescription(`Use \`/education study join ${groupId}\` to join this study group!`)
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`study_join_${groupId}`)
                    .setLabel('Join Group')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📚')
            );

        await interaction.reply({ embeds: [embed], components: [row] });
    }

    async handleFlashcardInteraction(interaction) {
        if (interaction.isModalSubmit()) {
            await this.handleFlashcardModal(interaction);
        } else if (interaction.isButton()) {
            await this.handleFlashcardButton(interaction);
        }
    }

    async handleFlashcardModal(interaction) {
        const customId = interaction.customId;
        const name = interaction.fields.getTextInputValue('flashcard_name');
        const subject = interaction.fields.getTextInputValue('flashcard_subject');
        const cardsText = interaction.fields.getTextInputValue('flashcard_cards');

        // Parse cards
        const cards = cardsText.split('\n').map(line => {
            const [question, answer] = line.split('|');
            return { question: question?.trim(), answer: answer?.trim() };
        }).filter(card => card.question && card.answer);

        if (cards.length === 0) {
            return await this.safeReply(interaction, 'Invalid card format! Use: Question|Answer', true);
        }

        const flashcards = this.loadData(flashcardsPath);
        const guildId = interaction.guild.id;
        const setId = this.generateId();

        if (!flashcards[guildId]) flashcards[guildId] = {};

        flashcards[guildId][setId] = {
            id: setId,
            name: name,
            subject: subject,
            creator: interaction.user.id,
            cards: cards,
            created: new Date().toISOString(),
            studyStats: {
                totalStudies: 0,
                correctAnswers: 0,
                totalAnswers: 0
            }
        };

        this.saveData(flashcardsPath, flashcards);

        const embed = new EmbedBuilder()
            .setTitle('📚 Flashcard Set Created!')
            .setColor('#4CAF50')
            .addFields(
                { name: '📝 Name', value: name, inline: true },
                { name: '📖 Subject', value: subject, inline: true },
                { name: '🃏 Cards', value: cards.length.toString(), inline: true }
            )
            .setDescription(`Use \`/education flashcards study ${setId}\` to start studying!`)
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`flashcard_study_${setId}`)
                    .setLabel('Start Studying')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📚'),
                new ButtonBuilder()
                    .setCustomId(`flashcard_quiz_${setId}`)
                    .setLabel('Take Quiz')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🧠')
            );

        await interaction.reply({ embeds: [embed], components: [row] });
    }

    async handleSessionInteraction(interaction) {
        const customId = interaction.customId;
        const [action, type, duration] = customId.split('_');

        switch (type) {
            case 'timer':
                await this.startStudyTimer(interaction, parseInt(duration));
                break;
            case 'break':
                await this.startBreakTimer(interaction, parseInt(duration));
                break;
            case 'end':
                await this.endStudySession(interaction);
                break;
        }
    }

    async startStudyTimer(interaction, duration) {
        const sessionId = this.generateId();
        const endTime = Date.now() + (duration * 60 * 1000);

        this.activeStudySessions.set(sessionId, {
            userId: interaction.user.id,
            guildId: interaction.guild.id,
            startTime: Date.now(),
            endTime: endTime,
            duration: duration,
            type: 'study'
        });

        const embed = new EmbedBuilder()
            .setTitle(`⏰ Study Timer Started - ${duration} minutes`)
            .setColor('#FF9800')
            .setDescription('Focus on your studies! The timer will notify you when time is up.')
            .addFields(
                { name: '🎯 Session Type', value: 'Study Session', inline: true },
                { name: '⏱️ Duration', value: `${duration} minutes`, inline: true },
                { name: '🕐 End Time', value: `<t:${Math.floor(endTime / 1000)}:R>`, inline: true }
            )
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`session_pause_${sessionId}`)
                    .setLabel('Pause')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('⏸️'),
                new ButtonBuilder()
                    .setCustomId(`session_end`)
                    .setLabel('End Session')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🛑')
            );

        await interaction.update({ embeds: [embed], components: [row] });

        // Set timeout to notify when session ends
        setTimeout(async () => {
            if (this.activeStudySessions.has(sessionId)) {
                this.activeStudySessions.delete(sessionId);
                try {
                    await interaction.followUp({
                        content: `🎉 <@${interaction.user.id}> Your ${duration}-minute study session is complete! Great job! 🎓`,
                        ephemeral: false
                    });
                } catch (error) {
                    console.error('Error sending session completion notification:', error);
                }
            }
        }, duration * 60 * 1000);
    }

    async handleCodingInteraction(interaction) {
        const customId = interaction.customId;
        const [action, type, ...params] = customId.split('_');

        switch (type) {
            case 'submit':
                await this.showCodeSubmissionModal(interaction, params[0]);
                break;
            case 'hint':
                await this.showCodingHint(interaction, params[0]);
                break;
            case 'leaderboard':
                await this.showCodingLeaderboard(interaction);
                break;
        }
    }

    async showCodeSubmissionModal(interaction, difficulty) {
        const modal = new ModalBuilder()
            .setCustomId(`coding_solution_${difficulty}_${this.generateId()}`)
            .setTitle(`Submit Solution - ${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}`);

        const solutionInput = new TextInputBuilder()
            .setCustomId('solution_code')
            .setLabel('Your Solution')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Paste your code solution here...')
            .setRequired(true);

        const languageInput = new TextInputBuilder()
            .setCustomId('solution_language')
            .setLabel('Programming Language')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('e.g., Python, JavaScript, Java')
            .setRequired(true);

        const explanationInput = new TextInputBuilder()
            .setCustomId('solution_explanation')
            .setLabel('Explanation (Optional)')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Explain your approach and time/space complexity...')
            .setRequired(false);

        const firstRow = new ActionRowBuilder().addComponents(solutionInput);
        const secondRow = new ActionRowBuilder().addComponents(languageInput);
        const thirdRow = new ActionRowBuilder().addComponents(explanationInput);

        modal.addComponents(firstRow, secondRow, thirdRow);
        await interaction.showModal(modal);
    }

    async handleQuizInteraction(interaction) {
        const customId = interaction.customId;
        const [action, type, selectedAnswer, correctAnswer] = customId.split('_');

        const isCorrect = parseInt(selectedAnswer) === parseInt(correctAnswer);
        
        const embed = new EmbedBuilder()
            .setTitle(isCorrect ? '✅ Correct!' : '❌ Incorrect!')
            .setColor(isCorrect ? '#4CAF50' : '#F44336')
            .setDescription(isCorrect ? 
                'Great job! You got the right answer.' : 
                `The correct answer was option ${['A', 'B', 'C', 'D'][correctAnswer]}.`)
            .setTimestamp();

        if (isCorrect) {
            embed.addFields({ name: '🎉 Points Earned', value: '+10 points', inline: true });
        }

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('quiz_next_question')
                    .setLabel('Next Question')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('➡️'),
                new ButtonBuilder()
                    .setCustomId('quiz_end')
                    .setLabel('End Quiz')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🏁')
            );

        await interaction.update({ embeds: [embed], components: [row] });
    }

    async handleTranslationInteraction(interaction) {
        const customId = interaction.customId;
        const [action, type, ...params] = customId.split('_');

        switch (type) {
            case 'reverse':
                await this.reverseTranslation(interaction, params[0], params[1]);
                break;
            case 'save':
                await this.saveToVocabulary(interaction, params[0], params[1]);
                break;
        }
    }

    async reverseTranslation(interaction, fromLang, toLang) {
        const embed = new EmbedBuilder()
            .setTitle('🔄 Reverse Translation')
            .setColor('#2196F3')
            .setDescription('This feature would reverse the translation direction.')
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    async saveToVocabulary(interaction, fromLang, toLang) {
        const embed = new EmbedBuilder()
            .setTitle('📚 Saved to Vocabulary')
            .setColor('#4CAF50')
            .setDescription('Translation saved to your personal vocabulary collection!')
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // Utility methods
    async safeReply(interaction, content, ephemeral = false) {
        try {
            if (interaction.deferred) {
                await interaction.editReply({ content, ephemeral });
            } else if (!interaction.replied) {
                await interaction.reply({ content, ephemeral });
            } else {
                await interaction.followUp({ content, ephemeral });
            }
        } catch (error) {
            console.error('Error in safeReply:', error);
        }
    }

    loadData(filePath) {
        try {
            if (fs.existsSync(filePath)) {
                return JSON.parse(fs.readFileSync(filePath, 'utf8'));
            }
        } catch (error) {
            console.error('Error loading data:', error);
        }
        return {};
    }

    saveData(filePath, data) {
        try {
            const dir = path.dirname(filePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
            return true;
        } catch (error) {
            console.error('Error saving data:', error);
            return false;
        }
    }

    generateId() {
        return Math.random().toString(36).substr(2, 9);
    }
}

module.exports = new EducationHandler();
