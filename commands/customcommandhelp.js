
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('customcommandhelp')
        .setDescription('📚 Learn how to create and use custom commands')
        .addStringOption(option =>
            option.setName('topic')
                .setDescription('Specific topic to learn about')
                .setRequired(false)
                .addChoices(
                    { name: 'Getting Started', value: 'basics' },
                    { name: 'Variables & Placeholders', value: 'variables' },
                    { name: 'Permissions & Settings', value: 'permissions' },
                    { name: 'Advanced Features', value: 'advanced' },
                    { name: 'Examples', value: 'examples' }
                )),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const topic = interaction.options.getString('topic');

        if (!topic) {
            // Show main help menu
            const mainEmbed = new EmbedBuilder()
                .setColor('#0099FF')
                .setTitle('📚 Custom Commands Guide')
                .setDescription('Learn how to create powerful custom commands for your server!')
                .addFields(
                    {
                        name: '🚀 Quick Start',
                        value: 'Use `/customcommands create` to make your first custom command!\n\n**Basic Example:**\n```\nName: welcome\nResponse: Welcome {user} to {server}! 🎉\n```',
                        inline: false
                    },
                    {
                        name: '📋 Available Topics',
                        value: '• **Getting Started** - Basic command creation\n• **Variables & Placeholders** - Dynamic content\n• **Permissions & Settings** - Access control\n• **Advanced Features** - Embeds, colors, types\n• **Examples** - Ready-to-use command ideas',
                        inline: false
                    },
                    {
                        name: '⚡ Quick Commands',
                        value: '`/customcommands create` - Create new command\n`/customcommands list` - View all commands\n`/customcommands variables` - See all variables',
                        inline: false
                    }
                )
                .setFooter({ text: 'Use the buttons below or run /customcommandhelp <topic>' })
                .setTimestamp();

            const buttons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('cchelp_basics')
                        .setLabel('Getting Started')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('🚀'),
                    new ButtonBuilder()
                        .setCustomId('cchelp_variables')
                        .setLabel('Variables')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('🔧'),
                    new ButtonBuilder()
                        .setCustomId('cchelp_examples')
                        .setLabel('Examples')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('💡')
                );

            await interaction.editReply({ embeds: [mainEmbed], components: [buttons] });
            return;
        }

        // Show specific topic
        let embed;
        switch (topic) {
            case 'basics':
                embed = createBasicsEmbed();
                break;
            case 'variables':
                embed = createVariablesEmbed();
                break;
            case 'permissions':
                embed = createPermissionsEmbed();
                break;
            case 'advanced':
                embed = createAdvancedEmbed();
                break;
            case 'examples':
                embed = createExamplesEmbed();
                break;
            default:
                embed = createBasicsEmbed();
        }

        await interaction.editReply({ embeds: [embed] });
    }
};

function createBasicsEmbed() {
    return new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('🚀 Getting Started with Custom Commands')
        .setDescription('Learn the basics of creating custom commands!')
        .addFields(
            {
                name: '1️⃣ Create Your First Command',
                value: '```\n/customcommands create\nname: hello\nresponse: Hello there, {user}!\n```\nThis creates a simple greeting command.',
                inline: false
            },
            {
                name: '2️⃣ Using Your Command',
                value: 'Once created, users can trigger it with:\n• `!hello` (prefix)\n• `/hello` (slash command)\n• Or both, depending on your settings!',
                inline: false
            },
            {
                name: '3️⃣ Command Options',
                value: '• **Name**: What users type to trigger it\n• **Response**: What the bot says back\n• **Description**: Helpful info about the command\n• **Embed**: Make it look fancy with colors\n• **Permissions**: Control who can use it',
                inline: false
            },
            {
                name: '💡 Pro Tips',
                value: '• Keep names simple and memorable\n• Test your commands after creating them\n• Use variables to make them dynamic\n• Check `/customcommands list` to see all your commands',
                inline: false
            }
        )
        .setFooter({ text: 'Next: Learn about Variables with /customcommandhelp variables' });
}

function createVariablesEmbed() {
    return new EmbedBuilder()
        .setColor('#FF6B6B')
        .setTitle('🔧 Variables & Placeholders')
        .setDescription('Make your commands dynamic with these special variables!')
        .addFields(
            {
                name: '👤 User Variables',
                value: '`{user}` - Mentions the user\n`{username}` - User\'s name\n`{usernickname}` - Server nickname\n`{userid}` - User\'s ID number',
                inline: true
            },
            {
                name: '🏠 Server Variables',
                value: '`{server}` - Server name\n`{membercount}` - Total members\n`{channelcount}` - Total channels\n`{serverid}` - Server ID',
                inline: true
            },
            {
                name: '📱 Channel Variables',
                value: '`{channel}` - Current channel\n`{channelname}` - Channel name\n`{channelid}` - Channel ID',
                inline: true
            },
            {
                name: '⏰ Time Variables',
                value: '`{date}` - Current date\n`{time}` - Current time\n`{timestamp}` - Unix timestamp',
                inline: true
            },
            {
                name: '🎲 Random Variables',
                value: '`{random:1-100}` - Random number\n`{choice:yes,no,maybe}` - Random choice\n`{choice:pizza,burgers,tacos}` - Pick food',
                inline: true
            },
            {
                name: '✨ Example Usage',
                value: '```\nWelcome {user} to {server}!\nYou are member #{membercount}.\nIt\'s {time} on {date}.\nYour lucky number is {random:1-100}!\n```',
                inline: false
            }
        )
        .setFooter({ text: 'Try: {choice:red,blue,green} or {random:1-10} in your commands!' });
}

