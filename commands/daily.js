
const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle 
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription('Daily activities and rewards!')
        .addSubcommand(subcommand =>
            subcommand
                .setName('claim')
                .setDescription('Claim your daily reward'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('challenge')
                .setDescription('Get your daily challenge'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('streak')
                .setDescription('Check your daily streak'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('leaderboard')
                .setDescription('View daily activity leaderboard')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const { getDailyReward, getDailyChallenge, getDailyStreak, getDailyLeaderboard } = require('../components/dailySystem');

        try {
            switch (subcommand) {
                case 'claim':
                    await handleDailyClaim(interaction);
                    break;
                case 'challenge':
                    await handleDailyChallenge(interaction);
                    break;
                case 'streak':
                    await handleDailyStreak(interaction);
                    break;
                case 'leaderboard':
                    await handleDailyLeaderboard(interaction);
                    break;
            }
        } catch (error) {
            console.error('❌ Error in daily command:', error);
            
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ **Error**: An unexpected error occurred.',
                    flags: 64
                });
            }
        }
    }
};

async function handleDailyClaim(interaction) {
    const { claimDailyReward } = require('../components/dailySystem');
    
    const result = await claimDailyReward(interaction.user.id);
    
    if (!result.success) {
        const timeLeft = Math.ceil((result.nextClaimTime - Date.now()) / (1000 * 60 * 60));
        
        const embed = new EmbedBuilder()
            .setTitle('⏰ Daily Reward Already Claimed')
            .setDescription(`You've already claimed your daily reward!\nCome back in ${timeLeft} hours.`)
            .setColor('#FFA500')
            .setTimestamp();
        
        return await interaction.reply({ embeds: [embed], flags: 64 });
    }
    
    const embed = new EmbedBuilder()
        .setTitle('🎁 Daily Reward Claimed!')
        .addFields(
            { name: 'Reward', value: `${result.points} points`, inline: true },
            { name: 'Streak Bonus', value: `${result.streakBonus} points`, inline: true },
            { name: 'Current Streak', value: `${result.streak} days`, inline: true }
        )
        .setColor('#00FF00')
        .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
}

async function handleDailyChallenge(interaction) {
    const { getDailyChallenge } = require('../components/dailySystem');
    
    const challenge = await getDailyChallenge(interaction.user.id);
    
    const embed = new EmbedBuilder()
        .setTitle('🎯 Daily Challenge')
        .setDescription(challenge.description)
        .addFields(
            { name: 'Reward', value: `${challenge.reward} points`, inline: true },
            { name: 'Progress', value: `${challenge.progress}/${challenge.target}`, inline: true },
            { name: 'Type', value: challenge.type, inline: true }
        )
        .setColor('#4A90E2')
        .setTimestamp();
    
    if (challenge.completed) {
        embed.setTitle('✅ Daily Challenge Completed!');
        embed.setColor('#00FF00');
    }
    
    await interaction.reply({ embeds: [embed] });
}

async function handleDailyStreak(interaction) {
    const { getUserDailyStats } = require('../components/dailySystem');
    
    const stats = await getUserDailyStats(interaction.user.id);
    
    const embed = new EmbedBuilder()
        .setTitle('🔥 Daily Streak')
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
        .addFields(
            { name: 'Current Streak', value: `${stats.currentStreak} days`, inline: true },
            { name: 'Best Streak', value: `${stats.bestStreak} days`, inline: true },
            { name: 'Total Claims', value: stats.totalClaims.toString(), inline: true },
            { name: 'Total Points Earned', value: stats.totalPoints.toString(), inline: true },
            { name: 'Last Claim', value: stats.lastClaim ? `<t:${Math.floor(stats.lastClaim / 1000)}:R>` : 'Never', inline: true }
        )
        .setColor('#FF6B35')
        .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
}

async function handleDailyLeaderboard(interaction) {
    const { getDailyLeaderboard } = require('../components/dailySystem');
    
    await interaction.deferReply();
    
    const leaderboard = await getDailyLeaderboard(interaction.guild.id, interaction.client);
    
    const embed = new EmbedBuilder()
        .setTitle('🏆 Daily Activity Leaderboard')
        .setDescription('Top daily reward collectors!')
        .setColor('#FFD700')
        .setTimestamp();
    
    if (leaderboard.length === 0) {
        embed.addFields({ name: 'No Data', value: 'No one has claimed daily rewards yet!', inline: false });
    } else {
        leaderboard.slice(0, 10).forEach((user, index) => {
            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
            embed.addFields({
                name: `${medal} ${user.username}`,
                value: `Streak: ${user.currentStreak} | Points: ${user.totalPoints}`,
                inline: false
            });
        });
    }
    
    await interaction.editReply({ embeds: [embed] });
}
