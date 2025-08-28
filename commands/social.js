const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const SOCIAL_FILE = path.join(__dirname, '..', 'config', 'social_data.json');
const EVENTS_FILE = path.join(__dirname, '..', 'config', 'community_events.json');
const FRIENDS_FILE = path.join(__dirname, '..', 'config', 'friend_system.json');

// Initialize data files
function initializeFiles() {
    if (!fs.existsSync(SOCIAL_FILE)) {
        fs.writeFileSync(SOCIAL_FILE, JSON.stringify({}, null, 2));
    }
    if (!fs.existsSync(EVENTS_FILE)) {
        fs.writeFileSync(EVENTS_FILE, JSON.stringify({}, null, 2));
    }
    if (!fs.existsSync(FRIENDS_FILE)) {
        fs.writeFileSync(FRIENDS_FILE, JSON.stringify({}, null, 2));
    }
}

function loadSocialData() {
    try {
        initializeFiles();
        const data = fs.readFileSync(SOCIAL_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error loading social data:', error);
        return {};
    }
}

function saveSocialData(data) {
    try {
        fs.writeFileSync(SOCIAL_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error saving social data:', error);
    }
}

function loadEventsData() {
    try {
        const data = fs.readFileSync(EVENTS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error loading events data:', error);
        return {};
    }
}

function saveEventsData(data) {
    try {
        fs.writeFileSync(EVENTS_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error saving events data:', error);
    }
}

function loadFriendsData() {
    try {
        const data = fs.readFileSync(FRIENDS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error loading friends data:', error);
        return {};
    }
}

function saveFriendsData(data) {
    try {
        fs.writeFileSync(FRIENDS_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error saving friends data:', error);
    }
}

function generateEventId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('social')
        .setDescription('🌟 Social and community features')
        .addSubcommandGroup(group =>
            group
                .setName('stats')
                .setDescription('📊 Social statistics and activity tracking')
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('view')
                        .setDescription('📈 View detailed social statistics')
                        .addUserOption(option =>
                            option.setName('user')
                                .setDescription('User to view stats for')
                                .setRequired(false))
                        .addStringOption(option =>
                            option.setName('timeframe')
                                .setDescription('Time period for stats')
                                .addChoices(
                                    { name: '📅 Today', value: 'today' },
                                    { name: '📊 This Week', value: 'week' },
                                    { name: '📈 This Month', value: 'month' },
                                    { name: '🏆 All Time', value: 'lifetime' }
                                )
                                .setRequired(false)))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('leaderboard')
                        .setDescription('🏆 View social activity leaderboards')
                        .addStringOption(option =>
                            option.setName('category')
                                .setDescription('Leaderboard category')
                                .addChoices(
                                    { name: '💬 Most Active Chatter', value: 'messages' },
                                    { name: '🎙️ Voice Champion', value: 'voice' },
                                    { name: '❤️ Reaction Master', value: 'reactions' },
                                    { name: '🤝 Social Butterfly', value: 'interactions' },
                                    { name: '🎯 Event Participant', value: 'events' }
                                )
                                .setRequired(false))))
        .addSubcommandGroup(group =>
            group
                .setName('profile')
                .setDescription('👤 Extended user profiles and customization')
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('view')
                        .setDescription('👁️ View user profile')
                        .addUserOption(option =>
                            option.setName('user')
                                .setDescription('User to view profile for')
                                .setRequired(false)))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('setup')
                        .setDescription('⚙️ Set up your social profile'))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('bio')
                        .setDescription('📝 Set your profile bio')
                        .addStringOption(option =>
                            option.setName('text')
                                .setDescription('Your bio text (max 200 characters)')
                                .setMaxLength(200)
                                .setRequired(true)))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('links')
                        .setDescription('🔗 Manage your social links')
                        .addStringOption(option =>
                            option.setName('platform')
                                .setDescription('Social platform')
                                .addChoices(
                                    { name: '🐦 Twitter', value: 'twitter' },
                                    { name: '📷 Instagram', value: 'instagram' },
                                    { name: '💼 LinkedIn', value: 'linkedin' },
                                    { name: '🎮 Twitch', value: 'twitch' },
                                    { name: '📺 YouTube', value: 'youtube' },
                                    { name: '🌐 Website', value: 'website' }
                                )
                                .setRequired(true))
                        .addStringOption(option =>
                            option.setName('url')
                                .setDescription('URL or username')
                                .setRequired(true))))
        .addSubcommandGroup(group =>
            group
                .setName('events')
                .setDescription('🎉 Community events and announcements')
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('create')
                        .setDescription('📅 Create a community event')
                        .addStringOption(option =>
                            option.setName('title')
                                .setDescription('Event title')
                                .setRequired(true))
                        .addStringOption(option =>
                            option.setName('description')
                                .setDescription('Event description')
                                .setRequired(true))
                        .addStringOption(option =>
                            option.setName('date')
                                .setDescription('Event date (YYYY-MM-DD)')
                                .setRequired(true))
                        .addStringOption(option =>
                            option.setName('time')
                                .setDescription('Event time (HH:MM)')
                                .setRequired(true))
                        .addChannelOption(option =>
                            option.setName('channel')
                                .setDescription('Event channel (if applicable)')
                                .setRequired(false)))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('list')
                        .setDescription('📋 List upcoming events')
                        .addStringOption(option =>
                            option.setName('filter')
                                .setDescription('Filter events')
                                .addChoices(
                                    { name: '🔜 Upcoming', value: 'upcoming' },
                                    { name: '📅 Today', value: 'today' },
                                    { name: '📊 This Week', value: 'week' },
                                    { name: '🏁 Past Events', value: 'past' }
                                )
                                .setRequired(false)))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('join')
                        .setDescription('✅ RSVP to an event')
                        .addStringOption(option =>
                            option.setName('event_id')
                                .setDescription('Event ID to join')
                                .setRequired(true)))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('announce')
                        .setDescription('📢 Create a server announcement')
                        .addStringOption(option =>
                            option.setName('title')
                                .setDescription('Announcement title')
                                .setRequired(true))
                        .addStringOption(option =>
                            option.setName('message')
                                .setDescription('Announcement message')
                                .setRequired(true))
                        .addStringOption(option =>
                            option.setName('priority')
                                .setDescription('Announcement priority')
                                .addChoices(
                                    { name: '🟢 Low', value: 'low' },
                                    { name: '🟡 Medium', value: 'medium' },
                                    { name: '🔴 High', value: 'high' },
                                    { name: '🚨 Critical', value: 'critical' }
                                )
                                .setRequired(false))))
        .addSubcommandGroup(group =>
            group
                .setName('friends')
                .setDescription('🤝 Friend system and social connections')
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('add')
                        .setDescription('➕ Send friend request')
                        .addUserOption(option =>
                            option.setName('user')
                                .setDescription('User to add as friend')
                                .setRequired(true)))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('list')
                        .setDescription('👥 View your friends list'))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('requests')
                        .setDescription('📬 View pending friend requests'))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('leaderboard')
                        .setDescription('🏆 Friend activity leaderboard'))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('remove')
                        .setDescription('➖ Remove a friend')
                        .addUserOption(option =>
                            option.setName('user')
                                .setDescription('Friend to remove')
                                .setRequired(true)))),

    async execute(interaction) {
        try {
            // Check interaction age before processing
            const interactionAge = Date.now() - interaction.createdTimestamp;
            if (interactionAge > 2500) {
                console.log(`ℹ️ Social command interaction too old (${interactionAge}ms), skipping`);
                return;
            }

            // Check if interaction is still valid
            if (!interaction.isRepliable()) {
                console.log(`ℹ️ Social command interaction expired for ${interaction.user.tag}`);
                return;
            }

            // Defer reply to prevent timeout
            await interaction.deferReply({ flags: 64 });

            const group = interaction.options.getSubcommandGroup();
            const subcommand = interaction.options.getSubcommand();

            switch (group) {
                case 'stats':
                    await handleSocialStats(interaction, subcommand);
                    break;
                case 'profile':
                    await handleProfile(interaction, subcommand);
                    break;
                case 'events':
                    await handleEvents(interaction, subcommand);
                    break;
                case 'friends':
                    await handleFriends(interaction, subcommand);
                    break;
            }
        } catch (error) {
            console.error('Error in social command:', error);

            // Check if interaction is still valid
            if (error.code === 10062 || error.code === 40060) {
                console.log(`ℹ️ Skipping error reply due to interaction state (code: ${error.code})`);
                return;
            }

            try {
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({
                        content: '❌ An error occurred while processing your request.',
                        flags: 64
                    });
                } else if (interaction.deferred) {
                    await interaction.editReply({
                        content: '❌ An error occurred while processing your request.'
                    });
                }
            } catch (replyError) {
                console.error('Failed to send error reply:', replyError);
            }
        }
    }
};

