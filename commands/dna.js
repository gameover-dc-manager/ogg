const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { callGemini } = require('../utils/gemini');
const fs = require('fs');
const path = require('path');

// DNA data storage
const DNA_DATA_PATH = path.join(__dirname, '../config/dna_profiles.json');

// Load DNA profiles
function loadDNAProfiles() {
    try {
        if (fs.existsSync(DNA_DATA_PATH)) {
            const data = fs.readFileSync(DNA_DATA_PATH, 'utf8');
            return data ? JSON.parse(data) : {};
        }
    } catch (error) {
        console.error('❌ Error loading DNA profiles:', error);
    }
    return {};
}

// Save DNA profiles
function saveDNAProfiles(profiles) {
    try {
        const dir = path.dirname(DNA_DATA_PATH);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(DNA_DATA_PATH, JSON.stringify(profiles, null, 2));
        return true;
    } catch (error) {
        console.error('❌ Error saving DNA profiles:', error);
        return false;
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dna')
        .setDescription('Advanced DNA profile system for learning and mimicking user styles')
        .addSubcommand(subcommand =>
            subcommand
                .setName('learn')
                .setDescription('Learn a user\'s speaking style from recent messages')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('The user whose style to learn')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('limit')
                        .setDescription('How many recent messages to fetch (max 100)')
                        .setRequired(false)
                        .setMinValue(10)
                        .setMaxValue(100)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('analyze')
                .setDescription('Get detailed analysis of a user\'s communication style')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('The user to analyze')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('talklike')
                .setDescription('Generate text in a user\'s style')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('The user to mimic')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('prompt')
                        .setDescription('What they should say')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('profile')
                .setDescription('Show comprehensive profile of a user\'s learned data')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('The user whose profile to display')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('ghost')
                .setDescription('Simulate a random ghost message from a user')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('The user whose ghost to summon')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('roast')
                .setDescription('Generate a roast in a user\'s style')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('The user whose tone to roast in')
                        .setRequired(true))
                .addUserOption(option =>
                    option.setName('target')
                        .setDescription('Who to roast (optional)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('compliment')
                .setDescription('Generate a compliment in a user\'s style')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('The user whose tone to compliment in')
                        .setRequired(true))
                .addUserOption(option =>
                    option.setName('target')
                        .setDescription('Who to compliment (optional)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('ship')
                .setDescription('Generate a romantic message from one user to another')
                .addUserOption(option =>
                    option.setName('sender')
                        .setDescription('The user who has a crush')
                        .setRequired(true))
                .addUserOption(option =>
                    option.setName('target')
                        .setDescription('The user they are crushing on')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('compare')
                .setDescription('Compare the writing styles of two users')
                .addUserOption(option =>
                    option.setName('user1')
                        .setDescription('First user to compare')
                        .setRequired(true))
                .addUserOption(option =>
                    option.setName('user2')
                        .setDescription('Second user to compare')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('memeify')
                .setDescription('Generate a meme caption in a user\'s style')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('The user to imitate')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('topic')
                        .setDescription('Meme topic (optional)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('cleanup')
                .setDescription('Clean old DNA data and optimize storage'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('export')
                .setDescription('Export a user\'s DNA profile')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('The user whose profile to export')
                        .setRequired(true))),

    async execute(interaction) {
        try {
            const subcommand = interaction.options.getSubcommand();

            switch (subcommand) {
                case 'learn':
                    await handleLearn(interaction);
                    break;
                case 'analyze':
                    await handleAnalyze(interaction);
                    break;
                case 'talklike':
                    await handleTalklike(interaction);
                    break;
                case 'profile':
                    await handleProfile(interaction);
                    break;
                case 'ghost':
                    await handleGhost(interaction);
                    break;
                case 'roast':
                    await handleRoast(interaction);
                    break;
                case 'compliment':
                    await handleCompliment(interaction);
                    break;
                case 'ship':
                    await handleShip(interaction);
                    break;
                case 'compare':
                    await handleCompare(interaction);
                    break;
                case 'memeify':
                    await handleMemeify(interaction);
                    break;
                case 'cleanup':
                    await handleCleanup(interaction);
                    break;
                case 'export':
                    await handleExport(interaction);
                    break;
                default:
                    await interaction.reply({ content: 'Unknown subcommand!', ephemeral: true });
            }
        } catch (error) {
            console.error('❌ Error in DNA command:', error);
            const content = 'An error occurred while processing the DNA command. Please try again later.';

            try {
                if (interaction.deferred) {
                    await interaction.editReply({ content });
                } else if (!interaction.replied) {
                    await interaction.reply({ content, ephemeral: true });
                }
            } catch (replyError) {
                console.error('❌ Error sending error response:', replyError);
            }
        }
    }
};

async function handleLearn(interaction) {
    const user = interaction.options.getUser('user');
    const limit = interaction.options.getInteger('limit') || 50;

    if (user.bot) {
        return interaction.reply({ content: 'Cannot learn from bot accounts!', ephemeral: true });
    }

    if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply({ ephemeral: true });
    }

    try {
        const messages = await interaction.channel.messages.fetch({ limit: 200 });
        const userMessages = messages.filter(msg => 
            msg.author.id === user.id && 
            msg.content && 
            msg.content.length > 10 && 
            !msg.author.bot &&
            !msg.content.startsWith('/') && 
            !msg.content.startsWith('!') && 
            !/^https?:\/\//.test(msg.content)
        ).first(limit);

        if (userMessages.length === 0) {
            return interaction.editReply({ content: `No suitable messages found for **${user.displayName}**.` });
        }

        const profiles = loadDNAProfiles();
        const userId = user.id;

        if (!profiles[userId]) {
            profiles[userId] = {
                username: user.username,
                displayName: user.displayName,
                messages: [],
                lastUpdated: Date.now(),
                messageCount: 0,
                characteristics: {}
            };
        }

        const newMessages = userMessages.map(msg => ({
            content: msg.content,
            timestamp: msg.createdTimestamp,
            channelId: msg.channel.id
        }));

        profiles[userId].messages = [...profiles[userId].messages, ...newMessages];
        profiles[userId].messageCount = profiles[userId].messages.length;
        profiles[userId].lastUpdated = Date.now();
        profiles[userId].username = user.username;
        profiles[userId].displayName = user.displayName;

        if (profiles[userId].messages.length > 200) {
            profiles[userId].messages = profiles[userId].messages.slice(-200);
        }

        await analyzeUserCharacteristics(profiles[userId]);

        if (saveDNAProfiles(profiles)) {
            const embed = new EmbedBuilder()
                .setTitle('🧬 DNA Learning Complete')
                .setDescription(`Successfully learned **${newMessages.length}** new messages from **${user.displayName}**!`)
                .addFields(
                    { name: '📊 Total Messages', value: profiles[userId].messageCount.toString(), inline: true },
                    { name: '🎯 Quality Score', value: `${Math.round(profiles[userId].characteristics.qualityScore || 0)}%`, inline: true },
                    { name: '📝 Avg Message Length', value: `${Math.round(profiles[userId].characteristics.avgLength || 0)} chars`, inline: true }
                )
                .setColor('#FF69B4')
                .setThumbnail(user.displayAvatarURL())
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } else {
            await interaction.editReply({ content: '❌ Failed to save DNA data.' });
        }

    } catch (error) {
        console.error('Error in DNA learn:', error);
        await interaction.editReply({ content: 'An error occurred while learning user data.' });
    }
}

async function analyzeUserCharacteristics(profile) {
    if (!profile.messages || profile.messages.length === 0) {
        profile.characteristics = {
            avgLength: 0,
            qualityScore: 0,
            emojiUsage: 0,
            capsUsage: 0,
            exclamationUsage: 0,
            questionUsage: 0,
            topWords: [],
            messageFrequency: 0,
            lastActive: 0,
            communicationStyle: 'unknown',
            activityPattern: 'inactive'
        };
        return;
    }

    const messages = profile.messages.map(m => m.content);
    const totalChars = messages.join('').length;
    const avgLength = totalChars / messages.length;

    const text = messages.join(' ');
    const emojiCount = (text.match(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu) || []).length;
    const capsCount = (text.match(/[A-Z]/g) || []).length;
    const exclamationCount = (text.match(/!/g) || []).length;
    const questionCount = (text.match(/\?/g) || []).length;
    const mentionCount = (text.match(/<@[!&]?\d+>/g) || []).length;

    const words = text.toLowerCase().split(/\s+/).filter(w => /^[a-zA-Z]+$/.test(w) && w.length > 2);
    const wordCount = {};
    words.forEach(word => {
        wordCount[word] = (wordCount[word] || 0) + 1;
    });

    const topWords = Object.entries(wordCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([word, count]) => ({ word, count }));

    let communicationStyle = 'balanced';
    if (avgLength > 80) communicationStyle = 'detailed';
    else if (avgLength < 30) communicationStyle = 'concise';
    if (emojiCount > totalChars * 0.05) communicationStyle += ' & expressive';
    if (capsCount > totalChars * 0.1) communicationStyle += ' & emphatic';

    const timestamps = profile.messages.map(m => m.timestamp);
    const timeGaps = [];
    for (let i = 1; i < timestamps.length; i++) {
        timeGaps.push(timestamps[i] - timestamps[i-1]);
    }
    const avgGap = timeGaps.length > 0 ? timeGaps.reduce((a, b) => a + b, 0) / timeGaps.length : 0;
    const activityPattern = avgGap < 300000 ? 'very active' : avgGap < 3600000 ? 'active' : 'casual';

    profile.characteristics = {
        avgLength,
        qualityScore: Math.min(100, (messages.length * 2) + (avgLength > 20 ? 20 : 0) + (topWords.length > 5 ? 10 : 0)),
        emojiUsage: totalChars > 0 ? (emojiCount / totalChars) * 1000 : 0,
        capsUsage: totalChars > 0 ? (capsCount / totalChars) * 100 : 0,
        exclamationUsage: messages.length > 0 ? (exclamationCount / messages.length) : 0,
        questionUsage: messages.length > 0 ? (questionCount / messages.length) : 0,
        mentionUsage: messages.length > 0 ? (mentionCount / messages.length) : 0,
        topWords,
        messageFrequency: messages.length,
        lastActive: timestamps.length > 0 ? Math.max(...timestamps) : Date.now(),
        communicationStyle,
        activityPattern,
        conversationStarter: questionCount > exclamationCount,
        socialEngagement: mentionCount > 0 || emojiCount > 0
    };
}

async function handleAnalyze(interaction) {
    const user = interaction.options.getUser('user');
    const profiles = loadDNAProfiles();

    if (!profiles[user.id] || profiles[user.id].messages.length === 0) {
        return interaction.reply({ 
            content: `No DNA data for ${user.displayName}. Use \`/dna learn\` first.`, 
            ephemeral: true 
        });
    }

    if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply();
    }

    const profile = profiles[user.id];
    const chars = profile.characteristics;

    try {
        const analysisPrompt = `Analyze this user's communication style based on their message patterns:

User: ${profile.displayName}
Messages analyzed: ${profile.messageCount}
Average message length: ${Math.round(chars.avgLength)} characters
Top words used: ${chars.topWords.map(w => w.word).join(', ')}
Emoji usage: ${chars.emojiUsage.toFixed(2)} per 1000 characters
Caps usage: ${chars.capsUsage.toFixed(1)}%
Questions asked: ${chars.questionUsage.toFixed(1)} per message
Exclamations: ${chars.exclamationUsage.toFixed(1)} per message

Recent messages sample:
${profile.messages.slice(-10).map(m => m.content).join('\n')}

Provide a comprehensive personality analysis including communication style, emotional patterns, interests, and unique traits. Be insightful and specific.`;

        const analysis = await callGemini(analysisPrompt, 500);

        const embed = new EmbedBuilder()
            .setTitle(`🧬 DNA Analysis: ${profile.displayName}`)
            .setDescription(analysis)
            .addFields(
                { name: '📊 Data Quality', value: `${Math.round(chars.qualityScore)}%`, inline: true },
                { name: '💬 Messages', value: profile.messageCount.toString(), inline: true },
                { name: '📏 Avg Length', value: `${Math.round(chars.avgLength)} chars`, inline: true },
                { name: '😄 Emoji Usage', value: `${chars.emojiUsage.toFixed(1)}/1k`, inline: true },
                { name: '📢 Caps Usage', value: `${chars.capsUsage.toFixed(1)}%`, inline: true },
                { name: '❗ Excitement', value: `${chars.exclamationUsage.toFixed(1)}/msg`, inline: true }
            )
            .setColor('#9932CC')
            .setThumbnail(user.displayAvatarURL())
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });

    } catch (error) {
        console.error('Error in DNA analyze:', error);
        await interaction.editReply({ content: 'Error generating analysis. Please try again later.' });
    }
}

async function handleTalklike(interaction) {
    const user = interaction.options.getUser('user');
    const prompt = interaction.options.getString('prompt');
    const profiles = loadDNAProfiles();

    if (!profiles[user.id] || profiles[user.id].messages.length < 10) {
        return interaction.reply({ 
            content: `Insufficient DNA data for ${user.displayName}. Need at least 10 messages. Use \`/dna learn\` first.`, 
            ephemeral: true 
        });
    }

    if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply();
    }

    const profile = profiles[user.id];
    const recentMessages = profile.messages.slice(-15).map(m => m.content).join('\n');

    const fullPrompt = `You are now roleplaying as ${profile.displayName}. Study their exact writing style from these messages:

${recentMessages}

Key characteristics:
- Average message length: ${Math.round(profile.characteristics.avgLength)} characters
- Top words: ${profile.characteristics.topWords.map(w => w.word).join(', ')}
- Emoji usage level: ${profile.characteristics.emojiUsage > 5 ? 'High' : profile.characteristics.emojiUsage > 2 ? 'Medium' : 'Low'}
- Caps usage: ${profile.characteristics.capsUsage > 5 ? 'High' : 'Normal'}

Now respond to this prompt in their exact style: "${prompt}"

Match their tone, word choice, punctuation habits, and personality. Keep it authentic to how they actually communicate.`;

    try {
        const reply = await callGemini(fullPrompt, 300);

        const embed = new EmbedBuilder()
            .setTitle(`💬 ${profile.displayName} might say:`)
            .setDescription(`> ${reply}`)
            .setColor('#00FF7F')
            .setThumbnail(user.displayAvatarURL())
            .setFooter({ text: `Based on ${profile.messageCount} messages` })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        console.error('Error generating talklike response:', error);
        await interaction.editReply({ content: 'Error generating response. Please try again later.' });
    }
}

async function handleProfile(interaction) {
    const user = interaction.options.getUser('user');
    const profiles = loadDNAProfiles();

    if (!profiles[user.id] || profiles[user.id].messages.length === 0) {
        return interaction.reply({ 
            content: `No DNA data for ${user.displayName}. Use \`/dna learn\` first.`, 
            ephemeral: true 
        });
    }

    const profile = profiles[user.id];
    const chars = profile.characteristics;

    const topWordsDisplay = chars.topWords.slice(0, 8)
        .map(w => `${w.word} (${w.count})`)
        .join(', ') || 'None';

    const lastActive = new Date(chars.lastActive).toLocaleDateString();

    const embed = new EmbedBuilder()
        .setTitle(`🧬 DNA Profile: ${profile.displayName}`)
        .addFields(
            { name: '📊 Statistics', value: `**Messages:** ${profile.messageCount}\n**Quality Score:** ${Math.round(chars.qualityScore)}%\n**Last Active:** ${lastActive}`, inline: true },
            { name: '📝 Writing Style', value: `**Avg Length:** ${Math.round(chars.avgLength)} chars\n**Emoji Usage:** ${chars.emojiUsage.toFixed(1)}/1k\n**Caps Usage:** ${chars.capsUsage.toFixed(1)}%`, inline: true },
            { name: '🎭 Personality', value: `**Questions:** ${chars.questionUsage.toFixed(1)}/msg\n**Excitement:** ${chars.exclamationUsage.toFixed(1)}/msg\n**Communication:** ${chars.avgLength > 50 ? 'Detailed' : 'Concise'}`, inline: true },
            { name: '💬 Top Words', value: topWordsDisplay, inline: false }
        )
        .setColor('#FF1493')
        .setThumbnail(user.displayAvatarURL())
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handleGhost(interaction) {
    const user = interaction.options.getUser('user');
    const profiles = loadDNAProfiles();

    if (!profiles[user.id] || profiles[user.id].messages.length < 5) {
        return interaction.reply({ 
            content: `Not enough DNA data for ${user.displayName}. Use \`/dna learn\` first.`, 
            ephemeral: true 
        });
    }

    if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply();
    }

    const profile = profiles[user.id];
    const style = profile.messages.slice(-10).map(m => m.content).join('\n');

    const prompt = `You are the ghost of ${profile.displayName}. Here are their recent messages:

${style}

Now say something they would say if they suddenly appeared as a ghost - make it mysterious but in their exact communication style. Keep their personality and way of speaking.`;

    try {
        const reply = await callGemini(prompt, 200);

        const embed = new EmbedBuilder()
            .setTitle('👻 A Wild Ghost Appears!')
            .setDescription(`**Ghost of ${profile.displayName}:**\n> ${reply}`)
            .setColor('#8A2BE2')
            .setThumbnail(user.displayAvatarURL())
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        console.error('Error generating ghost reply:', error);
        await interaction.editReply({ content: 'The ghost failed to materialize. Try again later.' });
    }
}

async function handleRoast(interaction) {
    const user = interaction.options.getUser('user');
    const target = interaction.options.getUser('target');
    const profiles = loadDNAProfiles();

    if (!profiles[user.id] || profiles[user.id].messages.length < 10) {
        return interaction.reply({ 
            content: `Not enough DNA data for ${user.displayName}. Use \`/dna learn\` first.`, 
            ephemeral: true 
        });
    }

    if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply();
    }

    const profile = profiles[user.id];
    const style = profile.messages.slice(-10).map(m => m.content).join('\n');
    const targetName = target ? target.displayName : 'someone';

    const prompt = `You are mimicking ${profile.displayName}'s exact communication style. Here are their messages:

${style}

Write a playful roast directed at ${targetName} in ${profile.displayName}'s exact tone and style. Make it funny but not mean-spirited. Match their humor level and way of speaking perfectly.`;

    try {
        const reply = await callGemini(prompt, 250);

        const embed = new EmbedBuilder()
            .setTitle('🔥 Roast Mode Activated!')
            .setDescription(`**${profile.displayName} roasts ${targetName}:**\n> ${reply}`)
            .setColor('#FF4500')
            .setThumbnail(user.displayAvatarURL())
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        console.error('Error generating roast:', error);
        await interaction.editReply({ content: 'Error generating roast. Please try again later.' });
    }
}

