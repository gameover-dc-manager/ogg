const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('economy')
        .setDescription('Complete economy system with coins, shops, and activities!')
        .addSubcommand(subcommand =>
            subcommand
                .setName('balance')
                .setDescription('Check your or someone else\'s balance')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to check balance for')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('work')
                .setDescription('Work to earn coins')
                .addStringOption(option =>
                    option.setName('job')
                        .setDescription('Choose your job type')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Pizza Delivery', value: 'pizza' },
                            { name: 'Programming', value: 'coding' },
                            { name: 'Dog Walking', value: 'dogs' },
                            { name: 'Tutoring', value: 'tutor' },
                            { name: 'Street Performance', value: 'perform' },
                            { name: 'Mystery Job', value: 'mystery' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('shop')
                .setDescription('Browse the server shop')),
    async execute(interaction) {
        await interaction.reply({
            content: '🚧 Economy system is under development!',
            ephemeral: true
        });
    }
};

// Enhanced Balance Handler
async function handleBalance(interaction) {
    const { getUserBalance, formatCurrency, calculateNetWorth } = require('../components/economySystem');

    const targetUser = interaction.options.getUser('user') || interaction.user;
    const balance = await getUserBalance(targetUser.id);
    const netWorth = calculateNetWorth(balance);

    const embed = new EmbedBuilder()
        .setTitle(`💰 ${targetUser.username}'s Wallet`)
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
        .addFields(
            { name: '🪙 Coins', value: `${formatCurrency(balance.coins)}`, inline: true },
            { name: '💎 Gems', value: `${formatCurrency(balance.gems)}`, inline: true },
            { name: '🏦 Bank', value: `${formatCurrency(balance.bank)}`, inline: true },
            { name: '📊 Net Worth', value: `${formatCurrency(netWorth)}`, inline: true },
            { name: '🎯 Level', value: `${balance.level} (${balance.experience}/1000 XP)`, inline: true },
            { name: '💳 Credit Score', value: `${balance.creditScore}/850`, inline: true },
            { name: '🔥 Work Streak', value: `${balance.workStreak} days`, inline: true },
            { name: '💼 Total Earned', value: `${formatCurrency(balance.totalEarned)}`, inline: true },
            { name: '💸 Total Spent', value: `${formatCurrency(balance.totalSpent)}`, inline: true }
        )
        .setColor(netWorth >= 10000 ? '#FFD700' : netWorth >= 5000 ? '#C0C0C0' : '#CD7F32')
        .setFooter({ text: `Economy Level: ${balance.level}` })
        .setTimestamp();

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('balance_refresh')
                .setLabel('🔄 Refresh')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('balance_detailed')
                .setLabel('📊 Detailed Stats')
                .setStyle(ButtonStyle.Primary)
        );

    await interaction.reply({ embeds: [embed], components: [row] });
}

// Enhanced Work Handler
async function handleWork(interaction) {
    const { workForCoins } = require('../components/economySystem');

    const jobChoice = interaction.options.getString('job');
    const result = await workForCoins(interaction.user.id, jobChoice);

    if (!result.success) {
        const timeLeft = Math.ceil((result.nextWorkTime - Date.now()) / (1000 * 60));

        const embed = new EmbedBuilder()
            .setTitle('⏰ Still Working')
            .setDescription(`You're exhausted from your last job!\n\n**Recovery Time:** ${timeLeft} minutes remaining\n**Tip:** Use coffee or energy drinks to reduce cooldown!`)
            .setColor('#FFA500')
            .setTimestamp();

        return await interaction.reply({ embeds: [embed], flags: 64 });
    }

    const embed = new EmbedBuilder()
        .setTitle('💼 Work Complete!')
        .setDescription(`**Job:** ${result.job}\n${result.description}`)
        .addFields(
            { name: '💰 Base Pay', value: `${result.earned} coins`, inline: true },
            { name: '🔥 Streak Bonus', value: result.streakBonus > 0 ? `+${result.streakBonus} coins` : 'None', inline: true },
            { name: '⭐ Level Bonus', value: result.levelBonus > 0 ? `+${result.levelBonus} coins` : 'None', inline: true },
            { name: '💊 Item Bonus', value: result.itemBonus > 0 ? `+${result.itemBonus} coins` : 'None', inline: true },
            { name: '💵 Total Earned', value: `**${result.totalEarned} coins**`, inline: true },
            { name: '📈 Experience', value: `+${result.experience} XP`, inline: true }
        )
        .setColor('#00FF00')
        .setFooter({ text: `Work Streak: ${result.newStreak} days | Next work in 30 minutes` })
        .setTimestamp();

    if (result.levelUp) {
        embed.addFields({
            name: '🎉 Level Up!',
            value: `Congratulations! You reached **Level ${result.newLevel}**!\nYou now earn ${result.newLevel * 2}% more coins from work!`,
            inline: false
        });
    }

    if (result.achievements && result.achievements.length > 0) {
        embed.addFields({
            name: '🏆 Achievement Unlocked!',
            value: result.achievements.join('\n'),
            inline: false
        });
    }

    await interaction.reply({ embeds: [embed] });
}

