
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Educational data files
const studyGroupsPath = path.join(__dirname, '../config/study_groups.json');
const flashcardsPath = path.join(__dirname, '../config/flashcards.json');
const languageLearningPath = path.join(__dirname, '../config/language_learning.json');
const codingChallengesPath = path.join(__dirname, '../config/coding_challenges.json');
const educationalTrivia = path.join(__dirname, '../config/educational_trivia.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('education')
        .setDescription('Educational and learning tools')
        .addSubcommandGroup(group =>
            group
                .setName('study')
                .setDescription('Study groups and sessions')
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('create')
                        .setDescription('Create a study group')
                        .addStringOption(option =>
                            option.setName('subject')
                                .setDescription('Study subject')
                                .setRequired(true))
                        .addStringOption(option =>
                            option.setName('time')
                                .setDescription('Study time (e.g., 2024-12-25 14:00)')
                                .setRequired(true))
                        .addIntegerOption(option =>
                            option.setName('duration')
                                .setDescription('Duration in minutes')
                                .setRequired(true)
                                .setMinValue(15)
                                .setMaxValue(480)))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('join')
                        .setDescription('Join a study group')
                        .addStringOption(option =>
                            option.setName('group_id')
                                .setDescription('Study group ID')
                                .setRequired(true)))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('list')
                        .setDescription('List active study groups'))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('session')
                        .setDescription('Start a study session')
                        .addStringOption(option =>
                            option.setName('type')
                                .setDescription('Session type')
                                .setRequired(true)
                                .addChoices(
                                    { name: 'Focus Session', value: 'focus' },
                                    { name: 'Group Discussion', value: 'discussion' },
                                    { name: 'Q&A Session', value: 'qa' },
                                    { name: 'Review Session', value: 'review' }
                                ))))
        .addSubcommandGroup(group =>
            group
                .setName('flashcards')
                .setDescription('Flashcard system')
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('create')
                        .setDescription('Create flashcard set')
                        .addStringOption(option =>
                            option.setName('name')
                                .setDescription('Flashcard set name')
                                .setRequired(true))
                        .addStringOption(option =>
                            option.setName('subject')
                                .setDescription('Subject category')
                                .setRequired(true)))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('study')
                        .setDescription('Study flashcards')
                        .addStringOption(option =>
                            option.setName('set')
                                .setDescription('Flashcard set to study')
                                .setRequired(true)))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('quiz')
                        .setDescription('Take flashcard quiz')
                        .addStringOption(option =>
                            option.setName('set')
                                .setDescription('Flashcard set for quiz')
                                .setRequired(true))
                        .addIntegerOption(option =>
                            option.setName('questions')
                                .setDescription('Number of questions')
                                .setMinValue(5)
                                .setMaxValue(50))))
        .addSubcommandGroup(group =>
            group
                .setName('language')
                .setDescription('Language learning tools')
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('translate')
                        .setDescription('Translate text')
                        .addStringOption(option =>
                            option.setName('text')
                                .setDescription('Text to translate')
                                .setRequired(true))
                        .addStringOption(option =>
                            option.setName('from')
                                .setDescription('Source language')
                                .setRequired(true)
                                .addChoices(
                                    { name: 'English', value: 'en' },
                                    { name: 'Spanish', value: 'es' },
                                    { name: 'French', value: 'fr' },
                                    { name: 'German', value: 'de' },
                                    { name: 'Italian', value: 'it' },
                                    { name: 'Portuguese', value: 'pt' },
                                    { name: 'Japanese', value: 'ja' },
                                    { name: 'Korean', value: 'ko' },
                                    { name: 'Chinese', value: 'zh' }
                                ))
                        .addStringOption(option =>
                            option.setName('to')
                                .setDescription('Target language')
                                .setRequired(true)
                                .addChoices(
                                    { name: 'English', value: 'en' },
                                    { name: 'Spanish', value: 'es' },
                                    { name: 'French', value: 'fr' },
                                    { name: 'German', value: 'de' },
                                    { name: 'Italian', value: 'it' },
                                    { name: 'Portuguese', value: 'pt' },
                                    { name: 'Japanese', value: 'ja' },
                                    { name: 'Korean', value: 'ko' },
                                    { name: 'Chinese', value: 'zh' }
                                )))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('wordofday')
                        .setDescription('Get word of the day')
                        .addStringOption(option =>
                            option.setName('language')
                                .setDescription('Language for word of the day')
                                .setRequired(false)
                                .addChoices(
                                    { name: 'English', value: 'en' },
                                    { name: 'Spanish', value: 'es' },
                                    { name: 'French', value: 'fr' },
                                    { name: 'German', value: 'de' },
                                    { name: 'Italian', value: 'it' }
                                )))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('vocabulary')
                        .setDescription('Practice vocabulary')
                        .addStringOption(option =>
                            option.setName('language')
                                .setDescription('Language to practice')
                                .setRequired(true)
                                .addChoices(
                                    { name: 'Spanish', value: 'es' },
                                    { name: 'French', value: 'fr' },
                                    { name: 'German', value: 'de' },
                                    { name: 'Italian', value: 'it' },
                                    { name: 'Japanese', value: 'ja' }
                                ))
                        .addStringOption(option =>
                            option.setName('level')
                                .setDescription('Difficulty level')
                                .setRequired(false)
                                .addChoices(
                                    { name: 'Beginner', value: 'beginner' },
                                    { name: 'Intermediate', value: 'intermediate' },
                                    { name: 'Advanced', value: 'advanced' }
                                ))))
        .addSubcommandGroup(group =>
            group
                .setName('coding')
                .setDescription('Coding challenges and practice')
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('challenge')
                        .setDescription('Get a coding challenge')
                        .addStringOption(option =>
                            option.setName('difficulty')
                                .setDescription('Challenge difficulty')
                                .setRequired(false)
                                .addChoices(
                                    { name: 'Beginner', value: 'beginner' },
                                    { name: 'Intermediate', value: 'intermediate' },
                                    { name: 'Advanced', value: 'advanced' },
                                    { name: 'Expert', value: 'expert' }
                                ))
                        .addStringOption(option =>
                            option.setName('language')
                                .setDescription('Programming language')
                                .setRequired(false)
                                .addChoices(
                                    { name: 'Python', value: 'python' },
                                    { name: 'JavaScript', value: 'javascript' },
                                    { name: 'Java', value: 'java' },
                                    { name: 'C++', value: 'cpp' },
                                    { name: 'C#', value: 'csharp' },
                                    { name: 'Go', value: 'go' },
                                    { name: 'Rust', value: 'rust' }
                                )))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('snippet')
                        .setDescription('Get useful code snippet')
                        .addStringOption(option =>
                            option.setName('category')
                                .setDescription('Code category')
                                .setRequired(true)
                                .addChoices(
                                    { name: 'Algorithms', value: 'algorithms' },
                                    { name: 'Data Structures', value: 'datastructures' },
                                    { name: 'Web Development', value: 'webdev' },
                                    { name: 'Database', value: 'database' },
                                    { name: 'API', value: 'api' },
                                    { name: 'Utilities', value: 'utilities' }
                                ))
                        .addStringOption(option =>
                            option.setName('language')
                                .setDescription('Programming language')
                                .setRequired(true)
                                .addChoices(
                                    { name: 'Python', value: 'python' },
                                    { name: 'JavaScript', value: 'javascript' },
                                    { name: 'Java', value: 'java' },
                                    { name: 'C++', value: 'cpp' }
                                )))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('leaderboard')
                        .setDescription('View coding challenge leaderboard'))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('submit')
                        .setDescription('Submit solution to current challenge')))
        .addSubcommandGroup(group =>
            group
                .setName('trivia')
                .setDescription('Educational trivia and quizzes')
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('quiz')
                        .setDescription('Start educational quiz')
                        .addStringOption(option =>
                            option.setName('subject')
                                .setDescription('Quiz subject')
                                .setRequired(true)
                                .addChoices(
                                    { name: 'Science', value: 'science' },
                                    { name: 'History', value: 'history' },
                                    { name: 'Mathematics', value: 'math' },
                                    { name: 'Literature', value: 'literature' },
                                    { name: 'Geography', value: 'geography' },
                                    { name: 'Technology', value: 'technology' },
                                    { name: 'Art', value: 'art' },
                                    { name: 'Mixed', value: 'mixed' }
                                ))
                        .addIntegerOption(option =>
                            option.setName('questions')
                                .setDescription('Number of questions')
                                .setRequired(false)
                                .setMinValue(5)
                                .setMaxValue(20)))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('custom')
                        .setDescription('Create custom trivia category'))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('leaderboard')
                        .setDescription('View trivia leaderboard'))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('stats')
                        .setDescription('View your trivia statistics'))),

    async execute(interaction) {
        const subcommandGroup = interaction.options.getSubcommandGroup();
        const subcommand = interaction.options.getSubcommand();

        try {
            switch (subcommandGroup) {
                case 'study':
                    await handleStudyCommands(interaction, subcommand);
                    break;
                case 'flashcards':
                    await handleFlashcardCommands(interaction, subcommand);
                    break;
                case 'language':
                    await handleLanguageCommands(interaction, subcommand);
                    break;
                case 'coding':
                    await handleCodingCommands(interaction, subcommand);
                    break;
                case 'trivia':
                    await handleTriviaCommands(interaction, subcommand);
                    break;
                default:
                    await interaction.reply({ content: '❌ Unknown command group.', ephemeral: true });
            }
        } catch (error) {
            console.error('Error in education command:', error);
            const errorMessage = '❌ An error occurred while executing this command.';
            
            if (interaction.deferred) {
                await interaction.editReply({ content: errorMessage });
            } else if (!interaction.replied) {
                await interaction.reply({ content: errorMessage, ephemeral: true });
            }
        }
    }
};

