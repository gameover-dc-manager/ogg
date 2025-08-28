
const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('diary')
        .setDescription('Personal diary and journal system')
        .addSubcommand(subcommand =>
            subcommand
                .setName('write')
                .setDescription('Write a diary entry')
                .addStringOption(option =>
                    option.setName('entry')
                        .setDescription('Your diary entry')
                        .setRequired(true)
                        .setMaxLength(1000))
                .addStringOption(option =>
                    option.setName('mood')
                        .setDescription('Your mood for this entry')
                        .setRequired(false)
                        .addChoices(
                            { name: '😊 Happy', value: 'happy' },
                            { name: '😢 Sad', value: 'sad' },
                            { name: '😴 Tired', value: 'tired' },
                            { name: '😎 Cool', value: 'cool' },
                            { name: '🤔 Thoughtful', value: 'thoughtful' },
                            { name: '😡 Frustrated', value: 'frustrated' },
                            { name: '😍 Excited', value: 'excited' },
                            { name: '🤗 Grateful', value: 'grateful' },
                            { name: '😌 Peaceful', value: 'peaceful' },
                            { name: '🤪 Silly', value: 'silly' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('read')
                .setDescription('Read your diary entries')
                .addStringOption(option =>
                    option.setName('filter')
                        .setDescription('Filter entries')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Today', value: 'today' },
                            { name: 'This Week', value: 'week' },
                            { name: 'This Month', value: 'month' },
                            { name: 'Happy Entries', value: 'happy' },
                            { name: 'Sad Entries', value: 'sad' },
                            { name: 'Recent (Last 5)', value: 'recent' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('stats')
                .setDescription('View your diary statistics'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('search')
                .setDescription('Search your diary entries')
                .addStringOption(option =>
                    option.setName('keyword')
                        .setDescription('Keyword to search for')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('export')
                .setDescription('Export your diary entries'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('delete')
                .setDescription('Delete a diary entry')
                .addIntegerOption(option =>
                    option.setName('entry_id')
                        .setDescription('ID of the entry to delete')
                        .setRequired(true))),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        // Initialize diary data
        if (!interaction.client.diaryData) {
            interaction.client.diaryData = {};
        }

        const userId = interaction.user.id;
        const guildId = interaction.guild.id;
        const key = `${guildId}_${userId}`;

        if (!interaction.client.diaryData[key]) {
            interaction.client.diaryData[key] = {
                entries: [],
                totalEntries: 0,
                streakDays: 0,
                lastEntryDate: null
            };
        }

        switch (subcommand) {
            case 'write':
                await handleWrite(interaction);
                break;
            case 'read':
                await handleRead(interaction);
                break;
            case 'stats':
                await handleStats(interaction);
                break;
            case 'search':
                await handleSearch(interaction);
                break;
            case 'export':
                await handleExport(interaction);
                break;
            case 'delete':
                await handleDelete(interaction);
                break;
        }

        // Save diary data
        global.saveDiaryData = () => {
            const fs = require('fs');
            fs.writeFileSync('./config/diary_data.json', JSON.stringify(interaction.client.diaryData, null, 2));
        };
        global.saveDiaryData();
    }
};

async function handleWrite(interaction) {
    const entry = interaction.options.getString('entry');
    const mood = interaction.options.getString('mood') || 'neutral';
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;
    const key = `${guildId}_${userId}`;

    const diaryData = interaction.client.diaryData[key];
    const now = Date.now();
    const today = new Date().toDateString();

    const entryId = diaryData.totalEntries + 1;
    const newEntry = {
        id: entryId,
        content: entry,
        mood: mood,
        timestamp: now,
        date: today,
        wordCount: entry.split(' ').length
    };

    diaryData.entries.push(newEntry);
    diaryData.totalEntries++;

    // Calculate streak
    const lastEntry = diaryData.lastEntryDate ? new Date(diaryData.lastEntryDate).toDateString() : null;
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();
    
    if (lastEntry === yesterday || lastEntry === today) {
        if (lastEntry !== today) {
            diaryData.streakDays++;
        }
    } else if (lastEntry !== today) {
        diaryData.streakDays = 1;
    }
    
    diaryData.lastEntryDate = now;

    const moodEmojis = {
        'happy': '😊', 'sad': '😢', 'tired': '😴', 'cool': '😎', 'thoughtful': '🤔',
        'frustrated': '😡', 'excited': '😍', 'grateful': '🤗', 'peaceful': '😌', 'silly': '🤪'
    };

    const embed = new EmbedBuilder()
        .setTitle('📖 Diary Entry Added')
        .setDescription(`Your diary entry has been saved!`)
        .addFields(
            { name: 'Entry ID', value: `#${entryId}`, inline: true },
            { name: 'Mood', value: `${moodEmojis[mood] || '😐'} ${mood.charAt(0).toUpperCase() + mood.slice(1)}`, inline: true },
            { name: 'Word Count', value: newEntry.wordCount.toString(), inline: true },
            { name: 'Streak', value: `${diaryData.streakDays} day${diaryData.streakDays !== 1 ? 's' : ''}`, inline: true }
        )
        .setColor('#8B4513')
        .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleRead(interaction) {
    const filter = interaction.options.getString('filter') || 'recent';
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;
    const key = `${guildId}_${userId}`;

    const diaryData = interaction.client.diaryData[key];
    
    if (diaryData.entries.length === 0) {
        return interaction.reply({ content: '📖 Your diary is empty. Start writing your first entry!', ephemeral: true });
    }

    let filteredEntries = [];
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const oneWeek = 7 * oneDay;
    const oneMonth = 30 * oneDay;

    switch (filter) {
        case 'today':
            const today = new Date().toDateString();
            filteredEntries = diaryData.entries.filter(e => new Date(e.timestamp).toDateString() === today);
            break;
        case 'week':
            filteredEntries = diaryData.entries.filter(e => now - e.timestamp <= oneWeek);
            break;
        case 'month':
            filteredEntries = diaryData.entries.filter(e => now - e.timestamp <= oneMonth);
            break;
        case 'happy':
        case 'sad':
            filteredEntries = diaryData.entries.filter(e => e.mood === filter);
            break;
        case 'recent':
        default:
            filteredEntries = diaryData.entries.slice(-5);
            break;
    }

    if (filteredEntries.length === 0) {
        return interaction.reply({ content: `📖 No diary entries found for filter: ${filter}`, ephemeral: true });
    }

    const embed = new EmbedBuilder()
        .setTitle(`📖 Your Diary - ${filter.charAt(0).toUpperCase() + filter.slice(1)}`)
        .setColor('#8B4513')
        .setTimestamp();

    const moodEmojis = {
        'happy': '😊', 'sad': '😢', 'tired': '😴', 'cool': '😎', 'thoughtful': '🤔',
        'frustrated': '😡', 'excited': '😍', 'grateful': '🤗', 'peaceful': '😌', 'silly': '🤪'
    };

    filteredEntries.forEach(entry => {
        const content = entry.content.length > 200 ? entry.content.substring(0, 200) + '...' : entry.content;
        embed.addFields({
            name: `Entry #${entry.id} ${moodEmojis[entry.mood] || '😐'}`,
            value: `${content}\n*<t:${Math.floor(entry.timestamp / 1000)}:f> • ${entry.wordCount} words*`,
            inline: false
        });
    });

    if (filteredEntries.length !== diaryData.entries.length) {
        embed.setFooter({ text: `Showing ${filteredEntries.length} of ${diaryData.entries.length} total entries` });
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleStats(interaction) {
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;
    const key = `${guildId}_${userId}`;

    const diaryData = interaction.client.diaryData[key];
    
    if (diaryData.entries.length === 0) {
        return interaction.reply({ content: '📖 No diary statistics available. Start writing entries first!', ephemeral: true });
    }

    const totalWords = diaryData.entries.reduce((sum, entry) => sum + entry.wordCount, 0);
    const avgWordsPerEntry = Math.round(totalWords / diaryData.entries.length);
    
    // Calculate mood distribution
    const moodCounts = {};
    diaryData.entries.forEach(entry => {
        moodCounts[entry.mood] = (moodCounts[entry.mood] || 0) + 1;
    });
    
    const mostCommonMood = Object.keys(moodCounts).reduce((a, b) => moodCounts[a] > moodCounts[b] ? a : b);
    
    // Calculate writing frequency
    const firstEntry = new Date(diaryData.entries[0].timestamp);
    const lastEntry = new Date(diaryData.entries[diaryData.entries.length - 1].timestamp);
    const daysSinceFirst = Math.max(1, Math.ceil((lastEntry - firstEntry) / (24 * 60 * 60 * 1000)));
    const entriesPerWeek = Math.round((diaryData.entries.length / daysSinceFirst) * 7);

    const moodEmojis = {
        'happy': '😊', 'sad': '😢', 'tired': '😴', 'cool': '😎', 'thoughtful': '🤔',
        'frustrated': '😡', 'excited': '😍', 'grateful': '🤗', 'peaceful': '😌', 'silly': '🤪'
    };

    const embed = new EmbedBuilder()
        .setTitle('📊 Your Diary Statistics')
        .addFields(
            { name: '📖 Total Entries', value: diaryData.totalEntries.toString(), inline: true },
            { name: '🔥 Current Streak', value: `${diaryData.streakDays} days`, inline: true },
            { name: '📝 Total Words', value: totalWords.toString(), inline: true },
            { name: '📊 Avg Words/Entry', value: avgWordsPerEntry.toString(), inline: true },
            { name: '📅 Entries/Week', value: entriesPerWeek.toString(), inline: true },
            { name: '😊 Most Common Mood', value: `${moodEmojis[mostCommonMood] || '😐'} ${mostCommonMood}`, inline: true }
        )
        .setColor('#8B4513')
        .setTimestamp();

    if (diaryData.entries.length > 0) {
        embed.addFields({
            name: '📅 Writing Period',
            value: `${firstEntry.toLocaleDateString()} - ${lastEntry.toLocaleDateString()}`,
            inline: false
        });
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleSearch(interaction) {
    const keyword = interaction.options.getString('keyword').toLowerCase();
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;
    const key = `${guildId}_${userId}`;

    const diaryData = interaction.client.diaryData[key];
    
    if (diaryData.entries.length === 0) {
        return interaction.reply({ content: '📖 Your diary is empty. Nothing to search!', ephemeral: true });
    }

    const matchingEntries = diaryData.entries.filter(entry => 
        entry.content.toLowerCase().includes(keyword)
    );

    if (matchingEntries.length === 0) {
        return interaction.reply({ content: `📖 No diary entries found containing "${keyword}"`, ephemeral: true });
    }

    const embed = new EmbedBuilder()
        .setTitle(`📖 Search Results for "${keyword}"`)
        .setColor('#8B4513')
        .setTimestamp();

    const moodEmojis = {
        'happy': '😊', 'sad': '😢', 'tired': '😴', 'cool': '😎', 'thoughtful': '🤔',
        'frustrated': '😡', 'excited': '😍', 'grateful': '🤗', 'peaceful': '😌', 'silly': '🤪'
    };

    matchingEntries.slice(-5).forEach(entry => {
        const content = entry.content.length > 150 ? entry.content.substring(0, 150) + '...' : entry.content;
        embed.addFields({
            name: `Entry #${entry.id} ${moodEmojis[entry.mood] || '😐'}`,
            value: `${content}\n*<t:${Math.floor(entry.timestamp / 1000)}:f>*`,
            inline: false
        });
    });

    embed.setFooter({ text: `Found ${matchingEntries.length} matching entries` });

    await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleExport(interaction) {
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;
    const key = `${guildId}_${userId}`;

    const diaryData = interaction.client.diaryData[key];
    
    if (diaryData.entries.length === 0) {
        return interaction.reply({ content: '📖 Your diary is empty. Nothing to export!', ephemeral: true });
    }

    let exportText = `# ${interaction.user.username}'s Diary Export\n\n`;
    exportText += `Generated on: ${new Date().toLocaleString()}\n`;
    exportText += `Total Entries: ${diaryData.entries.length}\n`;
    exportText += `Current Streak: ${diaryData.streakDays} days\n\n`;
    exportText += `${'='.repeat(50)}\n\n`;

    diaryData.entries.forEach(entry => {
        exportText += `## Entry #${entry.id} - ${new Date(entry.timestamp).toLocaleDateString()}\n`;
        exportText += `**Mood:** ${entry.mood}\n`;
        exportText += `**Word Count:** ${entry.wordCount}\n\n`;
        exportText += `${entry.content}\n\n`;
        exportText += `${'-'.repeat(30)}\n\n`;
    });

    const buffer = Buffer.from(exportText, 'utf-8');
    const attachment = new AttachmentBuilder(buffer, { name: `diary-export-${Date.now()}.txt` });

    await interaction.reply({ 
        content: '📖 Here\'s your diary export!', 
        files: [attachment], 
        ephemeral: true 
    });
}

async function handleDelete(interaction) {
    const entryId = interaction.options.getInteger('entry_id');
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;
    const key = `${guildId}_${userId}`;

    const diaryData = interaction.client.diaryData[key];
    
    const entryIndex = diaryData.entries.findIndex(entry => entry.id === entryId);
    if (entryIndex === -1) {
        return interaction.reply({ content: '❌ Diary entry not found.', ephemeral: true });
    }

    const deletedEntry = diaryData.entries.splice(entryIndex, 1)[0];
    
    await interaction.reply({ 
        content: `✅ Diary entry #${entryId} deleted successfully!\n*"${deletedEntry.content.substring(0, 50)}${deletedEntry.content.length > 50 ? '...' : ''}"*`, 
        ephemeral: true 
    });
}
