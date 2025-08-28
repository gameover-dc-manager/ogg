
const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder
} = require('discord.js');
const { getModLogChannel } = require('../utils/helpers');

// Debounce to prevent duplicate executions
const processedInteractions = new Set();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('submit')
    .setDescription('Submit a report, suggestion, problem, or other')
    .addStringOption(opt =>
      opt.setName('type')
         .setDescription('What kind of submission is this?')
         .setRequired(true)
         .addChoices(
           { name: '🚨 Report (User/Rule Violation)', value: 'report' },
           { name: '💡 Suggestion (Feature/Improvement)', value: 'suggestion' },
           { name: '🐛 Bug Report (Technical Issue)', value: 'bug' },
           { name: '❓ Question (General Inquiry)', value: 'question' },
           { name: '💬 Feedback (General Feedback)', value: 'feedback' },
           { name: '🎯 Feature Request', value: 'feature' },
           { name: '📋 Other', value: 'other' },
         )
    )
    .addStringOption(opt =>
      opt.setName('title')
         .setDescription('Brief title for your submission')
         .setRequired(true)
         .setMaxLength(100)
    )
    .addStringOption(opt =>
      opt.setName('content')
         .setDescription('Detailed description of your submission')
         .setRequired(true)
         .setMaxLength(1000)
    )
    .addStringOption(opt =>
      opt.setName('priority')
         .setDescription('How urgent is this submission?')
         .setRequired(false)
         .addChoices(
           { name: '🔴 High Priority', value: 'high' },
           { name: '🟡 Medium Priority', value: 'medium' },
           { name: '🟢 Low Priority', value: 'low' }
         )
    )
    .addAttachmentOption(opt =>
      opt.setName('attachment')
         .setDescription('Optional: Attach a screenshot or file')
         .setRequired(false)
    )
    .addBooleanOption(opt =>
      opt.setName('anonymous')
         .setDescription('Submit anonymously (hides your identity from moderators)')
         .setRequired(false)
    ),

  async execute(interaction) {
    // Skip if already processed
    if (processedInteractions.has(interaction.id)) return;
    processedInteractions.add(interaction.id);
    setTimeout(() => processedInteractions.delete(interaction.id), 10000);

    try {
      const type = interaction.options.getString('type');
      const title = interaction.options.getString('title');
      const content = interaction.options.getString('content');
      const priority = interaction.options.getString('priority') || 'medium';
      const attachment = interaction.options.getAttachment('attachment');
      const isAnonymous = interaction.options.getBoolean('anonymous') || false;

      // Generate unique submission ID
      const submissionId = `SUB-${Date.now().toString(36).toUpperCase()}`;

      // Store submission data
      if (!interaction.client.submissions) {
        interaction.client.submissions = {};
      }
      
      interaction.client.submissions[submissionId] = {
        id: submissionId,
        type: type,
        title: title,
        content: content,
        priority: priority,
        user: interaction.user.id,
        guild: interaction.guild.id,
        status: 'pending',
        timestamp: Date.now(),
        attachment: attachment ? attachment.url : null,
        anonymous: isAnonymous,
        userTag: interaction.user.tag // Store for internal tracking
      };

      // Save submissions to file
      global.saveSubmissions = () => {
        const fs = require('fs');
        fs.writeFileSync('./config/submissions.json', JSON.stringify(interaction.client.submissions, null, 2));
      };
      global.saveSubmissions();

      // Color coding based on type and priority
      let color = '#0099FF';
      if (type === 'report') color = '#FF0000';
      else if (type === 'bug') color = '#FF6600';
      else if (type === 'suggestion') color = '#00FF00';
      else if (priority === 'high') color = '#FF3333';

      // Build the enhanced embed
      const embed = new EmbedBuilder()
        .setTitle(`📋 New ${type.charAt(0).toUpperCase() + type.slice(1)} Submission${isAnonymous ? ' (Anonymous)' : ''}`)
        .setDescription(`**${title}**`)
        .addFields(
          { name: '📝 Description', value: content, inline: false },
          { name: '📊 Type', value: type.charAt(0).toUpperCase() + type.slice(1), inline: true },
          { name: '⚡ Priority', value: priority.charAt(0).toUpperCase() + priority.slice(1), inline: true },
          { name: '🆔 ID', value: submissionId, inline: true },
          { name: '📅 Submitted', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true },
          { name: '👤 User', value: isAnonymous ? '🕵️ Anonymous User' : `${interaction.user.tag} (${interaction.user.id})`, inline: true },
          { name: '🏷️ Status', value: '⏳ Pending Review', inline: true }
        )
        .setAuthor({ 
          name: isAnonymous ? 'Anonymous User' : interaction.user.tag, 
          iconURL: isAnonymous ? 'https://cdn.discordapp.com/embed/avatars/0.png' : interaction.user.displayAvatarURL() 
        })
        .setColor(color)
        .setTimestamp()
        .setFooter({ text: `Submission ID: ${submissionId}${isAnonymous ? ' • Anonymous' : ''}` });

      if (attachment) {
        embed.addFields({ name: '📎 Attachment', value: `[View File](${attachment.url})`, inline: true });
        if (attachment.contentType && attachment.contentType.startsWith('image/')) {
          embed.setImage(attachment.url);
        }
      }

      // Enhanced management buttons
      const actionRow1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`submission_approve_${submissionId}`)
          .setLabel('✅ Approve')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`submission_reject_${submissionId}`)
          .setLabel('❌ Reject')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId(`submission_feedback_${submissionId}`)
          .setLabel('💬 Send Feedback')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`submission_inprogress_${submissionId}`)
          .setLabel('🔄 In Progress')
          .setStyle(ButtonStyle.Secondary)
      );

      // Add reveal identity button for anonymous submissions
      if (isAnonymous) {
        actionRow1.addComponents(
          new ButtonBuilder()
            .setCustomId(`submission_reveal_${submissionId}`)
            .setLabel('🕵️ Reveal Identity')
            .setStyle(ButtonStyle.Danger)
        );
      }

      const statusMenu = new StringSelectMenuBuilder()
        .setCustomId(`submission_status_${submissionId}`)
        .setPlaceholder('Change submission status...')
        .addOptions([
          { label: 'Pending Review', value: 'pending', emoji: '⏳' },
          { label: 'Under Review', value: 'reviewing', emoji: '👀' },
          { label: 'In Progress', value: 'inprogress', emoji: '🔄' },
          { label: 'Completed', value: 'completed', emoji: '✅' },
          { label: 'Rejected', value: 'rejected', emoji: '❌' },
          { label: 'Need More Info', value: 'moreinfo', emoji: '❓' }
        ]);

      const actionRow2 = new ActionRowBuilder().addComponents(statusMenu);

      // Send to mod‐log
      const logChannel = getModLogChannel(interaction.guild);
      if (logChannel) {
        await logChannel.send({ embeds: [embed], components: [actionRow1, actionRow2] });
      } else {
        console.warn(`No mod‐log channel set for guild ${interaction.guild.id}`);
      }

      // Enhanced user confirmation
      const userEmbed = new EmbedBuilder()
        .setTitle('✅ Submission Received!')
        .setDescription(`Your **${type}** submission has been successfully sent to our team.${isAnonymous ? '\n🕵️ **Your identity is hidden from moderators.**' : ''}`)
        .addFields(
          { name: '🆔 Submission ID', value: submissionId, inline: true },
          { name: '📋 Title', value: title, inline: true },
          { name: '⏰ Status', value: 'Pending Review', inline: true },
          { name: '🔒 Privacy', value: isAnonymous ? '🕵️ Anonymous' : '👤 Identified', inline: true },
          { name: '📧 Next Steps', value: isAnonymous ? 'Updates will be sent anonymously if needed.' : 'You will receive a DM when there are updates on your submission.', inline: false }
        )
        .setColor('#00FF00')
        .setTimestamp()
        .setFooter({ text: `Keep your submission ID for reference!${isAnonymous ? ' • Anonymous submission' : ''}` });

      await interaction.reply({
        embeds: [userEmbed],
        ephemeral: true
      });

    } catch (err) {
      console.error('Error in /submit command:', err);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: '❌ Oops! There was an error processing your submission. Please try again.',
          ephemeral: true
        });
      }
    }
  },
};
