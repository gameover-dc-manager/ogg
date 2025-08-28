const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const {
    processNumberGuess,
    processTicTacToeMove,
    processHangmanGuess,
    processWordleGuess,
    recordGameResult,
    getRandomTrivia,
    getRandomRiddle,
    loadActiveGames,
    createDeck, // Assuming this is part of gameSystem
    calculateBlackjackValue, // Assuming this is part of gameSystem
    updateGameStats // Assuming this is part of gameSystem
} = require('./gameSystem');

class GameHandlers {
    constructor() {
        // The edited snippet introduces a GameSystem dependency.
        // Assuming GameSystem is a class as used in the snippet.
        // If GameSystem is intended to be just the imported functions, then `new GameSystem()` would be incorrect.
        // Based on `this.gameSystem = new GameSystem();` in the snippet, we proceed with that assumption.
        // If GameSystem is a class and `createDeck`, `calculateBlackjackValue`, `updateGameStats` are static methods,
        // then `this.gameSystem.createDeck()` would be `GameSystem.createDeck()`.
        // However, the snippet implies instantiation.
        // If GameSystem is just functions, this line `this.gameSystem = new GameSystem();` would be removed.
        // For now, we'll assume GameSystem is a class that needs instantiation.
        // If `gameSystem` is intended to be the imported functions, remove `this.gameSystem = new GameSystem();`
        // and use the imported functions directly as in the original code.
        // Given the provided snippet's context, it's likely the intention was to use `gameSystem` as a class.
        // However, the original code imports functions from './gameSystem'.
        // Let's align with the original code's import style and assume `gameSystem` is a module with functions, not a class to instantiate.
        // Therefore, `this.gameSystem = new GameSystem();` is removed, and we use imported functions.
        // If the intention was to use a class, the imports would need to change.
        // For now, we use the imported functions directly.

        this.activeGames = new Map(); // Store active games for games managed by this class (like Blackjack)
    }

    async handleBlackjackGame(interaction) {
        const gameId = `bj_${interaction.user.id}_${Date.now()}`;
        // Use the imported function for deck creation
        const deck = createDeck();

        const game = {
            deck,
            playerCards: [deck.pop(), deck.pop()],
            dealerCards: [deck.pop(), deck.pop()],
            gameOver: false,
            playerTurn: true,
            result: null // To store outcome like 'bust', 'tie', 'win', 'lose'
        };

        this.activeGames.set(gameId, game);
        // Pass the interaction and gameId to update the display
        await this.updateBlackjackDisplay(interaction, gameId, false);
    }

    async handleBlackjackAction(interaction) {
        const parts = interaction.customId.split('_');
        const action = parts[1];
        const userId = interaction.user.id;

        // Find the active game for the user. This assumes a game is active for the user interacting.
        let gameId = null;
        for (const [id, currentGame] of this.activeGames.entries()) {
            // Check if the game ID starts with the user ID and the game is not over
            if (id.startsWith(`bj_${userId}`) && !currentGame.gameOver) {
                gameId = id;
                break;
            }
        }

        if (!gameId) {
            return await interaction.reply({ content: '❌ Game not found or already ended!', ephemeral: true });
        }

        const game = this.activeGames.get(gameId);

        if (action === 'hit') {
            game.playerCards.push(game.deck.pop());
            // Use the imported function to calculate value
            const playerValue = calculateBlackjackValue(game.playerCards);

            if (playerValue > 21) {
                game.gameOver = true;
                game.result = 'bust';
                // Use the imported function to update stats
                await updateGameStats(userId, 'blackjack', 'lose');
            } else {
                game.playerValue = playerValue; // Update player value for display
            }
        } else if (action === 'stand') {
            game.playerTurn = false;

            // Dealer plays
            let dealerValue = calculateBlackjackValue(game.dealerCards); // Use imported function
            while (dealerValue < 17) {
                game.dealerCards.push(game.deck.pop());
                dealerValue = calculateBlackjackValue(game.dealerCards); // Use imported function
            }
            game.dealerValue = dealerValue; // Update dealer value for display

            const playerValue = calculateBlackjackValue(game.playerCards); // Use imported function

            if (dealerValue > 21) {
                game.result = 'dealer_bust';
                await updateGameStats(userId, 'blackjack', 'win'); // Use imported function
            } else if (playerValue > dealerValue) {
                game.result = 'player_wins';
                await updateGameStats(userId, 'blackjack', 'win'); // Use imported function
            } else if (dealerValue > playerValue) {
                game.result = 'dealer_wins';
                await updateGameStats(userId, 'blackjack', 'lose'); // Use imported function
            } else {
                game.result = 'tie';
                await updateGameStats(userId, 'blackjack', 'tie'); // Use imported function
            }
            game.gameOver = true;
        }
        // Update the display after the action
        await this.updateBlackjackDisplay(interaction, gameId, true);

        if (game.gameOver) {
            // Automatically clean up the game after a delay
            setTimeout(() => {
                this.activeGames.delete(gameId);
            }, 60000); // Remove game after 60 seconds
        }
    }