// Study group functions
async function handleStudyCommands(interaction, subcommand) {
    switch (subcommand) {
        case 'create':
            await createStudyGroup(interaction);
            break;
        case 'join':
            await joinStudyGroup(interaction);
            break;
        case 'list':
            await listStudyGroups(interaction);
            break;
        case 'session':
            await startStudySession(interaction);
            break;
    }
}

async function createStudyGroup(interaction) {
    const subject = interaction.options.getString('subject');
    const time = interaction.options.getString('time');
    const duration = interaction.options.getInteger('duration');

    const studyGroups = loadData(studyGroupsPath);
    const guildId = interaction.guild.id;
    const groupId = generateId();

    if (!studyGroups[guildId]) studyGroups[guildId] = {};

    studyGroups[guildId][groupId] = {
        id: groupId,
        subject: subject,
        creator: interaction.user.id,
        time: time,
        duration: duration,
        members: [interaction.user.id],
        created: new Date().toISOString(),
        status: 'active'
    };

    saveData(studyGroupsPath, studyGroups);

    const embed = new EmbedBuilder()
        .setTitle('📚 Study Group Created!')
        .setColor('#4CAF50')
        .addFields(
            { name: '📖 Subject', value: subject, inline: true },
            { name: '🕐 Time', value: time, inline: true },
            { name: '⏱️ Duration', value: `${duration} minutes`, inline: true },
            { name: '🆔 Group ID', value: groupId, inline: true },
            { name: '👥 Members', value: '1', inline: true },
            { name: '👨‍🏫 Creator', value: `<@${interaction.user.id}>`, inline: true }
        )
        .setDescription('Share the Group ID with others so they can join!')
        .setTimestamp();

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`study_share_${groupId}`)
                .setLabel('Share Group')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('📤'),
            new ButtonBuilder()
                .setCustomId(`study_edit_${groupId}`)
                .setLabel('Edit Group')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('✏️')
        );

    await interaction.reply({ embeds: [embed], components: [row] });
}

