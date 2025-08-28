const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');

// Import complete musicIcons from utils
const { musicIcons } = require('../utils/musicIcons.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('📚 Get comprehensive help with bot commands and features')
        .addStringOption(option =>
            option.setName('category')
                .setDescription('Choose a specific category to get help with')
                .setRequired(false)
                .addChoices(
                    { name: '🎵 Music Commands', value: 'music' },
                    { name: '🛡️ Moderation Commands', value: 'moderation' },
                    { name: '🎮 Fun & Games', value: 'fun' },
                    { name: '⚙️ Utility Commands', value: 'utility' },
                    { name: '📊 Dashboard & Setup', value: 'dashboard' },
                    { name: '🤖 AI Features', value: 'ai' },
                    { name: '🎭 Roles & Reactions', value: 'roles' },
                    { name: '🎯 Anime & Entertainment', value: 'anime' },
                    { name: '🔧 Admin Commands', value: 'admin' },
                    { name: '💰 Economy & XP', value: 'economy' },
                    { name: '🗳️ Voting & Polls', value: 'voting' },
                    { name: '🔒 Security & Captcha', value: 'security' },
                    { name: '📝 Logging System', value: 'logging' },
                    { name: '🎲 DNA & Personality', value: 'dna' },
                    { name: '🎨 Creative & Content', value: 'creative' },
                    { name: '🎓 Educational & Learning', value: 'education' }
                )),

    async execute(interaction) {
        const category = interaction.options.getString('category');

        try {
            // Ensure we respond within Discord's timeout
            if (category) {
                await interaction.deferReply({ ephemeral: true });
                await showCategoryHelp(interaction, category);
            } else {
                await interaction.deferReply();
                await showMainHelp(interaction);
            }
        } catch (error) {
            console.error('❌ Error in help command:', error);

            const errorMessage = {
                content: '❌ An error occurred while loading help information. Please try again.',
                ephemeral: true
            };

            try {
                if (interaction.deferred) {
                    await interaction.editReply(errorMessage);
                } else if (!interaction.replied) {
                    await interaction.reply(errorMessage);
                }
            } catch (replyError) {
                console.error('Failed to send error message:', replyError);
            }
        }
    }
};

