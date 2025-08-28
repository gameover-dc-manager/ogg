
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('utility')
        .setDescription('Comprehensive utility tools and helpful commands')
        .addSubcommand(subcommand =>
            subcommand
                .setName('serverinfo')
                .setDescription('Display detailed server information'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('userinfo')
                .setDescription('Get detailed information about a user')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('The user to get information about')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('avatar')
                .setDescription('Get a user\'s avatar')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('The user whose avatar to display')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('weather')
                .setDescription('Get weather information for a location')
                .addStringOption(option =>
                    option.setName('location')
                        .setDescription('City or location name')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('qr')
                .setDescription('Generate a QR code from text')
                .addStringOption(option =>
                    option.setName('text')
                        .setDescription('Text to encode in the QR code')
                        .setRequired(true)))
        
        .addSubcommand(subcommand =>
            subcommand
                .setName('base64')
                .setDescription('Encode or decode base64 text')
                .addStringOption(option =>
                    option.setName('text')
                        .setDescription('Text to encode or decode')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('action')
                        .setDescription('Choose to encode or decode')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Encode', value: 'encode' },
                            { name: 'Decode', value: 'decode' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('timestamp')
                .setDescription('Convert timestamp to readable date')
                .addStringOption(option =>
                    option.setName('timestamp')
                        .setDescription('Unix timestamp or date string')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('color')
                .setDescription('Display color information')
                .addStringOption(option =>
                    option.setName('hex')
                        .setDescription('Hex color code (e.g., #FF0000)')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('shorten')
                .setDescription('Shorten a URL')
                .addStringOption(option =>
                    option.setName('url')
                        .setDescription('URL to shorten')
                        .setRequired(true))),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        try {
            switch (subcommand) {
                case 'serverinfo':
                    await handleServerInfo(interaction);
                    break;
                case 'userinfo':
                    await handleUserInfo(interaction);
                    break;
                case 'avatar':
                    await handleAvatar(interaction);
                    break;
                case 'weather':
                    await handleWeather(interaction);
                    break;
                case 'qr':
                    await handleQR(interaction);
                    break;
                
                case 'base64':
                    await handleBase64(interaction);
                    break;
                case 'timestamp':
                    await handleTimestamp(interaction);
                    break;
                case 'color':
                    await handleColor(interaction);
                    break;
                case 'shorten':
                    await handleShorten(interaction);
                    break;
                default:
                    await interaction.reply({ content: '❌ Unknown subcommand.', ephemeral: true });
            }
        } catch (error) {
            console.error('Error in utility command:', error);
            const errorMessage = '❌ An error occurred while executing this command.';
            
            if (interaction.deferred) {
                await interaction.editReply({ content: errorMessage });
            } else if (!interaction.replied) {
                await interaction.reply({ content: errorMessage, ephemeral: true });
            }
        }
    }
};

async function handleServerInfo(interaction) {
    const guild = interaction.guild;
    
    if (!guild) {
        return await interaction.reply({ content: '❌ This command can only be used in a server.', ephemeral: true });
    }

    const owner = await guild.fetchOwner();
    const createdAt = Math.floor(guild.createdTimestamp / 1000);
    
    const embed = new EmbedBuilder()
        .setTitle(`📊 ${guild.name} - Server Information`)
        .setColor('#5865F2')
        .setThumbnail(guild.iconURL({ dynamic: true, size: 256 }))
        .addFields(
            { name: '🆔 Server ID', value: guild.id, inline: true },
            { name: '👑 Owner', value: `${owner.user.tag}`, inline: true },
            { name: '📅 Created', value: `<t:${createdAt}:F>`, inline: true },
            { name: '👥 Members', value: `${guild.memberCount}`, inline: true },
            { name: '📝 Channels', value: `${guild.channels.cache.size}`, inline: true },
            { name: '😀 Emojis', value: `${guild.emojis.cache.size}`, inline: true },
            { name: '🎭 Roles', value: `${guild.roles.cache.size}`, inline: true },
            { name: '🔒 Verification Level', value: `${guild.verificationLevel}`, inline: true },
            { name: '💬 Description', value: guild.description || 'No description set', inline: false }
        )
        .setTimestamp();

    if (guild.bannerURL()) {
        embed.setImage(guild.bannerURL({ dynamic: true, size: 1024 }));
    }

    await interaction.reply({ embeds: [embed] });
}

async function handleUserInfo(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    const member = interaction.guild ? await interaction.guild.members.fetch(user.id).catch(() => null) : null;
    
    const embed = new EmbedBuilder()
        .setTitle(`👤 ${user.tag} - User Information`)
        .setColor(member?.displayHexColor || '#5865F2')
        .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }))
        .addFields(
            { name: '🆔 User ID', value: user.id, inline: true },
            { name: '📅 Account Created', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:F>`, inline: true },
            { name: '🤖 Bot', value: user.bot ? 'Yes' : 'No', inline: true }
        );

    if (member) {
        embed.addFields(
            { name: '📝 Display Name', value: member.displayName, inline: true },
            { name: '📅 Joined Server', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>`, inline: true },
            { name: '🎭 Roles', value: member.roles.cache.filter(role => role.name !== '@everyone').map(role => role.name).join(', ') || 'No roles', inline: false }
        );
    }

    await interaction.reply({ embeds: [embed] });
}

