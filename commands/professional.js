
const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('professional')
        .setDescription('Professional productivity tools for teams!')
        .addSubcommand(subcommand =>
            subcommand
                .setName('meeting')
                .setDescription('Schedule and manage meetings')
                .addStringOption(option =>
                    option.setName('action')
                        .setDescription('Meeting action')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Schedule Meeting', value: 'schedule' },
                            { name: 'View Meetings', value: 'view' },
                            { name: 'Join Meeting', value: 'join' },
                            { name: 'Cancel Meeting', value: 'cancel' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('task')
                .setDescription('Assign and manage tasks')
                .addStringOption(option =>
                    option.setName('action')
                        .setDescription('Task action')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Create Task', value: 'create' },
                            { name: 'View Tasks', value: 'view' },
                            { name: 'Complete Task', value: 'complete' },
                            { name: 'My Tasks', value: 'my' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('project')
                .setDescription('Manage projects and milestones')
                .addStringOption(option =>
                    option.setName('action')
                        .setDescription('Project action')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Create Project', value: 'create' },
                            { name: 'View Projects', value: 'view' },
                            { name: 'Update Progress', value: 'update' },
                            { name: 'Project Stats', value: 'stats' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('time')
                .setDescription('Track work time and productivity')
                .addStringOption(option =>
                    option.setName('action')
                        .setDescription('Time tracking action')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Start Timer', value: 'start' },
                            { name: 'Stop Timer', value: 'stop' },
                            { name: 'View Stats', value: 'stats' },
                            { name: 'Leaderboard', value: 'leaderboard' }
                        ))),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const action = interaction.options.getString('action');

        try {
            switch (subcommand) {
                case 'meeting':
                    await handleMeetingCommand(interaction, action);
                    break;
                case 'task':
                    await handleTaskCommand(interaction, action);
                    break;
                case 'project':
                    await handleProjectCommand(interaction, action);
                    break;
                case 'time':
                    await handleTimeCommand(interaction, action);
                    break;
            }
        } catch (error) {
            console.error('❌ Error in professional command:', error);

            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ **Error**: Professional tools temporarily unavailable.',
                    flags: 64
                });
            }
        }
    }
};

async function handleMeetingCommand(interaction, action) {
    const { 
        scheduleMeeting, 
        getUserMeetings, 
        joinMeeting, 
        cancelMeeting 
    } = require('../components/professionalHandler');

    switch (action) {
        case 'schedule':
            await showScheduleMeetingModal(interaction);
            break;
        case 'view':
            await showUserMeetings(interaction);
            break;
        case 'join':
            await showJoinMeetingOptions(interaction);
            break;
        case 'cancel':
            await showCancelMeetingOptions(interaction);
            break;
    }
}

async function handleTaskCommand(interaction, action) {
    const { 
        createTask, 
        getUserTasks, 
        completeTask, 
        getMyTasks 
    } = require('../components/professionalHandler');

    switch (action) {
        case 'create':
            await showCreateTaskModal(interaction);
            break;
        case 'view':
            await showAllTasks(interaction);
            break;
        case 'complete':
            await showCompleteTaskOptions(interaction);
            break;
        case 'my':
            await showMyTasks(interaction);
            break;
    }
}

async function handleProjectCommand(interaction, action) {
    const { 
        createProject, 
        getProjects, 
        updateProjectProgress, 
        getProjectStats 
    } = require('../components/professionalHandler');

    switch (action) {
        case 'create':
            await showCreateProjectModal(interaction);
            break;
        case 'view':
            await showAllProjects(interaction);
            break;
        case 'update':
            await showUpdateProgressOptions(interaction);
            break;
        case 'stats':
            await showProjectStats(interaction);
            break;
    }
}

async function handleTimeCommand(interaction, action) {
    const { 
        startTimer, 
        stopTimer, 
        getTimeStats, 
        getTimeLeaderboard 
    } = require('../components/professionalHandler');

    switch (action) {
        case 'start':
            await handleStartTimer(interaction);
            break;
        case 'stop':
            await handleStopTimer(interaction);
            break;
        case 'stats':
            await showTimeStats(interaction);
            break;
        case 'leaderboard':
            await showTimeLeaderboard(interaction);
            break;
    }
}