async function showMainHelp(interaction) {
    const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle(`${musicIcons.musical_note} **Enhanced Bot Help Center** ${musicIcons.musical_note}`)
        .setDescription(`${musicIcons.MusicIcon} Welcome to the comprehensive help system! This bot has **50+ commands** across multiple categories with enhanced logging and moderation.`)
        .setThumbnail(interaction.client.user.displayAvatarURL({ dynamic: true, size: 256 }))
        .addFields(
            { 
                name: `${musicIcons.play} Music Commands`, 
                value: `${musicIcons.headphones} Full music control system\n\`/play\` \`/pause\` \`/stop\``,
                inline: true 
            },
            { 
                name: `${musicIcons.correctIcon} Enhanced Moderation`, 
                value: `${musicIcons.alertIcon} Complete moderation suite\n\`/moderation\` \`/warn\` \`/warnings\`\nAdvanced logging & auto-escalation`,
                inline: true 
            },
            { 
                name: '🗳️ Voting & Polls', 
                value: '📊 Democratic decision making\n`/vote` `/reactionroles`',
                inline: true 
            },
            { 
                name: '🎮 Fun & Games', 
                value: '🎯 Interactive entertainment\n`/games` `/counting` `/wordchain`',
                inline: true 
            },
            { 
                name: '⚙️ Utility Tools', 
                value: '🔍 Server tools & info\n`/utility` `/ping` `/minecraft`',
                inline: true 
            },
            { 
                name: '🎭 Role Management', 
                value: '🏷️ Advanced role systems\n`/reactionroles` `/roles` `/rolestats`',
                inline: true 
            },
            {
                name: '🎯 Entertainment Hub',
                value: '📺 Anime, news, Pokemon\n`/animeinfo` `/news` `/pokemon`',
                inline: true
            },
            {
                name: '🤖 AI Integration',
                value: '💬 Smart AI features\n`/aichat` `/utility ai`',
                inline: true
            },
            {
                name: '💰 Economy System',
                value: '💎 Rewards & progression\n`/daily` `/leaderboard`',
                inline: true
            },
            {
                name: '🔒 Security & Protection',
                value: '🛡️ Advanced security\n`/captcha` `/blockedwords` `/appeal`',
                inline: true
            },
            {
                name: '📝 Logging System',
                value: '📊 Complete activity tracking\n`/logging` `/testlog`',
                inline: true
            },
            {
                name: '🎲 DNA & Personality',
                value: '🧬 User analysis & fun\n`/dna` profile, ghost, roast',
                inline: true
            },
            {
                name: '🎨 Creative & Content',
                value: '🖼️ Meme generation & tools\n`/creative` meme, textart, color',
                inline: true
            },
            {
                name: '🎓 Educational & Learning',
                value: '📚 Study tools & learning\n`/education` study, flashcards, language',
                inline: true
            }
        )
        .addFields(
            { 
                name: '📈 Bot Statistics', 
                value: `**Servers:** ${interaction.client.guilds.cache.size}\n**Users:** ${interaction.client.users.cache.size}\n**Commands:** 50+\n**Uptime:** ${formatUptime(interaction.client.uptime)}`,
                inline: true 
            },
            { 
                name: '🔗 Quick Access', 
                value: '[Web Dashboard](https://yourbot.replit.app/dashboard)\n[Support Server](https://discord.gg/support)\n[Documentation](https://docs.yourbot.com)',
                inline: true 
            },
            { 
                name: `${musicIcons.settings} Setup Guide`, 
                value: '1. Use `/setup dashboard` to configure\n2. Set up logging with `/setup logs`\n3. Configure moderation roles',
                inline: true 
            }
        )
        .setFooter({ 
            text: `${musicIcons.beatsIcon} Use the dropdown below or /help <category> for detailed information`,
            iconURL: musicIcons.footerIcon
        })
        .setTimestamp();

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('help_category_select')
        .setPlaceholder('🔍 Choose a category for detailed help')
        .addOptions([
            {
                label: 'Music Commands',
                description: 'Play, control, and manage music',
                value: 'music',
                emoji: '🎵'
            },
            {
                label: 'Enhanced Moderation',
                description: 'Complete moderation toolkit with logging',
                value: 'moderation',
                emoji: '🛡️'
            },
            {
                label: 'Security & Captcha',
                description: 'Advanced security and verification',
                value: 'security',
                emoji: '🔒'
            },
            {
                label: 'Voting & Polls',
                description: 'Democratic voting and reaction role systems',
                value: 'voting',
                emoji: '🗳️'
            },
            {
                label: 'Fun & Games',
                description: 'Interactive games and entertainment',
                value: 'fun',
                emoji: '🎮'
            },
            {
                label: 'Utility Commands',
                description: 'Server info, AI chat, tools',
                value: 'utility',
                emoji: '⚙️'
            },
            {
                label: 'Dashboard & Setup',
                description: 'Web dashboard and server configuration',
                value: 'dashboard',
                emoji: '📊'
            },
            {
                label: 'AI Features',
                description: 'Advanced AI chat and analysis',
                value: 'ai',
                emoji: '🤖'
            },
            {
                label: 'Role Management',
                description: 'Reaction roles and role tools',
                value: 'roles',
                emoji: '🎭'
            },
            {
                label: 'Entertainment',
                description: 'Anime, news, Pokemon, recommendations',
                value: 'anime',
                emoji: '🎯'
            },
            {
                label: 'Admin Tools',
                description: 'Server administration and analytics',
                value: 'admin',
                emoji: '🔧'
            },
            {
                label: 'Economy & XP',
                description: 'Daily rewards and progression',
                value: 'economy',
                emoji: '💰'
            },
            {
                label: 'Logging System',
                description: 'Complete activity tracking',
                value: 'logging',
                emoji: '📝'
            },
            {
                label: 'DNA & Personality',
                description: 'User analysis and personality features',
                value: 'dna',
                emoji: '🎲'
            },
            {
                label: 'Creative & Content',
                description: 'Meme generation, image tools, text art',
                value: 'creative',
                emoji: '🎨'
            },
            {
                label: 'Educational & Learning',
                description: 'Study groups, flashcards, language learning',
                value: 'education',
                emoji: '🎓'
            }
        ]);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    await interaction.editReply({ embeds: [embed], components: [row] });
}