async function joinStudyGroup(interaction) {
    const groupId = interaction.options.getString('group_id');
    const studyGroups = loadData(studyGroupsPath);
    const guildId = interaction.guild.id;

    if (!studyGroups[guildId] || !studyGroups[guildId][groupId]) {
        return await interaction.reply({ content: '❌ Study group not found!', ephemeral: true });
    }

    const group = studyGroups[guildId][groupId];

    if (group.members.includes(interaction.user.id)) {
        return await interaction.reply({ content: '❌ You are already a member of this study group!', ephemeral: true });
    }

    group.members.push(interaction.user.id);
    saveData(studyGroupsPath, studyGroups);

    const embed = new EmbedBuilder()
        .setTitle('✅ Joined Study Group!')
        .setColor('#4CAF50')
        .addFields(
            { name: '📖 Subject', value: group.subject, inline: true },
            { name: '🕐 Time', value: group.time, inline: true },
            { name: '👥 Total Members', value: group.members.length.toString(), inline: true }
        )
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function listStudyGroups(interaction) {
    const studyGroups = loadData(studyGroupsPath);
    const guildId = interaction.guild.id;

    if (!studyGroups[guildId] || Object.keys(studyGroups[guildId]).length === 0) {
        return await interaction.reply({ content: '📚 No active study groups found. Create one with `/education study create`!', ephemeral: true });
    }

    const groups = Object.values(studyGroups[guildId]).filter(group => group.status === 'active');

    const embed = new EmbedBuilder()
        .setTitle('📚 Active Study Groups')
        .setColor('#2196F3')
        .setDescription('Join a study group by using `/education study join <group_id>`')
        .setTimestamp();

    groups.forEach(group => {
        embed.addFields({
            name: `📖 ${group.subject}`,
            value: `**ID:** ${group.id}\n**Time:** ${group.time}\n**Duration:** ${group.duration}min\n**Members:** ${group.members.length}`,
            inline: true
        });
    });

    await interaction.reply({ embeds: [embed] });
}

async function startStudySession(interaction) {
    const sessionType = interaction.options.getString('type');
    
    const embed = new EmbedBuilder()
        .setTitle(`📚 ${getSessionTypeEmoji(sessionType)} ${getSessionTypeName(sessionType)} Started!`)
        .setColor('#FF9800')
        .setDescription(getSessionDescription(sessionType))
        .addFields(
            { name: '⏱️ Duration', value: 'Use the buttons below to control the session', inline: true },
            { name: '👥 Participants', value: `<@${interaction.user.id}>`, inline: true }
        )
        .setTimestamp();

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`session_timer_25`)
                .setLabel('25 min')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('⏰'),
            new ButtonBuilder()
                .setCustomId(`session_timer_50`)
                .setLabel('50 min')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('⏰'),
            new ButtonBuilder()
                .setCustomId(`session_break_5`)
                .setLabel('5 min break')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('☕'),
            new ButtonBuilder()
                .setCustomId(`session_end`)
                .setLabel('End Session')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('🛑')
        );

    await interaction.reply({ embeds: [embed], components: [row] });
}