async function handleCompliment(interaction) {
    const user = interaction.options.getUser('user');
    const target = interaction.options.getUser('target');
    const profiles = loadDNAProfiles();

    if (!profiles[user.id] || profiles[user.id].messages.length < 10) {
        return interaction.reply({ 
            content: `Not enough DNA data for ${user.displayName}. Use \`/dna learn\` first.`, 
            ephemeral: true 
        });
    }

    if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply();
    }

    const profile = profiles[user.id];
    const style = profile.messages.slice(-10).map(m => m.content).join('\n');
    const targetName = target ? target.displayName : 'someone';

    const prompt = `You are mimicking ${profile.displayName}'s exact communication style. Here are their messages:

${style}

Write a genuine, sweet compliment for ${targetName} in ${profile.displayName}'s exact tone and style. Make it heartfelt and match their personality perfectly.`;

    try {
        const reply = await callGemini(prompt, 250);

        const embed = new EmbedBuilder()
            .setTitle('💝 Compliment Time!')
            .setDescription(`**${profile.displayName} says to ${targetName}:**\n> ${reply}`)
            .setColor('#FFB6C1')
            .setThumbnail(user.displayAvatarURL())
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        console.error('Error generating compliment:', error);
        await interaction.editReply({ content: 'Error generating compliment. Please try again later.' });
    }
}