async function showScheduleMeetingModal(interaction) {
    const modal = new ModalBuilder()
        .setCustomId('schedule_meeting_modal')
        .setTitle('📅 Schedule Meeting');

    const titleInput = new TextInputBuilder()
        .setCustomId('meeting_title')
        .setLabel('Meeting Title')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(100);

    const descriptionInput = new TextInputBuilder()
        .setCustomId('meeting_description')
        .setLabel('Description')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false)
        .setMaxLength(500);

    const dateTimeInput = new TextInputBuilder()
        .setCustomId('meeting_datetime')
        .setLabel('Date & Time (YYYY-MM-DD HH:MM)')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setPlaceholder('2024-12-25 14:30');

    const durationInput = new TextInputBuilder()
        .setCustomId('meeting_duration')
        .setLabel('Duration (minutes)')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setPlaceholder('60');

    const participantsInput = new TextInputBuilder()
        .setCustomId('meeting_participants')
        .setLabel('Participants (@mention users)')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false)
        .setPlaceholder('@user1 @user2 @user3');

    modal.addComponents(
        new ActionRowBuilder().addComponents(titleInput),
        new ActionRowBuilder().addComponents(descriptionInput),
        new ActionRowBuilder().addComponents(dateTimeInput),
        new ActionRowBuilder().addComponents(durationInput),
        new ActionRowBuilder().addComponents(participantsInput)
    );

    await interaction.showModal(modal);
}

async function showUserMeetings(interaction) {
    const { getUserMeetings } = require('../components/professionalHandler');
    const meetings = await getUserMeetings(interaction.user.id, interaction.guild.id);

    if (meetings.length === 0) {
        const embed = new EmbedBuilder()
            .setTitle('📅 No Upcoming Meetings')
            .setDescription('You have no scheduled meetings. Use `/professional meeting schedule` to create one!')
            .setColor('#FFA500')
            .setTimestamp();

        return await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const embed = new EmbedBuilder()
        .setTitle('📅 Your Upcoming Meetings')
        .setDescription('Here are your scheduled meetings:')
        .setColor('#4A90E2')
        .setTimestamp();

    meetings.slice(0, 10).forEach(meeting => {
        const datetime = new Date(meeting.datetime);
        const timeUntil = datetime.getTime() - Date.now();
        const hoursUntil = Math.floor(timeUntil / (1000 * 60 * 60));
        
        embed.addFields({
            name: `📋 ${meeting.title}`,
            value: `**Date:** ${datetime.toLocaleDateString()}\n**Time:** ${datetime.toLocaleTimeString()}\n**Duration:** ${meeting.duration} minutes\n**Status:** ${hoursUntil > 0 ? `In ${hoursUntil} hours` : 'Starting soon!'}`,
            inline: true
        });
    });

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('meeting_refresh')
                .setLabel('🔄 Refresh')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('meeting_schedule_new')
                .setLabel('➕ Schedule New')
                .setStyle(ButtonStyle.Success)
        );

    await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
}

async function showCreateTaskModal(interaction) {
    const modal = new ModalBuilder()
        .setCustomId('create_task_modal')
        .setTitle('📋 Create Task');

    const titleInput = new TextInputBuilder()
        .setCustomId('task_title')
        .setLabel('Task Title')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(100);

    const descriptionInput = new TextInputBuilder()
        .setCustomId('task_description')
        .setLabel('Description')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false)
        .setMaxLength(500);

    const assigneeInput = new TextInputBuilder()
        .setCustomId('task_assignee')
        .setLabel('Assign to (@mention user)')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setPlaceholder('@username');

    const deadlineInput = new TextInputBuilder()
        .setCustomId('task_deadline')
        .setLabel('Deadline (YYYY-MM-DD)')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setPlaceholder('2024-12-31');

    const priorityInput = new TextInputBuilder()
        .setCustomId('task_priority')
        .setLabel('Priority (low, medium, high, urgent)')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setPlaceholder('medium');

    modal.addComponents(
        new ActionRowBuilder().addComponents(titleInput),
        new ActionRowBuilder().addComponents(descriptionInput),
        new ActionRowBuilder().addComponents(assigneeInput),
        new ActionRowBuilder().addComponents(deadlineInput),
        new ActionRowBuilder().addComponents(priorityInput)
    );

    await interaction.showModal(modal);
}

async function showMyTasks(interaction) {
    const { getMyTasks } = require('../components/professionalHandler');
    const tasks = await getMyTasks(interaction.user.id, interaction.guild.id);

    if (tasks.length === 0) {
        const embed = new EmbedBuilder()
            .setTitle('📋 No Tasks Assigned')
            .setDescription('You have no assigned tasks. Great job! 🎉')
            .setColor('#00FF00')
            .setTimestamp();

        return await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const embed = new EmbedBuilder()
        .setTitle('📋 My Tasks')
        .setDescription(`You have ${tasks.length} assigned task(s):`)
        .setColor('#9B59B6')
        .setTimestamp();

    const priorityEmojis = {
        low: '🟢',
        medium: '🟡',
        high: '🟠',
        urgent: '🔴'
    };

    tasks.slice(0, 10).forEach(task => {
        const deadline = task.deadline ? new Date(task.deadline) : null;
        const isOverdue = deadline && deadline < new Date();
        const priorityEmoji = priorityEmojis[task.priority] || '⚪';
        
        embed.addFields({
            name: `${priorityEmoji} ${task.title}`,
            value: `**Status:** ${task.status}\n**Priority:** ${task.priority}\n**Deadline:** ${deadline ? deadline.toLocaleDateString() : 'No deadline'}\n${isOverdue ? '⚠️ **OVERDUE**' : ''}`,
            inline: true
        });
    });

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('task_complete_select')
                .setLabel('✅ Complete Task')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('task_view_details')
                .setLabel('📄 View Details')
                .setStyle(ButtonStyle.Primary)
        );

    await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
}

