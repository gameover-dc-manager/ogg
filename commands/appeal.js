const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('appeal')
        .setDescription('Appeal a timeout'),
    
    async execute(interaction) {
        const userId = interaction.user.id;
        const member = interaction.guild.members.cache.get(userId);
        
        // Check if user is currently timed out
        if (!member || !member.isCommunicationDisabled()) {
            return interaction.reply({ 
                content: 'You are not currently timed out.',
                ephemeral: true
            });
        }
        
        // Initialize global appealedUsers if it doesn't exist
        if (!global.appealedUsers) {
            global.appealedUsers = new Set();
        }
        
        // Check if user has already appealed
        if (global.appealedUsers.has(userId)) {
            return interaction.reply({ 
                content: 'You have already submitted an appeal. Please wait for a moderator to review it.',
                ephemeral: true
            });
        }
        
        // Mark user as appealed
        global.appealedUsers.add(userId);
        
        // Create appeal embed
        const appealEmbed = new EmbedBuilder()
            .setTitle('⚖️ Timeout Appeal')
            .setDescription(`${interaction.user} has submitted an appeal for their timeout.`)
            .addFields(
                { name: 'User', value: interaction.user.toString(), inline: true },
                { name: 'User ID', value: userId, inline: true },
                { name: 'Guild', value: interaction.guild.name, inline: true }
            )
            .setColor('#FFA500')
            .setTimestamp();
        
        // Create action buttons for moderators
        const appealId = `TIMEOUT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const actionRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`timeout_appeal_approve|${userId}|timeout|${appealId}`)
                    .setLabel('Approve Appeal')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('✅'),
                new ButtonBuilder()
                    .setCustomId(`timeout_appeal_deny|${userId}|timeout|${appealId}`)
                    .setLabel('Deny Appeal')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('❌'),
                new ButtonBuilder()
                    .setCustomId(`appeal_feedback|${interaction.guild.id}|${userId}|${appealId}`)
                    .setLabel('📝 Write Feedback')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('💭')
            );
        
        // Send to mod log channel
        const { getModLogChannel } = require('../components/appealView');
        const logChannel = getModLogChannel(interaction.guild);
        
        if (logChannel) {
            await logChannel.send({ 
                embeds: [appealEmbed],
                components: [actionRow]
            });
        }
        
        // Confirm to user
        await interaction.reply({ 
            content: 'Your appeal has been submitted to the moderation team. They will review it shortly.',
            ephemeral: true
        });
    }
};