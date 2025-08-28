
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('animeinfo')
        .setDescription('Get detailed anime, manga, and manhwa information')
        .addSubcommand(subcommand =>
            subcommand
                .setName('search')
                .setDescription('Search for anime or manga')
                .addStringOption(option =>
                    option.setName('query')
                        .setDescription('Title to search for')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('type')
                        .setDescription('Content type')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Anime', value: 'anime' },
                            { name: 'Manga', value: 'manga' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('trending')
                .setDescription('Get trending anime/manga')
                .addStringOption(option =>
                    option.setName('type')
                        .setDescription('Content type')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Anime', value: 'anime' },
                            { name: 'Manga', value: 'manga' },
                            { name: 'Manhwa', value: 'manhwa' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('schedule')
                .setDescription('Get anime airing schedule')
                .addStringOption(option =>
                    option.setName('day')
                        .setDescription('Day of the week')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Monday', value: 'monday' },
                            { name: 'Tuesday', value: 'tuesday' },
                            { name: 'Wednesday', value: 'wednesday' },
                            { name: 'Thursday', value: 'thursday' },
                            { name: 'Friday', value: 'friday' },
                            { name: 'Saturday', value: 'saturday' },
                            { name: 'Sunday', value: 'sunday' },
                            { name: 'Today', value: 'now' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('random')
                .setDescription('Get a random anime or manga recommendation')
                .addStringOption(option =>
                    option.setName('type')
                        .setDescription('Content type')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Anime', value: 'anime' },
                            { name: 'Manga', value: 'manga' }
                        ))),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const subcommand = interaction.options.getSubcommand();
            const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

            switch (subcommand) {
                case 'search':
                    await this.handleSearch(interaction, fetch);
                    break;
                case 'trending':
                    await this.handleTrending(interaction, fetch);
                    break;
                case 'schedule':
                    await this.handleSchedule(interaction, fetch);
                    break;
                case 'random':
                    await this.handleRandom(interaction, fetch);
                    break;
            }
        } catch (error) {
            console.error('Error in animeinfo command:', error);
            
            // Check if interaction is still valid before replying
            if (interaction.deferred || interaction.replied) {
                try {
                    await interaction.editReply({
                        content: '❌ An error occurred while fetching anime information. Please try again later.'
                    });
                } catch (replyError) {
                    console.error('Failed to edit reply:', replyError.message);
                }
            } else {
                try {
                    await interaction.reply({
                        content: '❌ An error occurred while fetching anime information. Please try again later.',
                        ephemeral: true
                    });
                } catch (replyError) {
                    console.error('Failed to reply:', replyError.message);
                }
            }
        }
    },

    async handleSearch(interaction, fetch) {
        const query = interaction.options.getString('query');
        const type = interaction.options.getString('type') || 'anime';

        const url = `https://api.jikan.moe/v4/${type}?q=${encodeURIComponent(query)}&limit=5&order_by=score&sort=desc`;
        const response = await fetch(url);
        const data = await response.json();

        if (!data.data || data.data.length === 0) {
            return interaction.editReply({
                content: `❌ No ${type} found for "${query}".`,
                ephemeral: true
            });
        }

        const item = data.data[0]; // Get the top result
        const embed = this.createDetailedEmbed(item, type);

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel('View on MyAnimeList')
                    .setStyle(ButtonStyle.Link)
                    .setURL(item.url),
                new ButtonBuilder()
                    .setCustomId(`anime_more_${item.mal_id}_${type}`)
                    .setLabel('More Info')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('ℹ️')
            );

        await interaction.editReply({ embeds: [embed], components: [row] });
    },

    async handleTrending(interaction, fetch) {
        const type = interaction.options.getString('type') || 'anime';
        let url;
        let embedTitle;

        if (type === 'manhwa') {
            url = 'https://api.jikan.moe/v4/manga?genres=41&order_by=score&sort=desc&limit=10';
            embedTitle = '🇰🇷 Trending Manhwa';
        } else if (type === 'anime') {
            url = 'https://api.jikan.moe/v4/seasons/now?limit=10&order_by=score&sort=desc';
            embedTitle = '📺 Trending Anime This Season';
        } else {
            url = 'https://api.jikan.moe/v4/top/manga?limit=10';
            embedTitle = '📚 Trending Manga';
        }

        const response = await fetch(url);
        const data = await response.json();

        const embed = new EmbedBuilder()
            .setTitle(embedTitle)
            .setColor(type === 'anime' ? '#FF6B35' : type === 'manhwa' ? '#9C27B0' : '#4CAF50')
            .setTimestamp()
            .setFooter({ text: 'Data from MyAnimeList via Jikan API' });

        if (data.data && data.data.length > 0) {
            const description = data.data.slice(0, 10).map((item, index) => {
                const score = item.score ? `⭐ ${item.score}` : '❓ N/A';
                const status = item.status ? `• ${item.status}` : '';
                return `**${index + 1}.** [${item.title}](${item.url}) ${score} ${status}`;
            }).join('\n');

            embed.setDescription(description);
        } else {
            embed.setDescription('No trending content found.');
        }

        await interaction.editReply({ embeds: [embed] });
    },

    async handleSchedule(interaction, fetch) {
        const day = interaction.options.getString('day') || 'now';
        const url = day === 'now' ? 
            'https://api.jikan.moe/v4/schedules/now?limit=15' :
            `https://api.jikan.moe/v4/schedules/${day}?limit=15`;

        const response = await fetch(url);
        const data = await response.json();

        const embed = new EmbedBuilder()
            .setTitle(`📅 Anime Schedule${day !== 'now' ? ` - ${day.charAt(0).toUpperCase() + day.slice(1)}` : ' - Today'}`)
            .setColor('#2196F3')
            .setTimestamp()
            .setFooter({ text: 'Data from MyAnimeList via Jikan API' });

        if (data.data && data.data.length > 0) {
            for (let i = 0; i < Math.min(data.data.length, 8); i++) {
                const anime = data.data[i];
                const broadcastInfo = anime.broadcast ? 
                    `${anime.broadcast.day} at ${anime.broadcast.time}` : 
                    'Time not specified';
                
                embed.addFields({
                    name: anime.title,
                    value: `📺 **Broadcast:** ${broadcastInfo}\n⭐ **Score:** ${anime.score || 'N/A'}\n🔗 [View on MAL](${anime.url})`,
                    inline: true
                });
            }
        } else {
            embed.setDescription('No scheduled anime found for this day.');
        }

        await interaction.editReply({ embeds: [embed] });
    },

    async handleRandom(interaction, fetch) {
        const type = interaction.options.getString('type') || 'anime';
        const url = `https://api.jikan.moe/v4/random/${type}`;

        const response = await fetch(url);
        const data = await response.json();

        if (!data.data) {
            return interaction.editReply({
                content: `❌ Could not fetch random ${type}.`,
                ephemeral: true
            });
        }

        const embed = this.createDetailedEmbed(data.data, type);
        embed.setTitle(`🎲 Random ${type.charAt(0).toUpperCase() + type.slice(1)} Recommendation`);

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel('View on MyAnimeList')
                    .setStyle(ButtonStyle.Link)
                    .setURL(data.data.url),
                new ButtonBuilder()
                    .setCustomId(`anime_random_${type}`)
                    .setLabel('Get Another')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🎲')
            );

        await interaction.editReply({ embeds: [embed], components: [row] });
    },

    createDetailedEmbed(item, type) {
        const embed = new EmbedBuilder()
            .setTitle(item.title)
            .setColor(type === 'anime' ? '#FF6B35' : '#4CAF50')
            .setTimestamp()
            .setFooter({ text: 'Data from MyAnimeList via Jikan API' });

        if (item.images?.jpg?.large_image_url) {
            embed.setThumbnail(item.images.jpg.large_image_url);
        }

        if (item.synopsis) {
            const synopsis = item.synopsis.length > 1000 ? 
                item.synopsis.substring(0, 997) + '...' : 
                item.synopsis;
            embed.setDescription(synopsis);
        }

        // Basic info
        let basicInfo = '';
        if (item.score) basicInfo += `⭐ **Score:** ${item.score}/10\n`;
        if (item.status) basicInfo += `📊 **Status:** ${item.status}\n`;
        if (item.type) basicInfo += `📺 **Type:** ${item.type}\n`;
        
        if (type === 'anime') {
            if (item.episodes) basicInfo += `📹 **Episodes:** ${item.episodes}\n`;
            if (item.duration) basicInfo += `⏱️ **Duration:** ${item.duration}\n`;
            if (item.studios && item.studios.length > 0) {
                basicInfo += `🏢 **Studio:** ${item.studios.map(s => s.name).join(', ')}\n`;
            }
        } else {
            if (item.chapters) basicInfo += `📖 **Chapters:** ${item.chapters}\n`;
            if (item.volumes) basicInfo += `📚 **Volumes:** ${item.volumes}\n`;
            if (item.authors && item.authors.length > 0) {
                basicInfo += `✍️ **Author:** ${item.authors.map(a => a.name).join(', ')}\n`;
            }
        }

        if (basicInfo) {
            embed.addFields({ name: 'Basic Information', value: basicInfo, inline: true });
        }

        // Dates and additional info
        let additionalInfo = '';
        if (item.aired?.from || item.published?.from) {
            const startDate = item.aired?.from || item.published?.from;
            additionalInfo += `📅 **Started:** ${new Date(startDate).toLocaleDateString()}\n`;
        }
        if (item.aired?.to || item.published?.to) {
            const endDate = item.aired?.to || item.published?.to;
            additionalInfo += `🏁 **Ended:** ${new Date(endDate).toLocaleDateString()}\n`;
        }
        if (item.rating) additionalInfo += `🔞 **Rating:** ${item.rating}\n`;
        if (item.rank) additionalInfo += `🏆 **Rank:** #${item.rank}\n`;
        if (item.popularity) additionalInfo += `👥 **Popularity:** #${item.popularity}\n`;

        if (additionalInfo) {
            embed.addFields({ name: 'Additional Info', value: additionalInfo, inline: true });
        }

        // Genres
        if (item.genres && item.genres.length > 0) {
            const genres = item.genres.map(g => g.name).join(', ');
            embed.addFields({ name: 'Genres', value: genres, inline: false });
        }

        return embed;
    }
};
