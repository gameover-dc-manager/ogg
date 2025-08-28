
const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('creative')
        .setDescription('Creative and content generation tools')
        .addSubcommand(subcommand =>
            subcommand
                .setName('meme')
                .setDescription('Generate memes with templates')
                .addStringOption(option =>
                    option.setName('template')
                        .setDescription('Meme template to use')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Drake Pointing', value: 'drake' },
                            { name: 'Distracted Boyfriend', value: 'boyfriend' },
                            { name: 'Two Buttons', value: 'buttons' },
                            { name: 'Change My Mind', value: 'mind' },
                            { name: 'Expanding Brain', value: 'brain' },
                            { name: 'This is Fine', value: 'fine' },
                            { name: 'Woman Yelling at Cat', value: 'cat' },
                            { name: 'Surprised Pikachu', value: 'pikachu' }
                        ))
                .addStringOption(option =>
                    option.setName('top_text')
                        .setDescription('Top text for the meme')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('bottom_text')
                        .setDescription('Bottom text for the meme')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('textart')
                .setDescription('Generate ASCII art and fancy text')
                .addStringOption(option =>
                    option.setName('type')
                        .setDescription('Type of text art')
                        .setRequired(true)
                        .addChoices(
                            { name: 'ASCII Art', value: 'ascii' },
                            { name: 'Big Text', value: 'big' },
                            { name: 'Fancy Text', value: 'fancy' },
                            { name: 'Bubble Text', value: 'bubble' },
                            { name: 'Bold Text', value: 'bold' },
                            { name: 'Italic Text', value: 'italic' }
                        ))
                .addStringOption(option =>
                    option.setName('text')
                        .setDescription('Text to convert')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('color')
                .setDescription('Color palette and hex code tools')
                .addStringOption(option =>
                    option.setName('action')
                        .setDescription('Color action')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Generate Palette', value: 'palette' },
                            { name: 'Color Info', value: 'info' },
                            { name: 'Random Color', value: 'random' },
                            { name: 'Complementary Colors', value: 'complement' },
                            { name: 'Gradient Generator', value: 'gradient' }
                        ))
                .addStringOption(option =>
                    option.setName('color')
                        .setDescription('Base color (hex code like #FF0000)')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('theme')
                        .setDescription('Color palette theme')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Monochromatic', value: 'mono' },
                            { name: 'Analogous', value: 'analog' },
                            { name: 'Triadic', value: 'triadic' },
                            { name: 'Complementary', value: 'comp' },
                            { name: 'Split Complementary', value: 'split' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('image')
                .setDescription('Image manipulation and effects')
                .addStringOption(option =>
                    option.setName('effect')
                        .setDescription('Image effect to apply')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Placeholder Generator', value: 'placeholder' },
                            { name: 'QR Code', value: 'qr' },
                            { name: 'Gradient Image', value: 'gradient' },
                            { name: 'Pattern Generator', value: 'pattern' },
                            { name: 'Logo Placeholder', value: 'logo' }
                        ))
                .addStringOption(option =>
                    option.setName('text')
                        .setDescription('Text for the image')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('size')
                        .setDescription('Image size (e.g., 500x300)')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('color')
                        .setDescription('Primary color (hex without #)')
                        .setRequired(false))),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        try {
            switch (subcommand) {
                case 'meme':
                    await handleMeme(interaction);
                    break;
                case 'textart':
                    await handleTextArt(interaction);
                    break;
                case 'color':
                    await handleColor(interaction);
                    break;
                case 'image':
                    await handleImage(interaction);
                    break;
                default:
                    await interaction.reply({ content: '❌ Unknown subcommand.', ephemeral: true });
            }
        } catch (error) {
            console.error('Error in creative command:', error);
            const errorMessage = '❌ An error occurred while executing this command.';
            
            if (interaction.deferred) {
                await interaction.editReply({ content: errorMessage });
            } else if (!interaction.replied) {
                await interaction.reply({ content: errorMessage, ephemeral: true });
            }
        }
    }
};