async function handleShip(interaction) {
    const sender = interaction.options.getUser('sender');
    const target = interaction.options.getUser('target');
    const profiles = loadDNAProfiles();

    if (!profiles[sender.id] || profiles[sender.id].messages.length < 10) {
        return interaction.reply({ 
            content: `Not enough DNA data for ${sender.displayName}. Use \`/dna learn\` first.`, 
            ephemeral: true 
        });
    }

    if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply();
    }

    const profile = profiles[sender.id];
    const style = profile.messages.slice(-10).map(m => m.content).join('\n');

    const prompt = `You are mimicking ${profile.displayName}'s exact communication style. Here are their messages:

${style}

Write a flirty or romantic message from ${profile.displayName} to ${target.displayName}. Make it sweet and match ${profile.displayName}'s personality and way of speaking perfectly. Keep it playful and appropriate.`;

    try {
        const reply = await callGemini(prompt, 250);

        const embed = new EmbedBuilder()
            .setTitle('💕 Ship Sailed!')
            .setDescription(`**${profile.displayName} → ${target.displayName}:**\n> ${reply}`)
            .setColor('#FF1493')
            .setThumbnail(sender.displayAvatarURL())
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        console.error('Error generating ship message:', error);
        await interaction.editReply({ content: 'Error generating ship message. Please try again later.' });
    }
}