async function showCategoryHelp(interaction, category) {
    const embeds = {
        music: createMusicHelp(),
        moderation: createModerationHelp(),
        security: createSecurityHelp(),
        fun: createFunHelp(),
        utility: createUtilityHelp(),
        dashboard: createDashboardHelp(),
        ai: createAIHelp(),
        roles: createRolesHelp(),
        anime: createAnimeHelp(),
        admin: createAdminHelp(),
        economy: createEconomyHelp(),
        voting: createVotingHelp(),
        logging: createLoggingHelp(),
        dna: createDNAHelp(),
        creative: createCreativeHelp(),
        education: createEducationHelp()
    };

    const embed = embeds[category];
    if (embed) {
        await interaction.editReply({ embeds: [embed] });
    } else {
        await interaction.editReply({ content: '❌ Category not found! Please use the dropdown menu to select a valid category.' });
    }
}

function createMusicHelp() {
    return new EmbedBuilder()
        .setColor('#FF6B6B')
        .setTitle(`${musicIcons.musical_note} Music Commands`)
        .setDescription('Complete music control system with queue management:')
        .addFields(
            { 
                name: `${musicIcons.play} /play`, 
                value: '**Play music from various sources:**\n• YouTube, Spotify, SoundCloud support\n• Queue management\n• Playlist support\n`/play song: Never Gonna Give You Up`', 
                inline: false 
            },
            { 
                name: `${musicIcons.pause} /pause`, 
                value: '**Pause/Resume playback:**\n• Pause current track\n• Resume from where you left off\n`/pause`', 
                inline: true 
            },
            { 
                name: `${musicIcons.stop} /stop`, 
                value: '**Stop music completely:**\n• Stop current track\n• Clear entire queue\n• Disconnect from voice\n`/stop`', 
                inline: true 
            }
        );
}

function createModerationHelp() {
    return new EmbedBuilder()
        .setColor('#FF4757')
        .setTitle(`${musicIcons.correctIcon} Enhanced Moderation Commands`)
        .setDescription(`${musicIcons.MusicIcon} Complete moderation suite with advanced logging and tracking`)
        .setThumbnail(musicIcons.playerIcon)
        .addFields(
            { 
                name: `${musicIcons.alertIcon} /moderation - Core Toolkit`, 
                value: `${musicIcons.CheckmarkIcon} **Comprehensive moderation arsenal:**
${musicIcons.clear} \`purge <amount>\` - Mass delete with smart filters
${musicIcons.beatsIcon} \`warn <user> <reason>\` - Issue tracked warnings
${musicIcons.stopIcon} \`kick <user> <reason>\` - Remove users with logging
${musicIcons.stop} \`ban <user> <reason>\` - Permanent/temporary bans
${musicIcons.pauseresumeIcon} \`timeout <user> <duration>\` - Temporary mute
${musicIcons.volumeIcon} \`massban <user_ids>\` - Bulk ban operations
${musicIcons.loopIcon} \`lockdown <channel/server>\` - Emergency locks
${musicIcons.skipIcon} \`slowmode <seconds>\` - Rate limiting
${musicIcons.heartIcon} \`nickname <user> <name>\` - Name management`, 
                inline: false 
            },
            { 
                name: `${musicIcons.alertIcon} /warnings - Advanced Management`, 
                value: `${musicIcons.beatsIcon} **Smart warning system:**
${musicIcons.queue} \`view <user>\` - Detailed warning history
${musicIcons.clear} \`clear <user>\` - Reset warning count
${musicIcons.playlistIcon} \`list\` - Server warning overview
${musicIcons.loopIcon} Auto-escalation with smart detection
${musicIcons.heartIcon} Integrated appeal process
${musicIcons.pingIcon} Real-time moderator notifications`, 
                inline: false 
            },
            { 
                name: `${musicIcons.correctIcon} Auto-Moderation Suite`, 
                value: `${musicIcons.MusicIcon} **AI-powered protection:**
${musicIcons.volumeIcon} \`/blockedwords\` - Smart content filtering
${musicIcons.radio} \`/blockeddomains\` - Advanced link protection
${musicIcons.beats2Icon} Real-time spam detection
${musicIcons.alertIcon} Bypass attempt prevention
${musicIcons.CheckmarkIcon} Pattern recognition system
${musicIcons.footerIcon} Automated rule enforcement`, 
                inline: false 
            }
        );
}

