
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('vote')
        .setDescription('🗳️ Create and manage democratic voting polls with advanced features')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Create a new poll')
                .addStringOption(option =>
                    option.setName('type')
                        .setDescription('Type of poll')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Simple Poll', value: 'simple' },
                            { name: 'Multiple Choice', value: 'multiple_choice' },
                            { name: 'Yes/No Vote', value: 'yes_no' },
                            { name: 'Election', value: 'election' },
                            { name: 'Proposal', value: 'proposal' }
                        ))
                .addStringOption(option =>
                    option.setName('title')
                        .setDescription('Title of the poll')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('description')
                        .setDescription('Description of the poll')
                        .setRequired(false))
                .addIntegerOption(option =>
                    option.setName('duration')
                        .setDescription('Duration in hours (1-168, default: 24)')
                        .setRequired(false)
                        .setMinValue(1)
                        .setMaxValue(168))
                .addBooleanOption(option =>
                    option.setName('anonymous')
                        .setDescription('Anonymous voting (voters hidden, default: false)')
                        .setRequired(false))
                .addBooleanOption(option =>
                    option.setName('multiple_choice')
                        .setDescription('Allow multiple selections (default: false)')
                        .setRequired(false))
                .addRoleOption(option =>
                    option.setName('required_role')
                        .setDescription('Required role to vote (optional)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('results')
                .setDescription('View poll results')
                .addStringOption(option =>
                    option.setName('poll_id')
                        .setDescription('Poll ID to view results for')
                        .setRequired(true))
                .addBooleanOption(option =>
                    option.setName('detailed')
                        .setDescription('Show detailed results (default: false)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('end')
                .setDescription('End a poll early')
                .addStringOption(option =>
                    option.setName('poll_id')
                        .setDescription('Poll ID to end')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List all active polls in this server'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('stats')
                .setDescription('View server voting statistics')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        try {
            switch (subcommand) {
                case 'create':
                    await this.handleCreate(interaction);
                    break;
                case 'list':
                    await this.handleList(interaction);
                    break;
                case 'results':
                    await this.handleResults(interaction);
                    break;
                case 'end':
                    await this.handleEnd(interaction);
                    break;
                case 'stats':
                    await this.handleStats(interaction);
                    break;
                default:
                    await interaction.reply({
                        content: '❌ Unknown subcommand.',
                        ephemeral: true
                    });
            }
        } catch (error) {
            console.error('Vote command error:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ An error occurred while processing your request.',
                    ephemeral: true
                });
            }
        }
    },

    async handleCreate(interaction) {
        const type = interaction.options.getString('type');
        const title = interaction.options.getString('title');
        const description = interaction.options.getString('description') || 'No description provided';
        const duration = interaction.options.getInteger('duration') || 24;
        const anonymous = interaction.options.getBoolean('anonymous') || false;
        const multipleChoice = interaction.options.getBoolean('multiple_choice') || false;
        const requiredRole = interaction.options.getRole('required_role');

        // Create modal for poll options
        const modal = new ModalBuilder()
            .setCustomId(`poll_create|${type}|${duration}|${anonymous}|${multipleChoice}`)
            .setTitle('📊 Create Poll - Add Options');

        const titleInput = new TextInputBuilder()
            .setCustomId('poll_title')
            .setLabel('Poll Title')
            .setStyle(TextInputStyle.Short)
            .setValue(title)
            .setRequired(true);

        const descriptionInput = new TextInputBuilder()
            .setCustomId('poll_description')
            .setLabel('Poll Description')
            .setStyle(TextInputStyle.Paragraph)
            .setValue(description)
            .setRequired(false);

        const optionsInput = new TextInputBuilder()
            .setCustomId('poll_options')
            .setLabel('Poll Options (one per line, max 10)')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Option 1\nOption 2\nOption 3\n...')
            .setRequired(true);

        const row1 = new ActionRowBuilder().addComponents(titleInput);
        const row2 = new ActionRowBuilder().addComponents(descriptionInput);
        const row3 = new ActionRowBuilder().addComponents(optionsInput);

        modal.addComponents(row1, row2, row3);
        await interaction.showModal(modal);
    },

    async handleList(interaction) {
        const { getActivePolls } = require('../components/votingSystem');
        const activePolls = await getActivePolls(interaction.guild.id);

        if (activePolls.length === 0) {
            return await interaction.reply({
                content: '📊 No active polls in this server.',
                ephemeral: true
            });
        }

        const embed = new EmbedBuilder()
            .setTitle('🗳️ Active Polls')
            .setColor('#4A90E2')
            .setDescription(`Found ${activePolls.length} active poll(s):`)
            .setTimestamp();

        activePolls.forEach((poll, index) => {
            const totalVotes = poll.options.reduce((sum, option) => sum + option.votes, 0);
            const endTime = poll.endTime ? `<t:${Math.floor(poll.endTime / 1000)}:R>` : 'No end time';
            
            embed.addFields({
                name: `${index + 1}. ${poll.title}`,
                value: `**ID:** ${poll.id}\n**Type:** ${poll.type.replace('_', ' ')}\n**Votes:** ${totalVotes}\n**Ends:** ${endTime}`,
                inline: true
            });
        });

        await interaction.reply({ embeds: [embed] });
    },

    async handleResults(interaction) {
        const pollId = interaction.options.getString('poll_id');
        const detailed = interaction.options.getBoolean('detailed') || false;
        
        const { getPollResults } = require('../components/votingSystem');
        const result = await getPollResults(interaction.guild.id, pollId);

        if (!result.success) {
            return await interaction.reply({
                content: `❌ ${result.message}`,
                ephemeral: true
            });
        }

        const { poll, results } = result;
        
        const embed = new EmbedBuilder()
            .setTitle(`📊 Poll Results: ${poll.title}`)
            .setDescription(poll.description)
            .setColor(poll.active ? '#4A90E2' : '#95A5A6')
            .addFields(
                { name: '🆔 Poll ID', value: poll.id, inline: true },
                { name: '📝 Type', value: poll.type.replace('_', ' '), inline: true },
                { name: '🗳️ Total Votes', value: results.totalVotes.toString(), inline: true }
            )
            .setFooter({ 
                text: `${poll.anonymous ? 'Anonymous' : 'Public'} • ${poll.active ? 'Active' : 'Ended'}` 
            })
            .setTimestamp();

        if (poll.endTime) {
            embed.addFields({
                name: '⏰ End Time',
                value: `<t:${Math.floor(poll.endTime / 1000)}:${poll.active ? 'R' : 'f'}>`,
                inline: true
            });
        }

        // Add results for each option
        results.options.forEach((option, index) => {
            const progressBar = this.createProgressBar(option.percentage);
            embed.addFields({
                name: `${index + 1}. ${option.text}`,
                value: `${progressBar} ${option.votes} votes (${option.percentage}%)`,
                inline: false
            });
        });

        await interaction.reply({ embeds: [embed] });
    },

    async handleEnd(interaction) {
        const pollId = interaction.options.getString('poll_id');
        
        const { endPoll } = require('../components/votingSystem');
        const result = await endPoll(interaction.guild.id, pollId, interaction.user.id);

        if (!result.success) {
            return await interaction.reply({
                content: `❌ ${result.message}`,
                ephemeral: true
            });
        }

        const embed = new EmbedBuilder()
            .setTitle('🛑 Poll Ended')
            .setDescription(`Poll "${result.poll.title}" has been ended by ${interaction.user}.`)
            .setColor('#E74C3C')
            .addFields(
                { name: '🆔 Poll ID', value: result.poll.id, inline: true },
                { name: '📝 Type', value: result.poll.type.replace('_', ' '), inline: true }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },

    async handleStats(interaction) {
        const { loadPolls } = require('../components/votingSystem');
        const polls = loadPolls();
        const guildPolls = polls[interaction.guild.id] || [];

        const totalPolls = guildPolls.length;
        const activePolls = guildPolls.filter(poll => poll.active).length;
        const endedPolls = totalPolls - activePolls;
        const totalVotes = guildPolls.reduce((sum, poll) => 
            sum + poll.options.reduce((pollSum, option) => pollSum + option.votes, 0), 0
        );

        const embed = new EmbedBuilder()
            .setTitle('📊 Server Voting Statistics')
            .setColor('#4A90E2')
            .addFields(
                { name: '📋 Total Polls', value: totalPolls.toString(), inline: true },
                { name: '🟢 Active Polls', value: activePolls.toString(), inline: true },
                { name: '🔴 Ended Polls', value: endedPolls.toString(), inline: true },
                { name: '🗳️ Total Votes Cast', value: totalVotes.toString(), inline: true }
            )
            .setFooter({ text: `Statistics for ${interaction.guild.name}` })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },

    createProgressBar(percentage) {
        const filled = Math.round(percentage / 10);
        const empty = 10 - filled;
        return '█'.repeat(filled) + '░'.repeat(empty);
    }
};