// Flashcard functions
async function handleFlashcardCommands(interaction, subcommand) {
    switch (subcommand) {
        case 'create':
            await createFlashcardSet(interaction);
            break;
        case 'study':
            await studyFlashcards(interaction);
            break;
        case 'quiz':
            await flashcardQuiz(interaction);
            break;
    }
}

async function createFlashcardSet(interaction) {
    const name = interaction.options.getString('name');
    const subject = interaction.options.getString('subject');

    const modal = new ModalBuilder()
        .setCustomId(`flashcard_create_${generateId()}`)
        .setTitle('Create Flashcard Set');

    const nameInput = new TextInputBuilder()
        .setCustomId('flashcard_name')
        .setLabel('Flashcard Set Name')
        .setStyle(TextInputStyle.Short)
        .setValue(name)
        .setRequired(true);

    const subjectInput = new TextInputBuilder()
        .setCustomId('flashcard_subject')
        .setLabel('Subject')
        .setStyle(TextInputStyle.Short)
        .setValue(subject)
        .setRequired(true);

    const cardsInput = new TextInputBuilder()
        .setCustomId('flashcard_cards')
        .setLabel('Cards (Format: Question|Answer, one per line)')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('What is 2+2?|4\nCapital of France?|Paris')
        .setRequired(true);

    const firstRow = new ActionRowBuilder().addComponents(nameInput);
    const secondRow = new ActionRowBuilder().addComponents(subjectInput);
    const thirdRow = new ActionRowBuilder().addComponents(cardsInput);

    modal.addComponents(firstRow, secondRow, thirdRow);
    await interaction.showModal(modal);
}

// Language learning functions
async function handleLanguageCommands(interaction, subcommand) {
    switch (subcommand) {
        case 'translate':
            await translateText(interaction);
            break;
        case 'wordofday':
            await wordOfDay(interaction);
            break;
        case 'vocabulary':
            await vocabularyPractice(interaction);
            break;
    }
}

async function translateText(interaction) {
    const text = interaction.options.getString('text');
    const fromLang = interaction.options.getString('from');
    const toLang = interaction.options.getString('to');

    // Simple mock translation (in real implementation, use Google Translate API)
    const translations = {
        'hello': { es: 'hola', fr: 'bonjour', de: 'hallo', it: 'ciao' },
        'goodbye': { es: 'adiós', fr: 'au revoir', de: 'auf wiedersehen', it: 'arrivederci' },
        'thank you': { es: 'gracias', fr: 'merci', de: 'danke', it: 'grazie' }
    };

    const translatedText = translations[text.toLowerCase()]?.[toLang] || `[Translation of "${text}" from ${fromLang} to ${toLang}]`;

    const embed = new EmbedBuilder()
        .setTitle('🌐 Translation')
        .setColor('#4CAF50')
        .addFields(
            { name: `📝 Original (${fromLang.toUpperCase()})`, value: text, inline: false },
            { name: `🔄 Translation (${toLang.toUpperCase()})`, value: translatedText, inline: false }
        )
        .setFooter({ text: 'Powered by Translation API' })
        .setTimestamp();

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`translate_reverse_${fromLang}_${toLang}`)
                .setLabel('Reverse Translation')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🔄'),
            new ButtonBuilder()
                .setCustomId(`translate_save_${fromLang}_${toLang}`)
                .setLabel('Save to Vocabulary')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('📚')
        );

    await interaction.reply({ embeds: [embed], components: [row] });
}