async function handleMeme(interaction) {
    const template = interaction.options.getString('template');
    const topText = interaction.options.getString('top_text');
    const bottomText = interaction.options.getString('bottom_text') || '';

    // Meme template IDs for imgflip API
    const templates = {
        drake: '181913649',
        boyfriend: '112126428',
        buttons: '87743020',
        mind: '129242436',
        brain: '93895088',
        fine: '55311130',
        cat: '188390779',
        pikachu: '155067746'
    };

    const templateId = templates[template];
    if (!templateId) {
        return await interaction.reply({ content: '❌ Invalid meme template.', ephemeral: true });
    }

    try {
        // Using imgflip API (free tier)
        const memeUrl = `https://api.imgflip.com/caption_image?template_id=${templateId}&username=demo&password=demo&text0=${encodeURIComponent(topText)}&text1=${encodeURIComponent(bottomText)}`;
        
        const embed = new EmbedBuilder()
            .setTitle('🎭 Meme Generated!')
            .setColor('#FF6B6B')
            .addFields(
                { name: '📋 Template', value: template.charAt(0).toUpperCase() + template.slice(1), inline: true },
                { name: '📝 Top Text', value: topText.substring(0, 100), inline: true },
                { name: '📝 Bottom Text', value: bottomText ? bottomText.substring(0, 100) : 'None', inline: true }
            )
            .setDescription(`[View Meme](${memeUrl})`)
            .setImage(memeUrl)
            .setFooter({ text: 'Powered by Imgflip API' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    } catch (error) {
        console.error('Meme generation error:', error);
        await interaction.reply({ content: '❌ Failed to generate meme. Please try again.', ephemeral: true });
    }
}

async function handleTextArt(interaction) {
    const type = interaction.options.getString('type');
    const text = interaction.options.getString('text');

    if (text.length > 50) {
        return await interaction.reply({ content: '❌ Text is too long. Maximum 50 characters.', ephemeral: true });
    }

    let result = '';
    let title = '';

    switch (type) {
        case 'ascii':
            result = generateASCII(text);
            title = '🔤 ASCII Art';
            break;
        case 'big':
            result = generateBigText(text);
            title = '🔠 Big Text';
            break;
        case 'fancy':
            result = generateFancyText(text);
            title = '✨ Fancy Text';
            break;
        case 'bubble':
            result = generateBubbleText(text);
            title = '🫧 Bubble Text';
            break;
        case 'bold':
            result = generateBoldText(text);
            title = '🔤 Bold Text';
            break;
        case 'italic':
            result = generateItalicText(text);
            title = '🔤 Italic Text';
            break;
        default:
            return await interaction.reply({ content: '❌ Invalid text art type.', ephemeral: true });
    }

    const embed = new EmbedBuilder()
        .setTitle(title)
        .setColor('#4ECDC4')
        .addFields(
            { name: '📥 Input', value: `\`${text}\``, inline: true },
            { name: '📊 Length', value: `${text.length} characters`, inline: true },
            { name: '🎨 Style', value: type.charAt(0).toUpperCase() + type.slice(1), inline: true },
            { name: '📤 Output', value: `\`\`\`\n${result}\n\`\`\``, inline: false }
        )
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handleColor(interaction) {
    const action = interaction.options.getString('action');
    const colorInput = interaction.options.getString('color');
    const theme = interaction.options.getString('theme');

    switch (action) {
        case 'palette':
            await generateColorPalette(interaction, colorInput, theme);
            break;
        case 'info':
            await getColorInfo(interaction, colorInput);
            break;
        case 'random':
            await generateRandomColor(interaction);
            break;
        case 'complement':
            await getComplementaryColors(interaction, colorInput);
            break;
        case 'gradient':
            await generateGradient(interaction, colorInput);
            break;
        default:
            await interaction.reply({ content: '❌ Invalid color action.', ephemeral: true });
    }
}

async function handleImage(interaction) {
    const effect = interaction.options.getString('effect');
    const text = interaction.options.getString('text') || 'Sample Text';
    const size = interaction.options.getString('size') || '400x300';
    const color = interaction.options.getString('color') || '4ECDC4';

    let imageUrl = '';
    let title = '';
    let description = '';

    switch (effect) {
        case 'placeholder':
            imageUrl = `https://via.placeholder.com/${size}/${color}/FFFFFF?text=${encodeURIComponent(text)}`;
            title = '🖼️ Placeholder Image';
            description = `Generated placeholder image with custom text`;
            break;
        case 'qr':
            imageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(text)}`;
            title = '📱 QR Code';
            description = `QR code generated for: ${text}`;
            break;
        case 'gradient':
            imageUrl = `https://via.placeholder.com/${size}/${color}/FFFFFF?text=Gradient`;
            title = '🌈 Gradient Image';
            description = `Custom gradient image`;
            break;
        case 'pattern':
            imageUrl = `https://via.placeholder.com/${size}/${color}/FFFFFF?text=Pattern`;
            title = '🎨 Pattern Image';
            description = `Generated pattern image`;
            break;
        case 'logo':
            imageUrl = `https://via.placeholder.com/200x200/${color}/FFFFFF?text=LOGO`;
            title = '🏷️ Logo Placeholder';
            description = `Logo placeholder image`;
            break;
        default:
            return await interaction.reply({ content: '❌ Invalid image effect.', ephemeral: true });
    }

    const embed = new EmbedBuilder()
        .setTitle(title)
        .setColor(`#${color}`)
        .setDescription(description)
        .setImage(imageUrl)
        .addFields(
            { name: '📏 Size', value: size, inline: true },
            { name: '🎨 Color', value: `#${color}`, inline: true },
            { name: '📝 Text', value: text.substring(0, 50), inline: true }
        )
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

// Helper functions for text art generation
function generateASCII(text) {
    const chars = {
        'A': '  █  \n █ █ \n███ \n█   █\n█   █',
        'B': '███ \n█  █\n███ \n█  █\n███ ',
        'C': ' ███\n█   \n█   \n█   \n ███',
        // Add more letters as needed
    };
    
    return text.toUpperCase().split('').map(char => chars[char] || char).join('  ');
}

function generateBigText(text) {
    return text.split('').map(char => {
        return `🇦🇧🇨🇩🇪🇫🇬🇭🇮🇯🇰🇱🇲🇳🇴🇵🇶🇷🇸🇹🇺🇻🇼🇽🇾🇿`[char.toUpperCase().charCodeAt(0) - 65] || char;
    }).join(' ');
}

function generateFancyText(text) {
    const fancyMap = {
        'a': '𝒶', 'b': '𝒷', 'c': '𝒸', 'd': '𝒹', 'e': '𝑒', 'f': '𝒻', 'g': '𝑔', 'h': '𝒽',
        'i': '𝒾', 'j': '𝒿', 'k': '𝓀', 'l': '𝓁', 'm': '𝓂', 'n': '𝓃', 'o': '𝑜', 'p': '𝓅',
        'q': '𝓆', 'r': '𝓇', 's': '𝓈', 't': '𝓉', 'u': '𝓊', 'v': '𝓋', 'w': '𝓌', 'x': '𝓍',
        'y': '𝓎', 'z': '𝓏'
    };
    
    return text.toLowerCase().split('').map(char => fancyMap[char] || char).join('');
}

function generateBubbleText(text) {
    const bubbleMap = {
        'a': 'ⓐ', 'b': 'ⓑ', 'c': 'ⓒ', 'd': 'ⓓ', 'e': 'ⓔ', 'f': 'ⓕ', 'g': 'ⓖ', 'h': 'ⓗ',
        'i': 'ⓘ', 'j': 'ⓙ', 'k': 'ⓚ', 'l': 'ⓛ', 'm': 'ⓜ', 'n': 'ⓝ', 'o': 'ⓞ', 'p': 'ⓟ',
        'q': 'ⓠ', 'r': 'ⓡ', 's': 'ⓢ', 't': 'ⓣ', 'u': 'ⓤ', 'v': 'ⓥ', 'w': 'ⓦ', 'x': 'ⓧ',
        'y': 'ⓨ', 'z': 'ⓩ'
    };
    
    return text.toLowerCase().split('').map(char => bubbleMap[char] || char).join('');
}

function generateBoldText(text) {
    const boldMap = {
        'a': '𝐚', 'b': '𝐛', 'c': '𝐜', 'd': '𝐝', 'e': '𝐞', 'f': '𝐟', 'g': '𝐠', 'h': '𝐡',
        'i': '𝐢', 'j': '𝐣', 'k': '𝐤', 'l': '𝐥', 'm': '𝐦', 'n': '𝐧', 'o': '𝐨', 'p': '𝐩',
        'q': '𝐪', 'r': '𝐫', 's': '𝐬', 't': '𝐭', 'u': '𝐮', 'v': '𝐯', 'w': '𝐰', 'x': '𝐱',
        'y': '𝐲', 'z': '𝐳'
    };
    
    return text.toLowerCase().split('').map(char => boldMap[char] || char).join('');
}

function generateItalicText(text) {
    const italicMap = {
        'a': '𝑎', 'b': '𝑏', 'c': '𝑐', 'd': '𝑑', 'e': '𝑒', 'f': '𝑓', 'g': '𝑔', 'h': 'ℎ',
        'i': '𝑖', 'j': '𝑗', 'k': '𝑘', 'l': '𝑙', 'm': '𝑚', 'n': '𝑛', 'o': '𝑜', 'p': '𝑝',
        'q': '𝑞', 'r': '𝑟', 's': '𝑠', 't': '𝑡', 'u': '𝑢', 'v': '𝑣', 'w': '𝑤', 'x': '𝑥',
        'y': '𝑦', 'z': '𝑧'
    };
    
    return text.toLowerCase().split('').map(char => italicMap[char] || char).join('');
}

// Color helper functions
async function generateColorPalette(interaction, baseColor, theme) {
    const color = baseColor || generateRandomHexColor();
    const cleanColor = color.replace('#', '');
    
    if (!/^[0-9A-F]{6}$/i.test(cleanColor)) {
        return await interaction.reply({ content: '❌ Invalid hex color format. Use #RRGGBB', ephemeral: true });
    }

    const palette = generatePalette(cleanColor, theme || 'mono');
    const paletteUrl = `https://coolors.co/${palette.join('-')}`;

    const embed = new EmbedBuilder()
        .setTitle('🎨 Color Palette')
        .setColor(`#${cleanColor}`)
        .setDescription(`**Theme:** ${theme || 'Monochromatic'}\n**Base Color:** #${cleanColor}`)
        .addFields(
            ...palette.map((color, index) => ({
                name: `Color ${index + 1}`,
                value: `#${color}`,
                inline: true
            }))
        )
        .setImage(`https://via.placeholder.com/600x100/${palette.join('/')}?text=Color+Palette`)
        .setFooter({ text: `View on Coolors: ${paletteUrl}` })
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function getColorInfo(interaction, colorInput) {
    if (!colorInput) {
        return await interaction.reply({ content: '❌ Please provide a hex color code.', ephemeral: true });
    }

    const color = colorInput.replace('#', '');
    if (!/^[0-9A-F]{6}$/i.test(color)) {
        return await interaction.reply({ content: '❌ Invalid hex color format. Use #RRGGBB', ephemeral: true });
    }

    const rgb = hexToRgb(color);
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    const complement = getComplementColor(color);

    const embed = new EmbedBuilder()
        .setTitle('🎨 Color Information')
        .setColor(`#${color}`)
        .setThumbnail(`https://via.placeholder.com/200x200/${color}/${color}`)
        .addFields(
            { name: '🎯 Hex', value: `#${color.toUpperCase()}`, inline: true },
            { name: '🔴 RGB', value: `${rgb.r}, ${rgb.g}, ${rgb.b}`, inline: true },
            { name: '🌈 HSL', value: `${hsl.h}°, ${hsl.s}%, ${hsl.l}%`, inline: true },
            { name: '🔄 Complement', value: `#${complement}`, inline: true },
            { name: '📊 Brightness', value: `${Math.round((rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000)}`, inline: true },
            { name: '🎨 Type', value: isLightColor(color) ? 'Light' : 'Dark', inline: true }
        )
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function generateRandomColor(interaction) {
    const color = generateRandomHexColor();
    const rgb = hexToRgb(color);
    
    const embed = new EmbedBuilder()
        .setTitle('🎲 Random Color')
        .setColor(`#${color}`)
        .setThumbnail(`https://via.placeholder.com/200x200/${color}/${color}`)
        .addFields(
            { name: '🎯 Hex', value: `#${color}`, inline: true },
            { name: '🔴 RGB', value: `${rgb.r}, ${rgb.g}, ${rgb.b}`, inline: true },
            { name: '🎨 Type', value: isLightColor(color) ? 'Light' : 'Dark', inline: true }
        )
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function getComplementaryColors(interaction, colorInput) {
    if (!colorInput) {
        return await interaction.reply({ content: '❌ Please provide a hex color code.', ephemeral: true });
    }

    const color = colorInput.replace('#', '');
    if (!/^[0-9A-F]{6}$/i.test(color)) {
        return await interaction.reply({ content: '❌ Invalid hex color format. Use #RRGGBB', ephemeral: true });
    }

    const complement = getComplementColor(color);
    const analogous = getAnalogousColors(color);

    const embed = new EmbedBuilder()
        .setTitle('🔄 Complementary Colors')
        .setColor(`#${color}`)
        .addFields(
            { name: '🎯 Base Color', value: `#${color}`, inline: true },
            { name: '🔄 Complement', value: `#${complement}`, inline: true },
            { name: '🎨 Analogous 1', value: `#${analogous[0]}`, inline: true },
            { name: '🎨 Analogous 2', value: `#${analogous[1]}`, inline: true },
            { name: '⚡ Split Complement 1', value: `#${getSplitComplementColors(color)[0]}`, inline: true },
            { name: '⚡ Split Complement 2', value: `#${getSplitComplementColors(color)[1]}`, inline: true }
        )
        .setImage(`https://via.placeholder.com/600x100/${color}/${complement}/${analogous[0]}/${analogous[1]}?text=Color+Harmony`)
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function generateGradient(interaction, colorInput) {
    const color1 = colorInput ? colorInput.replace('#', '') : generateRandomHexColor();
    const color2 = generateRandomHexColor();

    const embed = new EmbedBuilder()
        .setTitle('🌈 Gradient Generator')
        .setColor(`#${color1}`)
        .addFields(
            { name: '🎨 Start Color', value: `#${color1}`, inline: true },
            { name: '🎨 End Color', value: `#${color2}`, inline: true },
            { name: '📏 Direction', value: 'Horizontal', inline: true }
        )
        .setImage(`https://via.placeholder.com/600x200/${color1}/${color2}?text=Gradient`)
        .setDescription(`CSS: \`linear-gradient(90deg, #${color1}, #${color2})\``)
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

// Utility functions
function generateRandomHexColor() {
    return Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
}

function hexToRgb(hex) {
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return { r, g, b };
}

function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
        h = s = 0;
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    return {
        h: Math.round(h * 360),
        s: Math.round(s * 100),
        l: Math.round(l * 100)
    };
}

function getComplementColor(hex) {
    const rgb = hexToRgb(hex);
    const comp = {
        r: 255 - rgb.r,
        g: 255 - rgb.g,
        b: 255 - rgb.b
    };
    return ((1 << 24) + (comp.r << 16) + (comp.g << 8) + comp.b).toString(16).slice(1);
}

function getAnalogousColors(hex) {
    const hsl = rgbToHsl(...Object.values(hexToRgb(hex)));
    const analog1 = hslToHex((hsl.h + 30) % 360, hsl.s, hsl.l);
    const analog2 = hslToHex((hsl.h - 30 + 360) % 360, hsl.s, hsl.l);
    return [analog1, analog2];
}

function getSplitComplementColors(hex) {
    const hsl = rgbToHsl(...Object.values(hexToRgb(hex)));
    const split1 = hslToHex((hsl.h + 150) % 360, hsl.s, hsl.l);
    const split2 = hslToHex((hsl.h + 210) % 360, hsl.s, hsl.l);
    return [split1, split2];
}

function hslToHex(h, s, l) {
    l /= 100; s /= 100;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l - c/2;
    let r = 0, g = 0, b = 0;

    if (0 <= h && h < 60) { r = c; g = x; b = 0; }
    else if (60 <= h && h < 120) { r = x; g = c; b = 0; }
    else if (120 <= h && h < 180) { r = 0; g = c; b = x; }
    else if (180 <= h && h < 240) { r = 0; g = x; b = c; }
    else if (240 <= h && h < 300) { r = x; g = 0; b = c; }
    else if (300 <= h && h < 360) { r = c; g = 0; b = x; }

    r = Math.round((r + m) * 255);
    g = Math.round((g + m) * 255);
    b = Math.round((b + m) * 255);

    return ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function generatePalette(baseColor, theme) {
    const colors = [baseColor];
    const hsl = rgbToHsl(...Object.values(hexToRgb(baseColor)));

    switch (theme) {
        case 'mono':
            for (let i = 1; i < 5; i++) {
                colors.push(hslToHex(hsl.h, hsl.s, Math.max(10, Math.min(90, hsl.l + (i * 15)))));
            }
            break;
        case 'analog':
            for (let i = 1; i < 5; i++) {
                colors.push(hslToHex((hsl.h + (i * 30)) % 360, hsl.s, hsl.l));
            }
            break;
        case 'triadic':
            colors.push(hslToHex((hsl.h + 120) % 360, hsl.s, hsl.l));
            colors.push(hslToHex((hsl.h + 240) % 360, hsl.s, hsl.l));
            break;
        default:
            colors.push(getComplementColor(baseColor));
            break;
    }

    return colors.slice(0, 5);
}

function isLightColor(hex) {
    const rgb = hexToRgb(hex);
    const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
    return brightness > 128;
}