function createSecurityHelp() {
    return new EmbedBuilder()
        .setColor('#8B0000')
        .setTitle('🔒 Security & Captcha System')
        .setDescription('Advanced security features and verification systems:')
        .addFields(
            { 
                name: '🔐 /captcha', 
                value: `**Verification System:**
• \`setup\` - Configure captcha system
• \`test\` - Test captcha verification
• \`stats\` - View verification statistics
• \`config\` - Modify captcha settings
• Image-based verification
• Anti-bot protection`, 
                inline: false 
            },
            { 
                name: '🚫 /blockedwords', 
                value: `**Content Filtering:**
• \`add <word>\` - Add blocked word
• \`remove <word>\` - Remove blocked word
• \`list\` - View all blocked words
• \`toggle\` - Enable/disable filtering
• Bypass detection system`, 
                inline: false 
            },
            { 
                name: '🌐 /blockeddomains', 
                value: `**Link Protection:**
• \`add <domain>\` - Block specific domains
• \`remove <domain>\` - Unblock domains
• \`list\` - View blocked domains
• \`toggle\` - Enable/disable protection
• Automatic malicious link detection`, 
                inline: false 
            },
            { 
                name: '📝 /appeal', 
                value: `**Appeal System:**
• Submit ban/mute appeals
• Automated appeal processing
• Staff notification system
• Appeal history tracking`, 
                inline: false 
            }
        );
}

function createFunHelp() {
    return new EmbedBuilder()
        .setColor('#5DADE2')
        .setTitle('🎮 Fun & Games Commands')
        .setDescription('Interactive entertainment to engage your community:')
        .addFields(
            { 
                name: '🎯 /games', 
                value: `**Interactive Games:**
• \`trivia\` - Quiz questions with categories
• \`rps\` - Rock Paper Scissors battles
• \`guess\` - Number guessing games
• \`riddle\` - Brain teasers and puzzles
• \`8ball\` - Magic 8-ball predictions
• \`coinflip\` - Coin flipping with betting
• \`wordle\` - Word guessing games
• \`quiz\` - Multi-question quizzes`, 
                inline: false 
            },
            { 
                name: '🔢 /counting', 
                value: `**Counting Game:**
• Set up counting channels
• Track counting records
• Automatic counting validation
• Leaderboard system`, 
                inline: false 
            },
            { 
                name: '📝 /wordchain', 
                value: `**Word Chain Games:**
• Create word association chains
• Category-specific chains
• Difficulty levels
• Chain length tracking`, 
                inline: false 
            }
        );
}

function createUtilityHelp() {
    return new EmbedBuilder()
        .setColor('#58D68D')
        .setTitle('⚙️ Utility Commands')
        .setDescription('Helpful tools and server information:')
        .addFields(
            { 
                name: '📊 /utility', 
                value: `**Comprehensive Utilities:**
• \`serverinfo\` - Detailed server statistics
• \`userinfo <user>\` - User profile and stats
• \`currency <amount> <from> <to>\` - Currency conversion
• \`ai <question>\` - Ask AI questions
• \`sentiment <text>\` - Analyze text sentiment
• \`weather <location>\` - Weather information
• \`qr <text>\` - Generate QR codes`, 
                inline: false 
            },
            { 
                name: '🏓 /ping', 
                value: `**Performance Monitoring:**
• Bot latency information
• API response times
• WebSocket ping
• System health check`, 
                inline: false 
            },
            { 
                name: '🎮 /minecraft', 
                value: `**Minecraft Integration:**
• Server status checking
• Player statistics
• Server info display
• Connection monitoring`, 
                inline: false 
            }
        );
}

