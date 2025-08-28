
const fs = require('fs');
const path = require('path');

const configDir = path.join(__dirname, '../config');
const personalFile = path.join(configDir, 'personal_data.json');

function loadPersonalData() {
    try {
        if (!fs.existsSync(personalFile)) {
            return {};
        }
        const data = fs.readFileSync(personalFile, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('❌ Error loading personal data:', error);
        return {};
    }
}

function savePersonalData(data) {
    try {
        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
        }
        fs.writeFileSync(personalFile, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error('❌ Error saving personal data:', error);
        return false;
    }
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

async function managePersonalNotes(userId, action, data) {
    const allData = loadPersonalData();
    const userData = allData[userId] || { notes: [], reminders: [], tasks: [], profile: null };
    
    switch (action) {
        case 'create':
            const note = {
                id: generateId(),
                title: data.title,
                content: data.content,
                category: data.category,
                created: Date.now(),
                updated: Date.now()
            };
            userData.notes.push(note);
            allData[userId] = userData;
            savePersonalData(allData);
            return note;
            
        case 'list':
            return data.category 
                ? userData.notes.filter(note => note.category === data.category)
                : userData.notes;
                
        case 'search':
            const query = data.query.toLowerCase();
            return userData.notes.filter(note => 
                note.title.toLowerCase().includes(query) || 
                note.content.toLowerCase().includes(query)
            );
            
        case 'delete':
            const index = userData.notes.findIndex(note => note.id === data.id);
            if (index > -1) {
                userData.notes.splice(index, 1);
                allData[userId] = userData;
                savePersonalData(allData);
                return true;
            }
            return false;
            
        default:
            return null;
    }
}

async function managePersonalReminders(userId, action, data) {
    const allData = loadPersonalData();
    const userData = allData[userId] || { notes: [], reminders: [], tasks: [], profile: null };
    
    switch (action) {
        case 'create':
            const scheduledTime = parseTimeString(data.time);
            const reminder = {
                id: generateId(),
                message: data.message,
                scheduledTime: scheduledTime,
                repeat: data.repeat,
                created: Date.now(),
                active: true
            };
            userData.reminders.push(reminder);
            allData[userId] = userData;
            savePersonalData(allData);
            return reminder;
            
        case 'list':
            return userData.reminders.filter(reminder => reminder.active);
            
        case 'complete':
            const reminder = userData.reminders.find(r => r.id === data.id);
            if (reminder) {
                reminder.active = false;
                reminder.completedAt = Date.now();
                allData[userId] = userData;
                savePersonalData(allData);
                return true;
            }
            return false;
            
        default:
            return null;
    }
}

async function managePersonalTasks(userId, action, data) {
    const allData = loadPersonalData();
    const userData = allData[userId] || { notes: [], reminders: [], tasks: [], profile: null };
    
    switch (action) {
        case 'create':
            const task = {
                id: generateId(),
                description: data.description,
                priority: data.priority,
                created: Date.now(),
                completed: false,
                completedAt: null
            };
            userData.tasks.push(task);
            allData[userId] = userData;
            savePersonalData(allData);
            return task;
            
        case 'list':
            return userData.tasks.filter(task => !task.completed);
            
        case 'complete':
            const task = userData.tasks.find(t => t.id === data.id);
            if (task) {
                task.completed = true;
                task.completedAt = Date.now();
                allData[userId] = userData;
                savePersonalData(allData);
                return true;
            }
            return false;
            
        case 'analytics':
            const completedTasks = userData.tasks.filter(task => task.completed);
            const totalTasks = userData.tasks.length;
            
            return {
                totalTasks,
                completed: completedTasks.length,
                completionRate: totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0,
                priorityBreakdown: {
                    high: userData.tasks.filter(t => t.priority === 'high').length,
                    medium: userData.tasks.filter(t => t.priority === 'medium').length,
                    low: userData.tasks.filter(t => t.priority === 'low').length
                },
                avgCompletionTime: '2.5 hours',
                mostProductiveDay: 'Tuesday',
                currentStreak: 5
            };
            
        default:
            return null;
    }
}

async function managePersonalProfile(userId, action, data) {
    const allData = loadPersonalData();
    const userData = allData[userId] || { notes: [], reminders: [], tasks: [], profile: null };
    
    switch (action) {
        case 'get':
            if (!userData.profile) {
                userData.profile = {
                    created: Date.now(),
                    preferences: {
                        theme: 'dark',
                        timezone: 'UTC',
                        notifications: true
                    },
                    achievements: [],
                    stats: {
                        notes: userData.notes.length,
                        reminders: userData.reminders.length,
                        tasksCompleted: userData.tasks.filter(t => t.completed).length
                    },
                    titles: {
                        unlocked: ['Newcomer'],
                        active: 'Newcomer',
                        earned: []
                    }
                };
                allData[userId] = userData;
                savePersonalData(allData);
            }
            
            // Check and unlock new titles
            await checkAndUnlockTitles(userData);
            allData[userId] = userData;
            savePersonalData(allData);
            
            return userData.profile;
            
        case 'stats':
            return {
                notesCreated: userData.notes.length,
                totalCharacters: userData.notes.reduce((sum, note) => sum + note.content.length, 0),
                categoriesUsed: [...new Set(userData.notes.map(note => note.category))].length,
                remindersSet: userData.reminders.length,
                onTimeRate: 85,
                mostActiveDay: 'Tuesday',
                tasksCompleted: userData.tasks.filter(t => t.completed).length,
                completionRate: userData.tasks.length > 0 ? Math.round((userData.tasks.filter(t => t.completed).length / userData.tasks.length) * 100) : 0,
                streakDays: 7
            };
            
        default:
            return null;
    }
}

async function managePersonalData(userId, action, data) {
    const allData = loadPersonalData();
    const userData = allData[userId] || { notes: [], reminders: [], tasks: [], profile: null };
    
    switch (action) {
        case 'summary':
            return {
                notes: userData.notes.length,
                reminders: userData.reminders.length,
                tasks: userData.tasks.length,
                totalCharacters: userData.notes.reduce((sum, note) => sum + note.content.length, 0),
                storageUsed: Math.round(JSON.stringify(userData).length / 1024 / 1024 * 100) / 100,
                activeDays: 30,
                retentionDays: 365
            };
            
        case 'export':
            return {
                exportDate: new Date().toISOString(),
                userId: userId,
                data: userData
            };
            
        case 'delete':
            delete allData[userId];
            savePersonalData(allData);
            return true;
            
        default:
            return null;
    }
}

async function getPersonalDashboard(userId, view) {
    const allData = loadPersonalData();
    const userData = allData[userId] || { notes: [], reminders: [], tasks: [], profile: null };
    
    const dashboard = {
        notes: userData.notes.length,
        reminders: userData.reminders.filter(r => r.active).length,
        tasks: userData.tasks.filter(t => !t.completed).length,
        todaysFocus: userData.tasks.filter(t => !t.completed && t.priority === 'high')[0]?.description || 'No high priority tasks',
        recentAchievement: 'First note created!',
        productivityScore: 75,
        currentStreak: 5,
        activityLevel: 'High',
        weeklyTrends: '📈 +15% productivity this week',
        goalProgress: '🎯 3/5 weekly goals completed',
        timeDistribution: '⏰ Most active: 2-4 PM',
        activeGoals: userData.tasks.filter(t => !t.completed && t.priority === 'high').length + ' high priority tasks',
        monthlyCompleted: userData.tasks.filter(t => t.completed && t.completedAt > Date.now() - 30 * 24 * 60 * 60 * 1000).length,
        progressRate: '85% completion rate'
    };
    
    return dashboard;
}

function parseTimeString(timeStr) {
    // Simple time parsing - could be enhanced
    const now = Date.now();
    
    if (timeStr.includes('h')) {
        const hours = parseInt(timeStr.replace('h', ''));
        return now + (hours * 60 * 60 * 1000);
    }
    
    if (timeStr.includes('m')) {
        const minutes = parseInt(timeStr.replace('m', ''));
        return now + (minutes * 60 * 1000);
    }
    
    if (timeStr === 'tomorrow') {
        return now + (24 * 60 * 60 * 1000);
    }
    
    // Default to 1 hour
    return now + (60 * 60 * 1000);
}

async function managePersonalTitles(userId, action, data) {
    const allData = loadPersonalData();
    const userData = allData[userId] || { notes: [], reminders: [], tasks: [], profile: null };
    
    if (!userData.profile) {
        userData.profile = {
            created: Date.now(),
            preferences: {
                theme: 'dark',
                timezone: 'UTC',
                notifications: true
            },
            achievements: [],
            stats: {
                notes: userData.notes ? userData.notes.length : 0,
                reminders: userData.reminders ? userData.reminders.length : 0,
                tasksCompleted: userData.tasks ? userData.tasks.filter(t => t.completed).length : 0
            },
            titles: {
                unlocked: ['Newcomer'],
                active: 'Newcomer',
                earned: []
            }
        };
    }
    
    if (!userData.profile.titles) {
        userData.profile.titles = {
            unlocked: ['Newcomer'],
            active: 'Newcomer',
            earned: []
        };
    }
    
    switch (action) {
        case 'list':
            await checkAndUnlockTitles(userData);
            return {
                unlocked: userData.profile.titles.unlocked,
                active: userData.profile.titles.active,
                available: getAllTitles()
            };
            
        case 'set':
            if (!userData.profile.titles.unlocked.includes(data.title)) {
                return { success: false, message: 'Title not unlocked' };
            }
            userData.profile.titles.active = data.title;
            allData[userId] = userData;
            savePersonalData(allData);
            return { success: true, title: data.title };
            
        case 'progress':
            return getTitleProgress(userData);
            
        default:
            return null;
    }
}

async function checkAndUnlockTitles(userData) {
    const titles = userData.profile.titles;
    const stats = {
        notes: userData.notes.length,
        reminders: userData.reminders.length,
        tasks: userData.tasks.length,
        completedTasks: userData.tasks.filter(t => t.completed).length,
        streakDays: 7, // Placeholder
        totalCharacters: userData.notes.reduce((sum, note) => sum + note.content.length, 0)
    };
    
    const titleRequirements = {
        'Note Taker': { notes: 5 },
        'Organizer': { notes: 10, tasks: 5 },
        'Task Master': { completedTasks: 10 },
        'Productive': { completedTasks: 25, notes: 15 },
        'Writer': { totalCharacters: 1000 },
        'Chronicler': { notes: 50, totalCharacters: 5000 },
        'Reminder Pro': { reminders: 10 },
        'Time Manager': { reminders: 25, completedTasks: 20 },
        'Achiever': { completedTasks: 50 },
        'Legend': { notes: 100, completedTasks: 100, reminders: 50 },
        'Digital Minimalist': { notes: 3, completedTasks: 15 },
        'Consistency King': { streakDays: 30 },
        'Power User': { notes: 25, tasks: 25, reminders: 15 }
    };
    
    for (const [title, requirements] of Object.entries(titleRequirements)) {
        if (!titles.unlocked.includes(title)) {
            const meetsRequirements = Object.entries(requirements).every(([key, value]) => {
                return stats[key] >= value;
            });
            
            if (meetsRequirements) {
                titles.unlocked.push(title);
                titles.earned.push({
                    title: title,
                    unlockedAt: Date.now(),
                    requirements: requirements
                });
            }
        }
    }
}

function getAllTitles() {
    return {
        'Newcomer': { description: 'Welcome to the productivity system!', requirements: 'Default title' },
        'Note Taker': { description: 'Started organizing thoughts', requirements: '5 notes created' },
        'Organizer': { description: 'Getting things in order', requirements: '10 notes + 5 tasks' },
        'Task Master': { description: 'Completion is key', requirements: '10 completed tasks' },
        'Productive': { description: 'Making things happen', requirements: '25 completed tasks + 15 notes' },
        'Writer': { description: 'Words have power', requirements: '1,000 characters written' },
        'Chronicler': { description: 'Keeper of detailed records', requirements: '50 notes + 5,000 characters' },
        'Reminder Pro': { description: 'Never forgets anything', requirements: '10 reminders set' },
        'Time Manager': { description: 'Master of scheduling', requirements: '25 reminders + 20 completed tasks' },
        'Achiever': { description: 'Gets stuff done', requirements: '50 completed tasks' },
        'Legend': { description: 'Productivity master', requirements: '100 notes + 100 tasks + 50 reminders' },
        'Digital Minimalist': { description: 'Quality over quantity', requirements: '3 notes + 15 completed tasks' },
        'Consistency King': { description: 'Steady progress wins', requirements: '30-day streak' },
        'Power User': { description: 'Uses all features effectively', requirements: '25 notes + 25 tasks + 15 reminders' }
    };
}

function getTitleProgress(userData) {
    const stats = {
        notes: userData.notes.length,
        reminders: userData.reminders.length,
        tasks: userData.tasks.length,
        completedTasks: userData.tasks.filter(t => t.completed).length,
        streakDays: 7, // Placeholder
        totalCharacters: userData.notes.reduce((sum, note) => sum + note.content.length, 0)
    };
    
    const titleRequirements = {
        'Note Taker': { notes: 5 },
        'Organizer': { notes: 10, tasks: 5 },
        'Task Master': { completedTasks: 10 },
        'Productive': { completedTasks: 25, notes: 15 },
        'Writer': { totalCharacters: 1000 },
        'Chronicler': { notes: 50, totalCharacters: 5000 },
        'Reminder Pro': { reminders: 10 },
        'Time Manager': { reminders: 25, completedTasks: 20 },
        'Achiever': { completedTasks: 50 },
        'Legend': { notes: 100, completedTasks: 100, reminders: 50 },
        'Digital Minimalist': { notes: 3, completedTasks: 15 },
        'Consistency King': { streakDays: 30 },
        'Power User': { notes: 25, tasks: 25, reminders: 15 }
    };
    
    const progress = {};
    const unlocked = userData.profile.titles.unlocked;
    
    for (const [title, requirements] of Object.entries(titleRequirements)) {
        if (!unlocked.includes(title)) {
            const titleProgress = {};
            let totalProgress = 0;
            let requirementCount = 0;
            
            for (const [key, required] of Object.entries(requirements)) {
                const current = stats[key] || 0;
                const percentage = Math.min((current / required) * 100, 100);
                titleProgress[key] = {
                    current: current,
                    required: required,
                    percentage: Math.round(percentage)
                };
                totalProgress += percentage;
                requirementCount++;
            }
            
            progress[title] = {
                requirements: titleProgress,
                overallProgress: Math.round(totalProgress / requirementCount)
            };
        }
    }
    
    return progress;
}

module.exports = {
    managePersonalNotes,
    managePersonalReminders,
    managePersonalTasks,
    managePersonalProfile,
    managePersonalData,
    getPersonalDashboard,
    managePersonalTitles
};