async function handleCompare(interaction) {
    const user1 = interaction.options.getUser('user1');
    const user2 = interaction.options.getUser('user2');
    const profiles = loadDNAProfiles();

    if (!profiles[user1.id] || profiles[user1.id].messages.length < 5) {
        return interaction.reply({ 
            content: `Not enough DNA data for ${user1.displayName}. Use \`/dna learn\` first.`, 
            ephemeral: true 
        });
    }

    if (!profiles[user2.id] || profiles[user2.id].messages.length < 5) {
        return interaction.reply({ 
            content: `Not enough DNA data for ${user2.displayName}. Use \`/dna learn\` first.`, 
            ephemeral: true 
        });
    }

    if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply();
    }

    const profile1 = profiles[user1.id];
    const profile2 = profiles[user2.id];
    const style1 = profile1.messages.slice(-8).map(m => m.content).join('\n');
    const style2 = profile2.messages.slice(-8).map(m => m.content).join('\n');

    const prompt = `Compare the communication styles of these two users. Be specific about differences in personality, humor, formality, and expression:

${profile1.displayName}:
${style1}

${profile2.displayName}:
${style2}

Provide detailed insights about how they differ in tone, word choice, emotional expression, and communication patterns.`;

    try {
        const comparison = await callGemini(prompt, 400);

        const chars1 = profile1.characteristics;
        const chars2 = profile2.characteristics;

        const embed = new EmbedBuilder()
            .setTitle(`🔍 Style Comparison: ${profile1.displayName} vs ${profile2.displayName}`)
            .setDescription(comparison)
            .addFields(
                { name: `📊 ${profile1.displayName} Stats`, value: `Avg Length: ${Math.round(chars1.avgLength)}\nEmoji Usage: ${chars1.emojiUsage.toFixed(1)}/1k\nCaps: ${chars1.capsUsage.toFixed(1)}%`, inline: true },
                { name: `📊 ${profile2.displayName} Stats`, value: `Avg Length: ${Math.round(chars2.avgLength)}\nEmoji Usage: ${chars2.emojiUsage.toFixed(1)}/1k\nCaps: ${chars2.capsUsage.toFixed(1)}%`, inline: true }
            )
            .setColor('#4169E1')
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        console.error('Error generating comparison:', error);
        await interaction.editReply({ content: 'Error generating comparison. Please try again later.' });
    }
}