function createDashboardHelp() {
    return new EmbedBuilder()
        .setColor('#AF7AC5')
        .setTitle('📊 Dashboard & Setup')
        .setDescription('Configure your server through web interface:')
        .addFields(
            { 
                name: '⚙️ /setup', 
                value: `**Bot Configuration:**
• \`dashboard\` - Setup web dashboard
• \`logs\` - Configure logging system
• \`moderation\` - Setup mod tools
• \`welcome\` - Welcome message config
• \`roles\` - Role system setup`, 
                inline: false 
            },
            { 
                name: '🔐 /dashboard-setup', 
                value: `**Dashboard Access:**
• Create admin credentials
• Generate access tokens
• Setup OAuth integration
• Configure permissions`, 
                inline: false 
            },
            { 
                name: '🖥️ /dashboard', 
                value: `**Web Interface:**
• Access control panel
• Visual configuration
• Real-time statistics
• Advanced settings`, 
                inline: false 
            }
        );
}

function createAIHelp() {
    return new EmbedBuilder()
        .setColor('#F39C12')
        .setTitle('🤖 AI Features')
        .setDescription('Advanced AI-powered interactions and analysis:')
        .addFields(
            { 
                name: '💬 /aichat', 
                value: `**AI Personality System:**
• \`chat <message>\` - Chat with AI
• \`personality\` - Configure AI traits
• \`settings\` - Adjust AI behavior
• \`history\` - View chat history
• Multiple personality modes
• Context-aware responses`, 
                inline: false 
            },
            { 
                name: '🧠 /utility ai', 
                value: `**AI Question System:**
• Ask complex questions
• Get detailed explanations
• Problem-solving assistance
• Educational support`, 
                inline: false 
            },
            { 
                name: '😊 /utility sentiment', 
                value: `**Sentiment Analysis:**
• Analyze text emotions
• Mood detection
• Positivity scoring
• Emotional insights`, 
                inline: false 
            }
        );
}

function createAnimeHelp() {
    return new EmbedBuilder()
        .setColor('#E91E63')
        .setTitle('🎯 Anime & Entertainment')
        .setDescription('Discover anime, manga, and entertainment content:')
        .addFields(
            { 
                name: '📺 /animeinfo', 
                value: `**Anime & Manga Database:**
• \`search <title>\` - Find anime/manga
• \`trending\` - Popular content
• \`random\` - Random recommendations
• Detailed information display
• Rating and review system`, 
                inline: false 
            },
            { 
                name: '🎲 /animerecommend', 
                value: `**Smart Recommendations:**
• Personalized suggestions
• Genre-based filtering
• Popularity rankings
• Similar content discovery`, 
                inline: false 
            },
            { 
                name: '📰 /news', 
                value: `**Latest News:**
• Technology updates
• Gaming news
• Anime announcements
• General news topics`, 
                inline: false 
            },
            { 
                name: '🎮 /pokemon', 
                value: `**Pokemon Database:**
• Pokemon information
• Stats and abilities
• Evolution chains
• Type effectiveness`, 
                inline: false 
            }
        );
}

function createAdminHelp() {
    return new EmbedBuilder()
        .setColor('#9B59B6')
        .setTitle('🔧 Admin Commands')
        .setDescription('Server administration and management tools:')
        .addFields(
            { 
                name: '👑 /admin', 
                value: `**Administrative Tools:**
• Server configuration
• User management
• Permission handling
• System maintenance
• Analytics and reports`, 
                inline: false 
            },
            { 
                name: '🔧 /setadminroles', 
                value: `**Role Management:**
• Configure admin roles
• Set permission levels
• Hierarchy management
• Access control`, 
                inline: false 
            },
            { 
                name: '📊 Analytics', 
                value: `**Server Statistics:**
• Usage analytics
• User activity tracking
• Command statistics
• Performance monitoring`, 
                inline: false 
            }
        );
}

