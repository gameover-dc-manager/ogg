
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('habits')
        .setDescription('Personal habit tracking system')
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add a new habit to track')
                .addStringOption(option =>
                    option.setName('name')
                        .setDescription('Name of the habit')
                        .setRequired(true)
                        .setMaxLength(50))
                .addStringOption(option =>
                    option.setName('description')
                        .setDescription('Description of the habit')
                        .setRequired(false)
                        .setMaxLength(200))
                .addStringOption(option =>
                    option.setName('frequency')
                        .setDescription('How often you want to do this habit')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Daily', value: 'daily' },
                            { name: 'Weekly', value: 'weekly' },
                            { name: 'Custom', value: 'custom' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('check')
                .setDescription('Mark a habit as completed for today')
                .addStringOption(option =>
                    option.setName('habit')
                        .setDescription('Name of the habit to check off')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('View your habits and progress'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('stats')
                .setDescription('View detailed statistics for your habits'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove a habit from tracking')
                .addStringOption(option =>
                    option.setName('habit')
                        .setDescription('Name of the habit to remove')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('streak')
                .setDescription('View your current streaks'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('reset')
                .setDescription('Reset progress for a specific habit')
                .addStringOption(option =>
                    option.setName('habit')
                        .setDescription('Name of the habit to reset')
                        .setRequired(true))),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        // Initialize habits data
        if (!interaction.client.habitsData) {
            interaction.client.habitsData = {};
        }

        const userId = interaction.user.id;
        const guildId = interaction.guild.id;
        const key = `${guildId}_${userId}`;

        if (!interaction.client.habitsData[key]) {
            interaction.client.habitsData[key] = {
                habits: {},
                totalHabits: 0,
                totalCompletions: 0
            };
        }

        switch (subcommand) {
            case 'add':
                await handleAdd(interaction);
                break;
            case 'check':
                await handleCheck(interaction);
                break;
            case 'view':
                await handleView(interaction);
                break;
            case 'stats':
                await handleStats(interaction);
                break;
            case 'remove':
                await handleRemove(interaction);
                break;
            case 'streak':
                await handleStreak(interaction);
                break;
            case 'reset':
                await handleReset(interaction);
                break;
        }

        // Save habits data
        global.saveHabitsData = () => {
            const fs = require('fs');
            fs.writeFileSync('./config/habits_data.json', JSON.stringify(interaction.client.habitsData, null, 2));
        };
        global.saveHabitsData();
    }
};

async function handleAdd(interaction) {
    const name = interaction.options.getString('name').toLowerCase();
    const description = interaction.options.getString('description') || 'No description provided';
    const frequency = interaction.options.getString('frequency') || 'daily';
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;
    const key = `${guildId}_${userId}`;

    const habitsData = interaction.client.habitsData[key];

    if (habitsData.habits[name]) {
        return interaction.reply({ content: '❌ You already have a habit with that name!', ephemeral: true });
    }

    habitsData.habits[name] = {
        name: name,
        description: description,
        frequency: frequency,
        createdAt: Date.now(),
        completions: [],
        currentStreak: 0,
        longestStreak: 0,
        totalCompletions: 0,
        lastCompleted: null
    };

    habitsData.totalHabits++;

    const embed = new EmbedBuilder()
        .setTitle('✅ Habit Added Successfully!')
        .setDescription(`**${name}** has been added to your habit tracker.`)
        .addFields(
            { name: 'Description', value: description, inline: false },
            { name: 'Frequency', value: frequency.charAt(0).toUpperCase() + frequency.slice(1), inline: true },
            { name: 'Total Habits', value: habitsData.totalHabits.toString(), inline: true }
        )
        .setColor('#00FF00')
        .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleCheck(interaction) {
    const habitName = interaction.options.getString('habit').toLowerCase();
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;
    const key = `${guildId}_${userId}`;

    const habitsData = interaction.client.habitsData[key];
    const habit = habitsData.habits[habitName];

    if (!habit) {
        return interaction.reply({ content: '❌ Habit not found! Use `/habits view` to see your habits.', ephemeral: true });
    }

    const today = new Date().toDateString();
    const lastCompleted = habit.lastCompleted ? new Date(habit.lastCompleted).toDateString() : null;

    if (lastCompleted === today) {
        return interaction.reply({ content: `✅ You've already completed **${habitName}** today! Great job maintaining your streak!`, ephemeral: true });
    }

    // Mark as completed
    const now = Date.now();
    habit.completions.push(now);
    habit.totalCompletions++;
    habit.lastCompleted = now;
    habitsData.totalCompletions++;

    // Calculate streak
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();
    if (lastCompleted === yesterday || habit.currentStreak === 0) {
        habit.currentStreak++;
    } else {
        habit.currentStreak = 1;
    }

    if (habit.currentStreak > habit.longestStreak) {
        habit.longestStreak = habit.currentStreak;
    }

    // Determine rewards/encouragement
    let rewardMessage = '';
    if (habit.currentStreak === 1) {
        rewardMessage = '🌱 Great start!';
    } else if (habit.currentStreak === 7) {
        rewardMessage = '🎉 One week streak! Amazing!';
    } else if (habit.currentStreak === 30) {
        rewardMessage = '🏆 30 days! You\'re building a strong habit!';
    } else if (habit.currentStreak === 100) {
        rewardMessage = '💎 100 days! You\'re a habit master!';
    } else if (habit.currentStreak % 10 === 0) {
        rewardMessage = `🔥 ${habit.currentStreak} day streak! Keep it up!`;
    }

    const embed = new EmbedBuilder()
        .setTitle('🎯 Habit Completed!')
        .setDescription(`You've completed **${habitName}** for today!`)
        .addFields(
            { name: 'Current Streak', value: `🔥 ${habit.currentStreak} days`, inline: true },
            { name: 'Total Completions', value: habit.totalCompletions.toString(), inline: true },
            { name: 'Longest Streak', value: `🏆 ${habit.longestStreak} days`, inline: true }
        )
        .setColor('#00FF00')
        .setTimestamp();

    if (rewardMessage) {
        embed.addFields({ name: 'Achievement', value: rewardMessage, inline: false });
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleView(interaction) {
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;
    const key = `${guildId}_${userId}`;

    const habitsData = interaction.client.habitsData[key];
    const habits = Object.values(habitsData.habits);

    if (habits.length === 0) {
        return interaction.reply({ content: '📝 You don\'t have any habits tracked yet. Use `/habits add` to start!', ephemeral: true });
    }

    const today = new Date().toDateString();
    
    const embed = new EmbedBuilder()
        .setTitle('📋 Your Habits Overview')
        .setColor('#4169E1')
        .setTimestamp();

    habits.forEach(habit => {
        const lastCompleted = habit.lastCompleted ? new Date(habit.lastCompleted).toDateString() : null;
        const completedToday = lastCompleted === today;
        const status = completedToday ? '✅' : '⭕';
        const streakText = habit.currentStreak > 0 ? `🔥 ${habit.currentStreak}` : '💤 0';
        
        embed.addFields({
            name: `${status} ${habit.name.charAt(0).toUpperCase() + habit.name.slice(1)}`,
            value: `${habit.description}\n**Streak:** ${streakText} | **Total:** ${habit.totalCompletions}`,
            inline: false
        });
    });

    const completedToday = habits.filter(h => {
        const lastCompleted = h.lastCompleted ? new Date(h.lastCompleted).toDateString() : null;
        return lastCompleted === today;
    }).length;

    embed.setFooter({ 
        text: `${completedToday}/${habits.length} completed today • ${habitsData.totalCompletions} total completions` 
    });

    await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleStats(interaction) {
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;
    const key = `${guildId}_${userId}`;

    const habitsData = interaction.client.habitsData[key];
    const habits = Object.values(habitsData.habits);

    if (habits.length === 0) {
        return interaction.reply({ content: '📊 No habits to analyze yet. Add some habits first!', ephemeral: true });
    }

    const totalDaysTracking = Math.max(1, Math.ceil((Date.now() - Math.min(...habits.map(h => h.createdAt))) / (24 * 60 * 60 * 1000)));
    const avgCompletionsPerDay = Math.round((habitsData.totalCompletions / totalDaysTracking) * 10) / 10;
    
    const bestHabit = habits.reduce((best, current) => 
        current.currentStreak > best.currentStreak ? current : best
    );
    
    const mostCompleted = habits.reduce((most, current) => 
        current.totalCompletions > most.totalCompletions ? current : most
    );

    const today = new Date().toDateString();
    const completedToday = habits.filter(h => {
        const lastCompleted = h.lastCompleted ? new Date(h.lastCompleted).toDateString() : null;
        return lastCompleted === today;
    }).length;

    const completionRate = habits.length > 0 ? Math.round((completedToday / habits.length) * 100) : 0;

    const embed = new EmbedBuilder()
        .setTitle('📊 Your Habit Statistics')
        .addFields(
            { name: '📋 Total Habits', value: habits.length.toString(), inline: true },
            { name: '✅ Total Completions', value: habitsData.totalCompletions.toString(), inline: true },
            { name: '📅 Days Tracking', value: totalDaysTracking.toString(), inline: true },
            { name: '📈 Avg/Day', value: avgCompletionsPerDay.toString(), inline: true },
            { name: '🎯 Today\'s Rate', value: `${completionRate}%`, inline: true },
            { name: '🔥 Best Streak', value: `${bestHabit.name} (${bestHabit.currentStreak} days)`, inline: true },
            { name: '🏆 Most Completed', value: `${mostCompleted.name} (${mostCompleted.totalCompletions}×)`, inline: false }
        )
        .setColor('#FFD700')
        .setTimestamp();

    // Add progress bar for today
    const progressBar = '█'.repeat(Math.floor(completionRate / 10)) + '░'.repeat(10 - Math.floor(completionRate / 10));
    embed.addFields({ 
        name: '📊 Today\'s Progress', 
        value: `${progressBar} ${completedToday}/${habits.length}`, 
        inline: false 
    });

    await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleRemove(interaction) {
    const habitName = interaction.options.getString('habit').toLowerCase();
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;
    const key = `${guildId}_${userId}`;

    const habitsData = interaction.client.habitsData[key];

    if (!habitsData.habits[habitName]) {
        return interaction.reply({ content: '❌ Habit not found!', ephemeral: true });
    }

    const habit = habitsData.habits[habitName];
    delete habitsData.habits[habitName];
    habitsData.totalHabits--;

    await interaction.reply({ 
        content: `✅ Habit **${habitName}** removed successfully!\n*You had completed it ${habit.totalCompletions} times with a best streak of ${habit.longestStreak} days.*`, 
        ephemeral: true 
    });
}

async function handleStreak(interaction) {
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;
    const key = `${guildId}_${userId}`;

    const habitsData = interaction.client.habitsData[key];
    const habits = Object.values(habitsData.habits);

    if (habits.length === 0) {
        return interaction.reply({ content: '🔥 No habits to show streaks for yet!', ephemeral: true });
    }

    const sortedByStreak = habits.sort((a, b) => b.currentStreak - a.currentStreak);
    
    const embed = new EmbedBuilder()
        .setTitle('🔥 Your Current Streaks')
        .setColor('#FF4500')
        .setTimestamp();

    sortedByStreak.forEach((habit, index) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏃';
        const streakIcon = habit.currentStreak > 0 ? '🔥' : '💤';
        
        embed.addFields({
            name: `${medal} ${habit.name.charAt(0).toUpperCase() + habit.name.slice(1)}`,
            value: `${streakIcon} **${habit.currentStreak} days** (Best: ${habit.longestStreak})`,
            inline: true
        });
    });

    const totalActiveStreaks = habits.filter(h => h.currentStreak > 0).length;
    embed.setFooter({ text: `${totalActiveStreaks}/${habits.length} habits have active streaks` });

    await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleReset(interaction) {
    const habitName = interaction.options.getString('habit').toLowerCase();
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;
    const key = `${guildId}_${userId}`;

    const habitsData = interaction.client.habitsData[key];
    const habit = habitsData.habits[habitName];

    if (!habit) {
        return interaction.reply({ content: '❌ Habit not found!', ephemeral: true });
    }

    const oldStats = {
        completions: habit.totalCompletions,
        streak: habit.currentStreak,
        longestStreak: habit.longestStreak
    };

    // Reset habit progress
    habit.completions = [];
    habit.currentStreak = 0;
    habit.longestStreak = 0;
    habit.totalCompletions = 0;
    habit.lastCompleted = null;

    await interaction.reply({ 
        content: `🔄 Habit **${habitName}** has been reset!\n*Previous stats: ${oldStats.completions} completions, ${oldStats.streak} current streak, ${oldStats.longestStreak} best streak*`, 
        ephemeral: true 
    });
}