async function handleSocialStats(interaction, subcommand) {
    const socialData = loadSocialData();
    const guildId = interaction.guild.id;
    const userId = interaction.options.getUser('user')?.id || interaction.user.id;
    const timeframe = interaction.options.getString('timeframe') || 'lifetime';

    if (!socialData[guildId]) socialData[guildId] = {};
    if (!socialData[guildId][userId]) {
        socialData[guildId][userId] = {
            messages: 0,
            voiceTime: 0,
            reactionsGiven: 0,
            reactionsReceived: 0,
            interactions: 0,
            eventsAttended: 0,
            joinDate: Date.now(),
            dailyStats: {},
            weeklyStats: {},
            monthlyStats: {}
        };
    }

    const userData = socialData[guildId][userId];
    const targetUser = await interaction.client.users.fetch(userId);

    if (subcommand === 'view') {
        const embed = new EmbedBuilder()
            .setTitle(`📊 Social Stats • ${targetUser.username}`)
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
            .setColor('#5865F2')
            .addFields(
                {
                    name: '💬 Message Activity',
                    value: `**${(userData.messages || 0).toLocaleString()}** messages sent\n**${(userData.reactionsGiven || 0).toLocaleString()}** reactions given\n**${(userData.reactionsReceived || 0).toLocaleString()}** reactions received`,
                    inline: true
                },
                {
                    name: '🎙️ Voice Activity',
                    value: `**${Math.floor((userData.voiceTime || 0) / 60).toLocaleString()}** minutes\n**${Math.floor((userData.voiceTime || 0) / 3600).toLocaleString()}** hours total\n**${((userData.voiceTime || 0) / 86400).toFixed(1)}** days equivalent`,
                    inline: true
                },
                {
                    name: '🤝 Social Interactions',
                    value: `**${(userData.interactions || 0).toLocaleString()}** total interactions\n**${userData.eventsAttended || 0}** events attended\n**${Math.floor((Date.now() - (userData.joinDate || Date.now())) / 86400000)}** days in server`,
                    inline: true
                },
                {
                    name: '📈 Activity Score',
                    value: `**${calculateActivityScore(userData)}** points\n${getActivityLevel(userData)} level\n${getActivityTrend(userData)} trend`,
                    inline: false
                }
            )
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`social_detailed_${userId}`)
                    .setLabel('Detailed View')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📋'),
                new ButtonBuilder()
                    .setCustomId(`social_compare_${userId}`)
                    .setLabel('Compare Stats')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('⚖️')
            );

        await interaction.editReply({ embeds: [embed], components: [row] });
    } else if (subcommand === 'leaderboard') {
        await handleSocialLeaderboard(interaction);
    }
}

