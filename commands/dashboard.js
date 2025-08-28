const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

const DASHBOARD_CONFIG_FILE = path.join(__dirname, '../config/dashboard_credentials.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dashboard')
        .setDescription('Get access to the server dashboard'),

    async execute(interaction) {
        // Check if user has administrator permissions
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return await interaction.reply({
                content: '❌ You need Administrator permissions to access the dashboard.',
                ephemeral: true
            });
        }

        try {
            const guildId = interaction.guild.id;
            let hasCredentials = false;
            let credentials = null;

            // Check if dashboard credentials exist
            if (fs.existsSync(DASHBOARD_CONFIG_FILE)) {
                try {
                    const allCredentials = JSON.parse(fs.readFileSync(DASHBOARD_CONFIG_FILE, 'utf8'));
                    if (allCredentials[guildId]) {
                        hasCredentials = true;
                        credentials = allCredentials[guildId];
                    }
                } catch (error) {
                    console.error('Error reading dashboard credentials:', error);
                }
            }

            const dashboardUrl = process.env.REPLIT_DEV_DOMAIN
                ? `https://${process.env.REPLIT_DEV_DOMAIN}/simple-dashboard`
                : `https://${process.env.REPL_SLUG}--${process.env.REPL_OWNER}.repl.co/simple-dashboard`;

            const embed = new EmbedBuilder()
                .setColor(hasCredentials ? '#00ff00' : '#ff9900')
                .setTitle('🖥️ Server Dashboard Access')
                .setDescription(hasCredentials
                    ? 'Your dashboard is ready! Use the credentials below to access it.'
                    : 'Dashboard credentials not found. Use `/dashboard-setup create` to set up dashboard access first.');

            if (hasCredentials) {
                embed.addFields(
                    { name: '🌐 Dashboard URL', value: `[Click here to access dashboard](${dashboardUrl})`, inline: false },
                    { name: '🆔 Server ID', value: `\`${guildId}\``, inline: true },
                    { name: '🔑 Password', value: `\`${credentials.password}\``, inline: true },
                    { name: '📅 Created', value: new Date(credentials.createdAt).toLocaleDateString(), inline: true },
                    { name: '⚙️ Features', value: '• View server statistics\n• Manage warnings\n• Monitor captcha system\n• Real-time updates', inline: false }
                );
            } else {
                embed.addFields(
                    { name: '🔧 Setup Required', value: 'Run `/dashboard-setup create <password>` to create dashboard access', inline: false },
                    { name: '📋 What You Get', value: '• Server statistics dashboard\n• Warning management\n• Captcha monitoring\n• Simple login system', inline: false }
                );
            }

            embed.setFooter({ text: hasCredentials ? 'Keep your credentials secure!' : 'Setup takes just a minute!' })
                .setTimestamp();

            await interaction.reply({ embeds: [embed], ephemeral: true });

            console.log(`🖥️ Dashboard access requested by ${interaction.user.username} in ${interaction.guild.name}`);
        } catch (error) {
            console.error('Error in dashboard command:', error);
            await interaction.reply({
                content: '❌ Failed to generate dashboard access. Please try again.',
                ephemeral: true
            });
        }
    }
};