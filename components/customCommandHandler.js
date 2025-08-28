
const { EmbedBuilder } = require('discord.js');
const { loadCustomCommands, saveCustomCommands } = require('../commands/customcommands');

class CustomCommandHandler {
    static async handleCustomCommand(message, commandName, isSlashCommand = false) {
        try {
            const data = await loadCustomCommands();
            const guildCommands = data[message.guild.id] || {};
            const command = guildCommands[commandName.toLowerCase()];

            if (!command || !command.enabled) {
                return false; // Command not found or disabled
            }

            // Check command type restrictions
            if (command.commandType === 'slash' && !isSlashCommand) {
                return false; // Command is slash-only but triggered via prefix
            }
            if (command.commandType === 'prefix' && isSlashCommand) {
                return false; // Command is prefix-only but triggered via slash
            }

            // Check permissions
            if (!this.hasPermission(message.member, command.permissions)) {
                await message.reply('❌ **Insufficient permissions**: You don\'t have permission to use this command.');
                return true;
            }

            // Process variables in response
            let response = this.processVariables(command.response, message);

            // Increment usage counter
            command.uses = (command.uses || 0) + 1;
            await saveCustomCommands(data);

            // Log command usage
            console.log(`[CUSTOM-COMMANDS] Command "${commandName}" used by ${message.author.tag} (${message.author.id}) in ${message.guild.name} - Usage #${command.uses}`);

            // Send response
            if (command.useEmbed) {
                const embed = new EmbedBuilder()
                    .setDescription(response)
                    .setColor(command.color || '#0099FF')
                    .setTimestamp();

                await message.reply({ embeds: [embed] });
            } else {
                await message.reply(response);
            }

            return true;
        } catch (error) {
            console.error('Error handling custom command:', error);
            return false;
        }
    }

    static hasPermission(member, requiredPermission) {
        switch (requiredPermission) {
            case 'everyone':
                return true;
            case 'manage_messages':
                return member.permissions.has('ManageMessages');
            case 'manage_channels':
                return member.permissions.has('ManageChannels');
            case 'manage_guild':
                return member.permissions.has('ManageGuild');
            case 'administrator':
                return member.permissions.has('Administrator');
            default:
                return true;
        }
    }

    static processVariables(text, message) {
        const variables = {
            '{user}': `<@${message.author.id}>`,
            '{username}': message.author.username,
            '{userid}': message.author.id,
            '{usertag}': message.author.tag,
            '{usernickname}': message.member?.displayName || message.author.username,
            '{server}': message.guild.name,
            '{serverid}': message.guild.id,
            '{membercount}': message.guild.memberCount.toString(),
            '{channelcount}': message.guild.channels.cache.size.toString(),
            '{channel}': `<#${message.channel.id}>`,
            '{channelname}': message.channel.name,
            '{channelid}': message.channel.id,
            '{date}': new Date().toLocaleDateString(),
            '{time}': new Date().toLocaleTimeString(),
            '{timestamp}': Math.floor(Date.now() / 1000).toString()
        };

        let processedText = text;

        // Replace basic variables
        for (const [variable, value] of Object.entries(variables)) {
            processedText = processedText.replace(new RegExp(variable.replace(/[{}]/g, '\\$&'), 'gi'), value);
        }

        // Process random number variables {random:1-100}
        processedText = processedText.replace(/{random:(\d+)-(\d+)}/gi, (match, min, max) => {
            const minNum = parseInt(min);
            const maxNum = parseInt(max);
            return Math.floor(Math.random() * (maxNum - minNum + 1)) + minNum;
        });

        // Process choice variables {choice:option1,option2,option3}
        processedText = processedText.replace(/{choice:([^}]+)}/gi, (match, choices) => {
            const options = choices.split(',').map(opt => opt.trim());
            return options[Math.floor(Math.random() * options.length)];
        });

        return processedText;
    }

    static async getCustomCommands(guildId) {
        const data = await loadCustomCommands();
        return data[guildId] || {};
    }

    static async getAllCustomCommandNames(guildId) {
        const commands = await this.getCustomCommands(guildId);
        return Object.keys(commands).filter(name => commands[name].enabled);
    }
}

module.exports = CustomCommandHandler;
