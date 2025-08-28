
const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle 
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('quick')
        .setDescription('Quick utility commands (Nighty-style)')
        .addSubcommand(subcommand =>
            subcommand
                .setName('purge')
                .setDescription('Quick message purge')
                .addIntegerOption(option =>
                    option.setName('amount')
                        .setDescription('Number of messages to delete')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(100))
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('Only delete messages from this user')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('say')
                .setDescription('Make the bot say something')
                .addStringOption(option =>
                    option.setName('message')
                        .setDescription('Message to send')
                        .setRequired(true))
                .addBooleanOption(option =>
                    option.setName('embed')
                        .setDescription('Send as embed')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('nick')
                .setDescription('Change someone\'s nickname')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to change nickname')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('nickname')
                        .setDescription('New nickname (leave empty to reset)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('slowmode')
                .setDescription('Set channel slowmode')
                .addIntegerOption(option =>
                    option.setName('seconds')
                        .setDescription('Slowmode duration in seconds (0 to disable)')
                        .setRequired(true)
                        .setMinValue(0)
                        .setMaxValue(21600)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('avatar')
                .setDescription('Get user avatar')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to get avatar of')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('serverinfo')
                .setDescription('Enhanced server information'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('userinfo')
                .setDescription('Enhanced user information')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to get info about')
                        .setRequired(false))),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        // Check permissions for mod commands
        if (['purge', 'nick', 'slowmode'].includes(subcommand)) {
            if (!interaction.member.permissions.has('ManageMessages')) {
                return await interaction.reply({ 
                    content: '❌ You need **Manage Messages** permission to use this command.', 
                    ephemeral: true 
                });
            }
        }

        switch (subcommand) {
            case 'purge':
                await handleQuickPurge(interaction);
                break;
            case 'say':
                await handleSay(interaction);
                break;
            case 'nick':
                await handleNick(interaction);
                break;
            case 'slowmode':
                await handleSlowmode(interaction);
                break;
            case 'avatar':
                await handleAvatar(interaction);
                break;
            case 'serverinfo':
                await handleServerInfo(interaction);
                break;
            case 'userinfo':
                await handleUserInfo(interaction);
                break;
        }
    }
};

async function handleQuickPurge(interaction) {
    const amount = interaction.options.getInteger('amount');
    const user = interaction.options.getUser('user');

    await interaction.deferReply({ ephemeral: true });
    
    try {
        let messages;
        if (user) {
            const fetched = await interaction.channel.messages.fetch({ limit: 100 });
            messages = fetched.filter(m => m.author.id === user.id).first(amount);
        } else {
            messages = await interaction.channel.messages.fetch({ limit: amount });
        }

        const deleted = await interaction.channel.bulkDelete(messages, true);

        const embed = new EmbedBuilder()
            .setTitle('🧹 Messages Purged')
            .setDescription(`Successfully deleted **${deleted.size}** messages${user ? ` from ${user.tag}` : ''}`)
            .setColor('#00FF00')
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        console.error('Error purging messages:', error);
        await interaction.editReply({ content: '❌ Failed to purge messages. They might be too old.' });
    }
}

async function handleSay(interaction) {
    const message = interaction.options.getString('message');
    const useEmbed = interaction.options.getBoolean('embed') || false;

    if (useEmbed) {
        const embed = new EmbedBuilder()
            .setDescription(message)
            .setColor('#4A90E2')
            .setFooter({ text: `Sent by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });

        await interaction.reply({ embeds: [embed] });
    } else {
        await interaction.reply({ content: message });
    }
}

async function handleNick(interaction) {
    const user = interaction.options.getUser('user');
    const nickname = interaction.options.getString('nickname');
    
    try {
        const member = await interaction.guild.members.fetch(user.id);
        const oldNick = member.displayName;
        
        await member.setNickname(nickname);
        
        const embed = new EmbedBuilder()
            .setTitle('✏️ Nickname Changed')
            .addFields(
                { name: 'User', value: user.tag, inline: true },
                { name: 'Old Nickname', value: oldNick, inline: true },
                { name: 'New Nickname', value: nickname || user.username, inline: true }
            )
            .setColor('#4A90E2')
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
        await interaction.reply({ content: '❌ Failed to change nickname. Check permissions and role hierarchy.', ephemeral: true });
    }
}

async function handleSlowmode(interaction) {
    const seconds = interaction.options.getInteger('seconds');
    
    try {
        await interaction.channel.setRateLimitPerUser(seconds);
        
        const embed = new EmbedBuilder()
            .setTitle('⏱️ Slowmode Updated')
            .setDescription(seconds > 0 ? `Slowmode set to **${seconds}** seconds` : 'Slowmode disabled')
            .setColor('#4A90E2')
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    } catch (error) {
        await interaction.reply({ content: '❌ Failed to set slowmode.', ephemeral: true });
    }
}

async function handleAvatar(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    
    const embed = new EmbedBuilder()
        .setTitle(`🖼️ ${user.displayName}'s Avatar`)
        .setImage(user.displayAvatarURL({ dynamic: true, size: 1024 }))
        .setColor('#4A90E2')
        .setTimestamp();

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setLabel('Open Original')
                .setStyle(ButtonStyle.Link)
                .setURL(user.displayAvatarURL({ dynamic: true, size: 1024 }))
        );

    await interaction.reply({ embeds: [embed], components: [row] });
}

async function handleServerInfo(interaction) {
    const guild = interaction.guild;
    const owner = await guild.fetchOwner();
    
    const embed = new EmbedBuilder()
        .setTitle(`🏰 ${guild.name}`)
        .setThumbnail(guild.iconURL({ dynamic: true }))
        .addFields(
            { name: '👑 Owner', value: owner.user.tag, inline: true },
            { name: '🆔 ID', value: guild.id, inline: true },
            { name: '📅 Created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`, inline: true },
            { name: '👥 Members', value: guild.memberCount.toString(), inline: true },
            { name: '💬 Channels', value: guild.channels.cache.size.toString(), inline: true },
            { name: '🎭 Roles', value: guild.roles.cache.size.toString(), inline: true },
            { name: '⚡ Boosts', value: `${guild.premiumSubscriptionCount} (Level ${guild.premiumTier})`, inline: true },
            { name: '🔒 Verification', value: guild.verificationLevel.toString(), inline: true },
            { name: '📍 Region', value: guild.preferredLocale, inline: true }
        )
        .setColor('#4A90E2')
        .setTimestamp();

    if (guild.banner) {
        embed.setImage(guild.bannerURL({ dynamic: true, size: 1024 }));
    }

    await interaction.reply({ embeds: [embed] });
}

async function handleUserInfo(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    if (!member) {
        return await interaction.reply({ content: '❌ User not found in this server.', ephemeral: true });
    }

    const embed = new EmbedBuilder()
        .setTitle(`👤 ${user.displayName}`)
        .setThumbnail(user.displayAvatarURL({ dynamic: true }))
        .addFields(
            { name: '🏷️ Tag', value: user.tag, inline: true },
            { name: '🆔 ID', value: user.id, inline: true },
            { name: '🤖 Bot', value: user.bot ? 'Yes' : 'No', inline: true },
            { name: '📅 Account Created', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:F>`, inline: false },
            { name: '📥 Joined Server', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>`, inline: false },
            { name: '🎨 Display Color', value: member.displayHexColor, inline: true },
            { name: '🏆 Highest Role', value: member.roles.highest.toString(), inline: true },
            { name: '🟢 Status', value: member.presence?.status || 'offline', inline: true }
        )
        .setColor(member.displayHexColor || '#4A90E2')
        .setTimestamp();

    if (member.roles.cache.size > 1) {
        embed.addFields({
            name: '🎭 Roles',
            value: member.roles.cache.filter(r => r.id !== interaction.guild.id).map(r => r.toString()).slice(0, 10).join(', '),
            inline: false
        });
    }

    await interaction.reply({ embeds: [embed] });
}
