
const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require('discord.js');

const { InteractiveSystem } = require('../components/interactiveSystem');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('interactive')
        .setDescription('Interactive entertainment and games')
        .addSubcommand(subcommand =>
            subcommand
                .setName('story')
                .setDescription('Collaborative storytelling')
                .addStringOption(option =>
                    option.setName('action')
                        .setDescription('Story action')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Start New Story', value: 'start' },
                            { name: 'Continue Story', value: 'continue' },
                            { name: 'View Current Story', value: 'view' },
                            { name: 'End Story', value: 'end' }
                        ))
                .addStringOption(option =>
                    option.setName('genre')
                        .setDescription('Story genre (for new stories)')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Fantasy', value: 'fantasy' },
                            { name: 'Sci-Fi', value: 'scifi' },
                            { name: 'Mystery', value: 'mystery' },
                            { name: 'Adventure', value: 'adventure' },
                            { name: 'Horror', value: 'horror' },
                            { name: 'Comedy', value: 'comedy' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('drawing')
                .setDescription('Digital drawing competitions')
                .addStringOption(option =>
                    option.setName('action')
                        .setDescription('Drawing action')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Start Competition', value: 'start' },
                            { name: 'Submit Drawing', value: 'submit' },
                            { name: 'Vote on Drawings', value: 'vote' },
                            { name: 'View Results', value: 'results' }
                        ))
                .addStringOption(option =>
                    option.setName('theme')
                        .setDescription('Drawing theme/prompt')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('pet')
                .setDescription('Virtual pet management')
                .addStringOption(option =>
                    option.setName('action')
                        .setDescription('Pet action')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Create Pet', value: 'create' },
                            { name: 'View Pet', value: 'view' },
                            { name: 'Feed Pet', value: 'feed' },
                            { name: 'Play with Pet', value: 'play' },
                            { name: 'Train Pet', value: 'train' },
                            { name: 'Pet Status', value: 'status' }
                        ))
                .addStringOption(option =>
                    option.setName('pet_type')
                        .setDescription('Type of pet to create')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Dragon', value: 'dragon' },
                            { name: 'Cat', value: 'cat' },
                            { name: 'Dog', value: 'dog' },
                            { name: 'Phoenix', value: 'phoenix' },
                            { name: 'Robot', value: 'robot' },
                            { name: 'Slime', value: 'slime' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('escape')
                .setDescription('Text-based escape rooms')
                .addStringOption(option =>
                    option.setName('action')
                        .setDescription('Escape room action')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Start Room', value: 'start' },
                            { name: 'Look Around', value: 'look' },
                            { name: 'Use Item', value: 'use' },
                            { name: 'Check Inventory', value: 'inventory' },
                            { name: 'Give Hint', value: 'hint' },
                            { name: 'Reset Room', value: 'reset' }
                        ))
                .addStringOption(option =>
                    option.setName('room_type')
                        .setDescription('Type of escape room')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Haunted House', value: 'haunted' },
                            { name: 'Space Station', value: 'space' },
                            { name: 'Ancient Temple', value: 'temple' },
                            { name: 'Laboratory', value: 'lab' },
                            { name: 'Prison Cell', value: 'prison' }
                        ))),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const interactiveSystem = new InteractiveSystem();

        try {
            switch (subcommand) {
                case 'story':
                    await this.handleStoryBuilder(interaction, interactiveSystem);
                    break;
                case 'drawing':
                    await this.handleDrawingGame(interaction, interactiveSystem);
                    break;
                case 'pet':
                    await this.handleVirtualPet(interaction, interactiveSystem);
                    break;
                case 'escape':
                    await this.handleEscapeRoom(interaction, interactiveSystem);
                    break;
                default:
                    await interaction.reply({ content: '❌ Unknown interactive command!', ephemeral: true });
            }
        } catch (error) {
            console.error('❌ Error in interactive command:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: '❌ An error occurred while processing your request!', ephemeral: true });
            }
        }
    },

    async handleStoryBuilder(interaction, system) {
        const action = interaction.options.getString('action');
        const genre = interaction.options.getString('genre');

        switch (action) {
            case 'start':
                await system.startStory(interaction, genre);
                break;
            case 'continue':
                await system.continueStory(interaction);
                break;
            case 'view':
                await system.viewStory(interaction);
                break;
            case 'end':
                await system.endStory(interaction);
                break;
        }
    },

    async handleDrawingGame(interaction, system) {
        const action = interaction.options.getString('action');
        const theme = interaction.options.getString('theme');

        switch (action) {
            case 'start':
                await system.startDrawingCompetition(interaction, theme);
                break;
            case 'submit':
                await system.submitDrawing(interaction);
                break;
            case 'vote':
                await system.voteDrawing(interaction);
                break;
            case 'results':
                await system.viewDrawingResults(interaction);
                break;
        }
    },

    async handleVirtualPet(interaction, system) {
        const action = interaction.options.getString('action');
        const petType = interaction.options.getString('pet_type');

        switch (action) {
            case 'create':
                await system.createPet(interaction, petType);
                break;
            case 'view':
                await system.viewPet(interaction);
                break;
            case 'feed':
                await system.feedPet(interaction);
                break;
            case 'play':
                await system.playWithPet(interaction);
                break;
            case 'train':
                await system.trainPet(interaction);
                break;
            case 'status':
                await system.getPetStatus(interaction);
                break;
        }
    },

    async handleEscapeRoom(interaction, system) {
        const action = interaction.options.getString('action');
        const roomType = interaction.options.getString('room_type');

        switch (action) {
            case 'start':
                await system.startEscapeRoom(interaction, roomType);
                break;
            case 'look':
                await system.lookAround(interaction);
                break;
            case 'use':
                await system.useItem(interaction);
                break;
            case 'inventory':
                await system.checkInventory(interaction);
                break;
            case 'hint':
                await system.giveHint(interaction);
                break;
            case 'reset':
                await system.resetRoom(interaction);
                break;
        }
    }
};
