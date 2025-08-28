
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const fs = require('fs');
const path = require('path');

const WORDCHAIN_FILE = path.join(__dirname, '..', 'config', 'wordchain.json');
const DICTIONARY_FILE = path.join(__dirname, '..', 'config', 'dictionary.json');

// Enhanced word validation with categories
const WORD_CATEGORIES = {
    animals: ['dog', 'cat', 'elephant', 'tiger', 'lion', 'bear', 'wolf', 'eagle', 'shark', 'whale'],
    nature: ['tree', 'flower', 'mountain', 'river', 'ocean', 'forest', 'garden', 'valley', 'desert', 'meadow'],
    food: ['apple', 'bread', 'cheese', 'grape', 'honey', 'lemon', 'mango', 'orange', 'pasta', 'rice'],
    general: ['house', 'music', 'dance', 'paper', 'bridge', 'crystal', 'energy', 'friend', 'happy', 'magic']
};

function loadWordChainData() {
    try {
        if (!fs.existsSync(WORDCHAIN_FILE)) {
            fs.writeFileSync(WORDCHAIN_FILE, JSON.stringify({}, null, 2));
        }
        const data = fs.readFileSync(WORDCHAIN_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error loading word chain data:', error);
        return {};
    }
}

function loadDictionary() {
    try {
        if (!fs.existsSync(DICTIONARY_FILE)) {
            // Create basic dictionary
            const basicWords = Object.values(WORD_CATEGORIES).flat();
            fs.writeFileSync(DICTIONARY_FILE, JSON.stringify(basicWords, null, 2));
        }
        const data = fs.readFileSync(DICTIONARY_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error loading dictionary:', error);
        return Object.values(WORD_CATEGORIES).flat();
    }
}

function isValidWord(word) {
    const dictionary = loadDictionary();
    return dictionary.includes(word.toLowerCase()) || word.length >= 3;
}

function saveWordChainData(data) {
    try {
        fs.writeFileSync(WORDCHAIN_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error saving word chain data:', error);
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('wordchain')
        .setDescription('Manage word chain game channels')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .addSubcommand(subcommand =>
            subcommand
                .setName('setup')
                .setDescription('Setup a word chain channel')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Channel for word chain game')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('start_word')
                        .setDescription('Starting word (default: random)')
                        .setRequired(false))
                .addIntegerOption(option =>
                    option.setName('min_length')
                        .setDescription('Minimum word length (default: 3)')
                        .setMinValue(2)
                        .setMaxValue(10)
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('category')
                        .setDescription('Word category theme (optional)')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Animals', value: 'animals' },
                            { name: 'Nature', value: 'nature' },
                            { name: 'Food', value: 'food' },
                            { name: 'General', value: 'general' }
                        ))
                .addStringOption(option =>
                    option.setName('mode')
                        .setDescription('Game mode')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Classic (last letter)', value: 'classic' },
                            { name: 'Rhyme (rhyming words)', value: 'rhyme' },
                            { name: 'Theme (same category)', value: 'theme' }
                        ))
                .addBooleanOption(option =>
                    option.setName('strict_validation')
                        .setDescription('Enable strict word validation')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('reset')
                .setDescription('Reset word chain in a channel')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Channel to reset')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('disable')
                .setDescription('Disable word chain in a channel')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Channel to disable word chain')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('stats')
                .setDescription('View word chain statistics')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Channel to view stats for')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('leaderboard')
                .setDescription('View word chain leaderboard')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Channel to view leaderboard for')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('config')
                .setDescription('Configure word chain settings')
                .addStringOption(option =>
                    option.setName('setting')
                        .setDescription('Setting to modify')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Minimum Length', value: 'min_length' },
                            { name: 'Category', value: 'category' },
                            { name: 'Mode', value: 'mode' },
                            { name: 'Strict Validation', value: 'validation' }
                        ))
                .addStringOption(option =>
                    option.setName('value')
                        .setDescription('New value for the setting')
                        .setRequired(true))
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Channel to configure')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('hint')
                .setDescription('Get a hint for the current word')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Channel to get hint for')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('achievements')
                .setDescription('View word chain achievements')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to view achievements for')
                        .setRequired(false))),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'setup':
                await handleSetup(interaction);
                break;
            case 'reset':
                await handleReset(interaction);
                break;
            case 'disable':
                await handleDisable(interaction);
                break;
            case 'stats':
                await handleStats(interaction);
                break;
            case 'leaderboard':
                await handleLeaderboard(interaction);
                break;
            case 'config':
                await handleConfig(interaction);
                break;
            case 'hint':
                await handleHint(interaction);
                break;
            case 'achievements':
                await handleAchievements(interaction);
                break;
        }
    }
};