    async updateBlackjackDisplay(interaction, gameId, isUpdate = false) {
        const game = this.activeGames.get(gameId);
        // Calculate values using the imported function
        const playerValue = calculateBlackjackValue(game.playerCards);
        // For the dealer's hand, only reveal the full value if the game is over or it's their turn to be revealed
        const dealerValue = game.gameOver || !game.playerTurn ? calculateBlackjackValue(game.dealerCards) : calculateBlackjackValue([game.dealerCards[0]]);

        const playerCardsDisplay = game.playerCards.map(card => card.display).join(' ');
        // Display dealer's cards appropriately: hidden first card, or fully revealed if game over/stand
        const dealerCardsDisplay = game.gameOver || !game.playerTurn
            ? game.dealerCards.map(card => card.display).join(' ')
            : `${game.dealerCards[0].display} 🂠`;

        const embed = new EmbedBuilder()
            .setTitle('🃏 Blackjack')
            .addFields(
                {
                    name: `Your Cards (${playerValue})`,
                    value: playerCardsDisplay,
                    inline: false
                },
                {
                    name: `Dealer Cards ${game.gameOver || !game.playerTurn ? `(${dealerValue})` : ''}`,
                    value: dealerCardsDisplay,
                    inline: false
                }
            )
            // Set color based on game outcome
            .setColor(game.gameOver ? (game.result?.includes('wins') || game.result === 'dealer_bust' ? '#00FF00' : game.result === 'tie' ? '#FFA500' : '#FF0000') : '#FFD700');

        // Add result description if the game is over
        if (game.gameOver) {
            let resultText = '';
            switch (game.result) {
                case 'bust':
                    resultText = '💥 Bust! You lose!';
                    break;
                case 'dealer_bust':
                    resultText = '🎉 Dealer busts! You win!';
                    break;
                case 'player_wins':
                    resultText = '🎉 You win!';
                    break;
                case 'dealer_wins':
                    resultText = '😢 Dealer wins!';
                    break;
                case 'tie':
                    resultText = '🤝 It\'s a tie!';
                    break;
            }
            embed.addFields({ name: 'Result', value: resultText, inline: false });
        }

        const components = [];
        // Add action buttons only if the game is not over and it's the player's turn
        if (!game.gameOver && game.playerTurn) {
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('bj_hit') // Specific custom ID for hit
                        .setLabel('Hit')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('bj_stand') // Specific custom ID for stand
                        .setLabel('Stand')
                        .setStyle(ButtonStyle.Secondary)
                );
            components.push(row);
        }

