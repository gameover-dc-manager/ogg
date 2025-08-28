const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const LEADERBOARD_FILE = path.join(__dirname, '..', 'config', 'leaderboard.json');

// Initialize leaderboard data
function initializeLeaderboard() {
    if (!fs.existsSync(LEADERBOARD_FILE)) {
        const defaultData = {};
        fs.writeFileSync(LEADERBOARD_FILE, JSON.stringify(defaultData, null, 2));
    }
}

function loadLeaderboard() {
    try {
        initializeLeaderboard();
        const data = fs.readFileSync(LEADERBOARD_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error loading leaderboard:', error);
        return {};
    }
}

function saveLeaderboard(data) {
    try {
        fs.writeFileSync(LEADERBOARD_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error saving leaderboard:', error);
    }
}

function addXP(guildId, userId, amount, messageType = 'text') {
    const data = loadLeaderboard();
    if (!data[guildId]) data[guildId] = {};
    if (!data[guildId][userId]) {
        data[guildId][userId] = {
            xp: 0,
            level: 1,
            messages: 0,
            textMessages: 0,
            mediaMessages: 0,
            linksShared: 0,
            commandsUsed: 0,
            reactionsGiven: 0,
            lastMessage: 0,
            dailyMessages: {},
            weeklyMessages: {},
            monthlyMessages: {}
        };
    }

    const now = Date.now();
    const today = new Date().toDateString();
    const weekStart = getWeekStart(new Date()).toDateString();
    const monthStart = getMonthStart(new Date()).toDateString();

    data[guildId][userId].xp += amount;
    data[guildId][userId].messages++;
    data[guildId][userId].lastMessage = now;

    // Initialize time-based tracking if not exists
    if (!data[guildId][userId].dailyMessages) data[guildId][userId].dailyMessages = {};
    if (!data[guildId][userId].weeklyMessages) data[guildId][userId].weeklyMessages = {};
    if (!data[guildId][userId].monthlyMessages) data[guildId][userId].monthlyMessages = {};

    // Track daily messages
    if (!data[guildId][userId].dailyMessages[today]) {
        data[guildId][userId].dailyMessages[today] = { total: 0, text: 0, media: 0, links: 0, commands: 0, reactions: 0 };
    }
    data[guildId][userId].dailyMessages[today].total++;
    data[guildId][userId].dailyMessages[today][messageType]++;

    // Track weekly messages
    if (!data[guildId][userId].weeklyMessages[weekStart]) {
        data[guildId][userId].weeklyMessages[weekStart] = { total: 0, text: 0, media: 0, links: 0, commands: 0, reactions: 0 };
    }
    data[guildId][userId].weeklyMessages[weekStart].total++;
    data[guildId][userId].weeklyMessages[weekStart][messageType]++;

    // Track monthly messages
    if (!data[guildId][userId].monthlyMessages[monthStart]) {
        data[guildId][userId].monthlyMessages[monthStart] = { total: 0, text: 0, media: 0, links: 0, commands: 0, reactions: 0 };
    }
    data[guildId][userId].monthlyMessages[monthStart].total++;
    data[guildId][userId].monthlyMessages[monthStart][messageType]++;

    // Track message categories
    switch (messageType) {
        case 'text':
            data[guildId][userId].textMessages++;
            break;
        case 'media':
            data[guildId][userId].mediaMessages++;
            break;
        case 'links':
            data[guildId][userId].linksShared++;
            break;
        case 'commands':
            data[guildId][userId].commandsUsed++;
            break;
        case 'reactions':
            data[guildId][userId].reactionsGiven++;
            break;
    }

    // Calculate level (exponential XP requirements - much harder)
    const getRequiredXP = (level) => Math.pow(level, 2.5) * 100;

    let newLevel = 1;
    let currentXP = data[guildId][userId].xp;

    while (currentXP >= getRequiredXP(newLevel)) {
        newLevel++;
    }

    const leveledUp = newLevel > data[guildId][userId].level;
    data[guildId][userId].level = newLevel;

    saveLeaderboard(data);
    return { leveledUp, newLevel };
}

function getWeekStart(date) {
    const day = date.getDay();
    const diff = date.getDate() - day;
    return new Date(date.setDate(diff));
}

function getMonthStart(date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('🏆 View interactive server leaderboards with advanced filtering')
        .addSubcommand(subcommand =>
            subcommand
                .setName('interactive')
                .setDescription('🎮 Open interactive leaderboard dashboard')
                .addStringOption(option =>
                    option.setName('type')
                        .setDescription('Default leaderboard type to show')
                        .addChoices(
                            { name: '⭐ XP Leaderboard', value: 'xp' },
                            { name: '🏅 Level Leaderboard', value: 'level' },
                            { name: '💬 Messages Leaderboard', value: 'messages' }
                        )
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('xp')
                .setDescription('⭐ View XP leaderboard')
                .addIntegerOption(option =>
                    option.setName('page')
                        .setDescription('Page number')
                        .setMinValue(1)
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('level')
                .setDescription('🏅 View level leaderboard')
                .addIntegerOption(option =>
                    option.setName('page')
                        .setDescription('Page number')
                        .setMinValue(1)
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('messages')
                .setDescription('💬 View message count leaderboard')
                .addStringOption(option =>
                    option.setName('category')
                        .setDescription('Message category')
                        .addChoices(
                            { name: '📊 Total Messages', value: 'total' },
                            { name: '📝 Text Messages', value: 'text' },
                            { name: '🖼️ Images/Media', value: 'media' },
                            { name: '🔗 Links Shared', value: 'links' },
                            { name: '⚡ Commands Used', value: 'commands' },
                            { name: '❤️ Reactions Given', value: 'reactions' }
                        )
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('timeframe')
                        .setDescription('Time period')
                        .addChoices(
                            { name: '📅 Today', value: 'today' },
                            { name: '📊 This Week', value: 'week' },
                            { name: '📈 This Month', value: 'month' },
                            { name: '🏆 Lifetime', value: 'lifetime' }
                        )
                        .setRequired(false))
                .addIntegerOption(option =>
                    option.setName('page')
                        .setDescription('Page number')
                        .setMinValue(1)
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('rank')
                .setDescription('🎯 Check your rank or someone else\'s')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to check rank for')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('reset')
                .setDescription('🗑️ Reset leaderboard (Admin only)')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('Specific user to reset')
                        .setRequired(false))),

    async execute(interaction) {
        try {
            const subcommand = interaction.options.getSubcommand();

            // Check if interaction is still valid before processing
            if (!interaction.isRepliable()) {
                console.log('❌ Leaderboard interaction not repliable');
                return;
            }

            // Check interaction age before deferring
            const interactionAge = Date.now() - interaction.createdTimestamp;
            if (interactionAge > 2000) {
                console.log(`❌ Leaderboard interaction too old (${interactionAge}ms), skipping`);
                return;
            }

            // Defer reply for commands that might take time
            if (!interaction.replied && !interaction.deferred) {
                await interaction.deferReply();
            }

            const data = loadLeaderboard();
            const guildData = data[interaction.guild.id] || {};

            switch (subcommand) {
                case 'interactive':
                    await handleInteractiveLeaderboard(interaction, guildData);
                    break;
                case 'xp':
                case 'level':
                case 'messages':
                    await handleLeaderboard(interaction, guildData, subcommand);
                    break;
                case 'rank':
                    await handleRank(interaction, guildData);
                    break;
                case 'reset':
                    await handleReset(interaction);
                    break;
            }
        } catch (error) {
            console.error('❌ Error in leaderboard execute:', error);
            
            // Only try to respond if we haven't already
            if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
                try {
                    await interaction.reply({
                        content: '❌ Command failed to execute. Please try again.',
                        ephemeral: true
                    });
                } catch (replyError) {
                    console.error('❌ Failed to send execute error:', replyError);
                }
            } else if (interaction.deferred && !interaction.replied) {
                try {
                    await interaction.editReply({
                        content: '❌ Command failed to execute. Please try again.'
                    });
                } catch (editError) {
                    console.error('❌ Failed to edit reply with error:', editError);
                }
            }
        }
    }
};

async function handleInteractiveLeaderboard(interaction, guildData) {
    // Only try to get options if it's a slash command interaction
    const defaultType = interaction.isChatInputCommand() ? 
        (interaction.options.getString('type') || 'messages') : 'messages';

    // Create the interactive dashboard
    const embed = new EmbedBuilder()
        .setTitle('🎮 Interactive Leaderboard Dashboard')
        .setDescription('Choose how you want to explore the server rankings!')
        .addFields(
            { 
                name: '⭐ XP Rankings', 
                value: 'See who has earned the most experience points', 
                inline: true 
            },
            { 
                name: '🏅 Level Rankings', 
                value: 'View the highest level members', 
                inline: true 
            },
            { 
                name: '💬 Activity Rankings', 
                value: 'Discover the most active chatters', 
                inline: true 
            },
            { 
                name: '📊 Quick Stats', 
                value: `🎯 Active Members: **${Object.keys(guildData).length}**\n📈 Total XP: **${Object.values(guildData).reduce((sum, user) => sum + (user.xp || 0), 0).toLocaleString()}**\n💬 Total Messages: **${Object.values(guildData).reduce((sum, user) => sum + (user.messages || 0), 0).toLocaleString()}**`, 
                inline: false 
            }
        )
        .setColor('#FFD700')
        .setThumbnail(interaction.guild.iconURL())
        .setTimestamp()
        .setFooter({ text: `${interaction.guild.name} • Interactive Dashboard`, iconURL: interaction.guild.iconURL() });

    // Navigation buttons
    const row1 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('leaderboard_quick_xp')
                .setLabel('XP Leaders')
                .setEmoji('⭐')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('leaderboard_quick_level')
                .setLabel('Level Leaders')
                .setEmoji('🏅')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('leaderboard_quick_messages')
                .setLabel('Chat Leaders')
                .setEmoji('💬')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('leaderboard_rank_me')
                .setLabel('My Rank')
                .setEmoji('🎯')
                .setStyle(ButtonStyle.Danger)
        );

    await interaction.editReply({ 
        embeds: [embed], 
        components: [row1] 
    });
}

async function handleLeaderboard(interaction, guildData, type) {
    const page = interaction.isChatInputCommand() ? 
        (interaction.options.getInteger('page') || 1) : 1;
    const usersPerPage = 10;
    const startIndex = (page - 1) * usersPerPage;

    // Filter out users with no data
    const validUsers = Object.entries(guildData).filter(([userId, userData]) => {
        return userData && (userData.xp > 0 || userData.messages > 0);
    });

    // Sort users based on type
    let sortedUsers;
    switch (type) {
        case 'xp':
            sortedUsers = validUsers.sort(([,a], [,b]) => (b.xp || 0) - (a.xp || 0));
            break;
        case 'level':
            sortedUsers = validUsers.sort(([,a], [,b]) => (b.level || 1) - (a.level || 1) || (b.xp || 0) - (a.xp || 0));
            break;
        case 'messages':
            const category = interaction.isChatInputCommand() ? 
                (interaction.options.getString('category') || 'total') : 'total';
            const timeframe = interaction.isChatInputCommand() ? 
                (interaction.options.getString('timeframe') || 'lifetime') : 'lifetime';

            sortedUsers = validUsers.sort(([,a], [,b]) => {
                let aCount = 0, bCount = 0;

                if (timeframe === 'lifetime') {
                    switch (category) {
                        case 'total': aCount = a.messages || 0; bCount = b.messages || 0; break;
                        case 'text': aCount = a.textMessages || 0; bCount = b.textMessages || 0; break;
                        case 'media': aCount = a.mediaMessages || 0; bCount = b.mediaMessages || 0; break;
                        case 'links': aCount = a.linksShared || 0; bCount = b.linksShared || 0; break;
                        case 'commands': aCount = a.commandsUsed || 0; bCount = b.commandsUsed || 0; break;
                        case 'reactions': aCount = a.reactionsGiven || 0; bCount = b.reactionsGiven || 0; break;
                    }
                } else {
                    // Get time-based counts
                    const now = new Date();
                    let timeKey;

                    if (timeframe === 'today') {
                        timeKey = now.toDateString();
                        aCount = (a.dailyMessages && a.dailyMessages[timeKey]) ? a.dailyMessages[timeKey][category] || 0 : 0;
                        bCount = (b.dailyMessages && b.dailyMessages[timeKey]) ? b.dailyMessages[timeKey][category] || 0 : 0;
                    } else if (timeframe === 'week') {
                        timeKey = getWeekStart(new Date(now)).toDateString();
                        aCount = (a.weeklyMessages && a.weeklyMessages[timeKey]) ? a.weeklyMessages[timeKey][category] || 0 : 0;
                        bCount = (b.weeklyMessages && b.weeklyMessages[timeKey]) ? b.weeklyMessages[timeKey][category] || 0 : 0;
                    } else if (timeframe === 'month') {
                        timeKey = getMonthStart(new Date(now)).toDateString();
                        aCount = (a.monthlyMessages && a.monthlyMessages[timeKey]) ? a.monthlyMessages[timeKey][category] || 0 : 0;
                        bCount = (b.monthlyMessages && b.monthlyMessages[timeKey]) ? b.monthlyMessages[timeKey][category] || 0 : 0;
                    }
                }

                return bCount - aCount;
            });
            break;
    }

    if (sortedUsers.length === 0) {
        return interaction.editReply({
            content: '📊 No leaderboard data available yet! Chat more to build up the leaderboard.',
            ephemeral: true
        });
    }

    const totalPages = Math.ceil(sortedUsers.length / usersPerPage);
    const pageUsers = sortedUsers.slice(startIndex, startIndex + usersPerPage);

    let description = '';

    for (let i = 0; i < pageUsers.length; i++) {
        const [userId, userData] = pageUsers[i];
        const rank = startIndex + i + 1;
        const user = await interaction.client.users.fetch(userId).catch(() => null);
        const username = user ? user.displayName : 'Unknown User';

        let value;
        if (type === 'messages') {
            const category = interaction.isChatInputCommand() ? 
                (interaction.options.getString('category') || 'total') : 'total';
            const timeframe = interaction.isChatInputCommand() ? 
                (interaction.options.getString('timeframe') || 'lifetime') : 'lifetime';
            let count = 0;

            if (timeframe === 'lifetime') {
                switch (category) {
                    case 'total': count = userData.messages || 0; break;
                    case 'text': count = userData.textMessages || 0; break;
                    case 'media': count = userData.mediaMessages || 0; break;
                    case 'links': count = userData.linksShared || 0; break;
                    case 'commands': count = userData.commandsUsed || 0; break;
                    case 'reactions': count = userData.reactionsGiven || 0; break;
                }
            } else {
                const now = new Date();
                let timeKey;

                if (timeframe === 'today') {
                    timeKey = now.toDateString();
                    count = (userData.dailyMessages && userData.dailyMessages[timeKey]) ? userData.dailyMessages[timeKey][category] || 0 : 0;
                } else if (timeframe === 'week') {
                    timeKey = getWeekStart(new Date(now)).toDateString();
                    count = (userData.weeklyMessages && userData.weeklyMessages[timeKey]) ? userData.weeklyMessages[timeKey][category] || 0 : 0;
                } else if (timeframe === 'month') {
                    timeKey = getMonthStart(new Date(now)).toDateString();
                    count = (userData.monthlyMessages && userData.monthlyMessages[timeKey]) ? userData.monthlyMessages[timeKey][category] || 0 : 0;
                }
            }

            value = `${count.toLocaleString()} messages`;
        } else {
            switch (type) {
                case 'xp':
                    value = `${userData.xp.toLocaleString()} XP`;
                    break;
                case 'level':
                    value = `Level ${userData.level} (${userData.xp.toLocaleString()} XP)`;
                    break;
            }
        }

        const line = `${rank}. @${username} - ${value}\n`;
        // Ensure description doesn't exceed Discord's 4096 character limit
        if (description.length + line.length > 4000) {
            description += '...and more';
            break;
        }
        description += line;
    }

    let title = `🏆 Leaderboard Messages (Page ${page}/${totalPages})`;
    if (type === 'messages') {
        const category = interaction.isChatInputCommand() ? 
            (interaction.options.getString('category') || 'total') : 'total';
        const timeframe = interaction.isChatInputCommand() ? 
            (interaction.options.getString('timeframe') || 'lifetime') : 'lifetime';
        title = `🏆 Leaderboard Messages (Page ${page}/${totalPages})`;
    }

    // Find user's position to show below leaderboard
    const userRank = sortedUsers.findIndex(([userId]) => userId === interaction.user.id) + 1;
    const userPositionText = userRank > 0 ? `🎯 ${interaction.user.displayName}'s Position: #${userRank}` : '';

    const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(description || 'No data available')
        .setColor('#00BFFF')
        .setTimestamp();

    if (userPositionText) {
        embed.addFields({ name: '\u200B', value: userPositionText, inline: false });
    }

    // Navigation buttons matching screenshot style
    const navigationRow = new ActionRowBuilder();

    // Left arrow button
    if (page > 1) {
        navigationRow.addComponents(
            new ButtonBuilder()
                .setCustomId(`leaderboard_nav_${type}_${page - 1}`)
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('◀️')
        );
    } else {
        navigationRow.addComponents(
            new ButtonBuilder()
                .setCustomId('leaderboard_disabled_prev')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('◀️')
                .setDisabled(true)
        );
    }

    // "Go To Page" button in the middle
    navigationRow.addComponents(
        new ButtonBuilder()
            .setCustomId(`leaderboard_goto_page_${type}`)
            .setLabel('Go To Page')
            .setStyle(ButtonStyle.Primary)
    );

    // Right arrow button
    if (page < totalPages) {
        navigationRow.addComponents(
            new ButtonBuilder()
                .setCustomId(`leaderboard_nav_${type}_${page + 1}`)
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('▶️')
        );
    } else {
        navigationRow.addComponents(
            new ButtonBuilder()
                .setCustomId('leaderboard_disabled_next')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('▶️')
                .setDisabled(true)
        );
    }

    const components = [navigationRow];

    await interaction.editReply({
        embeds: [embed],
        components: components
    });
}

async function handleRank(interaction, guildData) {
    const targetUser = interaction.isChatInputCommand() ? 
        (interaction.options.getUser('user') || interaction.user) : interaction.user;
    const userData = guildData[targetUser.id];

    if (!userData) {
        return interaction.editReply({
            content: `📊 ${targetUser.id === interaction.user.id ? 'You have' : `${targetUser.username} has`} no ranking data yet. Start chatting to build up XP!`,
            ephemeral: true
        });
    }

    // Calculate rank
    const allUsers = Object.entries(guildData).sort(([,a], [,b]) => (b.xp || 0) - (a.xp || 0));
    const rank = allUsers.findIndex(([userId]) => userId === targetUser.id) + 1;

    // Calculate progress to next level
    const currentLevelXP = Math.pow(userData.level - 1, 2.5) * 100;
    const nextLevelXP = Math.pow(userData.level, 2.5) * 100;
    const progressXP = userData.xp - currentLevelXP;
    const totalNeeded = nextLevelXP - currentLevelXP;
    const neededXP = nextLevelXP - userData.xp;

    // Create progress bar
    const progressPercent = Math.min((progressXP / totalNeeded) * 100, 100);
    const filledBars = Math.max(0, Math.min(10, Math.floor(progressPercent / 10)));
    const emptyBars = Math.max(0, 10 - filledBars);
    const progressBar = '▓'.repeat(filledBars) + '░'.repeat(emptyBars);

    const embed = new EmbedBuilder()
        .setTitle(`🎯 Rank Profile • ${targetUser.username}`)
        .setThumbnail(targetUser.displayAvatarURL({ size: 256 }))
        .setColor(rank <= 3 ? '#FFD700' : rank <= 10 ? '#C0C0C0' : '#CD7F32')
        .addFields(
            { name: '🏆 Server Rank', value: `**${rank}** out of ${allUsers.length}`, inline: true },
            { name: '⭐ Level', value: `**${userData.level}**`, inline: true },
            { name: '✨ Total XP', value: `**${userData.xp.toLocaleString()}**`, inline: true },
            { name: '💬 Messages Sent', value: `**${(userData.messages || 0).toLocaleString()}**`, inline: true },
            { name: '📝 Text Messages', value: `**${(userData.textMessages || 0).toLocaleString()}**`, inline: true },
            { name: '🖼️ Media Shared', value: `**${(userData.mediaMessages || 0).toLocaleString()}**`, inline: true },
            { 
                name: `📈 Progress to Level ${userData.level + 1}`, 
                value: `${progressBar} **${Math.round(progressPercent)}%**\n${progressXP.toLocaleString()}/${totalNeeded.toLocaleString()} XP (${neededXP.toLocaleString()} needed)`, 
                inline: false 
            }
        )
        .setFooter({ text: `${interaction.guild.name} • Rank Card`, iconURL: interaction.guild.iconURL() })
        .setTimestamp();

    const actionRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('leaderboard_dashboard')
                .setLabel('Back to Dashboard')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🏠')
        );

    await interaction.editReply({ embeds: [embed], components: [actionRow] });
}

async function handleReset(interaction) {
    if (!interaction.member.permissions.has('Administrator')) {
        return interaction.editReply({
            content: '❌ You need Administrator permission to reset the leaderboard.'
        });
    }

    const targetUser = interaction.isChatInputCommand() ? 
        interaction.options.getUser('user') : null;
    const data = loadLeaderboard();

    if (targetUser) {
        // Reset specific user
        if (data[interaction.guild.id] && data[interaction.guild.id][targetUser.id]) {
            delete data[interaction.guild.id][targetUser.id];
            saveLeaderboard(data);
            await interaction.editReply(`✅ Reset leaderboard data for ${targetUser.username}.`);
        } else {
            await interaction.editReply({
                content: `❌ ${targetUser.username} has no leaderboard data to reset.`
            });
        }
    } else {
        // Reset entire server leaderboard
        if (data[interaction.guild.id]) {
            delete data[interaction.guild.id];
            saveLeaderboard(data);
            await interaction.editReply('✅ Reset entire server leaderboard.');
        } else {
            await interaction.editReply({
                content: '❌ No leaderboard data to reset.'
            });
        }
    }
}

// Handle leaderboard button interactions
async function handleLeaderboardButton(interaction) {
    try {
        // Check if interaction is still valid
        if (!interaction.isRepliable()) {
            console.log('❌ Leaderboard button interaction not repliable');
            return;
        }

        // Check interaction age before processing
        const interactionAge = Date.now() - interaction.createdTimestamp;
        if (interactionAge > 2500) {
            console.log(`❌ Leaderboard button interaction too old (${interactionAge}ms), skipping`);
            return;
        }

        const customId = interaction.customId;
        const guildData = loadLeaderboard()[interaction.guild.id] || {};

        // Handle modals differently - don't defer for these
        if (customId.startsWith('leaderboard_goto_page_')) {
            const type = customId.replace('leaderboard_goto_page_', '');
            await handleGoToPageModal(interaction, type);
            return;
        }

        // For all other buttons, defer the update
        if (!interaction.replied && !interaction.deferred) {
            await interaction.deferUpdate();
        }

        if (customId.startsWith('leaderboard_quick_')) {
            const type = customId.replace('leaderboard_quick_', '');
            await handleQuickLeaderboard(interaction, guildData, type);
        } else if (customId.startsWith('leaderboard_nav_')) {
            const parts = customId.split('_');
            const type = parts[2];
            const page = parseInt(parts[3]);
            await handleNavigationLeaderboard(interaction, guildData, type, page);
        } else if (customId === 'leaderboard_refresh') {
            await handleRefreshLeaderboard(interaction);
        } else if (customId === 'leaderboard_my_rank' || customId === 'leaderboard_rank_me') {
            await handleMyRank(interaction, guildData);
        } else if (customId === 'leaderboard_dashboard') {
            await handleInteractiveLeaderboard(interaction, guildData);
        }
    } catch (error) {
        console.error('❌ Error handling leaderboard button:', error);

        // Only try to respond if we haven't already
        if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
            try {
                await interaction.reply({
                    content: '❌ An error occurred while processing your request. Please try again.',
                    ephemeral: true
                });
            } catch (replyError) {
                console.error('❌ Failed to send error reply:', replyError);
            }
        }
    }
}

async function handleQuickLeaderboard(interaction, guildData, type) {
    const page = 1;
    const usersPerPage = 10;

    // Filter out users with no data
    const validUsers = Object.entries(guildData).filter(([userId, userData]) => {
        return userData && (userData.xp > 0 || userData.messages > 0);
    });

    if (validUsers.length === 0) {
        return interaction.editReply({
            content: '📊 No leaderboard data available yet! Chat more to build up the leaderboard.',
            ephemeral: true
        });
    }

    // Sort users based on type
    let sortedUsers;
    switch (type) {
        case 'xp':
            sortedUsers = validUsers.sort(([,a], [,b]) => (b.xp || 0) - (a.xp || 0));
            break;
        case 'level':
            sortedUsers = validUsers.sort(([,a], [,b]) => (b.level || 1) - (a.level || 1) || (b.xp || 0) - (a.xp || 0));
            break;
        case 'messages':
            sortedUsers = validUsers.sort(([,a], [,b]) => (b.messages || 0) - (a.messages || 0));
            break;
    }

    const totalPages = Math.ceil(sortedUsers.length / usersPerPage);
    const pageUsers = sortedUsers.slice(0, usersPerPage);

    let description = '';

    for (let i = 0; i < pageUsers.length; i++) {
        const [userId, userData] = pageUsers[i];
        const rank = i + 1;
        const user = await interaction.client.users.fetch(userId).catch(() => null);
        const username = user ? user.displayName : 'Unknown User';

        let value;

        switch (type) {
            case 'xp':
                value = `${userData.xp.toLocaleString()} XP`;
                break;
            case 'level':
                value = `Level ${userData.level} (${userData.xp.toLocaleString()} XP)`;
                break;
            case 'messages':
                value = `${userData.messages.toLocaleString()} messages`;
                break;
        }

        const line = `${rank}. @${username} - ${value}\n`;
        // Ensure description doesn't exceed Discord's 4096 character limit
        if (description.length + line.length > 4000) {
            description += '...and more';
            break;
        }
        description += line;
    }

    const typeNames = {
        xp: '⭐ XP Leaderboard',
        level: '🏅 Level Leaderboard',
        messages: '💬 Messages Leaderboard'
    };

    // Find user's position
    const userRank = sortedUsers.findIndex(([userId]) => userId === interaction.user.id) + 1;
    const userPositionText = userRank > 0 ? `🎯 ${interaction.user.displayName}'s Position: #${userRank}` : '';

    const embed = new EmbedBuilder()
        .setTitle(`${typeNames[type]} (Page 1/${totalPages})`)
        .setDescription(description)
        .setColor(type === 'xp' ? '#FFD700' : type === 'level' ? '#00FF7F' : '#FF69B4')
        .setTimestamp();

    if (userPositionText) {
        embed.addFields({ name: '\u200B', value: userPositionText, inline: false });
    }

    // Navigation buttons with screenshot style
    const navigationRow = new ActionRowBuilder();

    if (totalPages > 1) {
        navigationRow.addComponents(
            new ButtonBuilder()
                .setCustomId('leaderboard_disabled_prev')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('◀️')
                .setDisabled(true),
            new ButtonBuilder()
                .setCustomId(`leaderboard_goto_page_${type}`)
                .setLabel('Go To Page')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(`leaderboard_nav_${type}_2`)
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('▶️')
        );
    }

    const components = [];
    if (navigationRow.components.length > 0) components.push(navigationRow);

    await interaction.editReply({
        embeds: [embed],
        components: components
    });
}

async function handleNavigationLeaderboard(interaction, guildData, type, page) {
    const usersPerPage = 10;
    const startIndex = (page - 1) * usersPerPage;

    const validUsers = Object.entries(guildData).filter(([userId, userData]) => {
        return userData && (userData.xp > 0 || userData.messages > 0);
    });

    if (validUsers.length === 0) {
        return interaction.editReply({
            content: '📊 No leaderboard data available yet! Chat more to build up the leaderboard.'
        });
    }

    let sortedUsers;
    switch (type) {
        case 'xp':
            sortedUsers = validUsers.sort(([,a], [,b]) => (b.xp || 0) - (a.xp || 0));
            break;
        case 'level':
            sortedUsers = validUsers.sort(([,a], [,b]) => (b.level || 1) - (a.level || 1) || (b.xp || 0) - (a.xp || 0));
            break;
        case 'messages':
            sortedUsers = validUsers.sort(([,a], [,b]) => (b.messages || 0) - (a.messages || 0));
            break;
    }

    const totalPages = Math.ceil(sortedUsers.length / usersPerPage);
    const pageUsers = sortedUsers.slice(startIndex, startIndex + usersPerPage);

    let description = '';

    for (let i = 0; i < pageUsers.length; i++) {
        const [userId, userData] = pageUsers[i];
        const rank = startIndex + i + 1;
        const user = await interaction.client.users.fetch(userId).catch(() => null);
        const username = user ? user.displayName : 'Unknown User';

        let value;

        switch (type) {
            case 'xp':
                value = `${userData.xp.toLocaleString()} XP`;
                break;
            case 'level':
                value = `Level ${userData.level} (${userData.xp.toLocaleString()} XP)`;
                break;
            case 'messages':
                value = `${userData.messages.toLocaleString()} messages`;
                break;
        }

        const line = `${rank}. @${username} - ${value}\n`;
        description += line;
    }

    const typeNames = {
        xp: '⭐ XP Leaderboard',
        level: '🏅 Level Leaderboard',
        messages: '💬 Messages Leaderboard'
    };

    // Find user's position
    const userRank = sortedUsers.findIndex(([userId]) => userId === interaction.user.id) + 1;
    const userPositionText = userRank > 0 ? `🎯 ${interaction.user.displayName}'s Position: #${userRank}` : '';

    const embed = new EmbedBuilder()
        .setTitle(`${typeNames[type]} (Page ${page}/${totalPages})`)
        .setDescription(description)
        .setColor(type === 'xp' ? '#FFD700' : type === 'level' ? '#00FF7F' : '#FF69B4')
        .setTimestamp();

    if (userPositionText) {
        embed.addFields({ name: '\u200B', value: userPositionText, inline: false });
    }

    // Navigation buttons with screenshot style
    const navigationRow = new ActionRowBuilder();

    if (page > 1) {
        navigationRow.addComponents(
            new ButtonBuilder()
                .setCustomId(`leaderboard_nav_${type}_${page - 1}`)
                .setLabel('')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('◀️')
        );
    } else {
        navigationRow.addComponents(
            new ButtonBuilder()
                .setCustomId('leaderboard_disabled_prev')
                .setLabel('')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('◀️')
                .setDisabled(true)
        );
    }

    navigationRow.addComponents(
        new ButtonBuilder()
            .setCustomId(`leaderboard_goto_page_${type}`)
            .setLabel('Go To Page')
            .setStyle(ButtonStyle.Primary)
    );

    if (page < totalPages) {
        navigationRow.addComponents(
            new ButtonBuilder()
                .setCustomId(`leaderboard_nav_${type}_${page + 1}`)
                .setLabel('')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('▶️')
        );
    } else {
        navigationRow.addComponents(
            new ButtonBuilder()
                .setCustomId('leaderboard_disabled_next')
                .setLabel('')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('▶️')
                .setDisabled(true)
        );
    }

    await interaction.editReply({
        embeds: [embed],
        components: [navigationRow]
    });
}

async function handleRefreshLeaderboard(interaction) {
    try {
        // Reload the leaderboard data from file
        const freshData = loadLeaderboard();
        const guildData = freshData[interaction.guild.id] || {};

        const embed = new EmbedBuilder()
            .setTitle('🔄 Leaderboard Refreshed!')
            .setDescription('The leaderboard has been updated with the latest data.')
            .setColor('#00FF00')
            .setTimestamp();

        await interaction.editReply({
            embeds: [embed],
            components: []
        });

        // After 1.5 seconds, show the dashboard again
        setTimeout(async () => {
            try {
                await handleInteractiveLeaderboard(interaction, guildData);
            } catch (error) {
                console.error('❌ Error showing dashboard after refresh:', error);
            }
        }, 1500);
    } catch (error) {
        console.error('❌ Error in refresh handler:', error);

        try {
            await interaction.editReply({
                content: '❌ Failed to refresh leaderboard. Please try again.',
                embeds: [],
                components: []
            });
        } catch (replyError) {
            console.error('❌ Failed to send refresh error message:', replyError);
        }
    }
}

async function handleMyRank(interaction, guildData) {
    const userData = guildData[interaction.user.id];

    if (!userData) {
        return interaction.editReply({
            content: '📊 You have no ranking data yet. Start chatting to build up XP!',
            ephemeral: true
        });
    }

    // Calculate rank
    const allUsers = Object.entries(guildData).sort(([,a], [,b]) => (b.xp || 0) - (a.xp || 0));
    const rank = allUsers.findIndex(([userId]) => userId === interaction.user.id) + 1;

    const embed = new EmbedBuilder()
        .setTitle(`🎯 Your Rank • ${interaction.user.username}`)
        .setDescription(`You are rank **#${rank}** out of ${allUsers.length} users!`)
        .setColor('#FFD700')
        .addFields(
            { name: '⭐ Level', value: `**${userData.level}**`, inline: true },
            { name: '✨ Total XP', value: `**${userData.xp.toLocaleString()}**`, inline: true },
            { name: '💬 Messages Sent', value: `**${(userData.messages || 0).toLocaleString()}**`, inline: true }
        )
        .setTimestamp();

    const actionRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('leaderboard_dashboard')
                .setLabel('Back to Dashboard')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🏠')
        );

    await interaction.editReply({ embeds: [embed], components: [actionRow] });
}