async function handleSetup(interaction) {
    const channel = interaction.options.getChannel('channel');
    const category = interaction.options.getString('category') || 'general';
    const mode = interaction.options.getString('mode') || 'classic';
    const strictValidation = interaction.options.getBoolean('strict_validation') || false;
    const startWord = interaction.options.getString('start_word') || getRandomStartWord(category);
    const minLength = interaction.options.getInteger('min_length') || 3;

    const data = loadWordChainData();
    if (!data[interaction.guild.id]) {
        data[interaction.guild.id] = {};
    }

    data[interaction.guild.id][channel.id] = {
        enabled: true,
        currentWord: startWord.toLowerCase(),
        lastUser: null,
        chainLength: 1,
        longestChain: 1,
        totalWords: 1,
        mistakes: 0,
        contributors: {},
        usedWords: [startWord.toLowerCase()],
        minLength: minLength,
        category: category,
        mode: mode,
        strictValidation: strictValidation,
        hints: 0,
        achievements: {},
        startedAt: Date.now(),
        lastResetAt: Date.now()
    };

    saveWordChainData(data);

    const embed = new EmbedBuilder()
        .setTitle('🔗 Word Chain Game Setup')
        .setDescription(`Word chain game has been set up in ${channel}!`)
        .addFields(
            { name: 'Starting Word', value: startWord, inline: true },
            { name: 'Minimum Length', value: minLength.toString(), inline: true },
            { name: 'Rules', value: '• Next word must start with the last letter of the previous word\n• No repeating words\n• One person cannot go twice in a row\n• Words must be valid English words', inline: false }
        )
        .setColor('#00FF00')
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    // Send initial message to the word chain channel
    await channel.send({
        embeds: [new EmbedBuilder()
            .setTitle('🔗 Word Chain Game Started!')
            .setDescription(`The word chain has begun! The current word is: **${startWord}**\n\nNext word must start with: **${startWord.slice(-1).toUpperCase()}**\n\n**Rules:**\n• Use the last letter of the previous word\n• No repeating words\n• Don't go twice in a row\n• Minimum ${minLength} letters`)
            .setColor('#FFD700')]
    });
}