// Enhanced Shop Handler
async function handleShop(interaction) {
    const { getShopItems, getUserData } = require('../components/economySystem');

    const category = interaction.options.getString('category') || 'all';
    const user = getUserData(interaction.user.id);
    const items = await getShopItems(category);

    const embed = new EmbedBuilder()
        .setTitle(`🛒 Server Shop${category !== 'all' ? ` - ${category.charAt(0).toUpperCase() + category.slice(1)}` : ''}`)
        .setDescription(`💰 Your Balance: **${user.coins.toLocaleString()}** coins\n\nBrowse our extensive collection of items!`)
        .setColor('#4A90E2')
        .setTimestamp();

    if (items.length === 0) {
        embed.addFields({ name: 'No Items', value: 'No items available in this category!', inline: false });
    } else {
        items.slice(0, 25).forEach(item => {
            const canAfford = user.coins >= item.price;
            const priceText = canAfford ? `${item.price.toLocaleString()} coins` : `~~${item.price.toLocaleString()} coins~~ (Can't afford)`;

            embed.addFields({
                name: `${item.emoji} ${item.name}`,
                value: `**Price:** ${priceText}\n**ID:** \`${item.id}\`\n${item.description}`,
                inline: true
            });
        });
    }

    const row = new ActionRowBuilder()
        .addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('shop_category')
                .setPlaceholder('Select a category...')
                .addOptions([
                    { label: 'All Items', value: 'all', emoji: '🛍️' },
                    { label: 'Tools & Equipment', value: 'tools', emoji: '🛠️' },
                    { label: 'Consumables', value: 'consumables', emoji: '🍎' },
                    { label: 'Upgrades & Boosts', value: 'upgrades', emoji: '⚡' },
                    { label: 'Collectibles', value: 'collectibles', emoji: '🎭' },
                    { label: 'Special Items', value: 'special', emoji: '✨' }
                ])
        );

    await interaction.reply({ embeds: [embed], components: [row] });
}

// Enhanced Buy Handler
async function handleBuy(interaction) {
    const { buyItem } = require('../components/economySystem');

    const itemId = interaction.options.getString('item');
    const result = await buyItem(interaction.user.id, itemId);

    if (!result.success) {
        const embed = new EmbedBuilder()
            .setTitle('❌ Purchase Failed')
            .setDescription(result.message)
            .setColor('#FF0000')
            .setTimestamp();

        return await interaction.reply({ embeds: [embed], flags: 64 });
    }

    const embed = new EmbedBuilder()
        .setTitle('✅ Purchase Successful!')
        .setDescription(`You successfully bought **${result.item.name}**!`)
        .addFields(
            { name: '🎁 Item', value: `${result.item.emoji} ${result.item.name}`, inline: true },
            { name: '💰 Cost', value: `${result.item.price.toLocaleString()} coins`, inline: true },
            { name: '💳 New Balance', value: `${result.newBalance.toLocaleString()} coins`, inline: true }
        )
        .setColor('#00FF00')
        .setFooter({ text: 'Check your inventory with /economy inventory' })
        .setTimestamp();

    if (result.effect) {
        embed.addFields({
            name: '✨ Item Effect',
            value: result.effect,
            inline: false
        });
    }

    await interaction.reply({ embeds: [embed] });
}

