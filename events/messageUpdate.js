const { Events, EmbedBuilder } = require('discord.js');
const { 
    URL_REGEX, 
    INVITE_REGEX, 
    KEYWORD_REGEX, 
    PARTIAL_REGEX,
    isAdultSite,
    isWhitelistedUrl,
    isAdultInvite,
    handleViolation,
    detectBypassAttempts,
    detectSuspiciousFormatting,
    calculateSuspicionScore,
    getModLogChannel
} = require('../utils/helpers');
const { loadBlockedWordsConfig, getSeverityLevel } = require('../commands/blockedwords');
const { loadBlockedDomainsConfig, getDomainSeverity, extractDomain } = require('../commands/blockeddomains');
const { addWarning, processAutoEscalation } = require('../components/warningSystem');
const { logAction } = require('../utils/loggingSystem');
const { storeEditedMessage } = require('../components/messageSniper');

module.exports = {
    name: Events.MessageUpdate,
    async execute(oldMessage, newMessage) {
        console.log(`🔄 Message update event triggered for message ${newMessage.id}`);

        try {
            // Basic validation checks
            if (oldMessage.partial || newMessage.partial || newMessage.author.bot) {
                console.log(`⏭️ Skipping message update: partial=${oldMessage.partial || newMessage.partial}, bot=${newMessage.author.bot}`);
                return;
            }

            if (!newMessage.guild) {
                console.log(`⏭️ Skipping DM message update`);
                return;
            }

            if (oldMessage.content === newMessage.content) {
                console.log(`⏭️ Skipping message update: content unchanged`);
                return;
            }

            const oldContent = oldMessage.content || '';
            const newContent = newMessage.content;

            console.log(`📝 Processing message edit from ${newMessage.author.tag} (${newMessage.author.id})`);
            console.log(`📝 Old content: "${oldContent.substring(0, 100)}${oldContent.length > 100 ? '...' : ''}"`);
            console.log(`📝 New content: "${newContent.substring(0, 100)}${newContent.length > 100 ? '...' : ''}"`);

            // Store message for edit sniping
            storeEditedMessage(oldMessage, newMessage);

            // PRIORITY 1: Log the message edit FIRST before any processing
            try {
                console.log(`📊 Attempting to log message edit...`);
                const logResult = await logAction(newMessage.guild, 'message_edit', {
                    author: newMessage.author,
                    channel: newMessage.channel,
                    messageId: newMessage.id,
                    messageUrl: `https://discord.com/channels/${newMessage.guild.id}/${newMessage.channel.id}/${newMessage.id}`,
                    oldContent: oldContent,
                    newContent: newContent
                }, newMessage.author);

                if (logResult) {
                    console.log(`✅ Successfully logged message edit for ${newMessage.author.tag}`);
                } else {
                    console.log(`❌ Failed to log message edit for ${newMessage.author.tag} - logAction returned false`);
                }
            } catch (error) {
                console.error(`❌ Error logging message edit for ${newMessage.author.tag}:`, error);
            }

            // Continue with auto-moderation processing
            const config = newMessage.client.config;
            const allowedLinkChannel = config.allowed_link_channel;
            const isAdmin = newMessage.member && newMessage.member.permissions.has('Administrator');

            console.log(`[AUTO-MOD] Processing edit from ${newMessage.author.tag} - Admin: ${isAdmin}`);

            // Load configurations
            const blockedWordsConfig = loadBlockedWordsConfig();
            const blockedDomainsConfig = loadBlockedDomainsConfig();

            // Enhanced security analysis
            const suspicionScore = calculateSuspicionScore(newContent, newMessage.author);
            const hasBypassAttempt = detectBypassAttempts(newContent);
            const hasSuspiciousFormatting = detectSuspiciousFormatting(newContent);

            console.log(`[SECURITY] Edit Analysis - User: ${newMessage.author.tag}, Suspicion Score: ${suspicionScore}, Bypass: ${hasBypassAttempt}, Suspicious Format: ${hasSuspiciousFormatting}`);

            // Rest of auto-moderation logic (only for non-admins)
            if (!isAdmin) {
                // Check blocked words
                if (blockedWordsConfig.enabled) {
                    const words = newContent.toLowerCase().split(/\s+/);
                    let blockedWordFound = null;
                    let wordSeverity = 'minor';

                    for (const word of words) {
                        const cleanWord = word.replace(/[^\w]/g, '');
                        if (blockedWordsConfig.whitelist.includes(cleanWord)) continue;

                        if (blockedWordsConfig.blocked_words.includes(cleanWord)) {
                            blockedWordFound = cleanWord;
                            wordSeverity = getSeverityLevel(cleanWord, blockedWordsConfig);
                            break;
                        }
                    }

                    if (blockedWordFound) {
                        console.log(`[BLOCKED-WORDS] Blocked word "${blockedWordFound}" (${wordSeverity}) detected in edit`);
                        try {
                            await newMessage.delete();
                            if (blockedWordsConfig.auto_warn) {
                                const warning = await addWarning(
                                    newMessage.guild.id,
                                    newMessage.author.id,
                                    `Used blocked word in message edit: "${blockedWordFound}"`,
                                    newMessage.client.user.id,
                                    wordSeverity,
                                    0,
                                    newMessage.client
                                );

                                if (blockedWordsConfig.auto_escalation) {
                                    await processAutoEscalation(newMessage.guild, newMessage.author, newMessage.member);
                                }
                            }
                            await newMessage.channel.send({
                                content: `${newMessage.author}, your edited message contained a blocked word and has been removed. ${blockedWordsConfig.auto_warn ? 'You have been issued a warning.' : ''}`,
                                allowedMentions: { users: [newMessage.author.id] }
                            });
                        } catch (error) {
                            console.error('❌ Error handling blocked word violation in edit:', error);
                        }
                        return;
                    }
                }

                // Check blocked keywords
                if (KEYWORD_REGEX.test(newContent) || PARTIAL_REGEX.test(newContent)) {
                    console.log(`[AUTO-MOD] Blocked keyword detected in edit from ${newMessage.author.tag}`);
                    await handleViolation(newMessage, 'blocked_keyword', true);
                    return;
                }

                // Check bypass attempts
                if (hasBypassAttempt) {
                    console.log(`[SECURITY] Bypass attempt detected in edit from ${newMessage.author.tag}`);
                    await handleViolation(newMessage, 'bypass_attempt', true);
                    return;
                }

                // Check suspicious formatting
                if (hasSuspiciousFormatting) {
                    console.log(`[SECURITY] Suspicious formatting detected in edit from ${newMessage.author.tag}`);
                    await handleViolation(newMessage, 'suspicious_formatting', suspicionScore >= 15);
                    return;
                }

                // High threat detection
                if (suspicionScore >= 25) {
                    console.log(`[SECURITY] High threat score (${suspicionScore}) detected in edit`);
                    await handleViolation(newMessage, 'high_threat', true);
                    return;
                }

                // Check URLs and domains
                const urls = newContent.match(URL_REGEX) || [];
                if (urls.length > 0) {
                    if (blockedDomainsConfig.enabled) {
                        const isAllowedChannel = blockedDomainsConfig.allowed_channels.includes(newMessage.channel.id);

                        if (!isAllowedChannel) {
                            for (const url of urls) {
                                const domain = extractDomain(url);
                                if (!domain || blockedDomainsConfig.whitelist.includes(domain)) continue;

                                if (blockedDomainsConfig.blocked_domains.includes(domain)) {
                                    const domainSeverity = getDomainSeverity(domain, blockedDomainsConfig);
                                    console.log(`[BLOCKED-DOMAINS] Blocked domain "${domain}" (${domainSeverity}) detected in edit`);

                                    try {
                                        if (blockedDomainsConfig.delete_messages) {
                                            await newMessage.delete();
                                        }
                                        if (blockedDomainsConfig.auto_warn) {
                                            const warning = await addWarning(
                                                newMessage.guild.id,
                                                newMessage.author.id,
                                                `Posted blocked domain in message edit: "${domain}"`,
                                                newMessage.client.user.id,
                                                domainSeverity,
                                                0,
                                                newMessage.client
                                            );

                                            if (blockedDomainsConfig.auto_escalation) {
                                                await processAutoEscalation(newMessage.guild, newMessage.author, newMessage.member);
                                            }
                                        }
                                        await newMessage.channel.send({
                                            content: `${newMessage.author}, your edited message contained a blocked domain and has been ${blockedDomainsConfig.delete_messages ? 'removed' : 'flagged'}. ${blockedDomainsConfig.auto_warn ? 'You have been issued a warning.' : ''}`,
                                            allowedMentions: { users: [newMessage.author.id] }
                                        });
                                    } catch (error) {
                                        console.error('❌ Error handling blocked domain violation in edit:', error);
                                    }
                                    return;
                                }
                            }
                        }
                    }

                    // Check for adult sites
                    if (allowedLinkChannel && newMessage.channel.id !== allowedLinkChannel) {
                        for (const url of urls) {
                            if (!isWhitelistedUrl(url) && isAdultSite(url)) {
                                await handleViolation(newMessage, 'adult_site');
                                return;
                            }
                        }
                    }
                }

                // Check Discord invites
                const invites = newContent.match(INVITE_REGEX) || [];
                if (invites.length > 0) {
                    for (const match of invites) {
                        const code = match.split('/').pop();
                        if (await isAdultInvite(newMessage.client, code)) {
                            await handleViolation(newMessage, 'adult_invite');
                            return;
                        }
                    }
                }
            } else {
                console.log(`[AUTO-MOD] Admin bypass - skipping auto-moderation for ${newMessage.author.tag}`);
            }

        } catch (error) {
            console.error('❌ Error processing message edit:', error);
        }
    }
};