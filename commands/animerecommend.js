
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('animerecommend')
        .setDescription('Get personalized anime recommendations')
        .addStringOption(option =>
            option.setName('genre')
                .setDescription('Preferred genre')
                .setRequired(false)
                .addChoices(
                    { name: 'Action', value: '1' },
                    { name: 'Adventure', value: '2' },
                    { name: 'Comedy', value: '4' },
                    { name: 'Drama', value: '8' },
                    { name: 'Fantasy', value: '10' },
                    { name: 'Romance', value: '22' },
                    { name: 'Sci-Fi', value: '24' },
                    { name: 'Slice of Life', value: '36' },
                    { name: 'Supernatural', value: '37' },
                    { name: 'Thriller', value: '41' }
                ))
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Anime type')
                .setRequired(false)
                .addChoices(
                    { name: 'TV Series', value: 'tv' },
                    { name: 'Movie', value: 'movie' },
                    { name: 'OVA', value: 'ova' },
                    { name: 'Special', value: 'special' }
                ))
        .addStringOption(option =>
            option.setName('status')
                .setDescription('Anime status')
                .setRequired(false)
                .addChoices(
                    { name: 'Currently Airing', value: 'airing' },
                    { name: 'Completed', value: 'complete' },
                    { name: 'Upcoming', value: 'upcoming' }
                ))
        .addIntegerOption(option =>
            option.setName('count')
                .setDescription('Number of recommendations (1-10)')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(10)),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
            
            const genre = interaction.options.getString('genre');
            const type = interaction.options.getString('type');
            const status = interaction.options.getString('status');
            const count = interaction.options.getInteger('count') || 5;

            // Build API URL with filters
            let url = 'https://api.jikan.moe/v4/anime?order_by=score&sort=desc&limit=25';
            
            if (genre) url += `&genres=${genre}`;
            if (type) url += `&type=${type}`;
            if (status) url += `&status=${status}`;

            const response = await fetch(url);
            const data = await response.json();

            if (!data.data || data.data.length === 0) {
                return interaction.editReply({
                    content: '❌ No anime found with the specified criteria. Try different filters!',
                    ephemeral: true
                });
            }

            // Shuffle and select random recommendations
            const shuffled = data.data.sort(() => 0.5 - Math.random());
            const recommendations = shuffled.slice(0, count);

            const embed = new EmbedBuilder()
                .setTitle('🎌 Personalized Anime Recommendations')
                .setColor('#FF6B35')
                .setTimestamp()
                .setFooter({ text: 'Data from MyAnimeList via Jikan API' });

            let description = '';
            recommendations.forEach((anime, index) => {
                const score = anime.score ? `⭐ ${anime.score}` : '❓ N/A';
                const episodes = anime.episodes ? `📺 ${anime.episodes} eps` : '📺 Unknown';
                const year = anime.year ? `📅 ${anime.year}` : '';
                
                description += `**${index + 1}.** [${anime.title}](${anime.url})\n`;
                description += `${score} | ${episodes} ${year}\n`;
                
                if (anime.synopsis) {
                    const shortSynopsis = anime.synopsis.length > 100 ? 
                        anime.synopsis.substring(0, 100) + '...' : 
                        anime.synopsis;
                    description += `*${shortSynopsis}*\n\n`;
                } else {
                    description += '\n';
                }
            });

            embed.setDescription(description);

            // Add filter info
            let filterInfo = '';
            if (genre) {
                const genreNames = {
                    '1': 'Action', '2': 'Adventure', '4': 'Comedy', '8': 'Drama',
                    '10': 'Fantasy', '22': 'Romance', '24': 'Sci-Fi',
                    '36': 'Slice of Life', '37': 'Supernatural', '41': 'Thriller'
                };
                filterInfo += `🎭 Genre: ${genreNames[genre]}\n`;
            }
            if (type) filterInfo += `📺 Type: ${type.toUpperCase()}\n`;
            if (status) filterInfo += `📊 Status: ${status.charAt(0).toUpperCase() + status.slice(1)}\n`;
            
            if (filterInfo) {
                embed.addFields({ name: 'Applied Filters', value: filterInfo, inline: true });
            }

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('anime_recommend_refresh')
                        .setLabel('Get New Recommendations')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('🔄'),
                    new ButtonBuilder()
                        .setCustomId('anime_recommend_random')
                        .setLabel('Surprise Me!')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('🎲')
                );

            await interaction.editReply({ embeds: [embed], components: [row] });

        } catch (error) {
            console.error('Error in animerecommend command:', error);
            
            if (interaction.deferred || interaction.replied) {
                try {
                    await interaction.editReply({
                        content: '❌ An error occurred while fetching recommendations. Please try again later.'
                    });
                } catch (replyError) {
                    console.error('Failed to edit reply:', replyError.message);
                }
            } else {
                try {
                    await interaction.reply({
                        content: '❌ An error occurred while fetching recommendations. Please try again later.',
                        ephemeral: true
                    });
                } catch (replyError) {
                    console.error('Failed to reply:', replyError.message);
                }
            }
        }
    }
};
