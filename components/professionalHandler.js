
const fs = require('fs');
const path = require('path');

const MEETINGS_FILE = path.join(__dirname, '../config/meetings.json');
const TASKS_FILE = path.join(__dirname, '../config/tasks.json');
const PROJECTS_FILE = path.join(__dirname, '../config/projects.json');
const TIME_TRACKING_FILE = path.join(__dirname, '../config/time_tracking.json');

// Initialize files
function initializeFiles() {
    const files = [MEETINGS_FILE, TASKS_FILE, PROJECTS_FILE, TIME_TRACKING_FILE];
    files.forEach(file => {
        if (!fs.existsSync(file)) {
            fs.writeFileSync(file, JSON.stringify({}, null, 2));
        }
    });
}

initializeFiles();

function loadData(file) {
    try {
        return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (error) {
        return {};
    }
}

function saveData(file, data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// Meeting Functions
async function scheduleMeeting(userId, guildId, meetingData) {
    const meetings = loadData(MEETINGS_FILE);
    if (!meetings[guildId]) meetings[guildId] = [];

    const meetingId = Date.now().toString();
    const meeting = {
        id: meetingId,
        title: meetingData.title,
        description: meetingData.description || '',
        organizer: userId,
        datetime: new Date(meetingData.datetime).toISOString(),
        duration: parseInt(meetingData.duration),
        participants: meetingData.participants || [],
        status: 'scheduled',
        createdAt: new Date().toISOString()
    };

    meetings[guildId].push(meeting);
    saveData(MEETINGS_FILE, meetings);

    return { success: true, meeting };
}

async function getUserMeetings(userId, guildId) {
    const meetings = loadData(MEETINGS_FILE);
    if (!meetings[guildId]) return [];

    const now = new Date();
    return meetings[guildId]
        .filter(meeting => 
            (meeting.organizer === userId || meeting.participants.includes(userId)) &&
            new Date(meeting.datetime) > now
        )
        .sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
}

async function joinMeeting(userId, guildId, meetingId) {
    const meetings = loadData(MEETINGS_FILE);
    if (!meetings[guildId]) return { success: false, message: 'No meetings found!' };

    const meeting = meetings[guildId].find(m => m.id === meetingId);
    if (!meeting) return { success: false, message: 'Meeting not found!' };

    if (!meeting.participants.includes(userId)) {
        meeting.participants.push(userId);
        saveData(MEETINGS_FILE, meetings);
    }

    return { success: true, meeting };
}

async function cancelMeeting(userId, guildId, meetingId) {
    const meetings = loadData(MEETINGS_FILE);
    if (!meetings[guildId]) return { success: false, message: 'No meetings found!' };

    const meetingIndex = meetings[guildId].findIndex(m => m.id === meetingId && m.organizer === userId);
    if (meetingIndex === -1) return { success: false, message: 'Meeting not found or you\'re not the organizer!' };

    meetings[guildId].splice(meetingIndex, 1);
    saveData(MEETINGS_FILE, meetings);

    return { success: true };
}

// Task Functions
async function createTask(userId, guildId, taskData) {
    const tasks = loadData(TASKS_FILE);
    if (!tasks[guildId]) tasks[guildId] = [];

    const taskId = Date.now().toString();
    const task = {
        id: taskId,
        title: taskData.title,
        description: taskData.description || '',
        creator: userId,
        assignee: taskData.assignee || userId,
        priority: taskData.priority || 'medium',
        status: 'pending',
        deadline: taskData.deadline ? new Date(taskData.deadline).toISOString() : null,
        createdAt: new Date().toISOString(),
        completedAt: null
    };

    tasks[guildId].push(task);
    saveData(TASKS_FILE, tasks);

    return { success: true, task };
}

async function getUserTasks(guildId) {
    const tasks = loadData(TASKS_FILE);
    if (!tasks[guildId]) return [];

    return tasks[guildId]
        .filter(task => task.status !== 'completed')
        .sort((a, b) => {
            const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
            return priorityOrder[b.priority] - priorityOrder[a.priority];
        });
}

async function getMyTasks(userId, guildId) {
    const tasks = loadData(TASKS_FILE);
    if (!tasks[guildId]) return [];

    return tasks[guildId]
        .filter(task => task.assignee === userId && task.status !== 'completed')
        .sort((a, b) => {
            if (a.deadline && b.deadline) {
                return new Date(a.deadline) - new Date(b.deadline);
            }
            return a.deadline ? -1 : 1;
        });
}

async function completeTask(userId, guildId, taskId) {
    const tasks = loadData(TASKS_FILE);
    if (!tasks[guildId]) return { success: false, message: 'No tasks found!' };

    const task = tasks[guildId].find(t => t.id === taskId && t.assignee === userId);
    if (!task) return { success: false, message: 'Task not found or not assigned to you!' };

    task.status = 'completed';
    task.completedAt = new Date().toISOString();

    saveData(TASKS_FILE, tasks);
    return { success: true, task };
}

// Project Functions
async function createProject(userId, guildId, projectData) {
    const projects = loadData(PROJECTS_FILE);
    if (!projects[guildId]) projects[guildId] = [];

    const projectId = Date.now().toString();
    const project = {
        id: projectId,
        name: projectData.name,
        description: projectData.description || '',
        owner: userId,
        team: projectData.team || [userId],
        deadline: projectData.deadline ? new Date(projectData.deadline).toISOString() : null,
        status: 'active',
        progress: 0,
        milestones: projectData.milestones || [],
        createdAt: new Date().toISOString()
    };

    projects[guildId].push(project);
    saveData(PROJECTS_FILE, projects);

    return { success: true, project };
}

async function getProjects(guildId) {
    const projects = loadData(PROJECTS_FILE);
    if (!projects[guildId]) return [];

    return projects[guildId]
        .filter(project => project.status === 'active')
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

async function updateProjectProgress(userId, guildId, projectId, progress) {
    const projects = loadData(PROJECTS_FILE);
    if (!projects[guildId]) return { success: false, message: 'No projects found!' };

    const project = projects[guildId].find(p => p.id === projectId);
    if (!project) return { success: false, message: 'Project not found!' };

    if (!project.team.includes(userId) && project.owner !== userId) {
        return { success: false, message: 'You\'re not a team member of this project!' };
    }

    project.progress = Math.min(100, Math.max(0, progress));
    if (project.progress === 100) {
        project.status = 'completed';
        project.completedAt = new Date().toISOString();
    }

    saveData(PROJECTS_FILE, projects);
    return { success: true, project };
}

async function getProjectStats(guildId) {
    const projects = loadData(PROJECTS_FILE);
    if (!projects[guildId]) return { active: 0, completed: 0, totalProgress: 0 };

    const guildProjects = projects[guildId];
    const active = guildProjects.filter(p => p.status === 'active').length;
    const completed = guildProjects.filter(p => p.status === 'completed').length;
    const totalProgress = guildProjects.reduce((sum, p) => sum + p.progress, 0) / guildProjects.length || 0;

    return { active, completed, totalProgress: Math.round(totalProgress) };
}

// Time Tracking Functions
async function startTimer(userId, guildId) {
    const timeData = loadData(TIME_TRACKING_FILE);
    if (!timeData[guildId]) timeData[guildId] = {};
    if (!timeData[guildId][userId]) timeData[guildId][userId] = { sessions: [], activeSession: null };

    const userData = timeData[guildId][userId];
    
    if (userData.activeSession) {
        return { success: false, message: 'You already have an active timer running!' };
    }

    userData.activeSession = {
        startTime: Date.now(),
        sessionType: 'work'
    };

    saveData(TIME_TRACKING_FILE, timeData);
    return { success: true, sessionType: 'work' };
}

async function stopTimer(userId, guildId) {
    const timeData = loadData(TIME_TRACKING_FILE);
    if (!timeData[guildId] || !timeData[guildId][userId] || !timeData[guildId][userId].activeSession) {
        return { success: false, message: 'No active timer found!' };
    }

    const userData = timeData[guildId][userId];
    const session = userData.activeSession;
    const duration = Math.floor((Date.now() - session.startTime) / 1000);

    const completedSession = {
        startTime: session.startTime,
        endTime: Date.now(),
        duration: duration,
        date: new Date().toDateString()
    };

    userData.sessions.push(completedSession);
    userData.activeSession = null;

    // Calculate productivity score (simple algorithm)
    const productivityScore = Math.min(100, Math.floor((duration / 60) * 2)); // 2 points per minute, max 100

    // Calculate total today
    const today = new Date().toDateString();
    const totalToday = userData.sessions
        .filter(s => s.date === today)
        .reduce((sum, s) => sum + s.duration, 0) / 60; // in minutes

    saveData(TIME_TRACKING_FILE, timeData);

    return { 
        success: true, 
        duration, 
        productivityScore, 
        totalToday: Math.round(totalToday) 
    };
}

async function getTimeStats(userId, guildId) {
    const timeData = loadData(TIME_TRACKING_FILE);
    if (!timeData[guildId] || !timeData[guildId][userId]) {
        return { today: 0, thisWeek: 0, thisMonth: 0, averageSession: 0, longestSession: 0, streak: 0 };
    }

    const sessions = timeData[guildId][userId].sessions;
    const now = new Date();
    const today = now.toDateString();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const todayMinutes = sessions
        .filter(s => s.date === today)
        .reduce((sum, s) => sum + s.duration, 0) / 60;

    const weekMinutes = sessions
        .filter(s => new Date(s.endTime) > weekAgo)
        .reduce((sum, s) => sum + s.duration, 0) / 60;

    const monthMinutes = sessions
        .filter(s => new Date(s.endTime) > monthAgo)
        .reduce((sum, s) => sum + s.duration, 0) / 60;

    const averageSession = sessions.length > 0 ? 
        sessions.reduce((sum, s) => sum + s.duration, 0) / sessions.length / 60 : 0;

    const longestSession = sessions.length > 0 ? 
        Math.max(...sessions.map(s => s.duration)) / 60 : 0;

    // Calculate streak (days with at least one session)
    const uniqueDates = [...new Set(sessions.map(s => s.date))].sort();
    let streak = 0;
    for (let i = uniqueDates.length - 1; i >= 0; i--) {
        const date = new Date(uniqueDates[i]);
        const daysDiff = Math.floor((now - date) / (24 * 60 * 60 * 1000));
        if (daysDiff === streak) {
            streak++;
        } else {
            break;
        }
    }

    return {
        today: Math.round(todayMinutes),
        thisWeek: Math.round(weekMinutes),
        thisMonth: Math.round(monthMinutes),
        averageSession: Math.round(averageSession),
        longestSession: Math.round(longestSession),
        streak
    };
}

async function getTimeLeaderboard(guildId) {
    const timeData = loadData(TIME_TRACKING_FILE);
    if (!timeData[guildId]) return [];

    const leaderboard = Object.entries(timeData[guildId]).map(([userId, userData]) => {
        const thisWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const weeklyMinutes = userData.sessions
            .filter(s => new Date(s.endTime) > thisWeek)
            .reduce((sum, s) => sum + s.duration, 0) / 60;

        return { userId, weeklyMinutes: Math.round(weeklyMinutes) };
    });

    return leaderboard
        .sort((a, b) => b.weeklyMinutes - a.weeklyMinutes)
        .slice(0, 10);
}

async function handleProfessionalInteraction(interaction) {
    const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
    
    if (interaction.isModalSubmit()) {
        const customId = interaction.customId;

        if (customId === 'schedule_meeting_modal') {
            const title = interaction.fields.getTextInputValue('meeting_title');
            const description = interaction.fields.getTextInputValue('meeting_description');
            const datetime = interaction.fields.getTextInputValue('meeting_datetime');
            const duration = interaction.fields.getTextInputValue('meeting_duration');
            const participants = interaction.fields.getTextInputValue('meeting_participants');

            const meetingData = {
                title,
                description,
                datetime,
                duration,
                participants: participants.match(/<@!?(\d+)>/g)?.map(m => m.replace(/<@!?/, '').replace('>', '')) || []
            };

            const result = await scheduleMeeting(interaction.user.id, interaction.guild.id, meetingData);

            if (result.success) {
                const embed = new EmbedBuilder()
                    .setTitle('📅 Meeting Scheduled!')
                    .setDescription(`**${title}** has been scheduled successfully!`)
                    .addFields(
                        { name: '📅 Date & Time', value: new Date(datetime).toLocaleString(), inline: true },
                        { name: '⏱️ Duration', value: `${duration} minutes`, inline: true },
                        { name: '👥 Participants', value: `${meetingData.participants.length} people`, inline: true }
                    )
                    .setColor('#00FF00')
                    .setTimestamp();

                await interaction.reply({ embeds: [embed], ephemeral: true });
            } else {
                await interaction.reply({ content: '❌ Failed to schedule meeting. Please check your input.', ephemeral: true });
            }
        }

        if (customId === 'create_task_modal') {
            const title = interaction.fields.getTextInputValue('task_title');
            const description = interaction.fields.getTextInputValue('task_description');
            const assignee = interaction.fields.getTextInputValue('task_assignee');
            const deadline = interaction.fields.getTextInputValue('task_deadline');
            const priority = interaction.fields.getTextInputValue('task_priority') || 'medium';

            const taskData = {
                title,
                description,
                assignee: assignee.match(/<@!?(\d+)>/)?.[1] || interaction.user.id,
                deadline,
                priority: ['low', 'medium', 'high', 'urgent'].includes(priority.toLowerCase()) ? priority.toLowerCase() : 'medium'
            };

            const result = await createTask(interaction.user.id, interaction.guild.id, taskData);

            if (result.success) {
                const embed = new EmbedBuilder()
                    .setTitle('📋 Task Created!')
                    .setDescription(`**${title}** has been created successfully!`)
                    .addFields(
                        { name: '🎯 Priority', value: priority, inline: true },
                        { name: '👤 Assigned to', value: `<@${taskData.assignee}>`, inline: true },
                        { name: '📅 Deadline', value: deadline || 'No deadline', inline: true }
                    )
                    .setColor('#9B59B6')
                    .setTimestamp();

                await interaction.reply({ embeds: [embed] });
            } else {
                await interaction.reply({ content: '❌ Failed to create task. Please try again.', ephemeral: true });
            }
        }

        if (customId === 'create_project_modal') {
            const name = interaction.fields.getTextInputValue('project_name');
            const description = interaction.fields.getTextInputValue('project_description');
            const deadline = interaction.fields.getTextInputValue('project_deadline');
            const team = interaction.fields.getTextInputValue('project_team');
            const milestones = interaction.fields.getTextInputValue('project_milestones');

            const projectData = {
                name,
                description,
                deadline,
                team: team.match(/<@!?(\d+)>/g)?.map(m => m.replace(/<@!?/, '').replace('>', '')) || [interaction.user.id],
                milestones: milestones ? milestones.split('\n').filter(m => m.trim()) : []
            };

            const result = await createProject(interaction.user.id, interaction.guild.id, projectData);

            if (result.success) {
                const embed = new EmbedBuilder()
                    .setTitle('🚀 Project Created!')
                    .setDescription(`**${name}** has been created successfully!`)
                    .addFields(
                        { name: '👥 Team Size', value: `${projectData.team.length} members`, inline: true },
                        { name: '📅 Deadline', value: deadline || 'No deadline', inline: true },
                        { name: '🎯 Milestones', value: `${projectData.milestones.length} milestones`, inline: true }
                    )
                    .setColor('#4A90E2')
                    .setTimestamp();

                await interaction.reply({ embeds: [embed] });
            } else {
                await interaction.reply({ content: '❌ Failed to create project. Please try again.', ephemeral: true });
            }
        }
    }

    if (interaction.isButton()) {
        const customId = interaction.customId;

        if (customId === 'timer_stop') {
            const result = await stopTimer(interaction.user.id, interaction.guild.id);
            
            if (result.success) {
                const hours = Math.floor(result.duration / 3600);
                const minutes = Math.floor((result.duration % 3600) / 60);
                
                const embed = new EmbedBuilder()
                    .setTitle('⏹️ Timer Stopped!')
                    .setDescription('Session completed! Great work! 🎉')
                    .addFields(
                        { name: '⏱️ Duration', value: `${hours}h ${minutes}m`, inline: true },
                        { name: '📈 Score', value: `${result.productivityScore}/100`, inline: true }
                    )
                    .setColor('#4A90E2')
                    .setTimestamp();

                await interaction.update({ embeds: [embed], components: [] });
            } else {
                await interaction.reply({ content: result.message, ephemeral: true });
            }
        }

        if (customId === 'task_complete_select') {
            const tasks = await getMyTasks(interaction.user.id, interaction.guild.id);
            
            if (tasks.length === 0) {
                await interaction.reply({ content: '✅ You have no pending tasks!', ephemeral: true });
                return;
            }

            const { StringSelectMenuBuilder } = require('discord.js');
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('complete_task_select')
                .setPlaceholder('Choose a task to complete...')
                .addOptions(
                    tasks.slice(0, 25).map(task => ({
                        label: task.title.substring(0, 100),
                        description: `Priority: ${task.priority}`,
                        value: task.id
                    }))
                );

            const row = new ActionRowBuilder().addComponents(selectMenu);
            await interaction.reply({ content: 'Select a task to mark as complete:', components: [row], ephemeral: true });
        }
    }

    if (interaction.isStringSelectMenu()) {
        if (interaction.customId === 'complete_task_select') {
            const taskId = interaction.values[0];
            const result = await completeTask(interaction.user.id, interaction.guild.id, taskId);

            if (result.success) {
                const embed = new EmbedBuilder()
                    .setTitle('✅ Task Completed!')
                    .setDescription(`**${result.task.title}** has been marked as complete!`)
                    .setColor('#00FF00')
                    .setTimestamp();

                await interaction.update({ embeds: [embed], components: [] });
            } else {
                await interaction.reply({ content: result.message, ephemeral: true });
            }
        }
    }
}

module.exports = {
    scheduleMeeting,
    getUserMeetings,
    joinMeeting,
    cancelMeeting,
    createTask,
    getUserTasks,
    getMyTasks,
    completeTask,
    createProject,
    getProjects,
    updateProjectProgress,
    getProjectStats,
    startTimer,
    stopTimer,
    getTimeStats,
    getTimeLeaderboard,
    handleProfessionalInteraction
};