async function wordOfDay(interaction) {
    const language = interaction.options.getString('language') || 'en';
    
    const wordsOfDay = {
        en: {
            word: 'Serendipity',
            pronunciation: '/ˌserənˈdipədē/',
            definition: 'The occurrence and development of events by chance in a happy or beneficial way',
            example: 'A fortunate stroke of serendipity brought them together.',
            etymology: 'Coined by Horace Walpole in 1754, from the Persian fairy tale "The Three Princes of Serendip"'
        },
        es: {
            word: 'Sobremesa',
            pronunciation: '/so.βɾeˈme.sa/',
            definition: 'The time spent lingering at the table after a meal, chatting with family or friends',
            example: 'La sobremesa es una tradición importante en mi familia.',
            etymology: 'From "sobre" (over) + "mesa" (table)'
        }
    };

    const wordData = wordsOfDay[language] || wordsOfDay.en;

    const embed = new EmbedBuilder()
        .setTitle(`📚 Word of the Day (${language.toUpperCase()})`)
        .setColor('#FF5722')
        .addFields(
            { name: '📝 Word', value: `**${wordData.word}**`, inline: true },
            { name: '🔊 Pronunciation', value: wordData.pronunciation, inline: true },
            { name: '📖 Definition', value: wordData.definition, inline: false },
            { name: '💬 Example', value: `*"${wordData.example}"*`, inline: false },
            { name: '📜 Etymology', value: wordData.etymology, inline: false }
        )
        .setTimestamp();

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`word_quiz_${language}`)
                .setLabel('Quiz Me')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🧠'),
            new ButtonBuilder()
                .setCustomId(`word_save_${language}`)
                .setLabel('Save Word')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('💾')
        );

    await interaction.reply({ embeds: [embed], components: [row] });
}

// Coding challenge functions
async function handleCodingCommands(interaction, subcommand) {
    switch (subcommand) {
        case 'challenge':
            await getCodingChallenge(interaction);
            break;
        case 'snippet':
            await getCodeSnippet(interaction);
            break;
        case 'leaderboard':
            await codingLeaderboard(interaction);
            break;
        case 'submit':
            await submitSolution(interaction);
            break;
    }
}

async function getCodingChallenge(interaction) {
    const difficulty = interaction.options.getString('difficulty') || 'beginner';
    const language = interaction.options.getString('language') || 'python';

    const challenges = {
        beginner: {
            title: 'Sum of Two Numbers',
            description: 'Write a function that takes two numbers and returns their sum.',
            example: 'Input: a = 5, b = 3\nOutput: 8',
            constraints: '• -1000 ≤ a, b ≤ 1000',
            points: 10
        },
        intermediate: {
            title: 'Palindrome Checker',
            description: 'Write a function that checks if a given string is a palindrome.',
            example: 'Input: "racecar"\nOutput: true',
            constraints: '• String length ≤ 1000\n• Case insensitive',
            points: 25
        },
        advanced: {
            title: 'Binary Tree Traversal',
            description: 'Implement in-order traversal of a binary tree.',
            example: 'Input: Tree with nodes [1,2,3,4,5]\nOutput: [4,2,5,1,3]',
            constraints: '• Tree nodes ≤ 100\n• Node values are unique',
            points: 50
        }
    };

    const challenge = challenges[difficulty];

    const embed = new EmbedBuilder()
        .setTitle(`💻 Coding Challenge - ${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}`)
        .setColor('#9C27B0')
        .addFields(
            { name: '🎯 Problem', value: challenge.title, inline: true },
            { name: '💎 Points', value: challenge.points.toString(), inline: true },
            { name: '💻 Language', value: language.toUpperCase(), inline: true },
            { name: '📝 Description', value: challenge.description, inline: false },
            { name: '💡 Example', value: `\`\`\`\n${challenge.example}\n\`\`\``, inline: false },
            { name: '⚠️ Constraints', value: challenge.constraints, inline: false }
        )
        .setTimestamp();

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`coding_submit_${difficulty}`)
                .setLabel('Submit Solution')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('📤'),
            new ButtonBuilder()
                .setCustomId(`coding_hint_${difficulty}`)
                .setLabel('Get Hint')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('💡'),
            new ButtonBuilder()
                .setCustomId(`coding_leaderboard`)
                .setLabel('Leaderboard')
                .setStyle(ButtonStyle.Success)
                .setEmoji('🏆')
        );

    await interaction.reply({ embeds: [embed], components: [row] });
}

