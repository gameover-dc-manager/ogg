const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('welcome')
        .setDescription('Welcome and goodbye message configuration')
        .addSubcommand(subcommand =>
            subcommand
                .setName('setchannel')
                .setDescription('Set the welcome channel')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Channel for welcome messages')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('setmessage')
                .setDescription('Set the welcome message template')
                .addStringOption(option =>
                    option.setName('message')
                        .setDescription('Welcome message template (use {user} for mention, {guild} for server name)')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('setbanner')
                .setDescription('Set the welcome banner URL')
                .addStringOption(option =>
                    option.setName('url')
                        .setDescription('URL of the welcome banner image')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('goodbyechannel')
                .setDescription('Set the goodbye channel')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Channel for goodbye messages')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('goodbyemessage')
                .setDescription('Set the goodbye message template')
                .addStringOption(option =>
                    option.setName('message')
                        .setDescription('Goodbye message template (use {user} for username, {guild} for server name)')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('goodbyebanner')
                .setDescription('Set the goodbye banner URL')
                .addStringOption(option =>
                    option.setName('url')
                        .setDescription('URL of the goodbye banner image')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('test')
                .setDescription('Test the welcome message'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('testgoodbye')
                .setDescription('Test the goodbye message'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'setchannel':
                await handleSetWelcomeChannel(interaction);
                break;
            case 'setmessage':
                await handleSetWelcomeMessage(interaction);
                break;
            case 'setbanner':
                await handleSetWelcomeBanner(interaction);
                break;
            case 'goodbyechannel':
                await handleSetGoodbyeChannel(interaction);
                break;
            case 'goodbyemessage':
                await handleSetGoodbyeMessage(interaction);
                break;
            case 'goodbyebanner':
                await handleSetGoodbyeBanner(interaction);
                break;
            case 'test':
                await handleTestWelcome(interaction);
                break;
            case 'testgoodbye':
                await handleTestGoodbye(interaction);
                break;
        }
    }
};

async function handleSetWelcomeChannel(interaction) {
    const channel = interaction.options.getChannel('channel');
    const guildId = interaction.guild.id;

    interaction.client.config.welcome_channel[guildId] = channel.id;
    global.saveConfig();

    const embed = new EmbedBuilder()
        .setTitle('👋 Welcome Channel Set')
        .setDescription(`Welcome channel has been set to ${channel}.`)
        .setColor('#00FF00')
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handleSetWelcomeMessage(interaction) {
    const message = interaction.options.getString('message');
    const guildId = interaction.guild.id;

    interaction.client.config.welcome_message[guildId] = message;
    global.saveConfig();

    const embed = new EmbedBuilder()
        .setTitle('👋 Welcome Message Set')
        .setDescription(`Welcome message has been set to:\n\`\`\`${message}\`\`\``)
        .setColor('#00FF00')
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handleSetWelcomeBanner(interaction) {
    const url = interaction.options.getString('url');
    const guildId = interaction.guild.id;

    // Validate URL
    try {
        new URL(url);
    } catch {
        return interaction.reply({ content: 'Invalid URL provided.', ephemeral: true });
    }

    interaction.client.config.welcome_banner[guildId] = url;
    global.saveConfig();

    const embed = new EmbedBuilder()
        .setTitle('👋 Welcome Banner Set')
        .setDescription('Welcome banner has been set.')
        .setImage(url)
        .setColor('#00FF00')
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handleSetGoodbyeChannel(interaction) {
    const channel = interaction.options.getChannel('channel');
    const guildId = interaction.guild.id;

    interaction.client.config.goodbye_channel[guildId] = channel.id;
    global.saveConfig();

    const embed = new EmbedBuilder()
        .setTitle('👋 Goodbye Channel Set')
        .setDescription(`Goodbye channel has been set to ${channel}.`)
        .setColor('#00FF00')
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handleSetGoodbyeMessage(interaction) {
    const message = interaction.options.getString('message');
    const guildId = interaction.guild.id;

    interaction.client.config.goodbye_message[guildId] = message;
    global.saveConfig();

    const embed = new EmbedBuilder()
        .setTitle('👋 Goodbye Message Set')
        .setDescription(`Goodbye message has been set to:\n\`\`\`${message}\`\`\``)
        .setColor('#00FF00')
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handleSetGoodbyeBanner(interaction) {
    const url = interaction.options.getString('url');
    const guildId = interaction.guild.id;

    // Validate URL
    try {
        new URL(url);
    } catch {
        return interaction.reply({ content: 'Invalid URL provided.', ephemeral: true });
    }

    interaction.client.config.goodbye_banner[guildId] = url;
    global.saveConfig();

    const embed = new EmbedBuilder()
        .setTitle('👋 Goodbye Banner Set')
        .setDescription('Goodbye banner has been set.')
        .setImage(url)
        .setColor('#00FF00')
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handleTestWelcome(interaction) {
    const guildId = interaction.guild.id;
    const channelId = interaction.client.config.welcome_channel[guildId];
    const message = interaction.client.config.welcome_message[guildId];
    const banner = interaction.client.config.welcome_banner[guildId];

    if (!channelId) {
        return interaction.reply({ content: 'Welcome channel not configured.', ephemeral: true });
    }

    const channel = interaction.guild.channels.cache.get(channelId);
    if (!channel) {
        return interaction.reply({ content: 'Welcome channel not found.', ephemeral: true });
    }

    const welcomeMessage = message 
        ? message.replace(/{user}/g, interaction.user.toString()).replace(/{guild}/g, interaction.guild.name)
        : `Welcome to ${interaction.guild.name}, ${interaction.user}!`;

    const embed = new EmbedBuilder()
        .setTitle('🎉 Welcome!')
        .setDescription(welcomeMessage)
        .setColor('#00FF00')
        .setTimestamp();

    if (banner) {
        embed.setImage(banner);
    }

    await channel.send({ embeds: [embed] });
    await interaction.reply({ content: 'Welcome message test sent!', ephemeral: true });
}

async function handleTestGoodbye(interaction) {
    const guildId = interaction.guild.id;
    const channelId = interaction.client.config.goodbye_channel[guildId];
    const message = interaction.client.config.goodbye_message[guildId];
    const banner = interaction.client.config.goodbye_banner[guildId];

    if (!channelId) {
        return interaction.reply({ content: 'Goodbye channel not configured.', ephemeral: true });
    }

    const channel = interaction.guild.channels.cache.get(channelId);
    if (!channel) {
        return interaction.reply({ content: 'Goodbye channel not found.', ephemeral: true });
    }

    const goodbyeMessage = message 
        ? message.replace(/{user}/g, interaction.user.username).replace(/{guild}/g, interaction.guild.name)
        : `Goodbye ${interaction.user.username}! Thanks for being part of ${interaction.guild.name}.`;

    const embed = new EmbedBuilder()
        .setTitle('👋 Goodbye!')
        .setDescription(goodbyeMessage)
        .setColor('#FF0000')
        .setTimestamp();

    if (banner) {
        embed.setImage(banner);
    }

    await channel.send({ embeds: [embed] });
    await interaction.reply({ content: 'Goodbye message test sent!', ephemeral: true });
}
