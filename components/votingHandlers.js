
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createPoll, vote, getPoll } = require('./votingSystem');

async function handlePollCreation(interaction) {
    const customIdParts = interaction.customId.split('|');
    if (customIdParts.length !== 5) {
        return await interaction.reply({
            content: '❌ **Error**: Invalid poll creation data.',
            ephemeral: true
        });
    }

    const [, type, duration, anonymous, multipleChoice] = customIdParts;

    const title = interaction.fields.getTextInputValue('poll_title');
    const description = interaction.fields.getTextInputValue('poll_description') || 'No description provided';
    const optionsText = interaction.fields.getTextInputValue('poll_options');

    // Parse options
    const options = optionsText.split('\n')
        .map(option => option.trim())
        .filter(option => option.length > 0);

    if (options.length < 2) {
        return await interaction.reply({
            content: '❌ **Error**: You must provide at least 2 options for the poll.',
            ephemeral: true
        });
    }

    if (options.length > 10) {
        return await interaction.reply({
            content: '❌ **Error**: Maximum of 10 options allowed.',
            ephemeral: true
        });
    }

    // Create the poll
    const result = await createPoll(
        interaction.guild.id,
        interaction.user.id,
        title,
        description,
        type,
        options,
        parseInt(duration),
        anonymous === 'true',
        multipleChoice === 'true'
    );

    if (!result.success) {
        return await interaction.reply({
            content: '❌ **Error**: Failed to create poll.',
            ephemeral: true
        });
    }

    const poll = result.poll;

    // Create poll embed
    const embed = new EmbedBuilder()
        .setTitle(`🗳️ ${poll.title}`)
        .setDescription(poll.description)
        .setColor('#4A90E2')
        .addFields(
            { name: '📝 Poll Type', value: poll.type.replace('_', ' '), inline: true },
            { name: '🆔 Poll ID', value: poll.id, inline: true },
            { name: '👤 Created by', value: interaction.user.toString(), inline: true }
        )
        .setFooter({ text: `Poll ID: ${poll.id} • ${poll.anonymous ? 'Anonymous' : 'Public'} • ${poll.multipleChoice ? 'Multiple Choice' : 'Single Choice'}` })
        .setTimestamp();

    if (poll.endTime) {
        embed.addFields({ 
            name: '⏰ Ends', 
            value: `<t:${Math.floor(poll.endTime / 1000)}:R>`, 
            inline: true 
        });
    }

    // Add options
    const pollOptionsText = poll.options.map((option, index) => 
        `${index + 1}. ${option.text}`
    ).join('\n');
    embed.addFields({ name: '📋 Options', value: pollOptionsText, inline: false });

    // Create voting buttons
    const rows = [];
    const maxButtonsPerRow = 5;

    for (let i = 0; i < poll.options.length; i += maxButtonsPerRow) {
        const row = new ActionRowBuilder();
        const rowOptions = poll.options.slice(i, i + maxButtonsPerRow);

        rowOptions.forEach((option, index) => {
            const actualIndex = i + index;
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`poll_vote|${poll.id}|${actualIndex}`)
                    .setLabel(`${actualIndex + 1}. ${option.text.substring(0, 50)}`)
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🗳️')
            );
        });

        rows.push(row);
    }

    // Add control buttons
    const controlRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`poll_results|${poll.id}`)
                .setLabel('View Results')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('📊'),
            new ButtonBuilder()
                .setCustomId(`poll_end|${poll.id}`)
                .setLabel('End Poll')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('🛑')
        );

    rows.push(controlRow);

    await interaction.reply({
        content: `📢 **New Poll Created!** Vote by clicking the buttons below.`,
        embeds: [embed],
        components: rows
    });

    console.log(`✅ Poll ${poll.id} created and posted by ${interaction.user.tag}`);
}

async function handlePollVote(interaction) {
    const parts = interaction.customId.split('|');
    if (parts.length !== 3) {
        return await interaction.reply({
            content: '❌ **Error**: Invalid vote button format.',
            ephemeral: true
        });
    }

    const [, pollId, optionIndex] = parts;
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;

    // Cast the vote
    const result = await vote(guildId, pollId, userId, [parseInt(optionIndex)]);

    if (!result.success) {
        return await interaction.reply({
            content: `❌ **Error**: ${result.message}`,
            ephemeral: true
        });
    }

    const poll = result.poll;
    const selectedOption = poll.options[parseInt(optionIndex)];

    await interaction.reply({
        content: `✅ **Vote Recorded!**\n\nYou voted for: **${selectedOption.text}**\n\nPoll: ${poll.title}`,
        ephemeral: true
    });

    console.log(`✅ User ${interaction.user.tag} voted in poll ${pollId} for option ${optionIndex}`);
}

module.exports = {
    handlePollCreation,
    handlePollVote
};