// Trivia functions
async function handleTriviaCommands(interaction, subcommand) {
    switch (subcommand) {
        case 'quiz':
            await startEducationalQuiz(interaction);
            break;
        case 'custom':
            await createCustomTrivia(interaction);
            break;
        case 'leaderboard':
            await triviaLeaderboard(interaction);
            break;
        case 'stats':
            await triviaStats(interaction);
            break;
    }
}

async function startEducationalQuiz(interaction) {
    const subject = interaction.options.getString('subject');
    const questions = interaction.options.getInteger('questions') || 10;

    const quizQuestions = {
        science: [
            {
                question: 'What is the chemical symbol for gold?',
                options: ['Go', 'Au', 'Ag', 'Gl'],
                correct: 1,
                explanation: 'Au comes from the Latin word "aurum" meaning gold.'
            },
            {
                question: 'Which planet is known as the Red Planet?',
                options: ['Venus', 'Jupiter', 'Mars', 'Saturn'],
                correct: 2,
                explanation: 'Mars appears red due to iron oxide (rust) on its surface.'
            }
        ],
        history: [
            {
                question: 'Who was the first President of the United States?',
                options: ['Thomas Jefferson', 'George Washington', 'John Adams', 'Benjamin Franklin'],
                correct: 1,
                explanation: 'George Washington served as the first President from 1789 to 1797.'
            }
        ]
    };

    const selectedQuestions = quizQuestions[subject] || quizQuestions.science;
    const question = selectedQuestions[Math.floor(Math.random() * selectedQuestions.length)];

    const embed = new EmbedBuilder()
        .setTitle(`🧠 Educational Quiz - ${subject.charAt(0).toUpperCase() + subject.slice(1)}`)
        .setColor('#FF5722')
        .setDescription(`**Question 1 of ${questions}**\n\n${question.question}`)
        .addFields(
            { name: '🅰️', value: question.options[0], inline: true },
            { name: '🅱️', value: question.options[1], inline: true },
            { name: '🅲️', value: question.options[2], inline: true },
            { name: '🅳️', value: question.options[3], inline: true }
        )
        .setFooter({ text: 'You have 30 seconds to answer!' })
        .setTimestamp();

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`quiz_answer_0_${question.correct}`)
                .setLabel('A')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🅰️'),
            new ButtonBuilder()
                .setCustomId(`quiz_answer_1_${question.correct}`)
                .setLabel('B')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🅱️'),
            new ButtonBuilder()
                .setCustomId(`quiz_answer_2_${question.correct}`)
                .setLabel('C')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🅲️'),
            new ButtonBuilder()
                .setCustomId(`quiz_answer_3_${question.correct}`)
                .setLabel('D')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🅳️')
        );

    await interaction.reply({ embeds: [embed], components: [row] });
}

// Utility functions
function loadData(filePath) {
    try {
        if (fs.existsSync(filePath)) {
            return JSON.parse(fs.readFileSync(filePath, 'utf8'));
        }
    } catch (error) {
        console.error('Error loading data:', error);
    }
    return {};
}

function saveData(filePath, data) {
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

function generateId() {
    return Math.random().toString(36).substr(2, 9);
}

function getSessionTypeEmoji(type) {
    const emojis = {
        focus: '🎯',
        discussion: '💬',
        qa: '❓',
        review: '📖'
    };
    return emojis[type] || '📚';
}

function getSessionTypeName(type) {
    const names = {
        focus: 'Focus Session',
        discussion: 'Group Discussion',
        qa: 'Q&A Session',
        review: 'Review Session'
    };
    return names[type] || 'Study Session';
}

function getSessionDescription(type) {
    const descriptions = {
        focus: 'A concentrated study session with minimal distractions. Perfect for deep learning and concentration.',
        discussion: 'Collaborative learning with group discussions and knowledge sharing.',
        qa: 'Ask questions and get answers from fellow students and mentors.',
        review: 'Review and reinforce previously learned material.'
    };
    return descriptions[type] || 'A productive study session to enhance your learning.';
}
