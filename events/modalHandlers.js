
async function handleEditProfileModal(interaction) {
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;
    const key = `${guildId}_${userId}`;
    
    if (!interaction.client.userData) interaction.client.userData = {};
    if (!interaction.client.userData[key]) {
        interaction.client.userData[key] = {
            profile: { theme: '#0099FF', stats: { commandsUsed: 0 } }
        };
    }
    
    const userData = interaction.client.userData[key];
    
    const bio = interaction.fields.getTextInputValue('bio');
    const timezone = interaction.fields.getTextInputValue('timezone');
    const birthday = interaction.fields.getTextInputValue('birthday');

    if (bio) userData.bio = bio;
    if (timezone) {
        try {
            new Date().toLocaleString('en-US', { timeZone: timezone });
            userData.timezone = timezone;
        } catch (error) {
            console.log('Invalid timezone provided:', timezone);
        }
    }
    if (birthday) {
        const dateRegex = /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
        if (dateRegex.test(birthday)) {
            userData.birthday = birthday;
        }
    }

    await interaction.reply({ content: '✅ Your profile has been updated!', ephemeral: true });
}

async function handleThemeModal(interaction) {
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;
    const key = `${guildId}_${userId}`;
    const userData = interaction.client.userData[key];

    const color = interaction.fields.getTextInputValue('color');
    const hexRegex = /^#[0-9A-F]{6}$/i;

    if (hexRegex.test(color)) {
        userData.profile.theme = color;
        await interaction.reply({ content: `🎨 Your theme color has been updated to ${color}!`, ephemeral: true });
    } else {
        await interaction.reply({ content: '❌ Invalid color format. Please use hex format like #FF0000.', ephemeral: true });
    }
}

async function handleEditNoteModal(interaction) {
    const noteId = interaction.customId.split('_')[1];
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;
    const key = `${guildId}_${userId}`;
    const userData = interaction.client.userData[key];

    const title = interaction.fields.getTextInputValue('noteTitle');
    const content = interaction.fields.getTextInputValue('noteContent');

    const note = userData.notes?.find(n => n.id === parseInt(noteId));
    if (note) {
        note.title = title;
        note.content = content;
        note.timestamp = Date.now(); // Update timestamp
        await interaction.reply({ content: `✅ Note "${title}" updated successfully!`, ephemeral: true });
    } else {
        await interaction.reply({ content: '❌ Note not found.', ephemeral: true });
    }
}

module.exports = {
    handleEditProfileModal,
    handleThemeModal,
    handleEditNoteModal
};