// Enhanced Inventory Handler
async function handleInventory(interaction) {
    const { getUserInventory } = require('../components/economySystem');

    const filter = interaction.options.getString('filter') || 'all';
    const inventory = await getUserInventory(interaction.user.id, filter);

    const embed = new EmbedBuilder()
        .setTitle('🎒 Your Inventory')
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
        .setColor('#8B4CB8')
        .setTimestamp();

    if (inventory.length === 0) {
        embed.setDescription('Your inventory is empty! Visit the shop to buy items with `/economy shop`.');
    } else {
        let totalValue = 0;
        inventory.forEach(item => {
            totalValue += item.value * item.quantity;
            embed.addFields({
                name: `${item.emoji} ${item.name}`,
                value: `**Quantity:** ${item.quantity}\n**Value:** ${item.value.toLocaleString()} coins each\n**Total:** ${(item.value * item.quantity).toLocaleString()} coins`,
                inline: true
            });
        });

        embed.setDescription(`Total Inventory Value: **${totalValue.toLocaleString()}** coins`);
    }

    const row = new ActionRowBuilder()
        .addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('inventory_filter')
                .setPlaceholder('Filter items...')
                .addOptions([
                    { label: 'All Items', value: 'all', emoji: '📦' },
                    { label: 'Tools', value: 'tools', emoji: '🛠️' },
                    { label: 'Consumables', value: 'consumables', emoji: '🍎' },
                    { label: 'Collectibles', value: 'collectibles', emoji: '🎭' }
                ])
        );

    await interaction.reply({ embeds: [embed], components: [row] });
}

