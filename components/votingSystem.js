
const fs = require('fs');
const path = require('path');

const votingDir = path.join(__dirname, '../config');
const pollsFile = path.join(votingDir, 'polls.json');

if (!fs.existsSync(votingDir)) {
    fs.mkdirSync(votingDir, { recursive: true });
}

function generatePollId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

function loadPolls() {
    try {
        if (!fs.existsSync(pollsFile)) {
            return {};
        }
        const data = fs.readFileSync(pollsFile, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('❌ Error loading polls:', error);
        return {};
    }
}

function savePolls(polls) {
    try {
        fs.writeFileSync(pollsFile, JSON.stringify(polls, null, 2));
        return true;
    } catch (error) {
        console.error('❌ Error saving polls:', error);
        return false;
    }
}

async function createPoll(guildId, creatorId, title, description, type, options, duration, anonymous, multipleChoice) {
    const polls = loadPolls();
    const pollId = generatePollId();
    const now = Date.now();
    
    const poll = {
        id: pollId,
        guildId,
        creatorId,
        title,
        description,
        type,
        options: options.map((option, index) => ({
            id: index,
            text: option.trim(),
            votes: 0,
            voters: []
        })),
        anonymous,
        multipleChoice,
        active: true,
        createdAt: now,
        endTime: duration > 0 ? now + (duration * 60 * 60 * 1000) : null,
        voters: [],
        messageId: null
    };

    if (!polls[guildId]) {
        polls[guildId] = [];
    }

    polls[guildId].push(poll);
    savePolls(polls);

    console.log(`✅ Poll ${pollId} created in guild ${guildId}`);
    return { success: true, poll };
}

async function vote(guildId, pollId, userId, optionIds) {
    const polls = loadPolls();
    
    if (!polls[guildId]) {
        return { success: false, message: 'No polls found for this server.' };
    }

    const pollIndex = polls[guildId].findIndex(p => p.id === pollId);
    if (pollIndex === -1) {
        return { success: false, message: 'Poll not found.' };
    }

    const poll = polls[guildId][pollIndex];

    if (!poll.active) {
        return { success: false, message: 'This poll is no longer active.' };
    }

    if (poll.endTime && Date.now() > poll.endTime) {
        poll.active = false;
        savePolls(polls);
        return { success: false, message: 'This poll has ended.' };
    }

    // Check if user already voted
    if (poll.voters.includes(userId) && !poll.multipleChoice) {
        return { success: false, message: 'You have already voted in this poll.' };
    }

    // Validate option IDs
    const validOptionIds = optionIds.filter(id => id >= 0 && id < poll.options.length);
    if (validOptionIds.length === 0) {
        return { success: false, message: 'Invalid option selected.' };
    }

    // If not multiple choice, only allow one selection
    if (!poll.multipleChoice && validOptionIds.length > 1) {
        return { success: false, message: 'You can only select one option.' };
    }

    // Remove previous votes if user voted before (for multiple choice polls)
    if (poll.voters.includes(userId)) {
        poll.options.forEach(option => {
            const voterIndex = option.voters.indexOf(userId);
            if (voterIndex > -1) {
                option.voters.splice(voterIndex, 1);
                option.votes--;
            }
        });
    }

    // Add new votes
    validOptionIds.forEach(optionId => {
        poll.options[optionId].voters.push(userId);
        poll.options[optionId].votes++;
    });

    if (!poll.voters.includes(userId)) {
        poll.voters.push(userId);
    }

    savePolls(polls);

    console.log(`✅ User ${userId} voted in poll ${pollId}`);
    return { success: true, poll: polls[guildId][pollIndex] };
}

async function endPoll(guildId, pollId, moderatorId) {
    const polls = loadPolls();
    
    if (!polls[guildId]) {
        return { success: false, message: 'No polls found for this server.' };
    }

    const pollIndex = polls[guildId].findIndex(p => p.id === pollId);
    if (pollIndex === -1) {
        return { success: false, message: 'Poll not found.' };
    }

    const poll = polls[guildId][pollIndex];

    if (!poll.active) {
        return { success: false, message: 'This poll is already ended.' };
    }

    poll.active = false;
    poll.endedBy = moderatorId;
    poll.endedAt = Date.now();

    savePolls(polls);

    console.log(`✅ Poll ${pollId} ended by ${moderatorId}`);
    return { success: true, poll };
}

async function getPollResults(guildId, pollId) {
    const polls = loadPolls();
    
    if (!polls[guildId]) {
        return { success: false, message: 'No polls found for this server.' };
    }

    const poll = polls[guildId].find(p => p.id === pollId);
    if (!poll) {
        return { success: false, message: 'Poll not found.' };
    }

    const totalVotes = poll.options.reduce((sum, option) => sum + option.votes, 0);
    
    const results = {
        totalVotes,
        options: poll.options.map(option => ({
            text: option.text,
            votes: option.votes,
            percentage: totalVotes > 0 ? ((option.votes / totalVotes) * 100).toFixed(1) : '0.0'
        }))
    };

    return { success: true, poll, results };
}

async function getActivePolls(guildId) {
    const polls = loadPolls();
    
    if (!polls[guildId]) {
        return [];
    }

    // Clean up expired polls
    const now = Date.now();
    polls[guildId].forEach(poll => {
        if (poll.active && poll.endTime && now > poll.endTime) {
            poll.active = false;
        }
    });

    savePolls(polls);

    return polls[guildId].filter(poll => poll.active);
}

async function getPoll(guildId, pollId) {
    const polls = loadPolls();
    
    if (!polls[guildId]) {
        return null;
    }

    return polls[guildId].find(p => p.id === pollId) || null;
}

module.exports = {
    createPoll,
    vote,
    endPoll,
    getPollResults,
    getActivePolls,
    getPoll,
    loadPolls,
    savePolls
};