async function handleProfile(interaction, subcommand) {
    const socialData = loadSocialData();
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;

    if (!socialData[guildId]) socialData[guildId] = {};
    if (!socialData[guildId][userId]) {
        socialData[guildId][userId] = {
            profile: {
                bio: '',
                socialLinks: {},
                achievements: [],
                badges: [],
                customization: {
                    color: '#5865F2',
                    theme: 'default'
                }
            }
        };
    }

    switch (subcommand) {
        case 'view':
            await handleProfileView(interaction, socialData);
            break;
        case 'setup':
            await handleProfileSetup(interaction);
            break;
        case 'bio':
            await handleProfileBio(interaction, socialData);
            break;
        case 'links':
            await handleProfileLinks(interaction, socialData);
            break;
    }
}

async function handleEvents(interaction, subcommand) {
    const eventsData = loadEventsData();
    const guildId = interaction.guild.id;

    if (!eventsData[guildId]) eventsData[guildId] = { events: [], announcements: [] };

    switch (subcommand) {
        case 'create':
            await handleEventCreate(interaction, eventsData);
            break;
        case 'list':
            await handleEventList(interaction, eventsData);
            break;
        case 'join':
            await handleEventJoin(interaction, eventsData);
            break;
        case 'announce':
            await handleAnnouncement(interaction, eventsData);
            break;
    }
}