        if (isUpdate) {
            // Update the existing message
            await interaction.update({ embeds: [embed], components });
        } else {
            // Reply to the interaction to start the game
            await interaction.reply({ embeds: [embed], components, ephemeral: true });
        }
    }

    // Message-based game checkers
    async checkNumberGuess(message) {
        try {
            return await processNumberGuess(message);
        } catch (error) {
            console.error('Error checking number guess:', error);
        }
    }

    async checkHangmanGuess(message) {
        try {
            return await processHangmanGuess(message);
        } catch (error) {
            console.error('Error checking hangman guess:', error);
        }
    }

    async checkWordleGuess(message) {
        try {
            return await processWordleGuess(message);
        } catch (error) {
            console.error('Error checking wordle guess:', error);
        }
    }

    async checkRiddleAnswer(message) {
        try {
            // Implementation for riddle answer checking
            const activeGames = loadActiveGames();
            const gameId = `riddle_${message.author.id}`;
            if (activeGames[gameId]) {
                const riddle = activeGames[gameId];
                if (message.content.toLowerCase().includes(riddle.answer.toLowerCase())) {
                    await message.reply('🎉 Correct! Well done!');
                    await updateGameStats(message.author.id, 'riddle', 'win');
                    delete activeGames[gameId];
                    return true;
                }
            }
            return false;
        } catch (error) {
            console.error('Error checking riddle answer:', error);
        }
    }

    // Interaction handlers
    async handleTriviaAnswer(interaction) {
        try {
            const trivia = getRandomTrivia();
            const embed = new EmbedBuilder()
                .setTitle('🧠 Trivia Question')
                .setDescription(trivia.question)
                .setColor('#4A90E2');

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('trivia_a')
                        .setLabel('A')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('trivia_b')
                        .setLabel('B')
                        .setStyle(ButtonStyle.Primary)
                );

            await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
        } catch (error) {
            console.error('Error handling trivia answer:', error);
            if (!interaction.replied) {
                await interaction.reply({ content: '❌ Error starting trivia game.', ephemeral: true });
            }
        }
    }

    async handleRockPaperScissors(interaction) {
        try {
            const choices = ['rock', 'paper', 'scissors'];
            const userChoice = interaction.customId.split('_')[1];
            const botChoice = choices[Math.floor(Math.random() * choices.length)];
            
            let result = 'tie';
            if ((userChoice === 'rock' && botChoice === 'scissors') ||
                (userChoice === 'paper' && botChoice === 'rock') ||
                (userChoice === 'scissors' && botChoice === 'paper')) {
                result = 'win';
            } else if (userChoice !== botChoice) {
                result = 'lose';
            }

            await updateGameStats(interaction.user.id, 'rps', result);
            
            const embed = new EmbedBuilder()
                .setTitle('✂️ Rock Paper Scissors')
                .setDescription(`You: ${userChoice}\nBot: ${botChoice}\nResult: ${result}`)
                .setColor(result === 'win' ? '#00FF00' : result === 'lose' ? '#FF0000' : '#FFA500');

            await interaction.update({ embeds: [embed], components: [] });
        } catch (error) {
            console.error('Error handling rock paper scissors:', error);
        }
    }

    async handleRiddleHint(interaction) {
        try {
            const activeGames = loadActiveGames();
            const gameId = `riddle_${interaction.user.id}`;
            if (activeGames[gameId]) {
                const riddle = activeGames[gameId];
                await interaction.reply({ 
                    content: `💡 Hint: ${riddle.hint || 'No hint available'}`, 
                    ephemeral: true 
                });
            } else {
                await interaction.reply({ content: '❌ No active riddle game found.', ephemeral: true });
            }
        } catch (error) {
            console.error('Error handling riddle hint:', error);
        }
    }

    async handleRiddleSkip(interaction) {
        try {
            const activeGames = loadActiveGames();
            const gameId = `riddle_${interaction.user.id}`;
            if (activeGames[gameId]) {
                const riddle = activeGames[gameId];
                await interaction.reply({ 
                    content: `⏭️ Answer was: **${riddle.answer}**`, 
                    ephemeral: true 
                });
                delete activeGames[gameId];
                await updateGameStats(interaction.user.id, 'riddle', 'skip');
            } else {
                await interaction.reply({ content: '❌ No active riddle game found.', ephemeral: true });
            }
        } catch (error) {
            console.error('Error handling riddle skip:', error);
        }
    }

    async handleTicTacToeMove(interaction) {
        try {
            return await processTicTacToeMove(interaction);
        } catch (error) {
            console.error('Error handling tic tac toe move:', error);
            if (!interaction.replied) {
                await interaction.reply({ content: '❌ Error processing move.', ephemeral: true });
            }
        }
    }

    async handleQuizStart(interaction) {
        try {
            const embed = new EmbedBuilder()
                .setTitle('📚 Quiz Started')
                .setDescription('Quiz functionality is being prepared...')
                .setColor('#4A90E2');

            await interaction.reply({ embeds: [embed], ephemeral: true });
        } catch (error) {
            console.error('Error handling quiz start:', error);
        }
    }

    async handleQuizAnswer(interaction) {
        try {
            const embed = new EmbedBuilder()
                .setTitle('📚 Quiz Answer')
                .setDescription('Quiz answer processing...')
                .setColor('#4A90E2');

            await interaction.reply({ embeds: [embed], ephemeral: true });
        } catch (error) {
            console.error('Error handling quiz answer:', error);
        }
    }

    async handleDailyAnswer(interaction) {
        try {
            const embed = new EmbedBuilder()
                .setTitle('📅 Daily Challenge')
                .setDescription('Daily challenge processing...')
                .setColor('#4A90E2');

            await interaction.reply({ embeds: [embed], ephemeral: true });
        } catch (error) {
            console.error('Error handling daily answer:', error);
        }
    }

    async handleTournamentJoin(interaction) {
        try {
            const embed = new EmbedBuilder()
                .setTitle('🏆 Tournament')
                .setDescription('Tournament system is being prepared...')
                .setColor('#FFD700');

            await interaction.reply({ embeds: [embed], ephemeral: true });
        } catch (error) {
            console.error('Error handling tournament join:', error);
        }
    }

    async handleGameButtons(interaction) {
        try {
            const customId = interaction.customId;
            
            if (customId.startsWith('rps_')) {
                await this.handleRockPaperScissors(interaction);
            } else if (customId.startsWith('trivia_')) {
                await this.handleTriviaAnswer(interaction);
            } else {
                await interaction.reply({ content: '❌ Unknown game button.', ephemeral: true });
            }
        } catch (error) {
            console.error('Error handling game buttons:', error);
        }
    }
}

