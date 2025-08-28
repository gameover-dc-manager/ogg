
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ChannelType } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { musicIcons } = require('../musicIcons/musicIcons.js');

// Configuration paths
const configPath = path.join(__dirname, '../config/reaction_roles.json');

// Load existing configuration
let reactionRoles = {};
try {
    if (fs.existsSync(configPath)) {
        reactionRoles = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
} catch (error) {
    console.error('❌ Error loading reaction roles config:', error);
    reactionRoles = {};
}

// Save configuration
function saveConfig() {
    try {
        fs.writeFileSync(configPath, JSON.stringify(reactionRoles, null, 2));
        console.log('✅ Reaction roles configuration saved');
    } catch (error) {
        console.error('❌ Error saving reaction roles config:', error);
    }
}

class ReactionRolePanel {
    constructor(guildId, options = {}) {
        this.guildId = guildId;
        this.id = options.id || this.generateId();
        this.name = options.name || 'New Panel';
        this.description = options.description || '';
        this.type = options.type || 'multiple'; // 'single', 'multiple', 'limited'
        this.maxRoles = options.maxRoles || null;
        this.cooldown = options.cooldown || 3000;
        this.roles = options.roles || [];
        this.style = options.style || 'buttons'; // 'buttons', 'select', 'reactions'
        this.color = options.color || '#5865F2';
        this.thumbnail = options.thumbnail || null;
        this.footer = options.footer || null;
        this.requireRole = options.requireRole || null;
        this.excludeRole = options.excludeRole || null;
        this.channelId = options.channelId || null;
        this.messageId = options.messageId || null;
        this.enabled = options.enabled !== false;
        this.createdAt = options.createdAt || Date.now();
        this.updatedAt = Date.now();
        this.stats = options.stats || { uses: 0, uniqueUsers: new Set() };
    }

    generateId() {
        return `panel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    addRole(roleId, emoji = null, label = null, description = null) {
        if (this.roles.find(r => r.id === roleId)) {
            return false; // Role already exists
        }

        this.roles.push({
            id: roleId,
            emoji: emoji,
            label: label || `Role ${this.roles.length + 1}`,
            description: description || '',
            uses: 0,
            addedAt: Date.now()
        });

        this.updatedAt = Date.now();
        return true;
    }

    removeRole(roleId) {
        const index = this.roles.findIndex(r => r.id === roleId);
        if (index === -1) return false;

        this.roles.splice(index, 1);
        this.updatedAt = Date.now();
        return true;
    }

    updateRole(roleId, updates) {
        const role = this.roles.find(r => r.id === roleId);
        if (!role) return false;

        Object.assign(role, updates);
        this.updatedAt = Date.now();
        return true;
    }

    createEmbed(guild) {
        const embed = new EmbedBuilder()
            .setTitle(`${musicIcons.MusicIcon} ${this.name}`)
            .setColor(this.color)
            .setFooter({ 
                text: `${musicIcons.beatsIcon} Enhanced Reaction Role System • ${this.roles.length} roles available`, 
                iconURL: musicIcons.footerIcon 
            })
            .setTimestamp();

        if (this.description) {
            embed.setDescription(`${musicIcons.musical_note} ${this.description}`);
        }

        if (this.thumbnail) {
            embed.setThumbnail(this.thumbnail);
        }

        // Add role information
        if (this.roles.length > 0) {
            const roleList = this.roles.map(role => {
                const guildRole = guild.roles.cache.get(role.id);
                if (!guildRole) return null;

                let display = `${role.emoji || musicIcons.heartIcon} **${guildRole.name}**`;
                if (role.description) {
                    display += `\n${musicIcons.musical_score} ${role.description}`;
                }
                return display;
            }).filter(Boolean).join('\n\n');

            if (roleList) {
                embed.addFields({
                    name: `${musicIcons.playlistIcon} Available Roles`,
                    value: roleList,
                    inline: false
                });
            }
        }

        // Add usage instructions
        let instructions = '';
        switch (this.type) {
            case 'single':
                instructions = `${musicIcons.radio} **Single Select**: Choose one role only`;
                break;
            case 'multiple':
                instructions = `${musicIcons.queue} **Multiple Select**: Choose as many roles as you want`;
                break;
            case 'limited':
                instructions = `${musicIcons.volumeIcon} **Limited Select**: Choose up to ${this.maxRoles} roles`;
                break;
        }

        if (this.cooldown > 0) {
            instructions += `\n${musicIcons.pauseresumeIcon} **Cooldown**: ${this.cooldown / 1000} seconds between changes`;
        }

        if (instructions) {
            embed.addFields({
                name: `${musicIcons.correctIcon} Instructions`,
                value: instructions,
                inline: false
            });
        }

        return embed;
    }

    createComponents(guild) {
        const components = [];

        if (this.style === 'buttons' && this.roles.length <= 25) {
            // Button style (max 25 buttons across 5 rows)
            const rows = [];
            let currentRow = new ActionRowBuilder();
            let buttonsInRow = 0;

            for (const role of this.roles) {
                const guildRole = guild.roles.cache.get(role.id);
                if (!guildRole) continue;

                if (buttonsInRow >= 5) {
                    rows.push(currentRow);
                    currentRow = new ActionRowBuilder();
                    buttonsInRow = 0;
                }

                const button = new ButtonBuilder()
                    .setCustomId(`rr_toggle_${this.id}_${role.id}`)
                    .setLabel(role.label || guildRole.name)
                    .setStyle(ButtonStyle.Secondary);

                if (role.emoji) {
                    // Check if emoji is custom or unicode
                    if (role.emoji.includes(':')) {
                        const emojiMatch = role.emoji.match(/<a?:([^:]+):(\d+)>/);
                        if (emojiMatch) {
                            button.setEmoji({ id: emojiMatch[2], name: emojiMatch[1] });
                        }
                    } else {
                        button.setEmoji(role.emoji);
                    }
                }

                currentRow.addComponents(button);
                buttonsInRow++;
            }

            if (buttonsInRow > 0) {
                rows.push(currentRow);
            }

            components.push(...rows);

        } else if (this.style === 'select') {
            // Select menu style (max 25 options)
            const options = this.roles.slice(0, 25).map(role => {
                const guildRole = guild.roles.cache.get(role.id);
                if (!guildRole) return null;

                const option = {
                    label: role.label || guildRole.name,
                    value: role.id,
                    description: role.description ? role.description.substring(0, 100) : `Toggle ${guildRole.name} role`
                };

                if (role.emoji) {
                    if (role.emoji.includes(':')) {
                        const emojiMatch = role.emoji.match(/<a?:([^:]+):(\d+)>/);
                        if (emojiMatch) {
                            option.emoji = { id: emojiMatch[2], name: emojiMatch[1] };
                        }
                    } else {
                        option.emoji = role.emoji;
                    }
                }

                return option;
            }).filter(Boolean);

            if (options.length > 0) {
                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId(`rr_select_${this.id}`)
                    .setPlaceholder(`${musicIcons.beatsIcon} Choose your roles...`)
                    .addOptions(options);

                if (this.type === 'multiple') {
                    selectMenu.setMinValues(0).setMaxValues(Math.min(options.length, 25));
                } else if (this.type === 'limited') {
                    selectMenu.setMinValues(0).setMaxValues(Math.min(this.maxRoles, options.length));
                } else {
                    selectMenu.setMinValues(0).setMaxValues(1);
                }

                components.push(new ActionRowBuilder().addComponents(selectMenu));
            }
        }

        // Add management buttons for administrators
        const managementRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`rr_manage_${this.id}_edit`)
                    .setLabel('Edit Panel')
                    .setEmoji(musicIcons.beatsIcon)
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`rr_manage_${this.id}_stats`)
                    .setLabel('View Stats')
                    .setEmoji(musicIcons.pingIcon)
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`rr_manage_${this.id}_toggle`)
                    .setLabel(this.enabled ? 'Disable' : 'Enable')
                    .setEmoji(this.enabled ? musicIcons.pauseresumeIcon : musicIcons.play)
                    .setStyle(this.enabled ? ButtonStyle.Danger : ButtonStyle.Success)
            );

        components.push(managementRow);

        return components.slice(0, 5); // Discord limit of 5 action rows
    }

    async deploy(channel) {
        try {
            const embed = this.createEmbed(channel.guild);
            const components = this.createComponents(channel.guild);

            let message;
            if (this.messageId) {
                // Update existing message
                try {
                    message = await channel.messages.fetch(this.messageId);
                    await message.edit({ embeds: [embed], components: components });
                } catch (error) {
                    // Message not found, create new one
                    message = await channel.send({ embeds: [embed], components: components });
                    this.messageId = message.id;
                }
            } else {
                // Create new message
                message = await channel.send({ embeds: [embed], components: components });
                this.messageId = message.id;
            }

            this.channelId = channel.id;
            this.updatedAt = Date.now();

            return message;
        } catch (error) {
            console.error('❌ Error deploying reaction role panel:', error);
            throw error;
        }
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            description: this.description,
            type: this.type,
            maxRoles: this.maxRoles,
            cooldown: this.cooldown,
            roles: this.roles,
            style: this.style,
            color: this.color,
            thumbnail: this.thumbnail,
            footer: this.footer,
            requireRole: this.requireRole,
            excludeRole: this.excludeRole,
            channelId: this.channelId,
            messageId: this.messageId,
            enabled: this.enabled,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            stats: {
                uses: this.stats.uses,
                uniqueUsers: Array.from(this.stats.uniqueUsers)
            }
        };
    }

    static fromJSON(guildId, data) {
        const panel = new ReactionRolePanel(guildId, data);
        if (data.stats && data.stats.uniqueUsers) {
            panel.stats.uniqueUsers = new Set(data.stats.uniqueUsers);
        }
        return panel;
    }
}

// Panel management functions
function getGuildPanels(guildId) {
    if (!reactionRoles[guildId]) {
        reactionRoles[guildId] = { panels: {}, settings: {} };
    }
    
    const panels = {};
    for (const [panelId, panelData] of Object.entries(reactionRoles[guildId].panels || {})) {
        panels[panelId] = ReactionRolePanel.fromJSON(guildId, panelData);
    }
    
    return panels;
}

function savePanel(panel) {
    if (!reactionRoles[panel.guildId]) {
        reactionRoles[panel.guildId] = { panels: {}, settings: {} };
    }
    
    reactionRoles[panel.guildId].panels[panel.id] = panel.toJSON();
    saveConfig();
}

function deletePanel(guildId, panelId) {
    if (reactionRoles[guildId] && reactionRoles[guildId].panels) {
        delete reactionRoles[guildId].panels[panelId];
        saveConfig();
        return true;
    }
    return false;
}

function getGuildSettings(guildId) {
    if (!reactionRoles[guildId]) {
        reactionRoles[guildId] = { panels: {}, settings: {} };
    }
    
    return {
        maxPanelsPerGuild: 10,
        maxRolesPerPanel: 25,
        defaultCooldown: 3000,
        requireManageRoles: true,
        logChannel: null,
        ...reactionRoles[guildId].settings
    };
}

function updateGuildSettings(guildId, settings) {
    if (!reactionRoles[guildId]) {
        reactionRoles[guildId] = { panels: {}, settings: {} };
    }
    
    reactionRoles[guildId].settings = { ...reactionRoles[guildId].settings, ...settings };
    saveConfig();
}

// Statistics functions
function incrementPanelUse(guildId, panelId, userId) {
    const panels = getGuildPanels(guildId);
    const panel = panels[panelId];
    
    if (panel) {
        panel.stats.uses++;
        panel.stats.uniqueUsers.add(userId);
        savePanel(panel);
    }
}

function incrementRoleUse(guildId, panelId, roleId) {
    const panels = getGuildPanels(guildId);
    const panel = panels[panelId];
    
    if (panel) {
        const role = panel.roles.find(r => r.id === roleId);
        if (role) {
            role.uses = (role.uses || 0) + 1;
            savePanel(panel);
        }
    }
}

// Export all functions and classes
module.exports = {
    ReactionRolePanel,
    getGuildPanels,
    savePanel,
    deletePanel,
    getGuildSettings,
    updateGuildSettings,
    incrementPanelUse,
    incrementRoleUse,
    reactionRoles,
    saveConfig
};
