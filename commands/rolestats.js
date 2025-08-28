const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rolestats')
        .setDescription('Display role statistics and member counts')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Channel to send the role stats to')
                .setRequired(false))
        .addBooleanOption(option =>
            option.setName('reactions')
                .setDescription('Add reaction numbers below the embed')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

    async execute(interaction) {
        try {
            await interaction.deferReply({ ephemeral: true });

            const channel = interaction.options.getChannel('channel') || interaction.channel;
            const addReactions = interaction.options.getBoolean('reactions') ?? true;

            // Get all roles with members (excluding @everyone)
            const roles = interaction.guild.roles.cache
                .filter(role => role.id !== interaction.guild.id && role.members.size > 0)
                .sort((a, b) => b.position - a.position);

            if (roles.size === 0) {
                return interaction.editReply({ content: '❌ No roles with members found.' });
            }

            // Create embed similar to the screenshot
            const embed = new EmbedBuilder()
                .setTitle('Reaction role')
                .setDescription('Role member statistics')
                .setColor('#5865F2')
                .setTimestamp();

            // Add roles to embed (limit to prevent embed size issues)
            const roleList = roles.first(20).map(role => {
                const emoji = this.getRoleEmoji(role.name) || '👤';
                return `${emoji} @${role.name.toUpperCase()}`;
            }).join('\n');

            embed.addFields({ name: 'Roles', value: roleList, inline: false });

            // Send the main embed
            const message = await channel.send({ embeds: [embed] });

            // Add reaction count display like in the screenshot
            if (addReactions) {
                let reactionText = '';
                const topRoles = roles.first(10); // Limit to prevent message length issues

                for (const role of topRoles.values()) {
                    const emoji = this.getRoleEmoji(role.name) || '👤';
                    reactionText += `${emoji} **${role.members.size}** `;
                }

                if (reactionText) {
                    await channel.send(reactionText);
                }
            }

            const successEmbed = new EmbedBuilder()
                .setTitle('✅ Role Stats Deployed')
                .setDescription(`Role statistics sent to ${channel}`)
                .addFields(
                    { name: '📊 Stats', value: `Total roles: ${roles.size}\nShowing: ${Math.min(20, roles.size)}`, inline: true }
                )
                .setColor('#00FF00');

            await interaction.editReply({ embeds: [successEmbed] });

        } catch (error) {
            console.error('Error in rolestats command:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ 
                    content: '❌ An error occurred while generating role stats.', 
                    ephemeral: true 
                });
            } else {
                await interaction.editReply({ content: '❌ An error occurred while generating role stats.' });
            }
        }
    },

    getRoleEmoji(roleName) {
        const emojiMap = {
            'COC': '👑',
            'BGMI': '🎮',
            'MINECRAFT': '⛏️',
            'CODM': '🔫',
            'STUMBLE GUYS': '🏃',
            'FALL GUYS': '🏃',
            'VALORANT': '🎯',
            'STANDOFF2': '💥',
            'SUPERSUS': '🕵️',
            'AMONG US': '🚀',
            'GENSHIN IMPACT': '⚔️',
            'CS:GO': '💣',
            'CSGO': '💣'
        };

        const upperName = roleName.toUpperCase();
        for (const [key, emoji] of Object.entries(emojiMap)) {
            if (upperName.includes(key)) {
                return emoji;
            }
        }
        return null;
    }
};