async function handleMemeify(interaction) {
    const user = interaction.options.getUser('user');
    const topic = interaction.options.getString('topic') || 'random meme';
    const profiles = loadDNAProfiles();

    if (!profiles[user.id] || profiles[user.id].messages.length < 5) {
        return interaction.reply({ 
            content: `Not enough DNA data for ${user.displayName}. Use \`/dna learn\` first.`, 
            ephemeral: true 
        });
    }

    if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply();
    }

    const profile = profiles[user.id];
    const style = profile.messages.slice(-10).map(m => m.content).join('\n');

    const prompt = `You are mimicking ${profile.displayName}'s exact communication style. Here are their messages:

${style}

Create a funny meme caption about "${topic}" in ${profile.displayName}'s exact style. Make it humorous and match their personality perfectly. Keep it short and punchy like a real meme caption.`;

    try {
        const meme = await callGemini(prompt, 150);

        const embed = new EmbedBuilder()
            .setTitle('🎭 Meme Generator')
            .setDescription(`**Meme by ${profile.displayName}:**\n\n*${topic.toUpperCase()}*\n\n> ${meme}`)
            .setColor('#FF69B4')
            .setThumbnail(user.displayAvatarURL())
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        console.error('Error generating meme:', error);
        await interaction.editReply({ content: 'Error generating meme. Please try again later.' });
    }
}

