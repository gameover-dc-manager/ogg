
const fs = require('fs').promises;
const path = require('path');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

class InteractiveSystem {
    constructor() {
        this.storiesPath = path.join(__dirname, '..', 'config', 'stories.json');
        this.drawingsPath = path.join(__dirname, '..', 'config', 'drawing_competitions.json');
        this.petsPath = path.join(__dirname, '..', 'config', 'virtual_pets.json');
        this.escapePath = path.join(__dirname, '..', 'config', 'escape_rooms.json');
        this.init();
    }

    async init() {
        await this.ensureFiles();
    }

    async ensureFiles() {
        const files = [this.storiesPath, this.drawingsPath, this.petsPath, this.escapePath];
        for (const file of files) {
            try {
                await fs.access(file);
            } catch {
                await fs.writeFile(file, '{}');
            }
        }
    }

    // Story Builder Methods
    async startStory(interaction, genre) {
        const stories = await this.loadData(this.storiesPath);
        const channelId = interaction.channel.id;

        if (stories[channelId] && stories[channelId].active) {
            return await interaction.reply({ content: '📖 A story is already active in this channel! Use `/interactive story view` to see it.', ephemeral: true });
        }

        const storyPrompts = {
            fantasy: ['A mysterious portal appears in the forest...', 'The ancient dragon awakens from its slumber...', 'A young wizard discovers a forbidden spellbook...'],
            scifi: ['The spaceship receives an unknown signal...', 'Scientists discover a new planet...', 'AI becomes self-aware...'],
            mystery: ['A detective finds a cryptic note...', 'The mansion holds dark secrets...', 'Evidence disappears from the crime scene...'],
            adventure: ['Treasure hunters find an ancient map...', 'Explorers enter uncharted territory...', 'A quest begins at dawn...'],
            horror: ['Strange noises come from the basement...', 'The old cemetery is disturbed...', 'Shadows move without their owners...'],
            comedy: ['A banana peel changes everything...', 'The world\'s worst superhero appears...', 'Chaos erupts at the talent show...']
        };

        const selectedGenre = genre || 'adventure';
        const prompts = storyPrompts[selectedGenre];
        const prompt = prompts[Math.floor(Math.random() * prompts.length)];

        stories[channelId] = {
            active: true,
            genre: selectedGenre,
            startedBy: interaction.user.id,
            startedAt: Date.now(),
            story: [{ text: prompt, author: 'System', timestamp: Date.now() }],
            contributors: [interaction.user.id],
            maxLength: 200,
            turnLimit: 20
        };

        await this.saveData(this.storiesPath, stories);

        const embed = new EmbedBuilder()
            .setTitle(`📖 New ${selectedGenre.charAt(0).toUpperCase() + selectedGenre.slice(1)} Story Started!`)
            .setDescription(`**Opening:**\n${prompt}\n\n*Use the button below to continue the story!*`)
            .setColor('#9B59B6')
            .setFooter({ text: `Started by ${interaction.user.displayName}` })
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('story_continue')
                    .setLabel('Continue Story')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('✍️'),
                new ButtonBuilder()
                    .setCustomId('story_view')
                    .setLabel('View Full Story')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📖')
            );