// Export functions that create GameHandlers instances
module.exports = {
    // Blackjack handlers
    async handleBlackjackHit(interaction) {
        const handler = new GameHandlers();
        await handler.handleBlackjackAction(interaction);
    },
    async handleBlackjackStand(interaction) {
        const handler = new GameHandlers();
        await handler.handleBlackjackAction(interaction);
    },
    async handleBlackjackGame(interaction) {
        const handler = new GameHandlers();
        await handler.handleBlackjackGame(interaction);
    },
    
    // Game message handlers
    async checkNumberGuess(message) {
        const handler = new GameHandlers();
        await handler.checkNumberGuess(message);
    },
    async checkHangmanGuess(message) {
        const handler = new GameHandlers();
        await handler.checkHangmanGuess(message);
    },
    async checkWordleGuess(message) {
        const handler = new GameHandlers();
        await handler.checkWordleGuess(message);
    },
    async checkRiddleAnswer(message) {
        const handler = new GameHandlers();
        await handler.checkRiddleAnswer(message);
    },
    
    // Other game handlers
    async handleTriviaAnswer(interaction) {
        const handler = new GameHandlers();
        await handler.handleTriviaAnswer(interaction);
    },
    async handleRockPaperScissors(interaction) {
        const handler = new GameHandlers();
        await handler.handleRockPaperScissors(interaction);
    },
    async handleRiddleHint(interaction) {
        const handler = new GameHandlers();
        await handler.handleRiddleHint(interaction);
    },
    async handleRiddleSkip(interaction) {
        const handler = new GameHandlers();
        await handler.handleRiddleSkip(interaction);
    },
    async handleTicTacToeMove(interaction) {
        const handler = new GameHandlers();
        await handler.handleTicTacToeMove(interaction);
    },
    async handleQuizStart(interaction) {
        const handler = new GameHandlers();
        await handler.handleQuizStart(interaction);
    },
    async handleQuizAnswer(interaction) {
        const handler = new GameHandlers();
        await handler.handleQuizAnswer(interaction);
    },
    async handleDailyAnswer(interaction) {
        const handler = new GameHandlers();
        await handler.handleDailyAnswer(interaction);
    },
    async handleTournamentJoin(interaction) {
        const handler = new GameHandlers();
        await handler.handleTournamentJoin(interaction);
    },
    async handleGameButtons(interaction) {
        const handler = new GameHandlers();
        await handler.handleGameButtons(interaction);
    }
};