async function handleCleanup(interaction) {
    if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply({ ephemeral: true });
    }

    const profiles = loadDNAProfiles();
    let cleaned = 0;
    const cutoffDate = Date.now() - (30 * 24 * 60 * 60 * 1000); // 30 days ago

    for (const [userId, profile] of Object.entries(profiles)) {
        if (profile.lastUpdated < cutoffDate && profile.messageCount < 20) {
            delete profiles[userId];
            cleaned++;
        } else {
            const oldCount = profile.messages.length;
            profile.messages = profile.messages.filter(m => m.timestamp > cutoffDate);
            if (profile.messages.length !== oldCount) {
                profile.messageCount = profile.messages.length;
                await analyzeUserCharacteristics(profile);
            }
        }
    }

    if (saveDNAProfiles(profiles)) {
        await interaction.editReply({ content: `🧹 Cleanup complete! Removed ${cleaned} inactive profiles and optimized remaining data.` });
    } else {
        await interaction.editReply({ content: '❌ Failed to save cleaned data.' });
    }
}

async function handleExport(interaction) {
    const user = interaction.options.getUser('user');
    const profiles = loadDNAProfiles();

    if (!profiles[user.id]) {
        return interaction.reply({ 
            content: `No DNA data for ${user.displayName}.`, 
            ephemeral: true 
        });
    }

    const profile = profiles[user.id];
    const exportData = {
        username: profile.username,
        displayName: profile.displayName,
        messageCount: profile.messageCount,
        lastUpdated: new Date(profile.lastUpdated).toISOString(),
        characteristics: profile.characteristics,
        sampleMessages: profile.messages.slice(-10).map(m => m.content)
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const truncatedJson = jsonString.length > 4000 ? jsonString.substring(0, 3900) + '\n...\n}' : jsonString;

    const embed = new EmbedBuilder()
        .setTitle(`📤 DNA Export: ${profile.displayName}`)
        .setDescription('```json\n' + truncatedJson + '```')
        .setColor('#32CD32')
        .setThumbnail(user.displayAvatarURL())
        .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
}