function createEconomyHelp() {
    return new EmbedBuilder()
        .setColor('#27AE60')
        .setTitle('💰 Economy & XP System')
        .setDescription('Reward and progression system:')
        .addFields(
            { 
                name: '💎 /daily', 
                value: `**Daily Rewards:**
• Daily coin collection
• Streak bonuses
• Special challenges
• Reward multipliers`, 
                inline: false 
            },
            { 
                name: '🏆 /leaderboard', 
                value: `**Rankings System:**
• XP leaderboards
• Activity rankings
• Achievement tracking
• Competitive features`, 
                inline: false 
            },
            { 
                name: '📈 Progression', 
                value: `**Automatic Systems:**
• XP gain from activity
• Level progression
• Role rewards
• Achievement unlocks`, 
                inline: false 
            }
        );
}

function createVotingHelp() {
    return new EmbedBuilder()
        .setColor('#4A90E2')
        .setTitle('🗳️ Voting & Democracy System')
        .setDescription('Democratic decision making and community engagement:')
        .addFields(
            { 
                name: '📊 /vote', 
                value: `**Voting System:**
• \`create\` - Create polls and elections
• \`list\` - View active votes
• \`results\` - Check poll results
• \`end\` - Close voting early
• \`stats\` - Server voting statistics
• Owner and staff elections
• Rule change proposals`, 
                inline: false 
            },
            { 
                name: '🎭 /reactionroles', 
                value: `**Advanced Role Management:**
• \`create\` - Build custom role panels
• \`edit\` - Modify existing panels
• \`deploy\` - Activate role systems
• \`list\` - View all role panels
• Button and reaction support
• Multiple selection modes`, 
                inline: false 
            },
            { 
                name: '🏷️ /roles & /rolestats', 
                value: `**Role Analytics:**
• Member distribution
• Role usage statistics
• Growth tracking
• Assignment analytics`, 
                inline: false 
            }
        );
}

function createLoggingHelp() {
    return new EmbedBuilder()
        .setColor('#2C3E50')
        .setTitle('📝 Enhanced Logging System')
        .setDescription('Complete activity tracking and audit trails:')
        .addFields(
            { 
                name: '📋 /logging', 
                value: `**Logging Configuration:**
• \`setup\` - Configure log channels
• \`toggle\` - Enable/disable logging
• \`test\` - Test logging system
• \`config\` - View current settings
• Custom log filters`, 
                inline: false 
            },
            { 
                name: '🧪 /testlog', 
                value: `**Testing Tools:**
• Test all log types
• Verify log channels
• Debug logging issues
• Performance testing`, 
                inline: false 
            },
            { 
                name: '📊 Tracked Events', 
                value: `**Comprehensive Logging:**
• Message edits and deletions
• Role changes and permissions
• Join/leave events with context
• Moderation action history
• Command usage tracking
• Security events`, 
                inline: false 
            }
        );
}

function createDNAHelp() {
    return new EmbedBuilder()
        .setColor('#FF69B4')
        .setTitle('🎲 DNA & Personality System')
        .setDescription('Advanced user analysis and personality simulation:')
        .addFields(
            { 
                name: '🧬 /dna', 
                value: `**Personality Analysis:**
• \`analyze <user>\` - Deep personality analysis
• \`profile <user>\` - User behavior profile
• \`ghost <user>\` - Simulate user messages
• \`roast <user>\` - Generate roasts in user style
• \`compliment <user>\` - Generate compliments
• \`compare <user1> <user2>\` - Compare personalities
• \`ship <user1> <user2>\` - Relationship analysis
• \`memeify <user>\` - Meme caption generation`, 
                inline: false 
            },
            { 
                name: '🔬 Analysis Features', 
                value: `**Advanced Capabilities:**
• Writing style analysis
• Emoji usage patterns
• Communication preferences
• Social interaction mapping
• Behavioral predictions`, 
                inline: false 
            },
            { 
                name: '🎭 Fun Applications', 
                value: `**Entertainment Uses:**
• Personality mimicking
• Style-based content generation
• User compatibility analysis
• Humorous interpretations`, 
                inline: false 
            }
        );
}

