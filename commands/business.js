const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    StringSelectMenuBuilder
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('business')
        .setDescription('Start and manage your business empire!')
        .addSubcommand(subcommand =>
            subcommand
                .setName('start')
                .setDescription('Start a new business')
                .addStringOption(option =>
                    option.setName('type')
                        .setDescription('Type of business to start')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Cafe', value: 'cafe' },
                            { name: 'Tech Startup', value: 'tech' },
                            { name: 'Restaurant', value: 'restaurant' },
                            { name: 'Retail Store', value: 'retail' },
                            { name: 'Mining Company', value: 'mining' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('manage')
                .setDescription('Manage your existing businesses'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('invest')
                .setDescription('Invest in your business')
                .addIntegerOption(option =>
                    option.setName('amount')
                        .setDescription('Amount to invest')
                        .setRequired(true)
                        .setMinValue(100)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('collect')
                .setDescription('Collect profits from your businesses'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('upgrade')
                .setDescription('Upgrade your business facilities'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('market')
                .setDescription('View business market and opportunities'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('expand')
                .setDescription('Expand your business operations')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        try {
            switch (subcommand) {
                case 'start':
                    await handleStartBusiness(interaction);
                    break;
                case 'manage':
                    await handleManageBusiness(interaction);
                    break;
                case 'invest':
                    await handleInvestBusiness(interaction);
                    break;
                case 'collect':
                    await handleCollectProfits(interaction);
                    break;
                case 'upgrade':
                    await handleUpgradeBusiness(interaction);
                    break;
                case 'market':
                    await handleBusinessMarket(interaction);
                    break;
            }
        } catch (error) {
            console.error('❌ Error in business command:', error);

            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ **Error**: Business system temporarily unavailable.',
                    flags: 64
                });
            }
        }
    }
};

async function handleStartBusiness(interaction) {
    const { startBusiness } = require('../components/businessSystem');

    const businessType = interaction.options.getString('type');
    const result = await startBusiness(interaction.user.id, businessType);

    if (!result.success) {
        const embed = new EmbedBuilder()
            .setTitle('❌ Business Startup Failed')
            .setDescription(result.message)
            .setColor('#FF0000')
            .setTimestamp();

        return await interaction.reply({ embeds: [embed], flags: 64 });
    }

    const embed = new EmbedBuilder()
        .setTitle('🏢 Business Started!')
        .setDescription(`Congratulations! You've started a **${result.business.name}**!`)
        .addFields(
            { name: '🏷️ Business Type', value: result.business.type, inline: true },
            { name: '💰 Startup Cost', value: `${result.business.startupCost} coins`, inline: true },
            { name: '📈 Daily Income', value: `${result.business.dailyIncome} coins`, inline: true },
            { name: '⭐ Level', value: '1', inline: true },
            { name: '👥 Employees', value: '0', inline: true },
            { name: '💳 Remaining Balance', value: `${result.newBalance} coins`, inline: true }
        )
        .setColor('#00FF00')
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handleManageBusiness(interaction) {
    const { getUserBusinesses } = require('../components/businessSystem');

    const businesses = await getUserBusinesses(interaction.user.id);

    if (businesses.length === 0) {
        const embed = new EmbedBuilder()
            .setTitle('🏢 No Businesses')
            .setDescription('You don\'t own any businesses yet! Use `/business start` to begin your entrepreneurial journey.')
            .setColor('#FFA500')
            .setTimestamp();

        return await interaction.reply({ embeds: [embed], flags: 64 });
    }

    const embed = new EmbedBuilder()
        .setTitle('🏢 Your Business Empire')
        .setDescription('Manage your businesses and watch your profits grow!')
        .setColor('#4A90E2')
        .setTimestamp();

    businesses.forEach(business => {
        const profitReady = Date.now() - business.lastCollection >= 24 * 60 * 60 * 1000;
        embed.addFields({
            name: `${business.emoji} ${business.name}`,
            value: `**Level:** ${business.level}\n**Daily Income:** ${business.dailyIncome} coins\n**Employees:** ${business.employees}\n**Profits:** ${profitReady ? '✅ Ready' : '⏰ Collecting...'}`,
            inline: true
        });
    });

    const totalDailyIncome = businesses.reduce((sum, b) => sum + b.dailyIncome, 0);
    embed.addFields({
        name: '💰 Total Daily Income',
        value: `${totalDailyIncome} coins`,
        inline: false
    });

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('business_collect_all')
                .setLabel('💰 Collect All')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('business_invest_all')
                .setLabel('📈 Auto-Invest')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('business_hire_employees')
                .setLabel('👥 Hire Staff')
                .setStyle(ButtonStyle.Secondary)
        );

    await interaction.reply({ embeds: [embed], components: [row] });
}

async function handleInvestBusiness(interaction) {
    const { investInBusiness } = require('../components/businessSystem');

    const amount = interaction.options.getInteger('amount');
    const result = await investInBusiness(interaction.user.id, amount);

    if (!result.success) {
        const embed = new EmbedBuilder()
            .setTitle('❌ Investment Failed')
            .setDescription(result.message)
            .setColor('#FF0000')
            .setTimestamp();

        return await interaction.reply({ embeds: [embed], flags: 64 });
    }

    const embed = new EmbedBuilder()
        .setTitle('📈 Investment Successful!')
        .setDescription(`You invested ${amount} coins into your business!`)
        .addFields(
            { name: '💰 Investment', value: `${amount} coins`, inline: true },
            { name: '📊 ROI Expected', value: `${result.expectedROI}%`, inline: true },
            { name: '💳 Remaining Balance', value: `${result.newBalance} coins`, inline: true }
        )
        .setColor('#00FF00')
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handleCollectProfits(interaction) {
    const { collectBusinessProfits } = require('../components/businessSystem');

    const result = await collectBusinessProfits(interaction.user.id);

    if (!result.success) {
        const embed = new EmbedBuilder()
            .setTitle('❌ Collection Failed')
            .setDescription(result.message)
            .setColor('#FF0000')
            .setTimestamp();

        return await interaction.reply({ embeds: [embed], flags: 64 });
    }

    const embed = new EmbedBuilder()
        .setTitle('💰 Profits Collected!')
        .setDescription('Successfully collected profits from your businesses!')
        .addFields(
            { name: '💰 Total Collected', value: `${result.totalCollected} coins`, inline: true },
            { name: '🏢 Businesses', value: result.businessCount.toString(), inline: true },
            { name: '💳 New Balance', value: `${result.newBalance} coins`, inline: true }
        )
        .setColor('#00FF00')
        .setTimestamp();

    if (result.bonuses.length > 0) {
        embed.addFields({
            name: '🎁 Bonuses',
            value: result.bonuses.join('\n'),
            inline: false
        });
    }

    await interaction.reply({ embeds: [embed] });
}

async function handleUpgradeBusiness(interaction) {
    const { getUpgradeOptions } = require('../components/businessSystem');

    const options = await getUpgradeOptions(interaction.user.id);

    if (options.length === 0) {
        const embed = new EmbedBuilder()
            .setTitle('🏢 No Upgrades Available')
            .setDescription('You don\'t have any businesses to upgrade or sufficient funds.')
            .setColor('#FFA500')
            .setTimestamp();

        return await interaction.reply({ embeds: [embed], flags: 64 });
    }

    const embed = new EmbedBuilder()
        .setTitle('⬆️ Business Upgrades')
        .setDescription('Invest in upgrades to increase your profits!')
        .setColor('#9B59B6')
        .setTimestamp();

    options.forEach(option => {
        embed.addFields({
            name: `${option.emoji} ${option.name}`,
            value: `**Cost:** ${option.cost} coins\n**Benefit:** ${option.benefit}\n**Current Level:** ${option.currentLevel}`,
            inline: true
        });
    });

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('business_upgrade_select')
        .setPlaceholder('Choose an upgrade...')
        .addOptions(
            options.map(option => ({
                label: option.name,
                description: `${option.cost} coins - ${option.benefit}`,
                value: option.id,
                emoji: option.emoji
            }))
        );

    const row = new ActionRowBuilder().addComponents(selectMenu);

    await interaction.reply({ embeds: [embed], components: [row] });
}

async function handleBusinessMarket(interaction) {
    const { getMarketData } = require('../components/businessSystem');

    const market = await getMarketData();

    const embed = new EmbedBuilder()
        .setTitle('📊 Business Market')
        .setDescription('Current market conditions and opportunities')
        .addFields(
            { name: '📈 Market Trend', value: market.trend, inline: true },
            { name: '💰 Average Profit', value: `${market.averageProfit} coins/day`, inline: true },
            { name: '🏆 Top Business Type', value: market.topBusinessType, inline: true }
        )
        .setColor('#F39C12')
        .setTimestamp();

    market.opportunities.forEach(opportunity => {
        embed.addFields({
            name: `${opportunity.emoji} ${opportunity.name}`,
            value: `**Investment:** ${opportunity.cost} coins\n**Potential Profit:** ${opportunity.profit} coins/day\n**Risk Level:** ${opportunity.risk}`,
            inline: true
        });
    });

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('market_refresh')
                .setLabel('🔄 Refresh Market')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('market_trends')
                .setLabel('📊 View Trends')
                .setStyle(ButtonStyle.Primary)
        );

    await interaction.reply({ embeds: [embed], components: [row] });
}