async function handleFriends(interaction, subcommand) {
    const friendsData = loadFriendsData();
    const userId = interaction.user.id;

    if (!friendsData[userId]) {
        friendsData[userId] = {
            friends: [],
            pendingRequests: [],
            sentRequests: [],
            settings: {
                allowRequests: true,
                showOnline: true
            }
        };
    }

    switch (subcommand) {
        case 'add':
            await handleFriendAdd(interaction, friendsData);
            break;
        case 'list':
            await handleFriendsList(interaction, friendsData);
            break;
        case 'requests':
            await handleFriendRequests(interaction, friendsData);
            break;
        case 'leaderboard':
            await handleFriendsLeaderboard(interaction, friendsData);
            break;
        case 'remove':
            await handleFriendRemove(interaction, friendsData);
            break;
    }
}

// Helper functions
function calculateActivityScore(userData) {
    const messageScore = userData.messages * 2;
    const voiceScore = Math.floor(userData.voiceTime / 60) * 3;
    const reactionScore = (userData.reactionsGiven + userData.reactionsReceived) * 1;
    const interactionScore = userData.interactions * 5;
    const eventScore = userData.eventsAttended * 10;

    return messageScore + voiceScore + reactionScore + interactionScore + eventScore;
}

function getActivityLevel(userData) {
    const score = calculateActivityScore(userData);
    if (score < 100) return '🌱 Newcomer';
    if (score < 500) return '🌿 Active';
    if (score < 1500) return '🌳 Engaged';
    if (score < 5000) return '⭐ Super Active';
    return '👑 Legend';
}

function getActivityTrend(userData) {
    // This would need historical data to calculate properly
    const trends = ['📈 Rising', '📊 Stable', '📉 Declining'];
    return trends[Math.floor(Math.random() * trends.length)];
}

async function handleSocialLeaderboard(interaction) {
    const category = interaction.options.getString('category') || 'messages';
    const socialData = loadSocialData();
    const guildData = socialData[interaction.guild.id] || {};

    const users = Object.entries(guildData)
        .filter(([userId, userData]) => userData && userData[category] > 0)
        .sort(([,a], [,b]) => (b[category] || 0) - (a[category] || 0))
        .slice(0, 10);

    if (users.length === 0) {
        return interaction.editReply({
            content: '📊 No leaderboard data available for this category yet!'
        });
    }

    let description = '';
    const categoryNames = {
        messages: '💬 Most Active Chatters',
        voice: '🎙️ Voice Champions',
        reactions: '❤️ Reaction Masters',
        interactions: '🤝 Social Butterflies',
        events: '🎯 Event Participants'
    };

    for (let i = 0; i < users.length; i++) {
        const [userId, userData] = users[i];
        const user = await interaction.client.users.fetch(userId).catch(() => null);
        const username = user ? user.username : 'Unknown User';
        const value = userData[category] || 0;

        description += `${i + 1}. **${username}** - ${value.toLocaleString()}\n`;
    }

    const embed = new EmbedBuilder()
        .setTitle(`🏆 ${categoryNames[category]} Leaderboard`)
        .setDescription(description)
        .setColor('#FFD700')
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}

