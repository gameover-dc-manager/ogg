const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pokemon')
        .setDescription('Pokemon information lookup')
        .addStringOption(option =>
            option.setName('pokemon')
                .setDescription('The name or ID of the Pokemon')
                .setRequired(true)),

    async execute(interaction) {
        const pokemon = interaction.options.getString('pokemon');
        
        await interaction.deferReply();

        try {
            const response = await axios.get(`https://pokeapi.co/api/v2/pokemon/${pokemon.toLowerCase()}`);
            const data = response.data;

            const name = data.name.charAt(0).toUpperCase() + data.name.slice(1);
            const height = data.height / 10; // Convert from decimeters to meters
            const weight = data.weight / 10; // Convert from hectograms to kilograms
            const types = data.types.map(type => type.type.name.charAt(0).toUpperCase() + type.type.name.slice(1)).join(', ');
            const abilities = data.abilities.map(ability => ability.ability.name.charAt(0).toUpperCase() + ability.ability.name.slice(1)).join(', ');

            // Get stats
            const stats = {};
            data.stats.forEach(stat => {
                stats[stat.stat.name] = stat.base_stat;
            });

            // Get first 5 moves
            const moves = data.moves.slice(0, 5).map(move => 
                move.move.name.charAt(0).toUpperCase() + move.move.name.slice(1)
            ).join(', ');

            const embed = new EmbedBuilder()
                .setTitle(`${name} - Pokemon Info`)
                .setColor('#0099FF')
                .addFields(
                    { name: 'Height', value: `${height} meters`, inline: true },
                    { name: 'Weight', value: `${weight} kg`, inline: true },
                    { name: 'Types', value: types, inline: true },
                    { name: 'Abilities', value: abilities, inline: true },
                    { name: 'Stats', value: `HP: ${stats.hp}\nAttack: ${stats.attack}\nDefense: ${stats.defense}\nSpecial Attack: ${stats['special-attack']}\nSpecial Defense: ${stats['special-defense']}\nSpeed: ${stats.speed}`, inline: false },
                    { name: 'Moves', value: moves, inline: false }
                )
                .setTimestamp();

            if (data.sprites.front_default) {
                embed.setImage(data.sprites.front_default);
            }

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Error fetching Pokemon data:', error);
            if (error.response && error.response.status === 404) {
                await interaction.editReply({ content: 'Pokemon not found. Please check the name or ID and try again.' });
            } else {
                await interaction.editReply({ content: 'Error fetching Pokemon data. Please try again later.' });
            }
        }
    }
};