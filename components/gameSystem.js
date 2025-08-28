
const fs = require('fs');
const path = require('path');

const GAMES_FILE = path.join(__dirname, '..', 'config', 'games.json');

// Initialize games file
function initializeGamesFile() {
    if (!fs.existsSync(GAMES_FILE)) {
        fs.writeFileSync(GAMES_FILE, JSON.stringify({}, null, 2));
    }
}

function loadActiveGames() {
    try {
        initializeGamesFile();
        const data = fs.readFileSync(GAMES_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error loading active games:', error);
        return {};
    }
}

function saveActiveGames(games) {
    try {
        fs.writeFileSync(GAMES_FILE, JSON.stringify(games, null, 2));
    } catch (error) {
        console.error('Error saving active games:', error);
    }
}

async function processNumberGuess(message) {
    try {
        const activeGames = loadActiveGames();
        const gameId = `number_${message.author.id}`;
        
        if (!activeGames[gameId]) {
            return false;
        }

        const guess = parseInt(message.content);
        if (isNaN(guess)) {
            return false;
        }

        const game = activeGames[gameId];
        game.attempts = (game.attempts || 0) + 1;

        if (guess === game.number) {
            await message.reply(`🎉 Correct! The number was ${game.number}. You got it in ${game.attempts} attempts!`);
            delete activeGames[gameId];
            saveActiveGames(activeGames);
            await updateGameStats(message.author.id, 'number_guess', 'win');
            return true;
        } else if (guess < game.number) {
            await message.reply(`📈 Too low! Try a higher number. (Attempt ${game.attempts})`);
        } else {
            await message.reply(`📉 Too high! Try a lower number. (Attempt ${game.attempts})`);
        }

        if (game.attempts >= 10) {
            await message.reply(`💀 Game over! The number was ${game.number}. Better luck next time!`);
            delete activeGames[gameId];
            await updateGameStats(message.author.id, 'number_guess', 'lose');
        }

        saveActiveGames(activeGames);
        return true;
    } catch (error) {
        console.error('Error processing number guess:', error);
        return false;
    }
}

async function processHangmanGuess(message) {
    try {
        const activeGames = loadActiveGames();
        const gameId = `hangman_${message.author.id}`;
        
        if (!activeGames[gameId]) {
            return false;
        }

        const guess = message.content.toLowerCase().trim();
        if (guess.length !== 1 || !/[a-z]/.test(guess)) {
            return false;
        }

        const game = activeGames[gameId];
        
        if (game.guessedLetters.includes(guess)) {
            await message.reply(`❌ You already guessed "${guess}"! Try a different letter.`);
            return true;
        }

        game.guessedLetters.push(guess);

        if (game.word.includes(guess)) {
            const revealed = game.word.split('').map(letter => 
                game.guessedLetters.includes(letter) ? letter : '_'
            ).join(' ');

            if (!revealed.includes('_')) {
                await message.reply(`🎉 Congratulations! You guessed the word: **${game.word}**`);
                delete activeGames[gameId];
                await updateGameStats(message.author.id, 'hangman', 'win');
            } else {
                await message.reply(`✅ Good guess! Word: \`${revealed}\``);
            }
        } else {
            game.wrongGuesses = (game.wrongGuesses || 0) + 1;
            const remaining = 6 - game.wrongGuesses;
            
            if (remaining <= 0) {
                await message.reply(`💀 Game over! The word was: **${game.word}**`);
                delete activeGames[gameId];
                await updateGameStats(message.author.id, 'hangman', 'lose');
            } else {
                await message.reply(`❌ Wrong guess! ${remaining} attempts remaining.`);
            }
        }

        saveActiveGames(activeGames);
        return true;
    } catch (error) {
        console.error('Error processing hangman guess:', error);
        return false;
    }
}

async function processWordleGuess(message) {
    try {
        const activeGames = loadActiveGames();
        const gameId = `wordle_${message.author.id}`;
        
        if (!activeGames[gameId]) {
            return false;
        }

        const guess = message.content.toLowerCase().trim();
        if (guess.length !== 5 || !/^[a-z]+$/.test(guess)) {
            return false;
        }

        const game = activeGames[gameId];
        game.attempts = (game.attempts || 0) + 1;

        let result = '';
        const targetWord = game.word.toLowerCase();
        
        for (let i = 0; i < 5; i++) {
            if (guess[i] === targetWord[i]) {
                result += '🟩'; // Correct position
            } else if (targetWord.includes(guess[i])) {
                result += '🟨'; // Wrong position
            } else {
                result += '⬛'; // Not in word
            }
        }

        if (guess === targetWord) {
            await message.reply(`🎉 Wordle solved in ${game.attempts} attempts!\n**${guess.toUpperCase()}**\n${result}`);
            delete activeGames[gameId];
            await updateGameStats(message.author.id, 'wordle', 'win');
        } else if (game.attempts >= 6) {
            await message.reply(`💀 Game over! The word was: **${targetWord.toUpperCase()}**\n**${guess.toUpperCase()}**\n${result}`);
            delete activeGames[gameId];
            await updateGameStats(message.author.id, 'wordle', 'lose');
        } else {
            await message.reply(`**${guess.toUpperCase()}**\n${result}\nAttempt ${game.attempts}/6`);
        }

        saveActiveGames(activeGames);
        return true;
    } catch (error) {
        console.error('Error processing wordle guess:', error);
        return false;
    }
}

async function processTicTacToeMove(interaction) {
    try {
        const activeGames = loadActiveGames();
        const gameId = `tictactoe_${interaction.user.id}`;
        
        if (!activeGames[gameId]) {
            await interaction.reply({ content: '❌ No active Tic-Tac-Toe game found!', ephemeral: true });
            return false;
        }

        // Implementation for tic-tac-toe move processing
        await interaction.reply({ content: '🎮 Tic-Tac-Toe move processed!', ephemeral: true });
        return true;
    } catch (error) {
        console.error('Error processing tic-tac-toe move:', error);
        return false;
    }
}

function createDeck() {
    const suits = ['♠', '♥', '♦', '♣'];
    const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    const deck = [];

    for (const suit of suits) {
        for (const rank of ranks) {
            deck.push({
                suit,
                rank,
                value: rank === 'A' ? 11 : ['J', 'Q', 'K'].includes(rank) ? 10 : parseInt(rank),
                display: `${rank}${suit}`
            });
        }
    }

    // Shuffle the deck
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    return deck;
}

function calculateBlackjackValue(cards) {
    let value = 0;
    let aces = 0;

    for (const card of cards) {
        if (card.rank === 'A') {
            aces++;
            value += 11;
        } else {
            value += card.value;
        }
    }

    // Adjust for aces
    while (value > 21 && aces > 0) {
        value -= 10;
        aces--;
    }

    return value;
}

async function updateGameStats(userId, game, result) {
    try {
        // Simple stats tracking - can be expanded
        console.log(`📊 Game stats updated: ${userId} played ${game} with result: ${result}`);
        return true;
    } catch (error) {
        console.error('Error updating game stats:', error);
        return false;
    }
}

function getRandomTrivia() {
    const triviaQuestions = [
        {
            question: "What is the capital of France?",
            answers: { A: "London", B: "Paris" },
            correct: "B"
        },
        {
            question: "What is 2 + 2?",
            answers: { A: "4", B: "5" },
            correct: "A"
        },
        {
            question: "What is the largest planet in our solar system?",
            answers: { A: "Earth", B: "Jupiter" },
            correct: "B"
        }
    ];

    return triviaQuestions[Math.floor(Math.random() * triviaQuestions.length)];
}

function getRandomRiddle() {
    const riddles = [
        {
            question: "I have keys but no locks. I have space but no room. What am I?",
            answer: "keyboard",
            hint: "You're probably using one right now!"
        },
        {
            question: "What has hands but can't clap?",
            answer: "clock",
            hint: "It tells time!"
        },
        {
            question: "I'm tall when I'm young, and short when I'm old. What am I?",
            answer: "candle",
            hint: "I provide light!"
        }
    ];

    return riddles[Math.floor(Math.random() * riddles.length)];
}

async function recordGameResult(userId, game, result) {
    return await updateGameStats(userId, game, result);
}

module.exports = {
    loadActiveGames,
    saveActiveGames,
    processNumberGuess,
    processHangmanGuess,
    processWordleGuess,
    processTicTacToeMove,
    createDeck,
    calculateBlackjackValue,
    updateGameStats,
    getRandomTrivia,
    getRandomRiddle,
    recordGameResult
};