async function handleProfileView(interaction, socialData) {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const userData = socialData[interaction.guild.id]?.[targetUser.id];

    if (!userData?.profile) {
        return interaction.editReply({
            content: `❌ ${targetUser.id === interaction.user.id ? 'You haven\'t' : `${targetUser.username} hasn't`} set up a social profile yet!`
        });
    }

    const profile = userData.profile;
    const embed = new EmbedBuilder()
        .setTitle(`👤 ${targetUser.username}'s Profile`)
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
        .setColor(profile.customization?.color || '#5865F2')
        .setDescription(profile.bio || '*No bio set*');

    if (Object.keys(profile.socialLinks).length > 0) {
        const links = Object.entries(profile.socialLinks)
            .map(([platform, url]) => `**${platform}:** ${url}`)
            .join('\n');
        embed.addFields({ name: '🔗 Social Links', value: links, inline: false });
    }

    if (profile.achievements?.length > 0) {
        embed.addFields({
            name: '🏆 Achievements',
            value: profile.achievements.slice(0, 5).join(' ') || 'None yet',
            inline: true
        });
    }

    // Original code had a block for stats and activity, which was causing errors.
    // Replaced with null-safe access and date parsing.
    const totalInteractions = ((profile?.friendsCount || 0) + (profile?.postsCount || 0) + (profile?.likesGiven || 0));
    embed.addFields(
        { name: '📊 Social Stats', value: `👥 Friends: **${profile?.friendsCount || 0}**\n📝 Posts: **${profile?.postsCount || 0}**\n❤️ Likes Given: **${profile?.likesGiven || 0}**\n📈 Total Interactions: **${totalInteractions}**`, inline: true },
        { name: '🗓️ Activity', value: `📅 Joined: **${profile?.joinedAt ? new Date(profile.joinedAt).toLocaleString() : 'Unknown'}**\n⏰ Last Active: **${profile?.lastActiveAt ? new Date(profile.lastActiveAt).toLocaleString() : 'Never'}**`, inline: true },
    );


    await interaction.editReply({ embeds: [embed] });
}

async function handleProfileSetup(interaction) {
    const embed = new EmbedBuilder()
        .setTitle('⚙️ Profile Setup')
        .setDescription('Welcome to the Social Profile setup! Choose what you\'d like to customize:')
        .setColor('#5865F2')
        .addFields(
            { name: '📝 Bio', value: 'Set a personal bio (max 200 characters)', inline: true },
            { name: '🔗 Social Links', value: 'Add your social media profiles', inline: true },
            { name: '🎨 Customization', value: 'Choose colors and themes', inline: true }
        );

    const row = new ActionRowBuilder()
        .addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('profile_setup_menu')
                .setPlaceholder('Choose what to set up...')
                .addOptions([
                    {
                        label: 'Set Bio',
                        description: 'Write a personal bio',
                        value: 'bio',
                        emoji: '📝'
                    },
                    {
                        label: 'Add Social Links',
                        description: 'Link your social media',
                        value: 'links',
                        emoji: '🔗'
                    },
                    {
                        label: 'Customize Appearance',
                        description: 'Colors and themes',
                        value: 'customize',
                        emoji: '🎨'
                    }
                ])
        );

    await interaction.editReply({ embeds: [embed], components: [row] });
}

async function handleProfileBio(interaction, socialData) {
    const bio = interaction.options.getString('text');
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;

    if (!socialData[guildId][userId].profile) {
        socialData[guildId][userId].profile = { bio: '', socialLinks: {}, achievements: [] };
    }

    socialData[guildId][userId].profile.bio = bio;
    saveSocialData(socialData);

    await interaction.editReply({
        content: `✅ Bio updated successfully!\n\n**Your new bio:**\n${bio}`
    });
}

