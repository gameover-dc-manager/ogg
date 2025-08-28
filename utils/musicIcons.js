
const musicIcons = {
    footerIcon: 'https://cdn.discordapp.com/emojis/865916418909536276.gif', 
    correctIcon: 'https://cdn.discordapp.com/emojis/820971058089820200.gif', 
    playerIcon: 'https://cdn.discordapp.com/emojis/992051186188435467.gif',
    pauseresumeIcon:'https://cdn.discordapp.com/emojis/982935235807313971.gif',
    loopIcon: 'https://cdn.discordapp.com/emojis/749272851529334795.gif',
    beatsIcon: 'https://cdn.discordapp.com/emojis/928310693416009828.gif',
    beats2Icon : 'https://cdn.discordapp.com/emojis/953413565400879165.gif',
    alertIcon : 'https://cdn.discordapp.com/emojis/996431685358981201.gif',
    skipIcon: 'https://cdn.discordapp.com/emojis/938388856095514654.gif',
    stopIcon: 'https://cdn.discordapp.com/emojis/1021628438441902100.gif',
    volumeIcon: 'https://cdn.discordapp.com/emojis/1040824501711159397.gif',
    playlistIcon : 'https://cdn.discordapp.com/emojis/1096444591982522498.gif',
    heartIcon : 'https://cdn.discordapp.com/emojis/900257798003240961.gif',
    pingIcon : 'https://cdn.discordapp.com/emojis/923089856752664576.gif',
    CheckmarkIcon: "https://cdn.discordapp.com/emojis/819446784647757834.gif",
    MusicIcon:"https://cdn.discordapp.com/emojis/763415718271385610.gif",
    
    // Additional standard emoji icons
    play: '▶️',
    pause: '⏸️',
    stop: '⏹️',
    skip: '⏭️',
    previous: '⏮️',
    shuffle: '🔀',
    repeat: '🔁',
    volume_up: '🔊',
    volume_down: '🔇',
    mute: '🔇',
    queue: '📋',
    loop: '🔄',
    lyrics: '🎵',
    clear: '🗑️',
    now_playing: '🎶',
    music_note: '🎵',
    headphones: '🎧',
    speaker: '🔊',
    microphone: '🎤',
    guitar: '🎸',
    piano: '🎹',
    trumpet: '🎺',
    violin: '🎻',
    drum: '🥁',
    musical_score: '🎼',
    cd: '💿',
    radio: '📻',
    sound_wave: '〰️'
};

function getRandomMusicIcon() {
    const icons = Object.values(musicIcons);
    return icons[Math.floor(Math.random() * icons.length)];
}

function getMusicEmoji(action) {
    return musicIcons[action] || musicIcons.music_note;
}

module.exports = {
    musicIcons,
    getRandomMusicIcon,
    getMusicEmoji
};