async function showCreateProjectModal(interaction) {
    const modal = new ModalBuilder()
        .setCustomId('create_project_modal')
        .setTitle('🚀 Create Project');

    const nameInput = new TextInputBuilder()
        .setCustomId('project_name')
        .setLabel('Project Name')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(100);

    const descriptionInput = new TextInputBuilder()
        .setCustomId('project_description')
        .setLabel('Description')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false)
        .setMaxLength(500);

    const deadlineInput = new TextInputBuilder()
        .setCustomId('project_deadline')
        .setLabel('Project Deadline (YYYY-MM-DD)')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setPlaceholder('2024-12-31');

    const teamInput = new TextInputBuilder()
        .setCustomId('project_team')
        .setLabel('Team Members (@mention users)')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false)
        .setPlaceholder('@user1 @user2 @user3');

    const milestonesInput = new TextInputBuilder()
        .setCustomId('project_milestones')
        .setLabel('Initial Milestones (one per line)')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false)
        .setPlaceholder('Planning phase\nDevelopment\nTesting\nDeployment');

    modal.addComponents(
        new ActionRowBuilder().addComponents(nameInput),
        new ActionRowBuilder().addComponents(descriptionInput),
        new ActionRowBuilder().addComponents(deadlineInput),
        new ActionRowBuilder().addComponents(teamInput),
        new ActionRowBuilder().addComponents(milestonesInput)
    );

    await interaction.showModal(modal);
}

async function handleStartTimer(interaction) {
    const { startTimer } = require('../components/professionalHandler');
    const result = await startTimer(interaction.user.id, interaction.guild.id);

    if (!result.success) {
        const embed = new EmbedBuilder()
            .setTitle('❌ Timer Error')
            .setDescription(result.message)
            .setColor('#FF0000')
            .setTimestamp();

        return await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const embed = new EmbedBuilder()
        .setTitle('⏱️ Timer Started!')
        .setDescription('Your work session has begun. Stay focused! 💪')
        .addFields(
            { name: '🕐 Started At', value: new Date().toLocaleTimeString(), inline: true },
            { name: '📊 Session Type', value: result.sessionType || 'Work Session', inline: true }
        )
        .setColor('#00FF00')
        .setTimestamp();

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('timer_stop')
                .setLabel('⏹️ Stop Timer')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('timer_pause')
                .setLabel('⏸️ Pause')
                .setStyle(ButtonStyle.Secondary)
        );

    await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
}

async function handleStopTimer(interaction) {
    const { stopTimer } = require('../components/professionalHandler');
    const result = await stopTimer(interaction.user.id, interaction.guild.id);

    if (!result.success) {
        const embed = new EmbedBuilder()
            .setTitle('❌ Timer Error')
            .setDescription(result.message)
            .setColor('#FF0000')
            .setTimestamp();

        return await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const hours = Math.floor(result.duration / 3600);
    const minutes = Math.floor((result.duration % 3600) / 60);
    const seconds = result.duration % 60;

    const embed = new EmbedBuilder()
        .setTitle('⏹️ Timer Stopped!')
        .setDescription('Great work! Session completed. 🎉')
        .addFields(
            { name: '⏱️ Session Duration', value: `${hours}h ${minutes}m ${seconds}s`, inline: true },
            { name: '📈 Productivity Score', value: `${result.productivityScore}/100`, inline: true },
            { name: '🏆 Total Today', value: `${result.totalToday} minutes`, inline: true }
        )
        .setColor('#4A90E2')
        .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function showTimeStats(interaction) {
    const { getTimeStats } = require('../components/professionalHandler');
    const stats = await getTimeStats(interaction.user.id, interaction.guild.id);

    const embed = new EmbedBuilder()
        .setTitle('📊 Your Productivity Stats')
        .setDescription('Track your work patterns and productivity!')
        .addFields(
            { name: '📅 Today', value: `${stats.today} minutes`, inline: true },
            { name: '📊 This Week', value: `${stats.thisWeek} minutes`, inline: true },
            { name: '📈 This Month', value: `${stats.thisMonth} minutes`, inline: true },
            { name: '🎯 Average Session', value: `${stats.averageSession} minutes`, inline: true },
            { name: '🔥 Longest Session', value: `${stats.longestSession} minutes`, inline: true },
            { name: '💪 Streak', value: `${stats.streak} days`, inline: true }
        )
        .setColor('#9B59B6')
        .setTimestamp();

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('time_detailed_stats')
                .setLabel('📋 Detailed Report')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('time_export_data')
                .setLabel('📁 Export Data')
                .setStyle(ButtonStyle.Secondary)
        );

    await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
}