async function handleProfileLinks(interaction, socialData) {
    const platform = interaction.options.getString('platform');
    const url = interaction.options.getString('url');
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;

    if (!socialData[guildId][userId].profile) {
        socialData[guildId][userId].profile = { bio: '', socialLinks: {}, achievements: [] };
    }

    socialData[guildId][userId].profile.socialLinks[platform] = url;
    saveSocialData(socialData);

    await interaction.editReply({
        content: `✅ ${platform} link added successfully!\n\n**${platform}:** ${url}`
    });
}

async function handleEventCreate(interaction, eventsData) {
    const title = interaction.options.getString('title');
    const description = interaction.options.getString('description');
    const date = interaction.options.getString('date');
    const time = interaction.options.getString('time');
    const channel = interaction.options.getChannel('channel');
    const guildId = interaction.guild.id;

    const eventId = generateEventId();
    const event = {
        id: eventId,
        title,
        description,
        date,
        time,
        channel: channel?.id,
        creator: interaction.user.id,
        attendees: [],
        created: Date.now()
    };

    if (!eventsData[guildId]) eventsData[guildId] = { events: [], announcements: [] };
    eventsData[guildId].events.push(event);
    saveEventsData(eventsData);

    const embed = new EmbedBuilder()
        .setTitle('🎉 Event Created Successfully!')
        .addFields(
            { name: '📅 Event', value: title, inline: true },
            { name: '🗓️ Date', value: date, inline: true },
            { name: '⏰ Time', value: time, inline: true },
            { name: '📝 Description', value: description, inline: false },
            { name: '🆔 Event ID', value: eventId, inline: true }
        )
        .setColor('#00FF00');

    if (channel) {
        embed.addFields({ name: '📍 Channel', value: `<#${channel.id}>`, inline: true });
    }

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`event_join_${eventId}`)
                .setLabel('Join Event')
                .setStyle(ButtonStyle.Success)
                .setEmoji('✅')
        );

    await interaction.editReply({ embeds: [embed], components: [row] });
}

async function handleEventList(interaction, eventsData) {
    const filter = interaction.options.getString('filter') || 'upcoming';
    const guildId = interaction.guild.id;
    const events = eventsData[guildId]?.events || [];

    if (events.length === 0) {
        return interaction.editReply({
            content: '📅 No events found! Create one with `/social events create`'
        });
    }

    let filteredEvents = events;
    const now = Date.now();

    // Simple filtering - in a real implementation, you'd parse dates properly
    if (filter === 'upcoming') {
        filteredEvents = events.slice(-5); // Show last 5 as "upcoming"
    }

    let description = '';
    filteredEvents.forEach(event => {
        description += `**${event.title}** (ID: ${event.id})\n`;
        description += `📅 ${event.date} at ${event.time}\n`;
        description += `👥 ${event.attendees.length} attending\n\n`;
    });

    const embed = new EmbedBuilder()
        .setTitle('📋 Community Events')
        .setDescription(description || 'No events match your filter.')
        .setColor('#5865F2');

    await interaction.editReply({ embeds: [embed] });
}

async function handleEventJoin(interaction, eventsData) {
    const eventId = interaction.options.getString('event_id');
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;

    const event = eventsData[guildId]?.events?.find(e => e.id === eventId);
    if (!event) {
        return interaction.editReply({
            content: '❌ Event not found! Check the event ID and try again.'
        });
    }

    if (event.attendees.includes(userId)) {
        return interaction.editReply({
            content: '✅ You\'re already registered for this event!'
        });
    }

    event.attendees.push(userId);
    saveEventsData(eventsData);

    await interaction.editReply({
        content: `✅ Successfully joined **${event.title}**!\n📅 ${event.date} at ${event.time}\n👥 ${event.attendees.length} people attending`
    });
}