async function handleGoToPageModal(interaction, type) {
    try {
        const { ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

        // Check if we can show the modal
        if (interaction.replied || interaction.deferred) {
            console.log('❌ Cannot show modal - interaction already handled');
            return;
        }

        const modal = new ModalBuilder()
            .setCustomId(`leaderboard_goto_modal_${type}`)
            .setTitle('Go To Page');

        const pageInput = new TextInputBuilder()
            .setCustomId('page_number')
            .setLabel('Page Number')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Enter page number...')
            .setRequired(true)
            .setMinLength(1)
            .setMaxLength(4);

        const row = new ActionRowBuilder().addComponents(pageInput);
        modal.addComponents(row);

        await interaction.showModal(modal);
    } catch (error) {
        console.error('❌ Error showing modal:', error);
        
        // If modal fails, try to defer and show error message
        if (!interaction.replied && !interaction.deferred) {
            try {
                await interaction.reply({
                    content: '❌ Failed to open page selection. Please try again.',
                    ephemeral: true
                });
            } catch (replyError) {
                console.error('❌ Failed to send modal error:', replyError);
            }
        }
    }
}

async function handleGoToPageModalSubmit(interaction) {
    try {
        // Check if interaction is valid
        if (!interaction.isRepliable()) {
            console.log('❌ Modal submit interaction not repliable');
            return;
        }

        const type = interaction.customId.replace('leaderboard_goto_modal_', '');
        const pageInput = interaction.fields.getTextInputValue('page_number');
        const page = parseInt(pageInput);

        if (isNaN(page) || page < 1) {
            await interaction.reply({
                content: '❌ Please enter a valid page number (1 or greater).',
                ephemeral: true
            });
            return;
        }

        const guildData = loadLeaderboard()[interaction.guild.id] || {};
        const validUsers = Object.entries(guildData).filter(([userId, userData]) => {
            return userData && (userData.xp > 0 || userData.messages > 0);
        });

        const totalPages = Math.ceil(validUsers.length / 10);

        if (page > totalPages) {
            await interaction.reply({
                content: `❌ Page ${page} doesn't exist. Maximum page is ${totalPages}.`,
                ephemeral: true
            });
            return;
        }

        // Defer the reply for navigation
        await interaction.deferUpdate();
        await handleNavigationLeaderboard(interaction, guildData, type, page);
    } catch (error) {
        console.error('❌ Error handling goto page modal:', error);
        
        if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
            try {
                await interaction.reply({
                    content: '❌ Failed to process page navigation. Please try again.',
                    ephemeral: true
                });
            } catch (replyError) {
                console.error('❌ Failed to send modal submit error:', replyError);
            }
        }
    }
}

module.exports.addXP = addXP;
module.exports.loadLeaderboard = loadLeaderboard;
module.exports.handleLeaderboardButton = handleLeaderboardButton;
module.exports.handleGoToPageModalSubmit = handleGoToPageModalSubmit;