const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

const SOCIAL_FILE = path.join(__dirname, '..', 'config', 'social_data.json');
const EVENTS_FILE = path.join(__dirname, '..', 'config', 'community_events.json');
const FRIENDS_FILE = path.join(__dirname, '..', 'config', 'friend_system.json');

function loadSocialData() {
    try {
        const data = fs.readFileSync(SOCIAL_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
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

async function handleSocialInteraction(interaction) {
    try {
        const customId = interaction.customId;

        if (customId.startsWith('social_detailed_')) {
            await handleDetailedStats(interaction);
        } else if (customId.startsWith('social_compare_')) {
            await handleCompareStats(interaction);
        } else if (customId.startsWith('event_join_')) {
            await handleEventJoinButton(interaction);
        } else if (customId === 'friends_manage_requests') {
            await handleManageFriendRequests(interaction);
        } else if (customId.startsWith('friend_accept_')) {
            await handleFriendAccept(interaction);
        } else if (customId.startsWith('friend_reject_')) {
            await handleFriendReject(interaction);
        } else if (customId === 'profile_setup_menu') {
            await handleProfileSetupMenu(interaction);
        } else if (customId === 'profile_links_menu') {
            await handleProfileLinksMenu(interaction);
        } else if (customId === 'profile_customize_menu') {
            await handleProfileCustomizeMenu(interaction);
        } else if (customId === 'profile_bio_modal') {
            await handleProfileBioModal(interaction);
        } else if (customId.startsWith('social_compare_modal_')) {
            await handleCompareModal(interaction);
        } else if (customId.startsWith('profile_link_modal_')) {
            await handleProfileLinkModal(interaction);
        } else if (customId === 'profile_color_modal') {
            await handleProfileColorModal(interaction);
        }
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

async function handleDetailedStats(interaction) {
    const userId = interaction.customId.split('_')[2];
    const socialData = loadSocialData();
    const guildData = socialData[interaction.guild.id] || {};
    const userData = guildData[userId];

    if (!userData) {
        return interaction.reply({
            content: '❌ No social data found for this user.',
            flags: 64
        });
    }

    const user = await interaction.client.users.fetch(userId);
    const joinedDate = new Date(userData.joinDate);
    const daysSinceJoin = Math.floor((Date.now() - userData.joinDate) / 86400000);

    const embed = new EmbedBuilder()
        .setTitle(`📋 Detailed Social Analytics • ${user.username}`)
        .setThumbnail(user.displayAvatarURL({ dynamic: true }))
        .setColor('#5865F2')
        .addFields(
            {
                name: '📊 Activity Breakdown',
                value: `**Messages:** ${userData.messages?.toLocaleString() || 0}\n**Voice Time:** ${Math.floor((userData.voiceTime || 0) / 3600)} hours\n**Reactions Given:** ${userData.reactionsGiven?.toLocaleString() || 0}\n**Reactions Received:** ${userData.reactionsReceived?.toLocaleString() || 0}`,
                inline: true
            },
            {
                name: '🎯 Engagement Metrics',
                value: `**Total Interactions:** ${userData.interactions?.toLocaleString() || 0}\n**Events Attended:** ${userData.eventsAttended || 0}\n**Daily Average:** ${Math.round((userData.messages || 0) / Math.max(daysSinceJoin, 1))} messages\n**Activity Score:** ${calculateActivityScore(userData)}`,
                inline: true
            },
            {
                name: '📈 Time Analysis',
                value: `**Joined:** ${joinedDate.toLocaleDateString()}\n**Days Active:** ${daysSinceJoin}\n**Avg Voice/Day:** ${Math.round((userData.voiceTime || 0) / 60 / Math.max(daysSinceJoin, 1))} minutes\n**Most Active:** ${getMostActiveTime()}`,
                inline: true
            },
            {
                name: '🏆 Achievements & Rankings',
                value: `**Server Rank:** #${await getUserRank(interaction.guild.id, userId)}\n**Activity Level:** ${getActivityLevel(userData)}\n**Next Milestone:** ${getNextMilestone(userData)}\n**Progress:** ${getProgress(userData)}`,
                inline: false
            }
        )
        .setFooter({ text: `Data since ${joinedDate.toLocaleDateString()}` })
        .setTimestamp();

    await interaction.reply({ embeds: [embed], flags: 64 });
}

async function handleCompareStats(interaction) {
    try {
        if (interaction.isModalSubmit()) {
            // Handle modal submission
            const username = interaction.fields.getTextInputValue('compare_user');

            // Process the comparison logic here
            await interaction.reply({
                content: `🔍 Comparing stats with user: ${username}`,
                flags: 64
            });
            return;
        }

        // Show modal for button interaction
        if (interaction.isButton()) {
            const modal = new ModalBuilder()
                .setCustomId(`social_compare_modal_${interaction.user.id}`)
                .setTitle('Compare Social Stats');

            const userInput = new TextInputBuilder()
                .setCustomId('compare_user')
                .setLabel('Username to compare with')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Enter username...')
                .setRequired(true);

            const firstActionRow = new ActionRowBuilder().addComponents(userInput);
            modal.addComponents(firstActionRow);

            await interaction.showModal(modal);
        }
    } catch (error) {
        console.error('Error in handleCompareStats:', error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: '❌ An error occurred while processing the comparison.',
                flags: 64
            });
        }
    }
}

async function handleEventJoinButton(interaction) {
    const eventId = interaction.customId.split('_')[2];
    const eventsData = loadEventsData();
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;

    const event = eventsData[guildId]?.events?.find(e => e.id === eventId);
    if (!event) {
        return interaction.reply({
            content: '❌ Event not found or has been deleted.',
            flags: 64
        });
    }

    if (event.attendees.includes(userId)) {
        return interaction.reply({
            content: '✅ You\'re already registered for this event!',
            flags: 64
        });
    }

    event.attendees.push(userId);

    // Track event attendance in social stats
    const socialData = loadSocialData();
    if (!socialData[guildId]) socialData[guildId] = {};
    if (!socialData[guildId][userId]) {
        socialData[guildId][userId] = {
            messages: 0, voiceTime: 0, reactionsGiven: 0,
            reactionsReceived: 0, interactions: 0, eventsAttended: 0, joinDate: Date.now()
        };
    }
    socialData[guildId][userId].eventsAttended++;

    saveEventsData(eventsData);
    saveSocialData(socialData);

    const embed = new EmbedBuilder()
        .setTitle('🎉 Event Registration Successful!')
        .setDescription(`You've successfully joined **${event.title}**!`)
        .addFields(
            { name: '📅 Date & Time', value: `${event.date} at ${event.time}`, inline: true },
            { name: '👥 Total Attendees', value: event.attendees.length.toString(), inline: true }
        )
        .setColor('#00FF00');

    await interaction.reply({ embeds: [embed], flags: 64 });
}

async function handleManageFriendRequests(interaction) {
    const friendsData = loadFriendsData();
    const userId = interaction.user.id;
    const requests = friendsData[userId]?.pendingRequests || [];

    if (requests.length === 0) {
        return interaction.reply({
            content: '📬 No pending friend requests!',
            flags: 64
        });
    }

    const embed = new EmbedBuilder()
        .setTitle('📬 Manage Friend Requests')
        .setDescription('Choose how to handle your pending friend requests:')
        .setColor('#FFD700');

    const buttons = [];
    for (let i = 0; i < Math.min(requests.length, 3); i++) {
        const requesterId = requests[i];
        try {
            const requester = await interaction.client.users.fetch(requesterId);
            buttons.push(
                new ButtonBuilder()
                    .setCustomId(`friend_accept_${requesterId}`)
                    .setLabel(`Accept ${requester.username}`)
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('✅')
            );
            buttons.push(
                new ButtonBuilder()
                    .setCustomId(`friend_reject_${requesterId}`)
                    .setLabel(`Reject ${requester.username}`)
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('❌')
            );
        } catch (error) {
            console.error('Error fetching user for friend request:', error);
        }
    }

    const rows = [];
    for (let i = 0; i < buttons.length; i += 2) {
        const row = new ActionRowBuilder().addComponents(buttons.slice(i, i + 2));
        rows.push(row);
    }

    await interaction.reply({ embeds: [embed], components: rows, flags: 64 });
}

async function handleFriendAccept(interaction) {
    const requesterId = interaction.customId.split('_')[2];
    const friendsData = loadFriendsData();
    const userId = interaction.user.id;

    // Remove from pending requests
    if (friendsData[userId]?.pendingRequests) {
        const index = friendsData[userId].pendingRequests.indexOf(requesterId);
        if (index > -1) {
            friendsData[userId].pendingRequests.splice(index, 1);
        }
    }

    // Remove from sent requests
    if (friendsData[requesterId]?.sentRequests) {
        const index = friendsData[requesterId].sentRequests.indexOf(userId);
        if (index > -1) {
            friendsData[requesterId].sentRequests.splice(index, 1);
        }
    }

    // Add to friends lists
    if (!friendsData[userId].friends) friendsData[userId].friends = [];
    if (!friendsData[requesterId].friends) friendsData[requesterId].friends = [];

    friendsData[userId].friends.push(requesterId);
    friendsData[requesterId].friends.push(userId);

    saveFriendsData(friendsData);

    try {
        const requester = await interaction.client.users.fetch(requesterId);
        await interaction.reply({
            content: `✅ You are now friends with **${requester.username}**!`,
            flags: 64
        });
    } catch (error) {
        await interaction.reply({
            content: '✅ Friend request accepted!',
            flags: 64
        });
    }
}

async function handleFriendReject(interaction) {
    const requesterId = interaction.customId.split('_')[2];
    const friendsData = loadFriendsData();
    const userId = interaction.user.id;

    // Remove from pending requests
    if (friendsData[userId]?.pendingRequests) {
        const index = friendsData[userId].pendingRequests.indexOf(requesterId);
        if (index > -1) {
            friendsData[userId].pendingRequests.splice(index, 1);
        }
    }

    // Remove from sent requests
    if (friendsData[requesterId]?.sentRequests) {
        const index = friendsData[requesterId].sentRequests.indexOf(userId);
        if (index > -1) {
            friendsData[requesterId].sentRequests.splice(index, 1);
        }
    }

    saveFriendsData(friendsData);

    try {
        const requester = await interaction.client.users.fetch(requesterId);
        await interaction.reply({
            content: `❌ Rejected friend request from **${requester.username}**.`,
            flags: 64
        });
    } catch (error) {
        await interaction.reply({
            content: '❌ Friend request rejected.',
            flags: 64
        });
    }
}

async function handleProfileSetupMenu(interaction) {
    const selectedValue = interaction.values[0];

    switch (selectedValue) {
        case 'bio':
            await showBioModal(interaction);
            break;
        case 'links':
            await showLinksMenu(interaction);
            break;
        case 'customize':
            await showCustomizeMenu(interaction);
            break;
    }
}

async function showBioModal(interaction) {
    const modal = new ModalBuilder()
        .setCustomId('profile_bio_modal')
        .setTitle('Set Your Profile Bio');

    const bioInput = new TextInputBuilder()
        .setCustomId('bio_text')
        .setLabel('Your Bio')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Tell everyone about yourself... (max 200 characters)')
        .setMaxLength(200)
        .setRequired(true);

    const row = new ActionRowBuilder().addComponents(bioInput);
    modal.addComponents(row);

    await interaction.showModal(modal);
}

async function showLinksMenu(interaction) {
    const embed = new EmbedBuilder()
        .setTitle('🔗 Add Social Links')
        .setDescription('Choose a platform to add your profile link:')
        .setColor('#5865F2');

    const row = new ActionRowBuilder()
        .addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('profile_links_menu')
                .setPlaceholder('Choose a platform...')
                .addOptions([
                    { label: 'Twitter', value: 'twitter', emoji: '🐦' },
                    { label: 'Instagram', value: 'instagram', emoji: '📷' },
                    { label: 'LinkedIn', value: 'linkedin', emoji: '💼' },
                    { label: 'Twitch', value: 'twitch', emoji: '🎮' },
                    { label: 'YouTube', value: 'youtube', emoji: '📺' },
                    { label: 'Website', value: 'website', emoji: '🌐' }
                ])
        );

    await interaction.reply({ embeds: [embed], components: [row], flags: 64 });
}

async function showCustomizeMenu(interaction) {
    const embed = new EmbedBuilder()
        .setTitle('🎨 Customize Profile')
        .setDescription('Choose what to customize:')
        .setColor('#5865F2');

    const row = new ActionRowBuilder()
        .addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('profile_customize_menu')
                .setPlaceholder('Choose customization option...')
                .addOptions([
                    { label: 'Profile Color', value: 'color', emoji: '🎨' },
                    { label: 'Theme Style', value: 'theme', emoji: '🖼️' },
                    { label: 'Badge Display', value: 'badges', emoji: '🏆' }
                ])
        );

    await interaction.reply({ embeds: [embed], components: [row], flags: 64 });
}

async function handleProfileLinksMenu(interaction) {
    const platform = interaction.values[0];

    const modal = new ModalBuilder()
        .setCustomId(`profile_link_modal_${platform}`)
        .setTitle(`Add ${platform.charAt(0).toUpperCase() + platform.slice(1)} Link`);

    const linkInput = new TextInputBuilder()
        .setCustomId('link_url')
        .setLabel(`Your ${platform} URL or Username`)
        .setStyle(TextInputStyle.Short)
        .setPlaceholder(`Enter your ${platform} profile link...`)
        .setRequired(true);

    const row = new ActionRowBuilder().addComponents(linkInput);
    modal.addComponents(row);

    await interaction.showModal(modal);
}

async function handleProfileCustomizeMenu(interaction) {
    const option = interaction.values[0];

    if (option === 'color') {
        const modal = new ModalBuilder()
            .setCustomId('profile_color_modal')
            .setTitle('Set Profile Color');

        const colorInput = new TextInputBuilder()
            .setCustomId('profile_color')
            .setLabel('Profile Color (Hex Code)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('#5865F2')
            .setRequired(true);

        const row = new ActionRowBuilder().addComponents(colorInput);
        modal.addComponents(row);

        await interaction.showModal(modal);
    } else {
        await interaction.reply({
            content: `🚧 ${option.charAt(0).toUpperCase() + option.slice(1)} customization coming soon!`,
            flags: 64
        });
    }
}

async function handleProfileBioModal(interaction) {
    const bio = interaction.fields.getTextInputValue('bio_text');
    const socialData = loadSocialData();
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;

    if (!socialData[guildId]) socialData[guildId] = {};
    if (!socialData[guildId][userId]) {
        socialData[guildId][userId] = { profile: { bio: '', socialLinks: {}, achievements: [] } };
    }
    if (!socialData[guildId][userId].profile) {
        socialData[guildId][userId].profile = { bio: '', socialLinks: {}, achievements: [] };
    }

    socialData[guildId][userId].profile.bio = bio;
    saveSocialData(socialData);

    await interaction.reply({
        content: `✅ Bio updated successfully!\n\n**Your new bio:**\n${bio}`,
        flags: 64
    });
}

async function handleProfileLinkModal(interaction) {
    const platform = interaction.customId.split('_')[3];
    const url = interaction.fields.getTextInputValue('link_url');
    const socialData = loadSocialData();
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;

    if (!socialData[guildId]) socialData[guildId] = {};
    if (!socialData[guildId][userId]) {
        socialData[guildId][userId] = { profile: { bio: '', socialLinks: {}, achievements: [] } };
    }
    if (!socialData[guildId][userId].profile) {
        socialData[guildId][userId].profile = { bio: '', socialLinks: {}, achievements: [] };
    }

    socialData[guildId][userId].profile.socialLinks[platform] = url;
    saveSocialData(socialData);

    await interaction.reply({
        content: `✅ ${platform.charAt(0).toUpperCase() + platform.slice(1)} link added successfully!\n\n**${platform}:** ${url}`,
        flags: 64
    });
}

async function handleProfileColorModal(interaction) {
    const color = interaction.fields.getTextInputValue('profile_color');
    const socialData = loadSocialData();
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;

    // Validate hex color
    const hexRegex = /^#[0-9A-F]{6}$/i;
    if (!hexRegex.test(color)) {
        return interaction.reply({
            content: '❌ Invalid hex color! Please use format: #RRGGBB (e.g., #5865F2)',
            flags: 64
        });
    }

    if (!socialData[guildId]) socialData[guildId] = {};
    if (!socialData[guildId][userId]) {
        socialData[guildId][userId] = { profile: { bio: '', socialLinks: {}, achievements: [], customization: {} } };
    }
    if (!socialData[guildId][userId].profile) {
        socialData[guildId][userId].profile = { bio: '', socialLinks: {}, achievements: [], customization: {} };
    }
    if (!socialData[guildId][userId].profile.customization) {
        socialData[guildId][userId].profile.customization = {};
    }

    socialData[guildId][userId].profile.customization.color = color;
    saveSocialData(socialData);

    await interaction.reply({
        content: `✅ Profile color updated to **${color}**!`,
        flags: 64
    });
}

async function handleCompareModal(interaction) {
    const userId = interaction.customId.split('_')[3];
    const compareInput = interaction.fields.getTextInputValue('compare_user');

    // Try to find user by username or ID
    let compareUser;
    try {
        // First try as user ID
        compareUser = await interaction.client.users.fetch(compareInput);
    } catch {
        // Then try to find by username in guild
        const members = await interaction.guild.members.fetch();
        compareUser = members.find(member =>
            member.user.username.toLowerCase() === compareInput.toLowerCase() ||
            member.displayName.toLowerCase() === compareInput.toLowerCase()
        )?.user;
    }

    if (!compareUser) {
        return interaction.reply({
            content: '❌ User not found! Please enter a valid username or user ID.',
            flags: 64
        });
    }

    const socialData = loadSocialData();
    const guildData = socialData[interaction.guild.id] || {};
    const user1Data = guildData[userId] || {};
    const user2Data = guildData[compareUser.id] || {};

    const user1 = await interaction.client.users.fetch(userId);

    const embed = new EmbedBuilder()
        .setTitle('⚖️ Social Stats Comparison')
        .setColor('#5865F2')
        .addFields(
            {
                name: `📊 ${user1.username}`,
                value: `Messages: **${user1Data.messages || 0}**\nVoice: **${Math.floor((user1Data.voiceTime || 0) / 3600)}h**\nReactions: **${(user1Data.reactionsGiven || 0) + (user1Data.reactionsReceived || 0)}**\nScore: **${calculateActivityScore(user1Data)}**`,
                inline: true
            },
            {
                name: `📊 ${compareUser.username}`,
                value: `Messages: **${user2Data.messages || 0}**\nVoice: **${Math.floor((user2Data.voiceTime || 0) / 3600)}h**\nReactions: **${(user2Data.reactionsGiven || 0) + (user2Data.reactionsReceived || 0)}**\nScore: **${calculateActivityScore(user2Data)}**`,
                inline: true
            }
        );

    await interaction.reply({ embeds: [embed], flags: 64 });
}

// Helper functions
function calculateActivityScore(userData) {
    const messageScore = (userData.messages || 0) * 2;
    const voiceScore = Math.floor((userData.voiceTime || 0) / 60) * 3;
    const reactionScore = ((userData.reactionsGiven || 0) + (userData.reactionsReceived || 0)) * 1;
    const interactionScore = (userData.interactions || 0) * 5;
    const eventScore = (userData.eventsAttended || 0) * 10;

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

function getMostActiveTime() {
    const times = ['Morning (6-12)', 'Afternoon (12-18)', 'Evening (18-24)', 'Night (0-6)'];
    return times[Math.floor(Math.random() * times.length)];
}

function getNextMilestone(userData) {
    const messages = userData.messages || 0;
    const nextMilestone = Math.ceil(messages / 100) * 100;
    return `${nextMilestone} messages`;
}

function getProgress(userData) {
    const messages = userData.messages || 0;
    const currentMilestone = Math.floor(messages / 100) * 100;
    const nextMilestone = currentMilestone + 100;
    const progress = ((messages - currentMilestone) / 100) * 100;
    return `${Math.round(progress)}% to next milestone`;
}

async function getUserRank(guildId, userId) {
    const socialData = loadSocialData();
    const guildData = socialData[guildId] || {};

    const users = Object.entries(guildData)
        .sort(([,a], [,b]) => calculateActivityScore(b) - calculateActivityScore(a));

    const rank = users.findIndex(([id]) => id === userId) + 1;
    return rank > 0 ? rank : 'Unranked';
}

module.exports = {
    handleSocialInteraction
};