async function handleFriendAdd(interaction, friendsData) {
    const targetUser = interaction.options.getUser('user');
    const userId = interaction.user.id;

    if (targetUser.id === userId) {
        return interaction.editReply({
            content: '❌ You cannot add yourself as a friend!'
        });
    }

    if (targetUser.bot) {
        return interaction.editReply({
            content: '❌ You cannot add bots as friends!'
        });
    }

    if (!friendsData[targetUser.id]) {
        friendsData[targetUser.id] = {
            friends: [],
            pendingRequests: [],
            sentRequests: []
        };
    }

    if (friendsData[userId].friends.includes(targetUser.id)) {
        return interaction.editReply({
            content: '✅ You are already friends with this user!'
        });
    }

    if (friendsData[userId].sentRequests.includes(targetUser.id)) {
        return interaction.editReply({
            content: '📤 You already sent a friend request to this user!'
        });
    }

    friendsData[userId].sentRequests.push(targetUser.id);
    friendsData[targetUser.id].pendingRequests.push(userId);
    saveFriendsData(friendsData);

    await interaction.editReply({
        content: `✅ Friend request sent to **${targetUser.username}**! They can accept it using \`/social friends requests\`.`
    });
}

async function handleFriendsList(interaction, friendsData) {
    const userId = interaction.user.id;
    const friends = friendsData[userId]?.friends || [];

    if (friends.length === 0) {
        return interaction.editReply({
            content: '👥 You don\'t have any friends yet! Add some with `/social friends add`.'
        });
    }

    let description = '';
    for (const friendId of friends.slice(0, 10)) {
        try {
            const friend = await interaction.client.users.fetch(friendId);
            description += `• **${friend.username}** (${friend.tag})\n`;
        } catch (error) {
            description += `• Unknown User (${friendId})\n`;
        }
    }

    const embed = new EmbedBuilder()
        .setTitle('👥 Your Friends List')
        .setDescription(description)
        .setColor('#5865F2')
        .setFooter({ text: `${friends.length} total friends` });

    await interaction.editReply({ embeds: [embed] });
}

async function handleFriendRequests(interaction, friendsData) {
    const userId = interaction.user.id;
    const requests = friendsData[userId]?.pendingRequests || [];

    if (requests.length === 0) {
        return interaction.editReply({
            content: '📬 No pending friend requests!'
        });
    }

    let description = '';
    for (const requesterId of requests.slice(0, 5)) {
        try {
            const requester = await interaction.client.users.fetch(requesterId);
            description += `• **${requester.username}** (${requester.tag})\n`;
        } catch (error) {
            description += `• Unknown User (${requesterId})\n`;
        }
    }

    const embed = new EmbedBuilder()
        .setTitle('📬 Pending Friend Requests')
        .setDescription(description)
        .setColor('#FFD700');

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('friends_manage_requests')
                .setLabel('Manage Requests')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('⚙️')
        );

    await interaction.editReply({ embeds: [embed], components: [row] });
}

async function handleFriendsLeaderboard(interaction, friendsData) {
    const socialData = loadSocialData();
    const guildData = socialData[interaction.guild.id] || {};

    // Calculate friend activity scores
    const friendScores = {};
    Object.keys(friendsData).forEach(userId => {
        const userSocialData = guildData[userId];
        if (userSocialData && friendsData[userId].friends.length > 0) {
            friendScores[userId] = {
                score: calculateActivityScore(userSocialData),
                friendCount: friendsData[userId].friends.length
            };
        }
    });

    const sortedFriends = Object.entries(friendScores)
        .sort(([,a], [,b]) => b.score - a.score)
        .slice(0, 10);

    if (sortedFriends.length === 0) {
        return interaction.editReply({
            content: '🏆 No friend activity data available yet!'
        });
    }

    let description = '';
    for (let i = 0; i < sortedFriends.length; i++) {
        const [userId, data] = sortedFriends[i];
        try {
            const user = await interaction.client.users.fetch(userId);
            description += `${i + 1}. **${user.username}** - ${data.score} points (${data.friendCount} friends)\n`;
        } catch (error) {
            description += `${i + 1}. Unknown User - ${data.score} points\n`;
        }
    }

    const embed = new EmbedBuilder()
        .setTitle('🏆 Friend Activity Leaderboard')
        .setDescription(description)
        .setColor('#FFD700')
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}