async function handleReset(interaction) {
    const channel = interaction.options.getChannel('channel') || interaction.channel;
    const data = loadWordChainData();

    if (!data[interaction.guild.id] || !data[interaction.guild.id][channel.id]) {
        return interaction.reply({
            content: '❌ No word chain game found in this channel.',
            ephemeral: true
        });
    }

    const channelData = data[interaction.guild.id][channel.id];
    const oldChain = channelData.chainLength;
    const newStartWord = getRandomStartWord();
    
    channelData.currentWord = newStartWord.toLowerCase();
    channelData.lastUser = null;
    channelData.chainLength = 1;
    channelData.usedWords = [newStartWord.toLowerCase()];
    channelData.lastResetAt = Date.now();
    channelData.mistakes++;

    saveWordChainData(data);

    const embed = new EmbedBuilder()
        .setTitle('🔄 Word Chain Reset')
        .setDescription(`The word chain in ${channel} has been reset!`)
        .addFields(
            { name: 'Previous Chain Length', value: oldChain.toString(), inline: true },
            { name: 'New Starting Word', value: newStartWord, inline: true },
            { name: 'Total Resets', value: channelData.mistakes.toString(), inline: true }
        )
        .setColor('#FF6600')
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handleDisable(interaction) {
    const channel = interaction.options.getChannel('channel') || interaction.channel;
    const data = loadWordChainData();

    if (!data[interaction.guild.id] || !data[interaction.guild.id][channel.id]) {
        return interaction.reply({
            content: '❌ No word chain game found in this channel.',
            ephemeral: true
        });
    }

    delete data[interaction.guild.id][channel.id];
    saveWordChainData(data);

    const embed = new EmbedBuilder()
        .setTitle('❌ Word Chain Game Disabled')
        .setDescription(`Word chain game has been disabled in ${channel}.`)
        .setColor('#FF0000')
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handleStats(interaction) {
    const channel = interaction.options.getChannel('channel') || interaction.channel;
    const data = loadWordChainData();

    if (!data[interaction.guild.id] || !data[interaction.guild.id][channel.id]) {
        return interaction.reply({
            content: '❌ No word chain game found in this channel.',
            ephemeral: true
        });
    }

    const channelData = data[interaction.guild.id][channel.id];
    const daysSinceStart = Math.floor((Date.now() - channelData.startedAt) / (1000 * 60 * 60 * 24));

    const embed = new EmbedBuilder()
        .setTitle(`📊 Word Chain Stats - ${channel.name}`)
        .addFields(
            { name: '🔗 Current Word', value: channelData.currentWord, inline: true },
            { name: '📏 Chain Length', value: channelData.chainLength.toString(), inline: true },
            { name: '🏆 Longest Chain', value: channelData.longestChain.toString(), inline: true },
            { name: '💬 Total Words', value: channelData.totalWords.toString(), inline: true },
            { name: '❌ Mistakes/Resets', value: channelData.mistakes.toString(), inline: true },
            { name: '👥 Contributors', value: Object.keys(channelData.contributors).length.toString(), inline: true },
            { name: '📅 Days Running', value: daysSinceStart.toString(), inline: true },
            { name: '📖 Unique Words', value: channelData.usedWords.length.toString(), inline: true }
        )
        .setColor('#0099FF')
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handleLeaderboard(interaction) {
    const channel = interaction.options.getChannel('channel') || interaction.channel;
    const data = loadWordChainData();

    if (!data[interaction.guild.id] || !data[interaction.guild.id][channel.id]) {
        return interaction.reply({
            content: '❌ No word chain game found in this channel.',
            ephemeral: true
        });
    }

    const channelData = data[interaction.guild.id][channel.id];
    const contributors = Object.entries(channelData.contributors)
        .sort(([,a], [,b]) => b.words - a.words)
        .slice(0, 10);

    if (contributors.length === 0) {
        return interaction.reply({
            content: '📊 No contributors yet! Start playing to appear on the leaderboard.',
            ephemeral: true
        });
    }

    let description = '';
    const medals = ['🥇', '🥈', '🥉'];

    for (let i = 0; i < contributors.length; i++) {
        const [userId, userData] = contributors[i];
        const user = await interaction.client.users.fetch(userId).catch(() => null);
        const username = user ? user.username : 'Unknown User';
        const medal = i < 3 ? medals[i] : `**${i + 1}.**`;
        
        description += `${medal} **${username}** - ${userData.words} words\n`;
    }

    const embed = new EmbedBuilder()
        .setTitle(`🏆 Word Chain Leaderboard - ${channel.name}`)
        .setDescription(description)
        .setColor('#FFD700')
        .setFooter({ text: `Total contributors: ${Object.keys(channelData.contributors).length}` })
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handleConfig(interaction) {
    const channel = interaction.options.getChannel('channel') || interaction.channel;
    const setting = interaction.options.getString('setting');
    const value = interaction.options.getString('value');
    const data = loadWordChainData();

    if (!data[interaction.guild.id] || !data[interaction.guild.id][channel.id]) {
        return interaction.reply({
            content: '❌ No word chain game found in this channel.',
            ephemeral: true
        });
    }

    const channelData = data[interaction.guild.id][channel.id];

    switch (setting) {
        case 'min_length':
            const newLength = parseInt(value);
            if (isNaN(newLength) || newLength < 2 || newLength > 10) {
                return interaction.reply({ content: '❌ Minimum length must be between 2 and 10.', ephemeral: true });
            }
            channelData.minLength = newLength;
            break;
        case 'category':
            if (!WORD_CATEGORIES[value]) {
                return interaction.reply({ content: '❌ Invalid category. Use: animals, nature, food, or general.', ephemeral: true });
            }
            channelData.category = value;
            break;
        case 'mode':
            if (!['classic', 'rhyme', 'theme'].includes(value)) {
                return interaction.reply({ content: '❌ Invalid mode. Use: classic, rhyme, or theme.', ephemeral: true });
            }
            channelData.mode = value;
            break;
        case 'validation':
            channelData.strictValidation = value.toLowerCase() === 'true';
            break;
    }

    saveWordChainData(data);

    const embed = new EmbedBuilder()
        .setTitle('⚙️ Word Chain Configuration Updated')
        .setDescription(`Successfully updated **${setting}** to **${value}** in ${channel}`)
        .setColor('#00FF00')
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handleHint(interaction) {
    const channel = interaction.options.getChannel('channel') || interaction.channel;
    const data = loadWordChainData();

    if (!data[interaction.guild.id] || !data[interaction.guild.id][channel.id]) {
        return interaction.reply({
            content: '❌ No word chain game found in this channel.',
            ephemeral: true
        });
    }

    const channelData = data[interaction.guild.id][channel.id];
    const currentWord = channelData.currentWord;
    const targetLetter = currentWord.slice(-1).toUpperCase();

    channelData.hints = (channelData.hints || 0) + 1;
    saveWordChainData(data);

    const hints = [
        `The next word must start with **${targetLetter}**`,
        `Try thinking of words in the **${channelData.category || 'general'}** category`,
        `The current word has **${currentWord.length}** letters`,
        `Words must be at least **${channelData.minLength}** letters long`
    ];

    const embed = new EmbedBuilder()
        .setTitle('💡 Word Chain Hint')
        .setDescription(`Current word: **${currentWord}**\n\n${hints.join('\n')}`)
        .addFields({ name: 'Hints Used', value: channelData.hints.toString(), inline: true })
        .setColor('#FFD700')
        .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleAchievements(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    const data = loadWordChainData();
    const guildData = data[interaction.guild.id] || {};

    let totalWords = 0;
    let totalChains = 0;
    let longestChain = 0;
    let achievements = [];

    // Calculate user stats across all channels
    for (const channelId in guildData) {
        const channelData = guildData[channelId];
        if (channelData.contributors && channelData.contributors[user.id]) {
            const userStats = channelData.contributors[user.id];
            totalWords += userStats.words || 0;
            totalChains += userStats.chains || 0;
            if (userStats.longestChain > longestChain) {
                longestChain = userStats.longestChain || 0;
            }
        }
    }

    // Award achievements
    if (totalWords >= 10) achievements.push('🏆 Word Warrior (10+ words)');
    if (totalWords >= 50) achievements.push('🎯 Word Master (50+ words)');
    if (totalWords >= 100) achievements.push('👑 Word Legend (100+ words)');
    if (longestChain >= 25) achievements.push('🔗 Chain Builder (25+ chain)');
    if (longestChain >= 50) achievements.push('⛓️ Chain Master (50+ chain)');
    if (totalChains >= 5) achievements.push('🎮 Chain Starter (5+ chains started)');

    const embed = new EmbedBuilder()
        .setTitle(`🏆 ${user.username}'s Word Chain Achievements`)
        .addFields(
            { name: 'Total Words', value: totalWords.toString(), inline: true },
            { name: 'Chains Started', value: totalChains.toString(), inline: true },
            { name: 'Longest Chain', value: longestChain.toString(), inline: true },
            { name: 'Achievements', value: achievements.length > 0 ? achievements.join('\n') : 'None yet', inline: false }
        )
        .setColor('#FFD700')
        .setThumbnail(user.displayAvatarURL({ dynamic: true }))
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

function getRandomStartWords(category = 'general') {
    return WORD_CATEGORIES[category] || WORD_CATEGORIES.general;
}

function getRandomStartWord(category = 'general') {
    const words = getRandomStartWords(category);
    return words[Math.floor(Math.random() * words.length)];
}

// Export functions for use in message handling
module.exports.loadWordChainData = loadWordChainData;
module.exports.saveWordChainData = saveWordChainData;
module.exports.getRandomStartWord = getRandomStartWord;
module.exports.isValidWord = isValidWord;
module.exports.WORD_CATEGORIES = WORD_CATEGORIES;