async function handleAvatar(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    
    const embed = new EmbedBuilder()
        .setTitle(`🖼️ ${user.tag}'s Avatar`)
        .setColor('#5865F2')
        .setImage(user.displayAvatarURL({ dynamic: true, size: 1024 }))
        .setDescription(`[Download Avatar](${user.displayAvatarURL({ dynamic: true, size: 1024 })})`)
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handleWeather(interaction) {
    const location = interaction.options.getString('location');

    const embed = new EmbedBuilder()
        .setTitle('🌤️ Weather Information')
        .setColor('#87CEEB')
        .setDescription(`Weather for: **${location}**`)
        .addFields(
            { name: '📍 Location', value: location, inline: true },
            { name: '⚠️ Status', value: 'Weather API not configured', inline: true },
            { name: '💡 Note', value: 'Configure a weather API service to enable real weather data.', inline: false }
        )
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handleQR(interaction) {
    const text = interaction.options.getString('text');

    if (text.length > 500) {
        return await interaction.reply({ content: '❌ Text is too long for QR code generation (max 500 characters).', ephemeral: true });
    }

    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(text)}`;

    const embed = new EmbedBuilder()
        .setTitle('📱 QR Code Generated')
        .setColor('#000000')
        .setDescription(`QR Code for: **${text.substring(0, 100)}${text.length > 100 ? '...' : ''}**`)
        .setImage(qrUrl)
        .addFields(
            { name: '📏 Size', value: '300x300 pixels', inline: true },
            { name: '📊 Data Length', value: `${text.length} characters`, inline: true }
        )
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}



async function handleBase64(interaction) {
    const action = interaction.options.getString('action');
    const text = interaction.options.getString('text');

    try {
        let result;
        
        if (action === 'encode') {
            result = Buffer.from(text, 'utf8').toString('base64');
        } else {
            result = Buffer.from(text, 'base64').toString('utf8');
        }

        const embed = new EmbedBuilder()
            .setTitle('🔄 Base64 Conversion')
            .setColor('#4169E1')
            .addFields(
                { name: '⚙️ Action', value: action.charAt(0).toUpperCase() + action.slice(1), inline: true },
                { name: '📊 Input Length', value: `${text.length} characters`, inline: true },
                { name: '📊 Output Length', value: `${result.length} characters`, inline: true },
                { name: '📥 Input', value: `\`\`\`\n${text.substring(0, 1000)}${text.length > 1000 ? '\n...(truncated)' : ''}\n\`\`\``, inline: false },
                { name: '📤 Output', value: `\`\`\`\n${result.substring(0, 1000)}${result.length > 1000 ? '\n...(truncated)' : ''}\n\`\`\``, inline: false }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    } catch (error) {
        await interaction.reply({ content: '❌ Error processing base64 conversion. Please check your input format.', ephemeral: true });
    }
}