function createCreativeHelp() {
    return new EmbedBuilder()
        .setColor('#DAA520')
        .setTitle('🎨 Creative & Content Commands')
        .setDescription('Create memes with templates, manipulate images, generate text art, and explore color palettes:')
        .addFields(
            { 
                name: '🖼️ Meme Generator', 
                value: `**Create Memes:**
• Use popular meme templates
• Customize text and images
• Generate unique memes
• \`/meme create <template> <text1> <text2>\``, 
                inline: false 
            },
            { 
                name: '✨ Image Manipulation', 
                value: `**Edit Images:**
• Apply filters and effects
• Create collages from multiple images
• Resize and crop images
• \`/image filter <image> <filter_name>\``, 
                inline: false 
            },
            { 
                name: '✍️ Text Art Generator', 
                value: `**ASCII & Fancy Text:**
• Convert text to ASCII art
• Fancy text converter with styles
• Generate unique text designs
• \`/textart ascii <h1>Hello World</h1>\``, 
                inline: false 
            },
            { 
                name: '🌈 Color Palette Tools', 
                value: `**Color Schemes:**
• Generate harmonious color palettes
• Convert between HEX, RGB, HSL
• Color blindness simulation
• \`/colorpalette generate <seed_color>\``, 
                inline: false 
            }
        );
}

function createEducationHelp() {
    return new EmbedBuilder()
        .setColor('#4CAF50')
        .setTitle('🎓 Educational & Learning Commands')
        .setDescription('Comprehensive learning tools for study groups, language learning, coding practice, and educational content:')
        .addFields(
            { 
                name: '📚 Study Groups & Sessions', 
                value: `**Collaborative Learning:**
• \`/education study create\` - Create study groups
• \`/education study join\` - Join existing groups
• \`/education study session\` - Start study sessions
• \`/education study list\` - View active groups
• Focus sessions with Pomodoro timers
• Group discussions and Q&A sessions`, 
                inline: false 
            },
            { 
                name: '🃏 Flashcard System', 
                value: `**Smart Flashcards:**
• \`/education flashcards create\` - Create flashcard sets
• \`/education flashcards study\` - Study flashcards
• \`/education flashcards quiz\` - Take flashcard quizzes
• Spaced repetition learning
• Progress tracking and statistics
• Custom categories and subjects`, 
                inline: false 
            },
            { 
                name: '🌐 Language Learning', 
                value: `**Multi-Language Support:**
• \`/education language translate\` - Translate text
• \`/education language wordofday\` - Daily vocabulary
• \`/education language vocabulary\` - Practice sessions
• 9 supported languages
• Vocabulary building exercises
• Pronunciation guides and etymology`, 
                inline: false 
            },
            { 
                name: '💻 Coding Challenges', 
                value: `**Programming Practice:**
• \`/education coding challenge\` - Get coding problems
• \`/education coding snippet\` - Useful code examples
• \`/education coding submit\` - Submit solutions
• \`/education coding leaderboard\` - View rankings
• Multiple difficulty levels
• Multi-language support (Python, JS, Java, C++)`, 
                inline: false 
            },
            { 
                name: '🧠 Educational Trivia', 
                value: `**Knowledge Testing:**
• \`/education trivia quiz\` - Subject-based quizzes
• \`/education trivia custom\` - Create custom categories
• \`/education trivia stats\` - View your progress
• \`/education trivia leaderboard\` - Competition rankings
• Subjects: Science, History, Math, Literature, Geography
• Detailed explanations for answers`, 
                inline: false 
            },
            { name: '💼 Professional Tools', value: 'Meeting scheduler, task assignment, project management, time tracking' },
            { 
                name: '🎓 Education', 
                value: 'Study groups, language learning, coding challenges, trivia',
                inline: true 
            },
            { name: '💼 Professional', value: 'Meeting scheduler, task management, project tracking, time tracking' },
        )
        .setFooter({ text: 'Transform your Discord server into a learning hub!' })
        .setTimestamp();
}

function isLightColor(hex) {
    const rgb = hexToRgb(hex);
    const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
    return brightness > 128;
}