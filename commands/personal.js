const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('personal')
        .setDescription('Advanced personal data management and productivity system')
        .addSubcommand(subcommand =>
            subcommand
                .setName('notes')
                .setDescription('Manage personal notes and memos')
                .addStringOption(option =>
                    option.setName('action')
                        .setDescription('Notes action')
                        .setRequired(true)
                        .addChoices(
                            { name: '📝 Create Note', value: 'create' },
                            { name: '📋 View Notes', value: 'view' },
                            { name: '✏️ Edit Note', value: 'edit' },
                            { name: '🗑️ Delete Note', value: 'delete' },
                            { name: '🔍 Search Notes', value: 'search' },
                            { name: '📤 Export Notes', value: 'export' }
                        ))
                .addStringOption(option =>
                    option.setName('title')
                        .setDescription('Note title or search query')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('content')
                        .setDescription('Note content')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('category')
                        .setDescription('Note category')
                        .setRequired(false)
                        .addChoices(
                            { name: '💼 Work', value: 'work' },
                            { name: '📚 Study', value: 'study' },
                            { name: '🎯 Goals', value: 'goals' },
                            { name: '💡 Ideas', value: 'ideas' },
                            { name: '📋 Tasks', value: 'tasks' },
                            { name: '🌟 Personal', value: 'personal' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('reminders')
                .setDescription('Set and manage personal reminders')
                .addStringOption(option =>
                    option.setName('action')
                        .setDescription('Reminder action')
                        .setRequired(true)
                        .addChoices(
                            { name: '⏰ Set Reminder', value: 'set' },
                            { name: '📅 View Reminders', value: 'view' },
                            { name: '✅ Complete Reminder', value: 'complete' },
                            { name: '🗑️ Delete Reminder', value: 'delete' },
                            { name: '⏸️ Snooze Reminder', value: 'snooze' }
                        ))
                .addStringOption(option =>
                    option.setName('message')
                        .setDescription('Reminder message')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('time')
                        .setDescription('When to remind (e.g., "1h", "tomorrow", "2024-12-25")')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('repeat')
                        .setDescription('Repeat interval')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Daily', value: 'daily' },
                            { name: 'Weekly', value: 'weekly' },
                            { name: 'Monthly', value: 'monthly' },
                            { name: 'No Repeat', value: 'none' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('profile')
                .setDescription('Manage your personal profile and preferences')
                .addStringOption(option =>
                    option.setName('action')
                        .setDescription('Profile action')
                        .setRequired(true)
                        .addChoices(
                            { name: '👤 View Profile', value: 'view' },
                            { name: '✏️ Edit Profile', value: 'edit' },
                            { name: '🎨 Customize Theme', value: 'theme' },
                            { name: '⚙️ Settings', value: 'settings' },
                            { name: '📊 Statistics', value: 'stats' },
                            { name: '🔄 Reset Profile', value: 'reset' },
                            { name: '🏆 Manage Titles', value: 'titles' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('tasks')
                .setDescription('Personal task and productivity management')
                .addStringOption(option =>
                    option.setName('action')
                        .setDescription('Task action')
                        .setRequired(true)
                        .addChoices(
                            { name: '➕ Add Task', value: 'add' },
                            { name: '📋 View Tasks', value: 'view' },
                            { name: '✅ Complete Task', value: 'complete' },
                            { name: '🗑️ Delete Task', value: 'delete' },
                            { name: '📊 Task Analytics', value: 'analytics' },
                            { name: '🏆 Achievements', value: 'achievements' }
                        ))
                .addStringOption(option =>
                    option.setName('task')
                        .setDescription('Task description')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('priority')
                        .setDescription('Task priority')
                        .setRequired(false)
                        .addChoices(
                            { name: '🔴 High Priority', value: 'high' },
                            { name: '🟡 Medium Priority', value: 'medium' },
                            { name: '🟢 Low Priority', value: 'low' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('data')
                .setDescription('Personal data management and privacy')
                .addStringOption(option =>
                    option.setName('action')
                        .setDescription('Data action')
                        .setRequired(true)
                        .addChoices(
                            { name: '📊 View Data Summary', value: 'summary' },
                            { name: '📤 Export All Data', value: 'export' },
                            { name: '🗑️ Delete All Data', value: 'delete' },
                            { name: '🔒 Privacy Settings', value: 'privacy' },
                            { name: '📋 Data Usage Report', value: 'usage' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('dashboard')
                .setDescription('Personal productivity dashboard')
                .addStringOption(option =>
                    option.setName('view')
                        .setDescription('Dashboard view')
                        .setRequired(false)
                        .addChoices(
                            { name: '📊 Overview', value: 'overview' },
                            { name: '📈 Analytics', value: 'analytics' },
                            { name: '🎯 Goals Progress', value: 'goals' },
                            { name: '⏰ Schedule', value: 'schedule' },
                            { name: '🏆 Achievements', value: 'achievements' }
                        ))),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        // Initialize user data if it doesn't exist
        if (!interaction.client.userData) {
            interaction.client.userData = {};
        }

        const userId = interaction.user.id;
        const guildId = interaction.guild.id;
        const key = `${guildId}_${userId}`;

        if (!interaction.client.userData[key]) {
            interaction.client.userData[key] = {
                bio: null,
                color: '#0099FF',
                afk: null,
                notes: [],
                timezone: null,
                birthday: null,
                joinDate: Date.now(),
                messageCount: 0,
                commandsUsed: 0,
                mood: null,
                moodHistory: [],
                quotes: [],
                goals: [],
                reminders: [],
                status: null,
                tasks: [],
                profile: {
                    theme: '#0099FF',
                    settings: {},
                    stats: {
                        messageCount: 0,
                        commandsUsed: 0,
                        tasksCompleted: 0
                    }
                },
                data: {
                    usage: {},
                    privacy: {}
                },
                dashboard: {},
                titles: {
                    earned: [],
                    equipped: null
                }
            };
        }

        switch (subcommand) {
            case 'profile':
                await handleProfile(interaction);
                break;
            case 'setbio': // This is an old subcommand, it should be handled by the new profile subcommand
                await handleSetBio(interaction);
                break;
            case 'setcolor': // This is an old subcommand, it should be handled by the new profile subcommand
                await handleSetColor(interaction);
                break;
            case 'afk': // This is an old subcommand, it should be handled by the new profile subcommand
                await handleAFK(interaction);
                break;
            case 'notes':
                await handleNotes(interaction);
                break;
            case 'timezone': // This is an old subcommand, it should be handled by the new profile subcommand
                await handleTimezone(interaction);
                break;
            case 'birthday': // This is an old subcommand, it should be handled by the new profile subcommand
                await handleBirthday(interaction);
                break;
            case 'stats': // This is an old subcommand, it should be handled by the new profile subcommand
                await handleStats(interaction);
                break;
            case 'mood': // This is an old subcommand, it should be handled by the new profile subcommand
                await handleMood(interaction);
                break;
            case 'quotes': // This is an old subcommand, it should be handled by the new profile subcommand
                await handleQuotes(interaction);
                break;
            case 'goals': // This is an old subcommand, it should be handled by the new profile subcommand
                await handleGoals(interaction);
                break;
            case 'reminders':
                await handleReminders(interaction);
                break;
            case 'status': // This is an old subcommand, it should be handled by the new profile subcommand
                await handleStatus(interaction);
                break;
            case 'avatar': // This is an old subcommand, it should be handled by the new profile subcommand
                await handleAvatar(interaction);
                break;
            case 'tasks':
                await handleTasks(interaction);
                break;
            case 'data':
                await handleData(interaction);
                break;
            case 'dashboard':
                await handleDashboard(interaction);
                break;
            case 'titles':
                const { managePersonalTitles } = require('../utils/personalManager');
                const titleResult = await managePersonalTitles(userId, 'list', {});

                const titleEmbed = new EmbedBuilder()
                    .setTitle(`🏆 ${interaction.user.username}'s Titles`)
                    .setColor(userData.profile?.theme || '#0099FF')
                    .setTimestamp();

                if (!titleResult || !titleResult.unlocked || titleResult.unlocked.length === 0) {
                    titleEmbed.setDescription('You haven\'t unlocked any titles yet!');
                } else {
                    titleEmbed.addFields(
                        { name: '🏆 Active Title', value: titleResult.active || 'None', inline: true },
                        { name: '✨ Unlocked Titles', value: titleResult.unlocked.join(', '), inline: true }
                    );
                }

                await interaction.reply({ embeds: [titleEmbed], ephemeral: true });
                break;
        }

        // Save user data
        global.saveUserData = () => {
            const fs = require('fs');
            fs.writeFileSync('./config/user_data.json', JSON.stringify(interaction.client.userData, null, 2));
        };
        global.saveUserData();
    }
};

async function handleProfile(interaction) {
    const action = interaction.options.getString('action');
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;
    const key = `${guildId}_${userId}`;
    const userData = interaction.client.userData[key];

    switch (action) {
        case 'view':
            const member = interaction.guild.members.cache.get(userId);
            const joinedAt = member ? member.joinedAt : new Date(userData.joinDate);
            const embed = new EmbedBuilder()
                .setTitle(`👤 ${interaction.user.username}'s Profile`)
                .setDescription(userData.bio || 'No bio set')
                .addFields(
                    { name: '🎨 Theme Color', value: userData.profile.theme, inline: true },
                    { name: '🌍 Timezone', value: userData.timezone || 'Not set', inline: true },
                    { name: '🎂 Birthday', value: userData.birthday || 'Not set', inline: true },
                    { name: '📅 Joined Server', value: `<t:${Math.floor(joinedAt.getTime() / 1000)}:R>`, inline: true },
                    { name: '💬 Messages Sent', value: userData.profile.stats.messageCount.toString(), inline: true },
                    { name: '⚡ Commands Used', value: userData.profile.stats.commandsUsed.toString(), inline: true }
                )
                .setColor(userData.profile.theme)
                .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
                .setTimestamp();

            if (userData.afk) {
                embed.addFields({ name: '😴 AFK Status', value: userData.afk, inline: false });
            }
            if (userData.titles && userData.titles.equipped) {
                embed.addFields({ name: '🏆 Title', value: userData.titles.equipped, inline: true });
            }


            await interaction.reply({ embeds: [embed], ephemeral: true });
            break;

        case 'edit':
            // Use modal for editing profile
            const profileModal = new ModalBuilder()
                .setCustomId('editProfileModal')
                .setTitle('Edit Your Profile');

            const bioInput = new TextInputBuilder()
                .setCustomId('bio')
                .setLabel('Your Bio')
                .setStyle(TextInputStyle.Paragraph)
                .setValue(userData.bio || '')
                .setRequired(false)
                .setMaxLength(200);

            const timezoneInput = new TextInputBuilder()
                .setCustomId('timezone')
                .setLabel('Your Timezone (e.g., America/New_York)')
                .setStyle(TextInputStyle.Short)
                .setValue(userData.timezone || '')
                .setRequired(false);

            const birthdayInput = new TextInputBuilder()
                .setCustomId('birthday')
                .setLabel('Your Birthday (MM-DD)')
                .setStyle(TextInputStyle.Short)
                .setValue(userData.birthday || '')
                .setRequired(false);

            profileModal.addComponents(
                new ActionRowBuilder().addComponents(bioInput),
                new ActionRowBuilder().addComponents(timezoneInput),
                new ActionRowBuilder().addComponents(birthdayInput)
            );
            await interaction.showModal(profileModal);
            break;

        case 'theme':
            const themeRow = new ActionRowBuilder()
                .addComponents(
                    new TextInputBuilder()
                        .setCustomId('color')
                        .setLabel('Enter your preferred theme color (hex)')
                        .setStyle(TextInputStyle.Short)
                        .setValue(userData.profile.theme)
                        .setRequired(true)
                );

            const themeModal = new ModalBuilder()
                .setCustomId('themeModal')
                .setTitle('Customize Theme')
                .addComponents(themeRow);

            await interaction.showModal(themeModal);
            break;

        case 'settings':
            // Placeholder for settings
            await interaction.reply({ content: '⚙️ Profile settings management is coming soon!', ephemeral: true });
            break;

        case 'stats':
            const memberStats = interaction.guild.members.cache.get(userId);
            const joinedAtStats = memberStats ? memberStats.joinedAt : new Date(userData.joinDate);
            const daysSinceJoin = Math.floor((Date.now() - joinedAtStats.getTime()) / (1000 * 60 * 60 * 24));

            const statsEmbed = new EmbedBuilder()
                .setTitle(`📊 ${interaction.user.username}'s Server Stats`)
                .addFields(
                    { name: '📅 Days in Server', value: daysSinceJoin.toString(), inline: true },
                    { name: '💬 Messages Sent', value: userData.profile.stats.messageCount.toString(), inline: true },
                    { name: '⚡ Commands Used', value: userData.profile.stats.commandsUsed.toString(), inline: true },
                    { name: '📝 Notes Saved', value: (userData.notes || []).length.toString(), inline: true },
                    { name: '💭 Quotes Saved', value: (userData.quotes || []).length.toString(), inline: true },
                    { name: '🎯 Goals Set', value: (userData.goals || []).length.toString(), inline: true },
                    { name: '🏆 Server Rank', value: 'Coming Soon', inline: true },
                    { name: '⭐ Activity Score', value: Math.floor((userData.profile.stats.messageCount * 2 + userData.profile.stats.commandsUsed * 5) / Math.max(daysSinceJoin, 1)).toString(), inline: true }
                )
                .setColor(userData.profile.theme)
                .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
                .setTimestamp();

            await interaction.reply({ embeds: [statsEmbed], ephemeral: true });
            break;

        case 'reset':
            // Confirm reset
            const confirmRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('confirmProfileReset')
                        .setLabel('Confirm Reset')
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId('cancelProfileReset')
                        .setLabel('Cancel')
                        .setStyle(ButtonStyle.Secondary)
                );
            await interaction.reply({
                content: 'Are you sure you want to reset your profile data? This action cannot be undone.',
                components: [confirmRow],
                ephemeral: true
            });
            break;
    }
}


async function handleSetBio(interaction) {
    const bio = interaction.options.getString('bio');
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;
    const key = `${guildId}_${userId}`;

    interaction.client.userData[key].bio = bio;
    interaction.client.userData[key].profile.stats.messageCount++; // Increment stats

    const embed = new EmbedBuilder()
        .setTitle('✅ Bio Updated')
        .setDescription(`Your bio has been set to:\n\n${bio}`)
        .setColor('#00FF00')
        .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleSetColor(interaction) {
    const color = interaction.options.getString('color');
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;
    const key = `${guildId}_${userId}`;

    // Validate hex color
    const hexRegex = /^#[0-9A-F]{6}$/i;
    if (!hexRegex.test(color)) {
        return interaction.reply({
            content: '❌ Invalid color format. Please use hex format like #FF0000',
            ephemeral: true
        });
    }

    interaction.client.userData[key].profile.theme = color; // Use profile theme
    interaction.client.userData[key].profile.stats.commandsUsed++; // Increment stats

    const embed = new EmbedBuilder()
        .setTitle('🎨 Color Updated')
        .setDescription(`Your personal theme color has been set to ${color}`)
        .setColor(color)
        .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleAFK(interaction) {
    const reason = interaction.options.getString('reason') || 'AFK';
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;
    const key = `${guildId}_${userId}`;

    if (interaction.client.userData[key].afk) {
        // Remove AFK
        interaction.client.userData[key].afk = null;
        await interaction.reply({ content: '✅ Welcome back! Your AFK status has been removed.', ephemeral: true });
    } else {
        // Set AFK
        interaction.client.userData[key].afk = reason;
        await interaction.reply({ content: `✅ You are now AFK: ${reason}`, ephemeral: true });
    }
    interaction.client.userData[key].profile.stats.commandsUsed++; // Increment stats
}

async function handleNotes(interaction) {
    const action = interaction.options.getString('action');
    const title = interaction.options.getString('title');
    const content = interaction.options.getString('content');
    const category = interaction.options.getString('category');
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;
    const key = `${guildId}_${userId}`;

    const userData = interaction.client.userData[key];
    if (!userData.notes) userData.notes = [];

    switch (action) {
        case 'create':
            if (!title || !content) {
                return interaction.reply({ content: '❌ Please provide both a title and content for the note.', ephemeral: true });
            }
            const noteId = userData.notes.length + 1;
            userData.notes.push({
                id: noteId,
                title: title,
                content: content,
                category: category,
                timestamp: Date.now()
            });
            await interaction.reply({ content: `✅ Note "${title}" created successfully!`, ephemeral: true });
            break;

        case 'view':
            if (userData.notes.length === 0) {
                return interaction.reply({ content: '📝 You have no notes saved.', ephemeral: true });
            }
            const embed = new EmbedBuilder()
                .setTitle('📝 Your Personal Notes')
                .setColor(userData.profile.theme)
                .setTimestamp();

            userData.notes.forEach(note => {
                embed.addFields({
                    name: `📝 ${note.title} (${note.category || 'Uncategorized'})`,
                    value: `${note.content.substring(0, 100)}${note.content.length > 100 ? '...' : ''}\n*Created: <t:${Math.floor(note.timestamp / 1000)}:R>*`,
                    inline: false
                });
            });

            await interaction.reply({ embeds: [embed], ephemeral: true });
            break;

        case 'edit':
            if (!title) {
                return interaction.reply({ content: '❌ Please provide the title of the note you want to edit.', ephemeral: true });
            }
            const noteToEdit = userData.notes.find(n => n.title.toLowerCase() === title.toLowerCase());
            if (!noteToEdit) {
                return interaction.reply({ content: '❌ Note not found.', ephemeral: true });
            }

            // Use modal for editing
            const editModal = new ModalBuilder()
                .setCustomId(`editNoteModal_${noteToEdit.id}`)
                .setTitle('Edit Note');

            const titleInput = new TextInputBuilder()
                .setCustomId('noteTitle')
                .setLabel('Note Title')
                .setStyle(TextInputStyle.Short)
                .setValue(noteToEdit.title)
                .setRequired(true);

            const contentInput = new TextInputBuilder()
                .setCustomId('noteContent')
                .setLabel('Note Content')
                .setStyle(TextInputStyle.Paragraph)
                .setValue(noteToEdit.content)
                .setRequired(false);

            const categorySelect = new StringSelectMenuBuilder()
                .setCustomId(`editNoteCategorySelect_${noteToEdit.id}`)
                .setPlaceholder('Select a category')
                .addOptions([
                    { label: 'Work', value: 'work', default: noteToEdit.category === 'work' },
                    { label: 'Study', value: 'study', default: noteToEdit.category === 'study' },
                    { label: 'Goals', value: 'goals', default: noteToEdit.category === 'goals' },
                    { label: 'Ideas', value: 'ideas', default: noteToEdit.category === 'ideas' },
                    { label: 'Tasks', value: 'tasks', default: noteToEdit.category === 'tasks' },
                    { label: 'Personal', value: 'personal', default: noteToEdit.category === 'personal' },
                ]);

            editModal.addComponents(new ActionRowBuilder().addComponents(titleInput));
            editModal.addComponents(new ActionRowBuilder().addComponents(contentInput));
            editModal.addComponents(new ActionRowBuilder().addComponents(categorySelect));

            await interaction.reply({ content: 'Opening modal to edit your note...', ephemeral: true });
            await interaction.showModal(editModal);
            break;

        case 'delete':
            if (!title) {
                return interaction.reply({ content: '❌ Please provide the title of the note you want to delete.', ephemeral: true });
            }
            const initialLength = userData.notes.length;
            userData.notes = userData.notes.filter(note => note.title.toLowerCase() !== title.toLowerCase());
            if (userData.notes.length === initialLength) {
                return interaction.reply({ content: '❌ Note not found.', ephemeral: true });
            }
            await interaction.reply({ content: `✅ Note "${title}" deleted successfully!`, ephemeral: true });
            break;

        case 'search':
            if (!title) {
                return interaction.reply({ content: '❌ Please provide a search query.', ephemeral: true });
            }
            const searchResults = userData.notes.filter(note =>
                note.title.toLowerCase().includes(title.toLowerCase()) ||
                (note.content && note.content.toLowerCase().includes(title.toLowerCase())) ||
                (note.category && note.category.toLowerCase() === title.toLowerCase())
            );

            if (searchResults.length === 0) {
                return interaction.reply({ content: '🔍 No notes found matching your search criteria.', ephemeral: true });
            }

            const searchEmbed = new EmbedBuilder()
                .setTitle(`🔍 Search Results for "${title}"`)
                .setColor(userData.profile.theme)
                .setTimestamp();

            searchResults.slice(0, 5).forEach(note => {
                searchEmbed.addFields({
                    name: `📝 ${note.title} (${note.category || 'Uncategorized'})`,
                    value: `${note.content.substring(0, 100)}${note.content.length > 100 ? '...' : ''}\n*Created: <t:${Math.floor(note.timestamp / 1000)}:R>*`,
                    inline: false
                });
            });

            if (searchResults.length > 5) {
                searchEmbed.setFooter({ text: `Showing first 5 of ${searchResults.length} results` });
            }

            await interaction.reply({ embeds: [searchEmbed], ephemeral: true });
            break;

        case 'export':
            if (userData.notes.length === 0) {
                return interaction.reply({ content: '📤 You have no notes to export.', ephemeral: true });
            }

            const notesContent = userData.notes.map(note =>
                `Title: ${note.title}\nCategory: ${note.category || 'Uncategorized'}\nContent: ${note.content}\nCreated: ${new Date(note.timestamp).toLocaleString()}\n---`
            ).join('\n');

            const attachment = new AttachmentBuilder(Buffer.from(notesContent, 'utf-8'), { name: `${interaction.user.username}_notes.txt` });
            await interaction.reply({ content: '📤 Here are your exported notes:', files: [attachment], ephemeral: true });
            break;
    }
    if (action !== 'edit' && action !== 'search') { // Avoid double incrementing for edit/search actions
        interaction.client.userData[key].profile.commandsUsed++;
    }
}


async function handleReminders(interaction) {
    const action = interaction.options.getString('action');
    const message = interaction.options.getString('message');
    const timeInput = interaction.options.getString('time');
    const repeat = interaction.options.getString('repeat');
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;
    const key = `${guildId}_${userId}`;

    const userData = interaction.client.userData[key];
    if (!userData.reminders) userData.reminders = [];

    switch (action) {
        case 'set':
            if (!message || !timeInput) {
                return interaction.reply({ content: '❌ Please provide both a reminder message and a time.', ephemeral: true });
            }

            let reminderTime;
            try {
                reminderTime = parseReminderTime(timeInput);
                if (isNaN(reminderTime)) throw new Error("Invalid time format");
            } catch (error) {
                return interaction.reply({ content: '❌ Invalid time format. Please use formats like "1h", "tomorrow 10:00", "2024-12-25 14:30".', ephemeral: true });
            }

            const reminderId = userData.reminders.length + 1;
            userData.reminders.push({
                id: reminderId,
                message: message,
                setTime: Date.now(),
                reminderTime: reminderTime,
                repeat: repeat || 'none',
                active: true,
                completed: false
            });

            await interaction.reply({
                content: `⏰ Reminder #${reminderId} set for <t:${Math.floor(reminderTime / 1000)}:R>: "${message}"`,
                ephemeral: true
            });
            break;

        case 'view':
            const activeReminders = userData.reminders.filter(r => r.active && !r.completed && r.reminderTime > Date.now());
            if (activeReminders.length === 0) {
                return interaction.reply({ content: '⏰ You have no active reminders.', ephemeral: true });
            }

            const embed = new EmbedBuilder()
                .setTitle('⏰ Your Active Reminders')
                .setColor(userData.profile.theme)
                .setTimestamp();

            activeReminders.forEach(r => {
                embed.addFields({
                    name: `⏰ Reminder #${r.id} (${r.repeat || 'No Repeat'})`,
                    value: `${r.message}\n*Due: <t:${Math.floor(r.reminderTime / 1000)}:R>*`,
                    inline: false
                });
            });

            await interaction.reply({ embeds: [embed], ephemeral: true });
            break;

        case 'complete':
            if (!message) {
                return interaction.reply({ content: '❌ Please provide the ID of the reminder to mark as complete.', ephemeral: true });
            }
            const reminderToComplete = userData.reminders.find(r => r.id === parseInt(message));
            if (!reminderToComplete) {
                return interaction.reply({ content: '❌ Reminder not found.', ephemeral: true });
            }
            if (reminderToComplete.completed) {
                return interaction.reply({ content: '✅ This reminder is already marked as complete.', ephemeral: true });
            }
            reminderToComplete.completed = true;
            reminderToComplete.active = false; // Deactivate after completion
            await interaction.reply({ content: `✅ Reminder #${message} marked as complete!`, ephemeral: true });
            break;

        case 'delete':
            if (!message) {
                return interaction.reply({ content: '❌ Please provide the ID of the reminder to delete.', ephemeral: true });
            }
            const initialLength = userData.reminders.length;
            userData.reminders = userData.reminders.filter(r => r.id !== parseInt(message));
            if (userData.reminders.length === initialLength) {
                return interaction.reply({ content: '❌ Reminder not found.', ephemeral: true });
            }
            await interaction.reply({ content: `✅ Reminder #${message} deleted!`, ephemeral: true });
            break;

        case 'snooze':
            if (!message) {
                return interaction.reply({ content: '❌ Please provide the ID of the reminder to snooze.', ephemeral: true });
            }
            const reminderToSnooze = userData.reminders.find(r => r.id === parseInt(message));
            if (!reminderToSnooze) {
                return interaction.reply({ content: '❌ Reminder not found.', ephemeral: true });
            }
            if (!reminderToSnooze.active) {
                return interaction.reply({ content: '❌ This reminder is not active.', ephemeral: true });
            }

            const snoozeTime = Date.now() + (5 * 60 * 1000); // Snooze for 5 minutes
            reminderToSnooze.reminderTime = snoozeTime;
            await interaction.reply({
                content: `⏰ Reminder #${message} snoozed for <t:${Math.floor(snoozeTime / 1000)}:R>`,
                ephemeral: true
            });
            break;
    }
    if (action !== 'view') { // Avoid double incrementing for view action
        interaction.client.userData[key].profile.commandsUsed++;
    }
}

async function handleTasks(interaction) {
    const action = interaction.options.getString('action');
    const taskContent = interaction.options.getString('task');
    const priority = interaction.options.getString('priority');
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;
    const key = `${guildId}_${userId}`;

    const userData = interaction.client.userData[key];
    if (!userData.tasks) userData.tasks = [];

    switch (action) {
        case 'add':
            if (!taskContent) {
                return interaction.reply({ content: '❌ Please provide a task description.', ephemeral: true });
            }
            const taskId = userData.tasks.length + 1;
            userData.tasks.push({
                id: taskId,
                content: taskContent,
                priority: priority || 'medium',
                completed: false,
                createdAt: Date.now(),
                completedAt: null
            });
            await interaction.reply({ content: `✅ Task #${taskId} added: "${taskContent}"`, ephemeral: true });
            break;

        case 'view':
            const activeTasks = userData.tasks.filter(t => !t.completed);
            if (activeTasks.length === 0) {
                return interaction.reply({ content: '📋 You have no active tasks. Add some to get started!', ephemeral: true });
            }

            const embed = new EmbedBuilder()
                .setTitle('📋 Your Tasks')
                .setColor(userData.profile.theme)
                .setTimestamp();

            // Sort tasks by priority (high, medium, low)
            activeTasks.sort((a, b) => {
                const priorityOrder = { 'high': 1, 'medium': 2, 'low': 3 };
                return priorityOrder[a.priority] - priorityOrder[b.priority];
            });

            activeTasks.slice(-10).forEach(task => {
                const priorityMap = { 'high': '🔴', 'medium': '🟡', 'low': '🟢' };
                embed.addFields({
                    name: `✅ Task #${task.id} (${priorityMap[task.priority]})`,
                    value: `${task.content}\n*Added: <t:${Math.floor(task.createdAt / 1000)}:R>*`,
                    inline: false
                });
            });

            embed.setFooter({ text: `${activeTasks.length} active tasks` });
            await interaction.reply({ embeds: [embed], ephemeral: true });
            break;

        case 'complete':
            if (!taskContent) {
                return interaction.reply({ content: '❌ Please provide the ID of the task to complete.', ephemeral: true });
            }
            const taskToComplete = userData.tasks.find(t => t.id === parseInt(taskContent));
            if (!taskToComplete) {
                return interaction.reply({ content: '❌ Task not found.', ephemeral: true });
            }
            if (taskToComplete.completed) {
                return interaction.reply({ content: '✅ This task is already completed!', ephemeral: true });
            }
            taskToComplete.completed = true;
            taskToComplete.completedAt = Date.now();
            userData.tasks.push({ // Move completed task to a separate list or just mark it
                id: taskToComplete.id,
                content: taskToComplete.content,
                priority: taskToComplete.priority,
                completed: true,
                createdAt: taskToComplete.createdAt,
                completedAt: taskToComplete.completedAt
            });
            // Remove from active tasks if you have a separate completed list
            userData.tasks = userData.tasks.filter(t => t.id !== parseInt(taskContent) || !t.completed);

            await interaction.reply({ content: `🎉 Congratulations! Task #${taskContent} completed: "${taskToComplete.content}"`, ephemeral: true });
            break;

        case 'delete':
            if (!taskContent) {
                return interaction.reply({ content: '❌ Please provide the ID of the task to delete.', ephemeral: true });
            }
            const initialTaskLength = userData.tasks.length;
            userData.tasks = userData.tasks.filter(t => t.id !== parseInt(taskContent));
            if (userData.tasks.length === initialTaskLength) {
                return interaction.reply({ content: '❌ Task not found.', ephemeral: true });
            }
            await interaction.reply({ content: `✅ Task #${taskContent} deleted!`, ephemeral: true });
            break;

        case 'analytics':
            const completedTasks = userData.tasks.filter(t => t.completed);
            const incompleteTasks = userData.tasks.filter(t => !t.completed);
            const highPriorityTasks = userData.tasks.filter(t => t.priority === 'high').length;
            const mediumPriorityTasks = userData.tasks.filter(t => t.priority === 'medium').length;
            const lowPriorityTasks = userData.tasks.filter(t => t.priority === 'low').length;

            const analyticsEmbed = new EmbedBuilder()
                .setTitle('📊 Task Analytics')
                .setColor(userData.profile.theme)
                .addFields(
                    { name: 'Total Tasks', value: userData.tasks.length.toString(), inline: true },
                    { name: 'Completed Tasks', value: completedTasks.length.toString(), inline: true },
                    { name: 'Incomplete Tasks', value: incompleteTasks.length.toString(), inline: true },
                    { name: 'High Priority', value: highPriorityTasks.toString(), inline: true },
                    { name: 'Medium Priority', value: mediumPriorityTasks.toString(), inline: true },
                    { name: 'Low Priority', value: lowPriorityTasks.toString(), inline: true }
                )
                .setTimestamp();
            await interaction.reply({ embeds: [analyticsEmbed], ephemeral: true });
            break;

        case 'achievements':
            // Placeholder for achievements
            await interaction.reply({ content: '🏆 Task achievements are coming soon!', ephemeral: true });
            break;
    }
    if (action !== 'view' && action !== 'analytics') { // Avoid double incrementing for view/analytics
        interaction.client.userData[key].profile.commandsUsed++;
    }
}

async function handleData(interaction) {
    const action = interaction.options.getString('action');
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;
    const key = `${guildId}_${userId}`;
    const userData = interaction.client.userData[key];

    switch (action) {
        case 'summary':
            const embed = new EmbedBuilder()
                .setTitle('📊 Data Summary')
                .setColor(userData.profile.theme)
                .addFields(
                    { name: 'Notes Count', value: (userData.notes || []).length.toString(), inline: true },
                    { name: 'Reminders Count', value: userData.reminders.filter(r => r.active).length.toString(), inline: true },
                    { name: 'Tasks Count', value: userData.tasks.filter(t => !t.completed).length.toString(), inline: true },
                    { name: 'Goals Count', value: (userData.goals || []).length.toString(), inline: true },
                    { name: 'Quotes Count', value: (userData.quotes || []).length.toString(), inline: true },
                    { name: 'Mood History Entries', value: (userData.moodHistory || []).length.toString(), inline: true }
                )
                .setTimestamp();
            await interaction.reply({ embeds: [embed], ephemeral: true });
            break;

        case 'export':
            const allData = JSON.stringify(userData, null, 2);
            const attachment = new AttachmentBuilder(Buffer.from(allData, 'utf-8'), { name: `${interaction.user.username}_data.json` });
            await interaction.reply({ content: '📤 Here is your data export:', files: [attachment], ephemeral: true });
            break;

        case 'delete':
            // Confirm deletion
            const confirmRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('confirmDataDelete')
                        .setLabel('Confirm Delete')
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId('cancelDataDelete')
                        .setLabel('Cancel')
                        .setStyle(ButtonStyle.Secondary)
                );
            await interaction.reply({
                content: 'Are you sure you want to delete ALL your personal data? This action cannot be undone.',
                components: [confirmRow],
                ephemeral: true
            });
            break;

        case 'privacy':
            // Placeholder for privacy settings
            await interaction.reply({ content: '🔒 Privacy settings management is coming soon!', ephemeral: true });
            break;

        case 'usage':
            // Placeholder for usage report
            await interaction.reply({ content: '📋 Data usage report is coming soon!', ephemeral: true });
            break;
    }
    interaction.client.userData[key].profile.commandsUsed++;
}

async function handleDashboard(interaction) {
    const view = interaction.options.getString('view');
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;
    const key = `${guildId}_${userId}`;
    const userData = interaction.client.userData[key];

    let embed = new EmbedBuilder()
        .setColor(userData.profile.theme)
        .setTimestamp();

    switch (view) {
        case 'overview':
            embed.setTitle('📊 Productivity Dashboard - Overview');
            embed.addFields(
                { name: 'Active Tasks', value: userData.tasks.filter(t => !t.completed).length.toString(), inline: true },
                { name: 'Pending Reminders', value: userData.reminders.filter(r => r.active && !r.completed).length.toString(), inline: true },
                { name: 'Active Goals', value: userData.goals.filter(g => !g.completed).length.toString(), inline: true },
                { name: 'Notes Count', value: (userData.notes || []).length.toString(), inline: true }
            );
            break;
        case 'analytics':
            const completedTasks = userData.tasks.filter(t => t.completed).length;
            const incompleteTasks = userData.tasks.filter(t => !t.completed).length;
            embed.setTitle('📊 Productivity Dashboard - Analytics');
            embed.addFields(
                { name: 'Total Tasks', value: userData.tasks.length.toString(), inline: true },
                { name: 'Completed Tasks', value: completedTasks.toString(), inline: true },
                { name: 'Incomplete Tasks', value: incompleteTasks.toString(), inline: true }
            );
            break;
        case 'goals':
            const activeGoals = userData.goals.filter(g => !g.completed);
            const completedGoals = userData.goals.filter(g => g.completed);
            embed.setTitle('📊 Productivity Dashboard - Goals Progress');
            embed.addFields(
                { name: 'Active Goals', value: activeGoals.length.toString(), inline: true },
                { name: 'Completed Goals', value: completedGoals.length.toString(), inline: true }
            );
            if (activeGoals.length > 0) {
                const nextGoal = activeGoals[0]; // Assuming sorted or just showing the first one
                embed.setDescription(`Next Goal: **${nextGoal.content}**\n*Set: <t:${Math.floor(nextGoal.createdAt / 1000)}:R>*`);
            }
            break;
        case 'schedule':
            // Display upcoming reminders and tasks
            const upcomingReminders = userData.reminders
                .filter(r => r.active && !r.completed && r.reminderTime > Date.now())
                .sort((a, b) => a.reminderTime - b.reminderTime)
                .slice(0, 3);
            const upcomingTasks = userData.tasks
                .filter(t => !t.completed)
                .sort((a, b) => a.createdAt - b.createdAt) // Simple sort by creation date
                .slice(0, 3);

            embed.setTitle('📊 Productivity Dashboard - Schedule');
            let scheduleDesc = '';
            if (upcomingReminders.length > 0) {
                scheduleDesc += '**Upcoming Reminders:**\n';
                upcomingReminders.forEach(r => scheduleDesc += `- ${r.message} (<t:${Math.floor(r.reminderTime / 1000)}:R>)\n`);
            }
            if (upcomingTasks.length > 0) {
                scheduleDesc += '\n**Upcoming Tasks:**\n';
                upcomingTasks.forEach(t => scheduleDesc += `- ${t.content} (${t.priority})\n`);
            }
            embed.setDescription(scheduleDesc || 'No upcoming events.');
            break;
        case 'achievements':
            embed.setTitle('📊 Productivity Dashboard - Achievements');
            embed.setDescription('Your productivity achievements will appear here!');
            break;
        default:
            embed.setTitle('📊 Productivity Dashboard');
            embed.setDescription('Select a view to see your productivity data.');
            break;
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
    interaction.client.userData[key].profile.commandsUsed++;
}

async function handleTitles(interaction) {
    const action = interaction.options.getString('action');
    const titleName = interaction.options.getString('title');
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;
    const key = `${guildId}_${userId}`;
    const userData = interaction.client.userData[key];

    if (!userData.titles) {
        userData.titles = {
            earned: [],
            equipped: null
        };
    }

    switch (action) {
        case 'view':
            const embed = new EmbedBuilder()
                .setTitle(`🏆 ${interaction.user.username}'s Titles`)
                .setColor(userData.profile.theme)
                .setTimestamp();

            if (userData.titles.earned.length === 0) {
                embed.setDescription('You haven\'t earned any titles yet!');
            } else {
                embed.addFields({ name: '🏆 Equipped Title', value: userData.titles.equipped || 'None', inline: true });
                embed.addFields({ name: '✨ Earned Titles', value: userData.titles.earned.join(', ') || 'None', inline: true });
            }

            await interaction.reply({ embeds: [embed], ephemeral: true });
            break;

        case 'equip':
            if (!titleName) {
                return interaction.reply({ content: '❌ Please specify the title you want to equip.', ephemeral: true });
            }
            if (!userData.titles.earned.includes(titleName)) {
                return interaction.reply({ content: '❌ You have not earned this title yet.', ephemeral: true });
            }
            userData.titles.equipped = titleName;
            await interaction.reply({ content: `🏆 You have equipped the title: **${titleName}**`, ephemeral: true });
            break;

        case 'unequip':
            if (userData.titles.equipped) {
                userData.titles.equipped = null;
                await interaction.reply({ content: '✅ You have unequipped your current title.', ephemeral: true });
            } else {
                await interaction.reply({ content: 'You do not have any title equipped.', ephemeral: true });
            }
            break;

        case 'earn': // This would typically be awarded by other commands or events
            if (!titleName) {
                return interaction.reply({ content: '❌ Please specify the title you want to earn.', ephemeral: true });
            }
            if (userData.titles.earned.includes(titleName)) {
                return interaction.reply({ content: 'You already have this title.', ephemeral: true });
            }
            userData.titles.earned.push(titleName);
            await interaction.reply({ content: `🎉 You have earned the title: **${titleName}**! You can now equip it using /personal profile titles equip.`, ephemeral: true });
            break;

        case 'list': // Lists available titles (hypothetical, as titles are not defined elsewhere)
            await interaction.reply({ content: 'Available titles: "First Timer", "Active User", "Power User", "Notes Master", "Reminder Pro"', ephemeral: true });
            break;
    }
    interaction.client.userData[key].profile.commandsUsed++;
}


// --- Old Handlers (kept for backward compatibility or reference, but should ideally be integrated into new ones) ---

async function handleTimezone(interaction) {
    const timezone = interaction.options.getString('timezone');
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;
    const key = `${guildId}_${userId}`;

    // Basic timezone validation
    try {
        new Date().toLocaleString('en-US', { timeZone: timezone });
        interaction.client.userData[key].timezone = timezone;

        const currentTime = new Date().toLocaleString('en-US', { timeZone: timezone });

        await interaction.reply({
            content: `✅ Timezone set to ${timezone}\nYour current time: ${currentTime}`,
            ephemeral: true
        });
    } catch (error) {
        await interaction.reply({
            content: '❌ Invalid timezone. Please use a valid timezone like "America/New_York" or "Europe/London"',
            ephemeral: true
        });
    }
    interaction.client.userData[key].profile.commandsUsed++;
}

async function handleBirthday(interaction) {
    const date = interaction.options.getString('date');
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;
    const key = `${guildId}_${userId}`;

    // Validate date format MM-DD
    const dateRegex = /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
    if (!dateRegex.test(date)) {
        return interaction.reply({
            content: '❌ Invalid date format. Please use MM-DD format (e.g., 03-15)',
            ephemeral: true
        });
    }

    interaction.client.userData[key].birthday = date;
    interaction.client.userData[key].profile.commandsUsed++;

    await interaction.reply({
        content: `🎂 Birthday set to ${date}! You'll receive birthday wishes on your special day.`,
        ephemeral: true
    });
}

async function handleStats(interaction) {
    // This handler is largely replaced by the 'profile stats' subcommand.
    // Keeping it for now, but it might be redundant.
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;
    const key = `${guildId}_${userId}`;

    const userData = interaction.client.userData[key];
    const member = interaction.guild.members.cache.get(userId);
    const joinedAt = member ? member.joinedAt : new Date(userData.joinDate);
    const daysSinceJoin = Math.floor((Date.now() - joinedAt.getTime()) / (1000 * 60 * 60 * 24));

    const embed = new EmbedBuilder()
        .setTitle(`📊 ${interaction.user.username}'s Server Stats`)
        .addFields(
            { name: '📅 Days in Server', value: daysSinceJoin.toString(), inline: true },
            { name: '💬 Messages Sent', value: userData.messageCount.toString(), inline: true }, // Old stats property
            { name: '⚡ Commands Used', value: userData.commandsUsed.toString(), inline: true }, // Old stats property
            { name: '📝 Notes Saved', value: (userData.notes || []).length.toString(), inline: true },
            { name: '💭 Quotes Saved', value: (userData.quotes || []).length.toString(), inline: true },
            { name: '🎯 Goals Set', value: (userData.goals || []).length.toString(), inline: true },
            { name: '🏆 Server Rank', value: 'Coming Soon', inline: true },
            { name: '⭐ Activity Score', value: Math.floor((userData.messageCount * 2 + userData.commandsUsed * 5) / Math.max(daysSinceJoin, 1)).toString(), inline: true }
        )
        .setColor(userData.color) // Old color property
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
        .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleMood(interaction) {
    const mood = interaction.options.getString('mood');
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;
    const key = `${guildId}_${userId}`;

    const userData = interaction.client.userData[key];

    if (!mood) {
        // Show current mood and mood history
        const embed = new EmbedBuilder()
            .setTitle(`${interaction.user.username}'s Mood Tracker`)
            .setColor(userData.color) // Old color property
            .setTimestamp();

        if (userData.mood) {
            const moodEmojis = {
                'happy': '😊', 'sad': '😢', 'tired': '😴', 'cool': '😎',
                'thinking': '🤔', 'angry': '😡', 'excited': '😍', 'grateful': '🤗'
            };
            embed.addFields({ name: 'Current Mood', value: `${moodEmojis[userData.mood]} ${userData.mood.charAt(0).toUpperCase() + userData.mood.slice(1)}`, inline: false });
        } else {
            embed.addFields({ name: 'Current Mood', value: 'Not set', inline: false });
        }

        if (userData.moodHistory && userData.moodHistory.length > 0) {
            const recentMoods = userData.moodHistory.slice(-5).map(entry =>
                `${entry.emoji} ${entry.mood} - <t:${Math.floor(entry.timestamp / 1000)}:R>`
            ).join('\n');
            embed.addFields({ name: 'Recent Moods', value: recentMoods, inline: false });
        }

        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
    }

    const moodEmojis = {
        'happy': '😊', 'sad': '😢', 'tired': '😴', 'cool': '😎',
        'thinking': '🤔', 'angry': '😡', 'excited': '😍', 'grateful': '🤗'
    };

    userData.mood = mood;
    if (!userData.moodHistory) userData.moodHistory = [];
    userData.moodHistory.push({
        mood: mood,
        emoji: moodEmojis[mood],
        timestamp: Date.now()
    });

    // Keep only last 20 mood entries
    if (userData.moodHistory.length > 20) {
        userData.moodHistory = userData.moodHistory.slice(-20);
    }

    await interaction.reply({
        content: `${moodEmojis[mood]} Your mood has been set to **${mood.charAt(0).toUpperCase() + mood.slice(1)}**!`,
        ephemeral: true
    });
    interaction.client.userData[key].profile.commandsUsed++;
}

async function handleQuotes(interaction) {
    const action = interaction.options.getString('action');
    const quoteContent = interaction.options.getString('quote'); // Renamed from 'quote' to 'quoteContent' to avoid confusion
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;
    const key = `${guildId}_${userId}`;

    const userData = interaction.client.userData[key];
    if (!userData.quotes) userData.quotes = [];

    switch (action) {
        case 'add':
            if (!quoteContent) {
                return interaction.reply({ content: '❌ Please provide a quote to add.', ephemeral: true });
            }
            const quoteId = userData.quotes.length + 1;
            userData.quotes.push({
                id: quoteId,
                content: quoteContent,
                timestamp: Date.now()
            });
            await interaction.reply({ content: `✅ Quote #${quoteId} added to your collection!`, ephemeral: true });
            break;

        case 'random':
            if (userData.quotes.length === 0) {
                return interaction.reply({ content: '💭 You have no quotes saved. Add some first!', ephemeral: true });
            }
            const randomQuote = userData.quotes[Math.floor(Math.random() * userData.quotes.length)];
            const embed = new EmbedBuilder()
                .setTitle('💭 Your Random Quote')
                .setDescription(`"${randomQuote.content}"`)
                .setFooter({ text: `Quote #${randomQuote.id} • Added ${new Date(randomQuote.timestamp).toLocaleDateString()}` })
                .setColor(userData.color); // Old color property
            await interaction.reply({ embeds: [embed], ephemeral: true });
            break;

        case 'daily':
            if (userData.quotes.length === 0) {
                return interaction.reply({ content: '💭 You have no quotes saved. Add some first!', ephemeral: true });
            }
            // Use date as seed for consistent daily quote
            const today = new Date().toDateString();
            const seed = today.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a }, 0);
            const dailyQuote = userData.quotes[Math.abs(seed) % userData.quotes.length];
            const dailyEmbed = new EmbedBuilder()
                .setTitle('🌅 Your Daily Quote')
                .setDescription(`"${dailyQuote.content}"`)
                .setFooter({ text: `Quote #${dailyQuote.id} • Today's inspiration` })
                .setColor(userData.color); // Old color property
            await interaction.reply({ embeds: [dailyEmbed], ephemeral: true });
            break;

        case 'view':
            if (userData.quotes.length === 0) {
                return interaction.reply({ content: '💭 You have no quotes saved.', ephemeral: true });
            }
            const viewEmbed = new EmbedBuilder()
                .setTitle('💭 Your Quote Collection')
                .setColor(userData.color) // Old color property
                .setTimestamp();

            userData.quotes.slice(-10).forEach(q => {
                viewEmbed.addFields({
                    name: `Quote #${q.id}`,
                    value: `"${q.content}"\n*Added: <t:${Math.floor(q.timestamp / 1000)}:R>*`,
                    inline: false
                });
            });

            if (userData.quotes.length > 10) {
                viewEmbed.setFooter({ text: `Showing last 10 of ${userData.quotes.length} quotes` });
            }

            await interaction.reply({ embeds: [viewEmbed], ephemeral: true });
            break;

        case 'delete':
            if (!quoteContent) {
                return interaction.reply({ content: '❌ Please provide the quote ID to delete.', ephemeral: true });
            }
            const quoteIndex = userData.quotes.findIndex(q => q.id === parseInt(quoteContent));
            if (quoteIndex === -1) {
                return interaction.reply({ content: '❌ Quote not found.', ephemeral: true });
            }
            userData.quotes.splice(quoteIndex, 1);
            await interaction.reply({ content: `✅ Quote #${quoteContent} deleted!`, ephemeral: true });
            break;
    }
    interaction.client.userData[key].profile.commandsUsed++;
}

async function handleGoals(interaction) {
    const action = interaction.options.getString('action');
    const content = interaction.options.getString('content');
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;
    const key = `${guildId}_${userId}`;

    const userData = interaction.client.userData[key];
    if (!userData.goals) userData.goals = [];

    switch (action) {
        case 'add':
            if (!content) {
                return interaction.reply({ content: '❌ Please provide a goal to add.', ephemeral: true });
            }
            const goalId = userData.goals.length + 1;
            userData.goals.push({
                id: goalId,
                content: content,
                completed: false,
                timestamp: Date.now(),
                completedAt: null
            });
            await interaction.reply({ content: `🎯 Goal #${goalId} added: "${content}"`, ephemeral: true });
            break;

        case 'complete':
            if (!content) {
                return interaction.reply({ content: '❌ Please provide the goal ID to complete.', ephemeral: true });
            }
            const goal = userData.goals.find(g => g.id === parseInt(content));
            if (!goal) {
                return interaction.reply({ content: '❌ Goal not found.', ephemeral: true });
            }
            if (goal.completed) {
                return interaction.reply({ content: '✅ This goal is already completed!', ephemeral: true });
            }
            goal.completed = true;
            goal.completedAt = Date.now();
            await interaction.reply({ content: `🎉 Congratulations! Goal #${content} completed: "${goal.content}"`, ephemeral: true });
            break;

        case 'view':
            if (userData.goals.length === 0) {
                return interaction.reply({ content: '🎯 You have no goals set. Set some goals to track your progress!', ephemeral: true });
            }

            const activeGoals = userData.goals.filter(g => !g.completed);
            const completedGoals = userData.goals.filter(g => g.completed);

            const embed = new EmbedBuilder()
                .setTitle('🎯 Your Goals')
                .setColor(userData.color) // Old color property
                .setTimestamp();

            if (activeGoals.length > 0) {
                const activeText = activeGoals.slice(-5).map(g =>
                    `**#${g.id}** ${g.content}\n*Set: <t:${Math.floor(g.timestamp / 1000)}:R>*`
                ).join('\n\n');
                embed.addFields({ name: '📋 Active Goals', value: activeText, inline: false });
            }

            if (completedGoals.length > 0) {
                const completedText = completedGoals.slice(-3).map(g =>
                    `**#${g.id}** ${g.content}\n*Completed: <t:${Math.floor(g.completedAt / 1000)}:R>*`
                ).join('\n\n');
                embed.addFields({ name: '✅ Recently Completed', value: completedText, inline: false });
            }

            embed.setFooter({ text: `${activeGoals.length} active • ${completedGoals.length} completed` });
            await interaction.reply({ embeds: [embed], ephemeral: true });
            break;

        case 'delete':
            if (!content) {
                return interaction.reply({ content: '❌ Please provide the goal ID to delete.', ephemeral: true });
            }
            const goalIndex = userData.goals.findIndex(g => g.id === parseInt(content));
            if (goalIndex === -1) {
                return interaction.reply({ content: '❌ Goal not found.', ephemeral: true });
            }
            userData.goals.splice(goalIndex, 1);
            await interaction.reply({ content: `✅ Goal #${content} deleted!`, ephemeral: true });
            break;
    }
    interaction.client.userData[key].profile.commandsUsed++;
}

// Helper function to parse reminder times
function parseReminderTime(timeStr) {
    // Check for specific keywords first
    if (timeStr.toLowerCase() === 'tomorrow') {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(now.getDate() + 1);
        tomorrow.setHours(9, 0, 0, 0); // Default to 9 AM tomorrow
        return tomorrow.getTime();
    }
    if (timeStr.toLowerCase().includes('tomorrow')) {
        const parts = timeStr.split(' ');
        const datePart = parts[0]; // "tomorrow"
        const timePart = parts[1]; // "HH:MM"
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(now.getDate() + 1);

        if (timePart) {
            const timeParts = timePart.split(':');
            if (timeParts.length === 2) {
                tomorrow.setHours(parseInt(timeParts[0]), parseInt(timeParts[1]), 0, 0);
                return tomorrow.getTime();
            }
        } else {
            tomorrow.setHours(9, 0, 0, 0); // Default to 9 AM if no time specified
            return tomorrow.getTime();
        }
    }

    // Try parsing as a date string (e.g., "2024-12-25", "2024-12-25 14:30")
    const dateFormats = [
        'yyyy-MM-dd HH:mm',
        'yyyy-MM-dd',
        'MM-dd HH:mm',
        'MM-dd',
        'dd-MM-yyyy HH:mm',
        'dd-MM-yyyy',
        'dd/MM/yyyy HH:mm',
        'dd/MM/yyyy',
    ];

    let parsedDate = null;
    for (const format of dateFormats) {
        try {
            const moment = require('moment-timezone'); // Assuming moment-timezone is available
            const date = moment.tz(timeStr, format, true, Intl.DateTimeFormat().resolvedOptions().timeZone).toDate();
            if (!isNaN(date.getTime())) {
                // Check if the date is in the past, if so, assume it's for next year if day/month match
                if (date.getTime() < Date.now()) {
                    const tempDate = new Date(date);
                    tempDate.setFullYear(tempDate.getFullYear() + 1);
                    if (tempDate.getTime() > Date.now()) {
                        parsedDate = tempDate;
                        break;
                    }
                } else {
                    parsedDate = date;
                    break;
                }
            }
        } catch (e) {
            // Ignore invalid formats
        }
    }

    if (parsedDate) {
        return parsedDate.getTime();
    }


    // Parse relative times like "1h", "30m", "2d"
    const regex = /^(\d+)([smhd])$/i;
    const match = timeStr.match(regex);

    if (match) {
        const value = parseInt(match[1]);
        const unit = match[2].toLowerCase();

        switch (unit) {
            case 's': return Date.now() + value * 1000;
            case 'm': return Date.now() + value * 60 * 1000;
            case 'h': return Date.now() + value * 60 * 60 * 1000;
            case 'd': return Date.now() + value * 24 * 60 * 60 * 1000;
            default: return NaN; // Indicate invalid unit
        }
    }

    return NaN; // Indicate invalid format
}

async function handleStatus(interaction) {
    const status = interaction.options.getString('status');
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;
    const key = `${guildId}_${userId}`;

    const userData = interaction.client.userData[key];

    if (!status) {
        // Clear status
        userData.status = null;
        await interaction.reply({ content: '✅ Your personal status has been cleared.', ephemeral: true });
        return;
    }

    userData.status = status;
    await interaction.reply({
        content: `✅ Your personal status has been set to: "${status}"`,
        ephemeral: true
    });
    interaction.client.userData[key].profile.commandsUsed++;
}

async function handleAvatar(interaction) {
    const format = interaction.options.getString('format') || 'png';
    const size = interaction.options.getInteger('size') || 512;

    const avatarUrl = interaction.user.displayAvatarURL({
        extension: format,
        size: size,
        dynamic: true
    });

    const embed = new EmbedBuilder()
        .setTitle(`${interaction.user.username}'s Avatar`)
        .setImage(avatarUrl)
        .addFields(
            { name: 'Format', value: format.toUpperCase(), inline: true },
            { name: 'Size', value: `${size}x${size}`, inline: true }
        )
        .setColor('#0099FF')
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
    interaction.client.userData[interaction.user.id].profile.commandsUsed++;
}


// --- Modal Submit Handlers ---
// These would typically be in a separate file or managed by an event listener
// For simplicity, they are included here. You'll need to register these handlers.

// async function handleEditProfileModalSubmit(interaction) {
//     const userId = interaction.user.id;
//     const guildId = interaction.guild.id;
//     const key = `${guildId}_${userId}`;
//     const userData = interaction.client.userData[key];

//     const bio = interaction.fields.getTextInputValue('bio');
//     const timezone = interaction.fields.getTextInputValue('timezone');
//     const birthday = interaction.fields.getTextInputValue('birthday');

//     if (bio) userData.bio = bio;
//     if (timezone) {
//         try {
//             new Date().toLocaleString('en-US', { timeZone: timezone });
//             userData.timezone = timezone;
//         } catch (error) {
//             await interaction.reply({ content: '❌ Invalid timezone provided. Your timezone was not updated.', ephemeral: true });
//         }
//     }
//     if (birthday) {
//         const dateRegex = /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
//         if (dateRegex.test(birthday)) {
//             userData.birthday = birthday;
//         } else {
//             await interaction.reply({ content: '❌ Invalid birthday format. Your birthday was not updated.', ephemeral: true });
//         }
//     }

//     await interaction.reply({ content: '✅ Your profile has been updated!', ephemeral: true });
// }

// async function handleThemeModalSubmit(interaction) {
//     const userId = interaction.user.id;
//     const guildId = interaction.guild.id;
//     const key = `${guildId}_${userId}`;
//     const userData = interaction.client.userData[key];

//     const color = interaction.fields.getTextInputValue('color');
//     const hexRegex = /^#[0-9A-F]{6}$/i;

//     if (hexRegex.test(color)) {
//         userData.profile.theme = color;
//         await interaction.reply({ content: `🎨 Your theme color has been updated to ${color}!`, ephemeral: true });
//     } else {
//         await interaction.reply({ content: '❌ Invalid color format. Please use hex format like #FF0000.', ephemeral: true });
//     }
// }