async function handleTimestamp(interaction) {
    const timestampInput = interaction.options.getString('timestamp');

    try {
        let timestamp;
        
        if (/^\d+$/.test(timestampInput)) {
            timestamp = parseInt(timestampInput);
            if (timestamp < 10000000000) timestamp *= 1000;
        } else {
            timestamp = Date.parse(timestampInput);
        }

        if (isNaN(timestamp)) {
            return await interaction.reply({ content: '❌ Invalid timestamp format. Please use a Unix timestamp or valid date string.', ephemeral: true });
        }

        const date = new Date(timestamp);
        const unixSeconds = Math.floor(date.getTime() / 1000);
        
        const embed = new EmbedBuilder()
            .setTitle('⏰ Timestamp Conversion')
            .setColor('#FFD700')
            .addFields(
                { name: '📥 Input', value: `\`${timestampInput}\``, inline: false },
                { name: '📅 Date', value: date.toDateString(), inline: true },
                { name: '🕐 Time', value: date.toLocaleTimeString(), inline: true },
                { name: '🌍 UTC', value: date.toISOString(), inline: true },
                { name: '🔢 Unix Timestamp', value: `${unixSeconds}`, inline: true },
                { name: '📱 Discord Timestamp', value: `<t:${unixSeconds}:F>`, inline: true },
                { name: '📋 Copy Formats', value: `**Relative:** \`<t:${unixSeconds}:R>\`\n**Short:** \`<t:${unixSeconds}:d>\`\n**Long:** \`<t:${unixSeconds}:F>\``, inline: false }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    } catch (error) {
        await interaction.reply({ content: '❌ Error processing timestamp. Please check your input.', ephemeral: true });
    }
}

async function handleColor(interaction) {
    const hexInput = interaction.options.getString('hex');
    
    // Clean and validate hex color
    let hex = hexInput.replace('#', '').toUpperCase();
    
    if (!/^[0-9A-F]{6}$/.test(hex)) {
        return await interaction.reply({ content: '❌ Invalid hex color. Please use format: #RRGGBB (e.g., #FF0000)', ephemeral: true });
    }

    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    const colorUrl = `https://dummyimage.com/200x200/${hex}/${hex}.png`;

    const embed = new EmbedBuilder()
        .setTitle('🎨 Color Information')
        .setColor(`#${hex}`)
        .setThumbnail(colorUrl)
        .addFields(
            { name: '🎯 Hex Code', value: `#${hex}`, inline: true },
            { name: '🔴 RGB', value: `rgb(${r}, ${g}, ${b})`, inline: true },
            { name: '📊 Decimal', value: `${parseInt(hex, 16)}`, inline: true },
            { name: '🌈 Red', value: `${r} (${Math.round(r/255*100)}%)`, inline: true },
            { name: '💚 Green', value: `${g} (${Math.round(g/255*100)}%)`, inline: true },
            { name: '💙 Blue', value: `${b} (${Math.round(b/255*100)}%)`, inline: true }
        )
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handleShorten(interaction) {
    const url = interaction.options.getString('url');

    // Basic URL validation
    try {
        new URL(url);
    } catch {
        return await interaction.reply({ content: '❌ Invalid URL format. Please provide a valid URL.', ephemeral: true });
    }

    const embed = new EmbedBuilder()
        .setTitle('🔗 URL Shortener')
        .setColor('#1DA1F2')
        .addFields(
            { name: '📥 Original URL', value: `[${url.substring(0, 50)}${url.length > 50 ? '...' : ''}](${url})`, inline: false },
            { name: '⚠️ Status', value: 'URL shortening service not configured', inline: true },
            { name: '💡 Note', value: 'Configure a URL shortening API to enable this feature.', inline: false }
        )
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}
