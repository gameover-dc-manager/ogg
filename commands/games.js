const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const { GameSystem } = require('../components/gameSystem');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('games')
        .setDescription('Play various mini-games')

        .addSubcommand(sub =>
            sub.setName('rps')
                .setDescription('Play Rock Paper Scissors')
                .addStringOption(opt =>
                    opt.setName('choice')
                        .setDescription('Your choice')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Rock', value: 'rock' },
                            { name: 'Paper', value: 'paper' },
                            { name: 'Scissors', value: 'scissors' }
                        )))

        .addSubcommand(sub =>
            sub.setName('coinflip')
                .setDescription('Flip a coin')
                .addStringOption(opt =>
                    opt.setName('bet')
                        .setDescription('Your bet (heads or tails)')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Heads', value: 'heads' },
                            { name: 'Tails', value: 'tails' }
                        ))
                .addIntegerOption(opt =>
                    opt.setName('amount')
                        .setDescription('Amount to bet')
                        .setRequired(false)))

        .addSubcommand(sub =>
            sub.setName('dice')
                .setDescription('Roll dice')
                .addIntegerOption(opt =>
                    opt.setName('count')
                        .setDescription('Number of dice to roll')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(10))
                .addIntegerOption(opt =>
                    opt.setName('sides')
                        .setDescription('Number of sides on the dice')
                        .setRequired(false)
                        .setMinValue(2)
                        .setMaxValue(100)))

        .addSubcommand(sub =>
            sub.setName('trivia')
                .setDescription('Answer trivia questions')
                .addStringOption(opt =>
                    opt.setName('category')
                        .setDescription('Trivia category')
                        .setRequired(false)
                        .addChoices(
                            { name: 'General', value: 'general' },
                            { name: 'Science', value: 'science' }
                        )))

        .addSubcommand(sub =>
            sub.setName('number')
                .setDescription('Guess the number game')
                .addIntegerOption(opt =>
                    opt.setName('range')
                        .setDescription('Maximum number range')
                        .setRequired(false)
                        .setMinValue(10)
                        .setMaxValue(1000)))

        .addSubcommand(sub =>
            sub.setName('blackjack')
                .setDescription('Play Blackjack'))

        .addSubcommand(sub =>
            sub.setName('stats')
                .setDescription('View your game statistics')
                .addUserOption(opt =>
                    opt.setName('user')
                        .setDescription('User to view stats for')
                        .setRequired(false))),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const gameSystem = new GameSystem();

        try {
            switch (subcommand) {
                case 'rps':
                    await this.handleRockPaperScissors(interaction, gameSystem);
                    break;
                case 'coinflip':
                    await this.handleCoinFlip(interaction, gameSystem);
                    break;
                case 'dice':
                    await this.handleDiceRoll(interaction, gameSystem);
                    break;
                case 'trivia':
                    await this.handleTrivia(interaction, gameSystem);
                    break;
                case 'number':
                    await this.handleNumberGuess(interaction, gameSystem);
                    break;
                case 'blackjack':
                    await this.handleBlackjack(interaction, gameSystem);
                    break;
                case 'stats':
                    await this.handleStats(interaction, gameSystem);
                    break;
                default:
                    await interaction.reply({ content: '❌ Unknown game command!', ephemeral: true });
            }
        } catch (error) {
            console.error('❌ Error in games command:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: '❌ An error occurred while processing your game!', ephemeral: true });
            }
        }
    },

    async handleRockPaperScissors(interaction, gameSystem) {
        const userChoice = interaction.options.getString('choice');
        const choices = ['rock', 'paper', 'scissors'];
        const botChoice = choices[Math.floor(Math.random() * choices.length)];

        const emojis = {
            rock: '🪨',
            paper: '📄',
            scissors: '✂️'
        };

        let result;
        if (userChoice === botChoice) {
            result = 'tie';
        } else if (
            (userChoice === 'rock' && botChoice === 'scissors') ||
            (userChoice === 'paper' && botChoice === 'rock') ||
            (userChoice === 'scissors' && botChoice === 'paper')
        ) {
            result = 'win';
        } else {
            result = 'lose';
        }

        const embed = new EmbedBuilder()
            .setTitle('🎮 Rock Paper Scissors')
            .setColor(result === 'win' ? '#00FF00' : result === 'lose' ? '#FF0000' : '#FFFF00')
            .addFields(
                { name: 'Your Choice', value: `${emojis[userChoice]} ${userChoice}`, inline: true },
                { name: 'Bot Choice', value: `${emojis[botChoice]} ${botChoice}`, inline: true },
                { name: 'Result', value: result === 'win' ? '🎉 You Win!' : result === 'lose' ? '😢 You Lose!' : '🤝 Tie!', inline: true }
            )
            .setTimestamp();

        await gameSystem.updateGameStats(interaction.user.id, 'rps', result);
        await interaction.reply({ embeds: [embed] });
    },

    async handleCoinFlip(interaction, gameSystem) {
        const userBet = interaction.options.getString('bet');
        const amount = interaction.options.getInteger('amount') || 0;

        const result = Math.random() < 0.5 ? 'heads' : 'tails';
        const won = userBet === result;

        const embed = new EmbedBuilder()
            .setTitle('🪙 Coin Flip')
            .setColor(won ? '#00FF00' : '#FF0000')
            .setDescription(`The coin landed on **${result}**!`)
            .addFields(
                { name: 'Your Bet', value: userBet, inline: true },
                { name: 'Result', value: result, inline: true },
                { name: 'Outcome', value: won ? '🎉 You Win!' : '😢 You Lose!', inline: true }
            );

        if (amount > 0) {
            embed.addFields({ name: 'Amount', value: `${won ? '+' : '-'}${amount} coins`, inline: true });
        }

        await gameSystem.updateGameStats(interaction.user.id, 'coinflip', won ? 'win' : 'lose');
        await interaction.reply({ embeds: [embed] });
    },

    async handleDiceRoll(interaction, gameSystem) {
        const sides = interaction.options.getInteger('sides') || 6;
        const count = interaction.options.getInteger('count') || 1;

        const rolls = [];
        let total = 0;

        for (let i = 0; i < count; i++) {
            const roll = Math.floor(Math.random() * sides) + 1;
            rolls.push(roll);
            total += roll;
        }

        const embed = new EmbedBuilder()
            .setTitle('🎲 Dice Roll')
            .setColor('#4169E1')
            .addFields(
                { name: 'Dice', value: `${count}d${sides}`, inline: true },
                { name: 'Rolls', value: rolls.join(', '), inline: true },
                { name: 'Total', value: total.toString(), inline: true }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },

    async handleTrivia(interaction, gameSystem) {
        const category = interaction.options.getString('category') || 'general';

        const questions = {
            general: [
                { q: "What is the capital of France?", a: ["Paris", "paris"], options: ["Paris", "London", "Berlin", "Madrid"] },
                { q: "How many continents are there?", a: ["7", "seven"], options: ["5", "6", "7", "8"] }
            ],
            science: [
                { q: "What is the chemical symbol for water?", a: ["H2O", "h2o"], options: ["H2O", "CO2", "O2", "NaCl"] },
                { q: "What planet is closest to the Sun?", a: ["Mercury", "mercury"], options: ["Venus", "Mercury", "Earth", "Mars"] }
            ]
        };

        const categoryQuestions = questions[category] || questions.general;
        const question = categoryQuestions[Math.floor(Math.random() * categoryQuestions.length)];

                const embed = new EmbedBuilder()
            .setTitle(`🧠 Trivia - ${category.charAt(0).toUpperCase() + category.slice(1)}`)
            .setDescription(question.q)
            .setColor('#9932CC')
            .setFooter({ text: 'You have 30 seconds to answer!' });

        const buttons = question.options.map((option, index) =>
            new ButtonBuilder()
                .setCustomId(`trivia_${index}`)
                .setLabel(option)
                .setStyle(ButtonStyle.Primary)
        );

        const row = new ActionRowBuilder().addComponents(buttons);
        const response = await interaction.reply({ embeds: [embed], components: [row] });

        const filter = i => i.user.id === interaction.user.id && i.customId.startsWith('trivia_');

        try {
            const confirmation = await response.awaitMessageComponent({ filter, time: 30000 });
            const selectedIndex = parseInt(confirmation.customId.split('_')[1]);
            const selectedAnswer = question.options[selectedIndex];
            const correct = question.a.includes(selectedAnswer) || question.a.includes(selectedAnswer.toLowerCase());

            const resultEmbed = new EmbedBuilder()
                .setTitle('🧠 Trivia Result')
                .setDescription(question.q)
                .addFields(
                    { name: 'Your Answer', value: selectedAnswer, inline: true },
                    { name: 'Correct Answer', value: question.a[0], inline: true },
                    { name: 'Result', value: correct ? '✅ Correct!' : '❌ Incorrect!', inline: true }
                )
                .setColor(correct ? '#00FF00' : '#FF0000');

            await gameSystem.updateGameStats(interaction.user.id, 'trivia', correct ? 'win' : 'lose');
            await confirmation.update({ embeds: [resultEmbed], components: [] });
        } catch (error) {
            const timeoutEmbed = new EmbedBuilder()
                .setTitle('⏰ Time\'s Up!')
                .setDescription('You didn\'t answer in time!')
                .setColor('#FF0000');

            await interaction.editReply({ embeds: [timeoutEmbed], components: [] });
        }
    },

    async handleNumberGuess(interaction, gameSystem) {
        const range = interaction.options.getInteger('range') || 100;
        const targetNumber = Math.floor(Math.random() * range) + 1;

        const embed = new EmbedBuilder()
            .setTitle('🔢 Number Guessing Game')
            .setDescription(`I'm thinking of a number between 1 and ${range}. You have 6 tries to guess it!`)
            .setColor('#FF6347')
            .setFooter({ text: 'Type your guess in chat!' });

        await interaction.reply({ embeds: [embed] });

        const filter = message =>
            message.author.id === interaction.user.id && !isNaN(message.content);

        let attempts = 0;
        const maxAttempts = 6;
        let won = false;

        while (attempts < maxAttempts && !won) {
            try {
                const collected = await interaction.channel.awaitMessages({
                    filter,
                    max: 1,
                    time: 30000,
                    errors: ['time']
                });

                const guess = parseInt(collected.first().content);
                attempts++;

                if (guess === targetNumber) {
                    won = true;
                    const winEmbed = new EmbedBuilder()
                        .setTitle('🎉 Congratulations!')
                        .setDescription(`You guessed it! The number was ${targetNumber}`)
                        .addFields({ name: 'Attempts', value: `${attempts}/${maxAttempts}`, inline: true })
                        .setColor('#00FF00');

                    await interaction.followUp({ embeds: [winEmbed] });
                } else {
                    const hint = guess < targetNumber ? 'higher' : 'lower';
                    const hintEmbed = new EmbedBuilder()
                        .setTitle('🔢 Try Again!')
                        .setDescription(`${guess} is too ${hint === 'higher' ? 'low' : 'high'}! Try ${hint}.`)
                        .addFields({ name: 'Attempts Left', value: `${maxAttempts - attempts}`, inline: true })
                        .setColor('#FFFF00');

                    if (attempts >= maxAttempts) {
                        hintEmbed.setTitle('😢 Game Over!')
                            .setDescription(`You're out of attempts! The number was ${targetNumber}`)
                            .setColor('#FF0000');
                    }

                    await interaction.followUp({ embeds: [hintEmbed] });
                }
            } catch (error) {
                const timeoutEmbed = new EmbedBuilder()
                    .setTitle('⏰ Game Timeout!')
                    .setDescription(`Time's up! The number was ${targetNumber}`)
                    .setColor('#FF0000');

                await interaction.followUp({ embeds: [timeoutEmbed] });
                break;
            }
        }

        await gameSystem.updateGameStats(interaction.user.id, 'number_guess', won ? 'win' : 'lose');
    },

    async handleBlackjack(interaction, gameSystem) {
        await interaction.reply({
            content: '🃏 Blackjack game coming soon!',
            ephemeral: true
        });
    },

    async handleStats(interaction, gameSystem) {
        const targetUser = interaction.options.getUser('user') || interaction.user;
        const stats = await gameSystem.getGameStats(targetUser.id);

        const embed = new EmbedBuilder()
            .setTitle(`🎮 Game Statistics - ${targetUser.displayName}`)
            .setThumbnail(targetUser.displayAvatarURL())
            .setColor('#9932CC')
            .setTimestamp();

        if (!stats || Object.keys(stats).length === 0) {
            embed.setDescription('No game statistics found!');
        } else {
            Object.entries(stats).forEach(([game, data]) => {
                const winRate = data.total > 0 ? ((data.wins / data.total) * 100).toFixed(1) : '0.0';
                embed.addFields({
                    name: game.charAt(0).toUpperCase() + game.slice(1),
                    value: `Wins: ${data.wins}\nLosses: ${data.losses}\nTotal: ${data.total}\nWin Rate: ${winRate}%`,
                    inline: true
                });
            });
        }

        await interaction.reply({ embeds: [embed] });
    }
};