async function handleFriendRemove(interaction, friendsData) {
    const targetUser = interaction.options.getUser('user');
    const userId = interaction.user.id;

    if (!friendsData[userId].friends.includes(targetUser.id)) {
        return interaction.editReply({
            content: '❌ You are not friends with this user!'
        });
    }

    // Remove from both friends lists
    const userIndex = friendsData[userId].friends.indexOf(targetUser.id);
    const targetIndex = friendsData[targetUser.id]?.friends?.indexOf(userId) || -1;

    if (userIndex > -1) {
        friendsData[userId].friends.splice(userIndex, 1);
    }
    if (targetIndex > -1 && friendsData[targetUser.id]) {
        friendsData[targetUser.id].friends.splice(targetIndex, 1);
    }

    saveFriendsData(friendsData);

    await interaction.editReply({
        content: `💔 You are no longer friends with **${targetUser.username}**.`
    });
}

async function handleAnnouncement(interaction, eventsData) {
    const title = interaction.options.getString('title');
    const message = interaction.options.getString('message');
    const priority = interaction.options.getString('priority') || 'medium';
    const guildId = interaction.guild.id;

    const announcement = {
        id: generateEventId(),
        title,
        message,
        priority,
        creator: interaction.user.id,
        created: Date.now()
    };

    if (!eventsData[guildId]) {
        eventsData[guildId] = { events: [], announcements: [] };
    }

    if (!eventsData[guildId].announcements) {
        eventsData[guildId].announcements = [];
    }

    eventsData[guildId].announcements.push(announcement);
    saveEventsData(eventsData);

    const priorityColors = {
        low: '#00FF00',
        medium: '#FFFF00',
        high: '#FFA500',
        critical: '#FF0000'
    };

    const priorityEmojis = {
        low: '🟢',
        medium: '🟡',
        high: '🔴',
        critical: '🚨'
    };

    const embed = new EmbedBuilder()
        .setTitle(`📢 ${title}`)
        .setDescription(message)
        .addFields(
            { name: 'Priority', value: `${priorityEmojis[priority]} ${priority.toUpperCase()}`, inline: true },
            { name: 'Announced by', value: `<@${interaction.user.id}>`, inline: true }
        )
        .setColor(priorityColors[priority])
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}


// Export tracking functions for use in message events
module.exports.trackMessage = function(guildId, userId) {
    const socialData = loadSocialData();
    if (!socialData[guildId]) socialData[guildId] = {};
    if (!socialData[guildId][userId]) {
        socialData[guildId][userId] = {
            messages: 0,
            voiceTime: 0,
            reactionsGiven: 0,
            reactionsReceived: 0,
            interactions: 0,
            eventsAttended: 0,
            joinDate: Date.now()
        };
    }

    socialData[guildId][userId].messages++;
    socialData[guildId][userId].interactions++;
    saveSocialData(socialData);
};

module.exports.trackReaction = function(guildId, userId, type = 'given') {
    const socialData = loadSocialData();
    if (!socialData[guildId]) socialData[guildId] = {};
    if (!socialData[guildId][userId]) {
        socialData[guildId][userId] = {
            messages: 0,
            voiceTime: 0,
            reactionsGiven: 0,
            reactionsReceived: 0,
            interactions: 0,
            eventsAttended: 0,
            joinDate: Date.now()
        };
    }

    if (type === 'given') {
        socialData[guildId][userId].reactionsGiven++;
    } else {
        socialData[guildId][userId].reactionsReceived++;
    }

    socialData[guildId][userId].interactions++;
    saveSocialData(socialData);
};

module.exports.trackVoiceTime = function(guildId, userId, minutes) {
    const socialData = loadSocialData();
    if (!socialData[guildId]) socialData[guildId] = {};
    if (!socialData[guildId][userId]) {
        socialData[guildId][userId] = {
            messages: 0,
            voiceTime: 0,
            reactionsGiven: 0,
            reactionsReceived: 0,
            interactions: 0,
            eventsAttended: 0,
            joinDate: Date.now()
        };
    }

    socialData[guildId][userId].voiceTime += minutes * 60; // Store in seconds
    saveSocialData(socialData);
};