        await interaction.reply({ embeds: [embed], components: [row] });
    }

    async continueStory(interaction) {
        const modal = new ModalBuilder()
            .setCustomId('story_continue_modal')
            .setTitle('Continue the Story');

        const storyInput = new TextInputBuilder()
            .setCustomId('story_text')
            .setLabel('Add to the story (max 200 characters)')
            .setStyle(TextInputStyle.Paragraph)
            .setMaxLength(200)
            .setRequired(true);

        const firstRow = new ActionRowBuilder().addComponents(storyInput);
        modal.addComponents(firstRow);

        await interaction.showModal(modal);
    }

    async viewStory(interaction) {
        const stories = await this.loadData(this.storiesPath);
        const channelId = interaction.channel.id;

        if (!stories[channelId] || !stories[channelId].active) {
            return await interaction.reply({ content: '📖 No active story in this channel. Start one with `/interactive story start`!', ephemeral: true });
        }

        const story = stories[channelId];
        const fullStory = story.story.map(part => `**${part.author}:** ${part.text}`).join('\n\n');

        const embed = new EmbedBuilder()
            .setTitle(`📖 ${story.genre.charAt(0).toUpperCase() + story.genre.slice(1)} Story`)
            .setDescription(fullStory.substring(0, 4000))
            .setColor('#9B59B6')
            .addFields(
                { name: '👥 Contributors', value: `${story.contributors.length} people`, inline: true },
                { name: '📝 Parts', value: `${story.story.length}`, inline: true },
                { name: '🎭 Genre', value: story.genre, inline: true }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }

    async endStory(interaction) {
        const stories = await this.loadData(this.storiesPath);
        const channelId = interaction.channel.id;

        if (!stories[channelId] || !stories[channelId].active) {
            return await interaction.reply({ content: '📖 No active story to end in this channel.', ephemeral: true });
        }

        const story = stories[channelId];
        
        // Only starter or admins can end story
        if (story.startedBy !== interaction.user.id && !interaction.member.permissions.has('MANAGE_MESSAGES')) {
            return await interaction.reply({ content: '❌ Only the story starter or moderators can end the story.', ephemeral: true });
        }

        story.active = false;
        story.endedAt = Date.now();

        await this.saveData(this.storiesPath, stories);

        const embed = new EmbedBuilder()
            .setTitle('📖 Story Completed!')
            .setDescription(`The ${story.genre} story has been ended by ${interaction.user.displayName}.\n\n**Final word count:** ${story.story.reduce((acc, part) => acc + part.text.length, 0)} characters\n**Contributors:** ${story.contributors.length} people`)
            .setColor('#2ECC71')
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }

    // Drawing Competition Methods
    async startDrawingCompetition(interaction, theme) {
        const competitions = await this.loadData(this.drawingsPath);
        const channelId = interaction.channel.id;

        if (competitions[channelId] && competitions[channelId].active) {
            return await interaction.reply({ content: '🎨 A drawing competition is already active in this channel!', ephemeral: true });
        }

        const themes = theme ? [theme] : ['Fantasy Castle', 'Cute Animal', 'Space Adventure', 'Ocean Scene', 'Abstract Art', 'Favorite Food', 'Superhero', 'Nature Scene'];
        const selectedTheme = themes[Math.floor(Math.random() * themes.length)];

        competitions[channelId] = {
            active: true,
            theme: selectedTheme,
            startedBy: interaction.user.id,
            startedAt: Date.now(),
            submissions: {},
            votingPhase: false,
            duration: 30 * 60 * 1000 // 30 minutes
        };

        await this.saveData(this.drawingsPath, competitions);

        const embed = new EmbedBuilder()
            .setTitle('🎨 Drawing Competition Started!')
            .setDescription(`**Theme:** ${selectedTheme}\n\n**How to participate:**\n1. Create your drawing (digital or traditional)\n2. Upload it to Discord\n3. Use \`/interactive drawing submit\` with your image\n\n**Time limit:** 30 minutes`)
            .setColor('#E74C3C')
            .setFooter({ text: `Started by ${interaction.user.displayName}` })
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('drawing_submit')
                    .setLabel('Submit Drawing')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🎨'),
                new ButtonBuilder()
                    .setCustomId('drawing_view')
                    .setLabel('View Submissions')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('👀')
            );

        await interaction.reply({ embeds: [embed], components: [row] });

        // Auto-end competition after 30 minutes
        setTimeout(async () => {
            await this.endDrawingCompetition(channelId);
        }, 30 * 60 * 1000);
    }

    async submitDrawing(interaction) {
        const competitions = await this.loadData(this.drawingsPath);
        const channelId = interaction.channel.id;

        if (!competitions[channelId] || !competitions[channelId].active || competitions[channelId].votingPhase) {
            return await interaction.reply({ content: '🎨 No active drawing competition accepting submissions in this channel.', ephemeral: true });
        }

        const modal = new ModalBuilder()
            .setCustomId('drawing_submit_modal')
            .setTitle('Submit Your Drawing');

        const titleInput = new TextInputBuilder()
            .setCustomId('drawing_title')
            .setLabel('Drawing Title')
            .setStyle(TextInputStyle.Short)
            .setMaxLength(50)
            .setRequired(true);

        const urlInput = new TextInputBuilder()
            .setCustomId('drawing_url')
            .setLabel('Image URL (upload to Discord first, then copy link)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const descInput = new TextInputBuilder()
            .setCustomId('drawing_desc')
            .setLabel('Description (optional)')
            .setStyle(TextInputStyle.Paragraph)
            .setMaxLength(200)
            .setRequired(false);

        const firstRow = new ActionRowBuilder().addComponents(titleInput);
        const secondRow = new ActionRowBuilder().addComponents(urlInput);
        const thirdRow = new ActionRowBuilder().addComponents(descInput);

        modal.addComponents(firstRow, secondRow, thirdRow);
        await interaction.showModal(modal);
    }

    // Virtual Pet Methods
    async createPet(interaction, petType) {
        const pets = await this.loadData(this.petsPath);
        const userId = interaction.user.id;

        if (pets[userId]) {
            return await interaction.reply({ content: '🐾 You already have a virtual pet! Use `/interactive pet view` to see them.', ephemeral: true });
        }

        const petTypes = {
            dragon: { emoji: '🐉', name: 'Dragon', stats: { strength: 8, intelligence: 7, cuteness: 6 } },
            cat: { emoji: '🐱', name: 'Cat', stats: { strength: 4, intelligence: 6, cuteness: 9 } },
            dog: { emoji: '🐶', name: 'Dog', stats: { strength: 6, intelligence: 5, cuteness: 8 } },
            phoenix: { emoji: '🔥', name: 'Phoenix', stats: { strength: 9, intelligence: 8, cuteness: 5 } },
            robot: { emoji: '🤖', name: 'Robot', stats: { strength: 7, intelligence: 10, cuteness: 4 } },
            slime: { emoji: '💚', name: 'Slime', stats: { strength: 3, intelligence: 4, cuteness: 7 } }
        };

        const selectedType = petType || 'cat';
        const petData = petTypes[selectedType];
        const petName = `${interaction.user.displayName}'s ${petData.name}`;

        pets[userId] = {
            name: petName,
            type: selectedType,
            emoji: petData.emoji,
            level: 1,
            experience: 0,
            hunger: 100,
            happiness: 100,
            energy: 100,
            stats: petData.stats,
            createdAt: Date.now(),
            lastFed: Date.now(),
            lastPlayed: Date.now() - (60 * 60 * 1000), // 1 hour ago
            achievements: []
        };

        await this.saveData(this.petsPath, pets);

        const embed = new EmbedBuilder()
            .setTitle(`🎉 Pet Created!`)
            .setDescription(`You've created **${petName}** ${petData.emoji}!`)
            .addFields(
                { name: '📊 Stats', value: `Strength: ${petData.stats.strength}\nIntelligence: ${petData.stats.intelligence}\nCuteness: ${petData.stats.cuteness}`, inline: true },
                { name: '💖 Status', value: `Level: 1\nHunger: 100%\nHappiness: 100%\nEnergy: 100%`, inline: true },
                { name: '🎮 Actions', value: 'Feed, play, and train your pet to help it grow!', inline: false }
            )
            .setColor('#2ECC71')
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('pet_feed')
                    .setLabel('Feed')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🍖'),
                new ButtonBuilder()
                    .setCustomId('pet_play')
                    .setLabel('Play')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🎾'),
                new ButtonBuilder()
                    .setCustomId('pet_train')
                    .setLabel('Train')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('💪')
            );

        await interaction.reply({ embeds: [embed], components: [row] });
    }

    async viewPet(interaction) {
        const pets = await this.loadData(this.petsPath);
        const userId = interaction.user.id;

        if (!pets[userId]) {
            return await interaction.reply({ content: '🐾 You don\'t have a virtual pet yet! Use `/interactive pet create` to get one.', ephemeral: true });
        }

        const pet = pets[userId];
        await this.updatePetStatus(pet);

        const embed = new EmbedBuilder()
            .setTitle(`${pet.emoji} ${pet.name}`)
            .addFields(
                { name: '📈 Level', value: `${pet.level} (${pet.experience}/100 XP)`, inline: true },
                { name: '🍖 Hunger', value: `${pet.hunger}%`, inline: true },
                { name: '😊 Happiness', value: `${pet.happiness}%`, inline: true },
                { name: '⚡ Energy', value: `${pet.energy}%`, inline: true },
                { name: '🏆 Achievements', value: pet.achievements.length > 0 ? pet.achievements.join(', ') : 'None yet', inline: false }
            )
            .setColor(this.getPetColor(pet))
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('pet_feed')
                    .setLabel('Feed')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🍖')
                    .setDisabled(pet.hunger > 80),
                new ButtonBuilder()
                    .setCustomId('pet_play')
                    .setLabel('Play')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🎾')
                    .setDisabled(pet.energy < 20),
                new ButtonBuilder()
                    .setCustomId('pet_train')
                    .setLabel('Train')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('💪')
                    .setDisabled(pet.energy < 30)
            );

        await interaction.reply({ embeds: [embed], components: [row] });
    }

    // Escape Room Methods
    async startEscapeRoom(interaction, roomType) {
        const rooms = await this.loadData(this.escapePath);
        const userId = interaction.user.id;

        const roomTypes = {
            haunted: {
                name: 'Haunted House',
                description: 'You find yourself in a creaky old mansion. Dust covers everything, and strange shadows dance on the walls.',
                items: ['old_key', 'candle', 'mirror'],
                puzzles: ['ghost_riddle', 'locked_door', 'secret_passage'],
                emoji: '🏚️'
            },
            space: {
                name: 'Space Station',
                description: 'Alert! Oxygen levels critical. The space station is malfunctioning and you need to find a way to the escape pods.',
                items: ['keycard', 'oxygen_tank', 'tools'],
                puzzles: ['computer_hack', 'airlock_puzzle', 'power_restoration'],
                emoji: '🚀'
            },
            temple: {
                name: 'Ancient Temple',
                description: 'You\'ve awakened an ancient curse. Stone walls surround you with mysterious hieroglyphs carved deep into the stone.',
                items: ['torch', 'ancient_coin', 'scroll'],
                puzzles: ['hieroglyph_puzzle', 'pressure_plate', 'statue_riddle'],
                emoji: '🏛️'
            }
        };

        const selectedRoom = roomType || 'haunted';
        const roomData = roomTypes[selectedRoom];

        rooms[userId] = {
            type: selectedRoom,
            name: roomData.name,
            description: roomData.description,
            emoji: roomData.emoji,
            inventory: [],
            solvedPuzzles: [],
            currentRoom: 'start',
            hintsUsed: 0,
            startTime: Date.now(),
            completed: false
        };

        await this.saveData(this.escapePath, rooms);

        const embed = new EmbedBuilder()
            .setTitle(`${roomData.emoji} Welcome to ${roomData.name}!`)
            .setDescription(roomData.description)
            .addFields(
                { name: '🎯 Objective', value: 'Find clues, solve puzzles, and escape!', inline: false },
                { name: '🎮 Controls', value: 'Use `/interactive escape look` to examine your surroundings\nUse `/interactive escape use` to interact with items', inline: false }
            )
            .setColor('#8E44AD')
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('escape_look')
                    .setLabel('Look Around')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('👀'),
                new ButtonBuilder()
                    .setCustomId('escape_inventory')
                    .setLabel('Check Inventory')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🎒'),
                new ButtonBuilder()
                    .setCustomId('escape_hint')
                    .setLabel('Get Hint')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('💡')
            );

        await interaction.reply({ embeds: [embed], components: [row] });
    }

    // Helper Methods
    async loadData(filePath) {
        try {
            const data = await fs.readFile(filePath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            return {};
        }
    }

    async saveData(filePath, data) {
        try {
            await fs.writeFile(filePath, JSON.stringify(data, null, 2));
            return true;
        } catch (error) {
            console.error('Error saving data:', error);
            return false;
        }
    }

    updatePetStatus(pet) {
        const now = Date.now();
        const hoursSinceLastFed = (now - pet.lastFed) / (1000 * 60 * 60);
        
        // Decrease stats over time
        pet.hunger = Math.max(0, pet.hunger - Math.floor(hoursSinceLastFed * 5));
        pet.happiness = Math.max(0, pet.happiness - Math.floor(hoursSinceLastFed * 2));
        pet.energy = Math.min(100, pet.energy + Math.floor(hoursSinceLastFed * 3));
    }

    getPetColor(pet) {
        if (pet.happiness > 80) return '#2ECC71';
        if (pet.happiness > 50) return '#F39C12';
        return '#E74C3C';
    }

    async handleInteractiveButtons(interaction) {
        const customId = interaction.customId;

        try {
            if (customId === 'story_continue') {
                await this.continueStory(interaction);
            } else if (customId === 'story_view') {
                await this.viewStory(interaction);
            } else if (customId === 'drawing_submit') {
                await this.submitDrawing(interaction);
            } else if (customId === 'pet_feed') {
                await this.feedPet(interaction);
            } else if (customId === 'pet_play') {
                await this.playWithPet(interaction);
            } else if (customId === 'pet_train') {
                await this.trainPet(interaction);
            } else if (customId === 'escape_look') {
                await this.lookAround(interaction);
            } else if (customId === 'escape_inventory') {
                await this.checkInventory(interaction);
            } else if (customId === 'escape_hint') {
                await this.giveHint(interaction);
            }
        } catch (error) {
            console.error('Error handling interactive button:', error);
            if (!interaction.replied) {
                await interaction.reply({ content: '❌ An error occurred!', ephemeral: true });
            }
        }
    }

    async handleInteractiveModals(interaction) {
        const customId = interaction.customId;

        try {
            if (customId === 'story_continue_modal') {
                await this.processStoryContinuation(interaction);
            } else if (customId === 'drawing_submit_modal') {
                await this.processDrawingSubmission(interaction);
            }
        } catch (error) {
            console.error('Error handling interactive modal:', error);
            if (!interaction.replied) {
                await interaction.reply({ content: '❌ An error occurred!', ephemeral: true });
            }
        }
    }

    async processStoryContinuation(interaction) {
        const stories = await this.loadData(this.storiesPath);
        const channelId = interaction.channel.id;
        const storyText = interaction.fields.getTextInputValue('story_text');

        if (!stories[channelId] || !stories[channelId].active) {
            return await interaction.reply({ content: '📖 No active story in this channel.', ephemeral: true });
        }

        const story = stories[channelId];
        
        // Add contributor if new
        if (!story.contributors.includes(interaction.user.id)) {
            story.contributors.push(interaction.user.id);
        }

        // Add to story
        story.story.push({
            text: storyText,
            author: interaction.user.displayName,
            timestamp: Date.now()
        });

        await this.saveData(this.storiesPath, stories);

        const embed = new EmbedBuilder()
            .setTitle('📖 Story Continued!')
            .setDescription(`**${interaction.user.displayName} added:**\n${storyText}`)
            .addFields(
                { name: '📊 Story Stats', value: `Parts: ${story.story.length}\nContributors: ${story.contributors.length}`, inline: true }
            )
            .setColor('#9B59B6')
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }

    async processDrawingSubmission(interaction) {
        const competitions = await this.loadData(this.drawingsPath);
        const channelId = interaction.channel.id;
        const title = interaction.fields.getTextInputValue('drawing_title');
        const url = interaction.fields.getTextInputValue('drawing_url');
        const description = interaction.fields.getTextInputValue('drawing_desc') || '';

        if (!competitions[channelId] || !competitions[channelId].active) {
            return await interaction.reply({ content: '🎨 No active drawing competition in this channel.', ephemeral: true });
        }

        const competition = competitions[channelId];
        competition.submissions[interaction.user.id] = {
            title,
            url,
            description,
            author: interaction.user.displayName,
            votes: 0,
            submittedAt: Date.now()
        };

        await this.saveData(this.drawingsPath, competitions);

        const embed = new EmbedBuilder()
            .setTitle('🎨 Drawing Submitted!')
            .setDescription(`**${title}** by ${interaction.user.displayName}`)
            .setImage(url)
            .addFields(
                { name: '📝 Description', value: description || 'No description provided', inline: false }
            )
            .setColor('#E74C3C')
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }

    async feedPet(interaction) {
        const pets = await this.loadData(this.petsPath);
        const userId = interaction.user.id;

        if (!pets[userId]) {
            return await interaction.reply({ content: '🐾 You don\'t have a pet yet!', ephemeral: true });
        }

        const pet = pets[userId];
        const now = Date.now();
        const hoursSinceLastFed = (now - pet.lastFed) / (1000 * 60 * 60);

        if (hoursSinceLastFed < 1) {
            return await interaction.reply({ content: `${pet.emoji} Your pet isn't hungry yet! Wait ${Math.ceil(60 - (now - pet.lastFed) / (1000 * 60))} minutes.`, ephemeral: true });
        }

        pet.hunger = Math.min(100, pet.hunger + 25);
        pet.happiness = Math.min(100, pet.happiness + 10);
        pet.experience += 5;
        pet.lastFed = now;

        // Check for level up
        if (pet.experience >= 100) {
            pet.level++;
            pet.experience = 0;
            pet.achievements.push('Level Up!');
        }

        await this.saveData(this.petsPath, pets);

        const embed = new EmbedBuilder()
            .setTitle(`${pet.emoji} Pet Fed!`)
            .setDescription(`You fed **${pet.name}**! They're happy and well-fed.`)
            .addFields(
                { name: '📈 Stats', value: `Hunger: ${pet.hunger}%\nHappiness: ${pet.happiness}%\nXP: ${pet.experience}/100`, inline: true }
            )
            .setColor('#2ECC71')
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }

    async playWithPet(interaction) {
        const pets = await this.loadData(this.petsPath);
        const userId = interaction.user.id;

        if (!pets[userId]) {
            return await interaction.reply({ content: '🐾 You don\'t have a pet yet!', ephemeral: true });
        }

        const pet = pets[userId];
        
        if (pet.energy < 20) {
            return await interaction.reply({ content: `${pet.emoji} Your pet is too tired to play! Let them rest.`, ephemeral: true });
        }

        pet.happiness = Math.min(100, pet.happiness + 20);
        pet.energy = Math.max(0, pet.energy - 15);
        pet.experience += 8;
        pet.lastPlayed = Date.now();

        await this.saveData(this.petsPath, pets);

        const playActivities = ['fetch', 'hide and seek', 'puzzle games', 'dancing', 'racing around'];
        const activity = playActivities[Math.floor(Math.random() * playActivities.length)];

        const embed = new EmbedBuilder()
            .setTitle(`${pet.emoji} Playtime!`)
            .setDescription(`You played **${activity}** with **${pet.name}**! They loved it!`)
            .addFields(
                { name: '📈 Stats', value: `Happiness: ${pet.happiness}%\nEnergy: ${pet.energy}%\nXP: ${pet.experience}/100`, inline: true }
            )
            .setColor('#3498DB')
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }

    async trainPet(interaction) {
        const pets = await this.loadData(this.petsPath);
        const userId = interaction.user.id;

        if (!pets[userId]) {
            return await interaction.reply({ content: '🐾 You don\'t have a pet yet!', ephemeral: true });
        }

        const pet = pets[userId];
        
        if (pet.energy < 30) {
            return await interaction.reply({ content: `${pet.emoji} Your pet needs more energy to train!`, ephemeral: true });
        }

        pet.energy = Math.max(0, pet.energy - 25);
        pet.experience += 15;

        // Random stat improvement
        const stats = ['strength', 'intelligence', 'cuteness'];
        const randomStat = stats[Math.floor(Math.random() * stats.length)];
        if (pet.stats[randomStat] < 10) {
            pet.stats[randomStat] += 1;
        }

        await this.saveData(this.petsPath, pets);

        const embed = new EmbedBuilder()
            .setTitle(`${pet.emoji} Training Complete!`)
            .setDescription(`**${pet.name}** completed training and improved their **${randomStat}**!`)
            .addFields(
                { name: '📈 Improved Stats', value: `${randomStat}: ${pet.stats[randomStat]}`, inline: true },
                { name: '⚡ Energy', value: `${pet.energy}%`, inline: true },
                { name: '✨ XP', value: `${pet.experience}/100`, inline: true }
            )
            .setColor('#F39C12')
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }

    async lookAround(interaction) {
        const rooms = await this.loadData(this.escapePath);
        const userId = interaction.user.id;

        if (!rooms[userId]) {
            return await interaction.reply({ content: '🚪 You\'re not in an escape room! Start one with `/interactive escape start`.', ephemeral: true });
        }

        const room = rooms[userId];
        
        const roomDescriptions = {
            haunted: {
                start: 'You see a dusty chandelier above, creaky floorboards below, and three doors: North, East, and West. A faint glow comes from under the Eastern door.',
                north: 'A library filled with ancient books. Some books seem to glow faintly. There\'s a desk with a locked drawer.',
                east: 'A kitchen with old pots and pans. You notice a strange symbol carved into the wooden table.',
                west: 'A bedroom with a four-poster bed. Under the bed, you see something glinting.'
            }
        };

        const currentDesc = roomDescriptions[room.type]?.[room.currentRoom] || 'You look around but see nothing special.';

        const embed = new EmbedBuilder()
            .setTitle(`${room.emoji} Looking Around - ${room.name}`)
            .setDescription(currentDesc)
            .addFields(
                { name: '🎒 Inventory', value: room.inventory.length > 0 ? room.inventory.join(', ') : 'Empty', inline: true },
                { name: '🧩 Puzzles Solved', value: `${room.solvedPuzzles.length}/3`, inline: true },
                { name: '💡 Hints Used', value: `${room.hintsUsed}`, inline: true }
            )
            .setColor('#8E44AD')
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }

    async checkInventory(interaction) {
        const rooms = await this.loadData(this.escapePath);
        const userId = interaction.user.id;

        if (!rooms[userId]) {
            return await interaction.reply({ content: '🚪 You\'re not in an escape room!', ephemeral: true });
        }

        const room = rooms[userId];
        
        const embed = new EmbedBuilder()
            .setTitle(`${room.emoji} Inventory - ${room.name}`)
            .setDescription(room.inventory.length > 0 ? room.inventory.map(item => `• ${item.replace('_', ' ')}`).join('\n') : 'Your inventory is empty.')
            .setColor('#8E44AD')
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }

    async giveHint(interaction) {
        const rooms = await this.loadData(this.escapePath);
        const userId = interaction.user.id;

        if (!rooms[userId]) {
            return await interaction.reply({ content: '🚪 You\'re not in an escape room!', ephemeral: true });
        }

        const room = rooms[userId];
        room.hintsUsed++;

        const hints = [
            'Try examining objects more carefully...',
            'Some items can be combined together.',
            'Look for patterns in the environment.',
            'Not everything is as it appears.',
            'Sometimes you need to go back to previous rooms.'
        ];

        const hint = hints[Math.min(room.hintsUsed - 1, hints.length - 1)];

        await this.saveData(this.escapePath, rooms);

        const embed = new EmbedBuilder()
            .setTitle(`${room.emoji} Hint`)
            .setDescription(`💡 ${hint}`)
            .setFooter({ text: `Hints used: ${room.hintsUsed}` })
            .setColor('#F1C40F')
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
}

module.exports = { InteractiveSystem };