// Enhanced Use Item Handler
async function handleUse(interaction) {
    const { useItem } = require('../components/economySystem');

    const itemId = interaction.options.getString('item');
    const result = await useItem(interaction.user.id, itemId);

    if (!result.success) {
        const embed = new EmbedBuilder()
            .setTitle('❌ Cannot Use Item')
            .setDescription(result.message)
            .setColor('#FF0000')
            .setTimestamp();

        return await interaction.reply({ embeds: [embed], flags: 64 });
    }

    const embed = new EmbedBuilder()
        .setTitle('✅ Item Used!')
        .setDescription(`You used **${result.item.name}**!`)
        .addFields(
            { name: '✨ Effect', value: result.effect, inline: false }
        )
        .setColor('#00FF00')
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

// Continue with other handlers...
async function handleTransfer(interaction) {
    const { transferCoins } = require('../components/economySystem');

    const targetUser = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');

    if (targetUser.id === interaction.user.id) {
        return await interaction.reply({ content: '❌ You cannot transfer coins to yourself!', flags: 64 });
    }

    if (targetUser.bot) {
        return await interaction.reply({ content: '❌ You cannot transfer coins to bots!', flags: 64 });
    }

    const result = await transferCoins(interaction.user.id, targetUser.id, amount);

    if (!result.success) {
        const embed = new EmbedBuilder()
            .setTitle('❌ Transfer Failed')
            .setDescription(result.message)
            .setColor('#FF0000')
            .setTimestamp();

        return await interaction.reply({ embeds: [embed], flags: 64 });
    }

    const embed = new EmbedBuilder()
        .setTitle('💸 Transfer Complete!')
        .setDescription(`Successfully transferred coins to ${targetUser}`)
        .addFields(
            { name: '💰 Amount Sent', value: `${amount.toLocaleString()} coins`, inline: true },
            { name: '💳 Transfer Fee', value: `${result.fee.toLocaleString()} coins (5%)`, inline: true },
            { name: '🎯 Recipient Got', value: `${(amount - result.fee).toLocaleString()} coins`, inline: true },
            { name: '💵 Your New Balance', value: `${result.newBalance.toLocaleString()} coins`, inline: false }
        )
        .setColor('#00FF00')
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

// Additional handlers for gamble, leaderboard, crime, rob, quest, mine, fish, business, stats...
async function handleGamble(interaction) {
    const { playGamblingGame } = require('../components/economySystem');

    const game = interaction.options.getString('game');
    const bet = interaction.options.getInteger('bet');

    const result = await playGamblingGame(interaction.user.id, game, bet);

    if (!result.success) {
        const embed = new EmbedBuilder()
            .setTitle('❌ Gambling Failed')
            .setDescription(result.message)
            .setColor('#FF0000')
            .setTimestamp();

        return await interaction.reply({ embeds: [embed], flags: 64 });
    }

    const embed = new EmbedBuilder()
        .setTitle(`🎲 ${result.game} Results`)
        .setDescription(result.description)
        .addFields(
            { name: '💰 Bet Amount', value: `${bet.toLocaleString()} coins`, inline: true },
            { name: result.won ? '🎉 You Won!' : '💸 You Lost', value: `${Math.abs(result.payout).toLocaleString()} coins`, inline: true },
            { name: '💳 New Balance', value: `${result.newBalance.toLocaleString()} coins`, inline: true }
        )
        .setColor(result.won ? '#00FF00' : '#FF0000')
        .setFooter({ text: `Multiplier: ${result.multiplier}x` })
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handleLeaderboard(interaction) {
    const { getEconomyLeaderboard } = require('../components/economySystem');

    await interaction.deferReply();

    const type = interaction.options.getString('type') || 'networth';
    const leaderboard = await getEconomyLeaderboard(interaction.guild.id, interaction.client, type);

    const embed = new EmbedBuilder()
        .setTitle(`💰 Economy Leaderboard - ${type.charAt(0).toUpperCase() + type.slice(1)}`)
        .setDescription('Top performers in the server economy!')
        .setColor('#FFD700')
        .setTimestamp();

    if (leaderboard.length === 0) {
        embed.addFields({ name: 'No Data', value: 'No economic activity yet!', inline: false });
    } else {
        leaderboard.slice(0, 15).forEach((user, index) => {
            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `**${index + 1}.**`;
            let valueText = '';

            switch (type) {
                case 'networth':
                    valueText = `Net Worth: ${user.netWorth.toLocaleString()} coins`;
                    break;
                case 'coins':
                    valueText = `Coins: ${user.coins.toLocaleString()}`;
                    break;
                case 'level':
                    valueText = `Level: ${user.level} (${user.experience} XP)`;
                    break;
                case 'streak':
                    valueText = `Work Streak: ${user.workStreak} days`;
                    break;
            }

            embed.addFields({
                name: `${medal} ${user.username}`,
                value: valueText,
                inline: false
            });
        });
    }

    await interaction.editReply({ embeds: [embed] });
}

// Placeholder handlers for remaining functions
async function handleCrime(interaction) {
    const { commitCrime } = require('../components/economySystem');
    const crimeType = interaction.options.getString('crime_type');
    const result = await commitCrime(interaction.user.id, crimeType);

    if (!result.success) {
        const timeLeft = Math.ceil((result.nextCrimeTime - Date.now()) / (1000 * 60));
        return await interaction.reply({
            content: `🚔 You need to lay low! Come back in ${timeLeft} minutes.`,
            flags: 64
        });
    }

    const embed = new EmbedBuilder()
        .setTitle(result.caught ? '🚔 Caught!' : '🕵️ Crime Success!')
        .setDescription(`**Crime:** ${result.crime}\n${result.description}`)
        .setColor(result.caught ? '#FF0000' : '#00FF00');

    await interaction.reply({ embeds: [embed] });
}

async function handleRob(interaction) {
    const { robUser } = require('../components/economySystem');
    const targetUser = interaction.options.getUser('user');

    if (targetUser.bot || targetUser.id === interaction.user.id) {
        return await interaction.reply({ content: '❌ Invalid target!', flags: 64 });
    }

    const result = await robUser(interaction.user.id, targetUser.id);
    // Implementation similar to other handlers...

    await interaction.reply({ content: 'Rob feature coming soon!', flags: 64 });
}

async function handleQuest(interaction) {
    await interaction.reply({ content: 'Quest system coming soon!', flags: 64 });
}

async function handleMine(interaction) {
    const { mineResources } = require('../components/economySystem');
    const location = interaction.options.getString('location');
    const result = await mineResources(interaction.user.id, location);

    // Implementation...
    await interaction.reply({ content: 'Mining feature enhanced!', flags: 64 });
}

async function handleFish(interaction) {
    await interaction.reply({ content: 'Fishing feature coming soon!', flags: 64 });
}

async function handleBusiness(interaction) {
    await interaction.reply({ content: 'Business system coming soon!', flags: 64 });
}

async function handleStats(interaction) {
    const { getUserStats } = require('../components/economySystem');
    const targetUser = interaction.options.getUser('user') || interaction.user;

    // Implementation for detailed stats...
    await interaction.reply({ content: 'Detailed stats coming soon!', flags: 64 });
}