function createPermissionsEmbed() {
    return new EmbedBuilder()
        .setColor('#FFA500')
        .setTitle('🔐 Permissions & Settings')
        .setDescription('Control who can use your commands and how they work!')
        .addFields(
            {
                name: '👥 Permission Levels',
                value: '• **Everyone** - Anyone can use\n• **Manage Messages** - Moderators\n• **Manage Channels** - Channel managers\n• **Manage Guild** - Admins\n• **Administrator** - Full admins only',
                inline: false
            },
            {
                name: '⚙️ Command Types',
                value: '• **Both** - Works with `!command` and `/command`\n• **Prefix Only** - Only `!command`\n• **Slash Only** - Only `/command`',
                inline: false
            },
            {
                name: '🎨 Customization Options',
                value: '• **Embed**: Makes responses look fancy\n• **Color**: Custom hex colors like `#FF0000`\n• **Prefix**: Change from `!` to `.` or `?`',
                inline: false
            },
            {
                name: '🔧 Management Commands',
                value: '• `/customcommands toggle` - Enable/disable\n• `/customcommands edit` - Modify existing\n• `/customcommands delete` - Remove command\n• `/customcommands info` - View details',
                inline: false
            }
        )
        .setFooter({ text: 'Tip: Start with "everyone" permissions, then restrict as needed' });
}

function createAdvancedEmbed() {
    return new EmbedBuilder()
        .setColor('#9B59B6')
        .setTitle('⚡ Advanced Features')
        .setDescription('Take your custom commands to the next level!')
        .addFields(
            {
                name: '🎨 Embed Styling',
                value: '• Use embed mode for beautiful responses\n• Set custom colors with hex codes\n• Embeds automatically include timestamps\n• Perfect for announcements and info',
                inline: false
            },
            {
                name: '🔢 Random Features',
                value: '```\n{random:1-6} - Dice roll\n{random:1-100} - Percentage\n{choice:heads,tails} - Coin flip\n{choice:rock,paper,scissors} - RPS\n```',
                inline: false
            },
            {
                name: '📊 Usage Tracking',
                value: '• Every command tracks how many times it\'s used\n• View stats with `/customcommands info`\n• See all commands with `/customcommands list`\n• Monitor popular commands',
                inline: false
            },
            {
                name: '🔧 Command Prefixes',
                value: 'Set custom prefixes for different command groups:\n• `!` for general commands\n• `.` for fun commands\n• `?` for help commands\n• `>` for admin commands',
                inline: false
            }
        )
        .setFooter({ text: 'Experiment with different combinations to create unique commands!' });
}

function createExamplesEmbed() {
    return new EmbedBuilder()
        .setColor('#00FFFF')
        .setTitle('💡 Custom Command Examples')
        .setDescription('Ready-to-use command ideas you can copy!')
        .addFields(
            {
                name: '🎉 Welcome Command',
                value: '```\nName: welcome\nResponse: Welcome {user} to {server}! 🎉\nWe now have {membercount} members!\nEnjoy your stay in {channel}!\n```',
                inline: false
            },
            {
                name: '🎲 Random Picker',
                value: '```\nName: pick\nResponse: 🎯 I choose: {choice:option1,option2,option3}\nReplace options with your choices!\n```',
                inline: false
            },
            {
                name: '🍕 Food Suggestion',
                value: '```\nName: food\nResponse: 🍽️ How about {choice:pizza,burgers,sushi,tacos,pasta,salad}?\nPerfect for {time} on {date}!\n```',
                inline: false
            },
            {
                name: '📊 Server Info',
                value: '```\nName: serverinfo\nResponse: 📈 {server} Stats:\n👥 Members: {membercount}\n💬 Channels: {channelcount}\n📅 Today: {date}\n```',
                inline: false
            },
            {
                name: '🎮 Dice Roll',
                value: '```\nName: roll\nResponse: 🎲 {user} rolled: {random:1-6}\n🍀 Lucky number: {random:1-100}\n```',
                inline: false
            },
            {
                name: '💝 Compliment Generator',
                value: '```\nName: compliment\nResponse: 💝 {user}, you are {choice:amazing,awesome,fantastic,incredible,wonderful}!\nHave a {choice:great,fantastic,amazing,wonderful} day!\n```',
                inline: false
            }
        )
        .setFooter({ text: 'Copy these examples and customize them for your server!' });
}
