const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup')
        .setDescription('Configure the bot and dashboard system')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('dashboard')
                .setDescription('Get dashboard setup instructions')),

    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return await interaction.reply({
                content: '❌ **Access Denied**: You need Administrator permissions to use setup commands.',
                ephemeral: true
            });
        }

        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'dashboard') {
            await handleDashboardSetup(interaction);
        }
    }
};

async function handleDashboardSetup(interaction) {
    // Check if user has administrator permissions
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return await interaction.reply({
            content: '❌ You need Administrator permissions to setup the dashboard.',
            ephemeral: true
        });
    }

    try {
        const setupUrl = process.env.REPLIT_DEV_DOMAIN 
            ? `https://${process.env.REPLIT_DEV_DOMAIN}/simple-dashboard`
            : `https://${process.env.REPL_SLUG}--${process.env.REPL_OWNER}.repl.co/simple-dashboard`;

        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('⚙️ Dashboard Setup')
            .setDescription('Follow these steps to complete your dashboard setup:')
            .addFields(
                { name: '1️⃣ Create Credentials', value: 'Use `/dashboard-setup create <password>` to create login credentials', inline: false },
                { name: '2️⃣ Access Dashboard', value: `[Click here to open dashboard](${setupUrl})`, inline: false },
                { name: '3️⃣ Login', value: 'Use your Server ID and the password you created to login', inline: false },
                { name: '4️⃣ Monitor', value: 'View server stats, warnings, and captcha data in real-time', inline: false }
            )
            .addFields(
                { name: '📊 Available Features', value: '• Server statistics and analytics\n• Warning management system\n• Captcha verification monitoring\n• Simple login system\n• Real-time updates', inline: false },
                { name: '🆔 Your Server ID', value: `\`${interaction.guild.id}\``, inline: false }
            )
            .setFooter({ text: 'Simple setup - no Discord OAuth required!' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });

        console.log(`⚙️ Dashboard setup initiated by ${interaction.user.username} in ${interaction.guild.name}`);
    } catch (error) {
        console.error('Error in dashboard setup:', error);
        await interaction.reply({
            content: '❌ Failed to initiate dashboard setup. Please try again.',
            ephemeral: true
        });
    }
}