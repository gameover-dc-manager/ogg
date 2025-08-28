const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

const DASHBOARD_CONFIG_FILE = path.join(__dirname, '../config/dashboard_credentials.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dashboard-setup')
        .setDescription('Set up dashboard access for your server')
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Create dashboard credentials for this server')
                .addStringOption(option =>
                    option.setName('password')
                        .setDescription('Password for dashboard access')
                        .setRequired(true)
                        .setMinLength(6)
                        .setMaxLength(50)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('info')
                .setDescription('View dashboard access information'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove dashboard access for this server')),

    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return await interaction.reply({
                content: '❌ You need Administrator permissions to manage dashboard access.',
                ephemeral: true
            });
        }

        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        switch (subcommand) {
            case 'create':
                await handleCreate(interaction, guildId);
                break;
            case 'info':
                await handleInfo(interaction, guildId);
                break;
            case 'remove':
                await handleRemove(interaction, guildId);
                break;
        }
    }
};

async function handleCreate(interaction, guildId) {
    const password = interaction.options.getString('password');

    try {
        let credentials = {};
        if (fs.existsSync(DASHBOARD_CONFIG_FILE)) {
            credentials = JSON.parse(fs.readFileSync(DASHBOARD_CONFIG_FILE, 'utf8'));
        }

        credentials[guildId] = {
            password: password,
            serverName: interaction.guild.name,
            createdAt: new Date().toISOString(),
            createdBy: interaction.user.id
        };

        fs.writeFileSync(DASHBOARD_CONFIG_FILE, JSON.stringify(credentials, null, 2));

        const dashboardUrl = process.env.REPLIT_DEV_DOMAIN 
            ? `https://${process.env.REPLIT_DEV_DOMAIN}/simple-dashboard`
            : `https://${process.env.REPL_SLUG}--${process.env.REPL_OWNER}.repl.co/simple-dashboard`;

        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('✅ Dashboard Credentials Created')
            .setDescription('Dashboard access has been successfully configured!')
            .addFields(
                { name: '🔗 Dashboard URL', value: `[Access Dashboard](${dashboardUrl})`, inline: false },
                { name: '🆔 Server ID', value: `\`${guildId}\``, inline: true },
                { name: '🔐 Password', value: '`Set successfully`', inline: true },
                { name: '📋 Next Steps', value: '1. Click the dashboard link above\n2. Enter your Server ID\n3. Enter your password\n4. Access your dashboard!', inline: false }
            )
            .setFooter({ text: 'Keep your credentials secure!' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });

    } catch (error) {
        console.error('Error creating dashboard credentials:', error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: '❌ Failed to create dashboard credentials.',
                ephemeral: true
            });
        }
    }
}

async function handleInfo(interaction, guildId) {
    try {
        if (!fs.existsSync(DASHBOARD_CONFIG_FILE)) {
            return await interaction.reply({
                content: '❌ No dashboard credentials found. Use `/dashboard-setup create` first.',
                ephemeral: true
            });
        }

        const credentials = JSON.parse(fs.readFileSync(DASHBOARD_CONFIG_FILE, 'utf8'));

        if (!credentials[guildId]) {
            return await interaction.reply({
                content: '❌ No dashboard credentials found for this server. Use `/dashboard-setup create` first.',
                ephemeral: true
            });
        }

        const dashboardUrl = process.env.REPLIT_DEV_DOMAIN 
            ? `https://${process.env.REPLIT_DEV_DOMAIN}/simple-dashboard`
            : `https://${process.env.REPL_SLUG}--${process.env.REPL_OWNER}.repl.co/simple-dashboard`;

        const serverCreds = credentials[guildId];
        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('📊 Dashboard Information')
            .setDescription(`Dashboard access information for **${interaction.guild.name}**`)
            .addFields(
                { name: '🔗 Dashboard URL', value: `[Access Dashboard](${dashboardUrl})`, inline: false },
                { name: '🆔 Server ID', value: `\`${guildId}\``, inline: true },
                { name: '📅 Created', value: `<t:${Math.floor(new Date(serverCreds.createdAt).getTime() / 1000)}:R>`, inline: true },
                { name: '👤 Created By', value: `<@${serverCreds.createdBy}>`, inline: true },
                { name: '🔐 Password Status', value: '✅ Configured', inline: true },
                { name: '📋 How to Access', value: '1. Click the dashboard link\n2. Enter your Server ID\n3. Enter your password\n4. View your dashboard!', inline: false }
            )
            .setFooter({ text: 'This message is only visible to you' });

        await interaction.reply({ embeds: [embed], ephemeral: true });

    } catch (error) {
        console.error('Error fetching dashboard info:', error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: '❌ Failed to fetch dashboard information.',
                ephemeral: true
            });
        }
    }
}

async function handleRemove(interaction, guildId) {
    try {
        if (!fs.existsSync(DASHBOARD_CONFIG_FILE)) {
            return await interaction.reply({
                content: '❌ No dashboard credentials found.',
                ephemeral: true
            });
        }

        let credentials = JSON.parse(fs.readFileSync(DASHBOARD_CONFIG_FILE, 'utf8'));

        if (!credentials[guildId]) {
            return await interaction.reply({
                content: '❌ No dashboard credentials found for this server.',
                ephemeral: true
            });
        }

        delete credentials[guildId];
        fs.writeFileSync(DASHBOARD_CONFIG_FILE, JSON.stringify(credentials, null, 2));

        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('🗑️ Dashboard Access Removed')
            .setDescription('Dashboard credentials have been removed for this server.')
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });

    } catch (error) {
        console.error('Error removing dashboard credentials:', error);
        await interaction.reply({
            content: '❌ Failed to remove dashboard credentials.',
            ephemeral: true
        });
    }
}