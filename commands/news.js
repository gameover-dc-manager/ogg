
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('news')
        .setDescription('Get the latest world news')
        .addStringOption(option =>
            option.setName('category')
                .setDescription('News category')
                .setRequired(false)
                .addChoices(
                    { name: 'General', value: 'general' },
                    { name: 'Technology', value: 'technology' },
                    { name: 'Science', value: 'science' },
                    { name: 'Business', value: 'business' },
                    { name: 'Health', value: 'health' },
                    { name: 'Sports', value: 'sports' },
                    { name: 'Entertainment', value: 'entertainment' }
                ))
        .addIntegerOption(option =>
            option.setName('count')
                .setDescription('Number of articles (1-10)')
                .setMinValue(1)
                .setMaxValue(10)
                .setRequired(false)),

    async execute(interaction) {
        try {
            await interaction.deferReply();

            const category = interaction.options.getString('category') || 'general';
            const count = interaction.options.getInteger('count') || 5;

            // Using NewsAPI (you'll need to get a free API key from newsapi.org)
            const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
            const apiKey = "81dc04f2c48548b7bfa4b190afc7df1a";

            if (!apiKey) {
                return await interaction.editReply({
                    content: '❌ News API key not configured. Please add NEWS_API_KEY to your environment variables.'
                });
            }

            const url = `https://newsapi.org/v2/top-headlines?category=${category}&country=us&pageSize=${count}&apiKey=${apiKey}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();

            if (data.status !== 'ok' || !data.articles || data.articles.length === 0) {
                return await interaction.editReply({
                    content: '❌ No news articles found or API error occurred.'
                });
            }

            const embed = new EmbedBuilder()
                .setTitle(`📰 Latest ${category.charAt(0).toUpperCase() + category.slice(1)} News`)
                .setColor('#FF6B35')
                .setTimestamp()
                .setFooter({ text: 'Powered by NewsAPI' });

            // Add articles as fields
            for (let i = 0; i < Math.min(data.articles.length, count); i++) {
                const article = data.articles[i];
                if (!article.title) continue;
                
                const title = article.title.length > 100 ? article.title.substring(0, 97) + '...' : article.title;
                const description = article.description ? 
                    (article.description.length > 200 ? article.description.substring(0, 197) + '...' : article.description) 
                    : 'No description available';

                embed.addFields({
                    name: `${i + 1}. ${title}`,
                    value: `${description}\n[Read more](${article.url || '#'})`,
                    inline: false
                });
            }

            return await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Error fetching news:', error);
            
            try {
                if (interaction.deferred && !interaction.replied) {
                    await interaction.editReply({
                        content: '❌ An error occurred while fetching news. Please try again later.'
                    });
                } else if (!interaction.replied) {
                    await interaction.reply({
                        content: '❌ An error occurred while fetching news. Please try again later.',
                        ephemeral: true
                    });
                }
            } catch (replyError) {
                console.error('Failed to handle error response:', replyError.message);
            }
        }
    }
};
