
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('support')
        .setDescription('Get support and join our community server'),

    async execute(interaction) {
        try {
            const embed = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle('🛟 Support & Community')
                .setDescription('Need help or want to connect with our community? We\'re here for you!')
                .setThumbnail(interaction.client.user.displayAvatarURL({ dynamic: true, size: 256 }))
                .addFields(
                    {
                        name: '🏠 Official Support Server',
                        value: '[Click here to join our server](https://discord.gg/f3D6hh5Jcd)\n`https://discord.gg/f3D6hh5Jcd`',
                        inline: false
                    },
                    {
                        name: '❓ What can you get help with?',
                        value: '• Bot setup and configuration\n• Command usage and troubleshooting\n• Feature requests and suggestions\n• Bug reports and issues\n• General Discord server management',
                        inline: false
                    },
                    {
                        name: '💬 Community Features',
                        value: '• Active community discussions\n• Bot updates and announcements\n• Beta testing opportunities\n• Direct support from developers\n• Share your server setups',
                        inline: false
                    },
                    {
                        name: '🚀 Quick Help',
                        value: 'Use `/help` to see all available commands\nUse `/setup dashboard` to configure the bot\nUse `/admin panel` for advanced settings',
                        inline: false
                    }
                )
                .setFooter({ 
                    text: `Requested by ${interaction.user.tag} • Join us for the best support experience!`,
                    iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                })
                .setTimestamp();

            // Log the support command usage
            const { logAction } = require('../utils/loggingSystem');
            await logAction(interaction.guild, 'command_usage', {
                command: 'support',
                user: interaction.user,
                parameters: 'Support server link requested'
            }, interaction.user);

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error in support command:', error);
            
            // Fallback response if embed fails
            const fallbackMessage = `🛟 **Support & Community**\n\nJoin our official support server for help and community discussions:\nhttps://discord.gg/f3D6hh5Jcd\n\nUse \`/help\` to see all available commands.`;
            
            try {
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({ content: fallbackMessage });
                } else {
                    await interaction.editReply({ content: fallbackMessage });
                }
            } catch (replyError) {
                console.error('Failed to send fallback support message:', replyError);
            }
        }
    }
};
