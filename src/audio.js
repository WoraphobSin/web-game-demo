const AUDIO_DIRECTORY = new URL("../assets/audio/", import.meta.url);
const MUSIC_TRACK = new URL("battle-theme-a.mp3", AUDIO_DIRECTORY).href;
const CUE_DEFINITIONS = {
  "guardian-fired-arrow": { filePrefix: "guardian-shot", variations: 2, volume: 0.12 },
  "guardian-fired-mage": { filePrefix: "impactBell_heavy", volume: 0.2 },
  "guardian-fired-stone": { filePrefix: "impactPunch_medium", volume: 0.17 },
  "enemy-defeated-goblin": { filePrefix: "impactSoft_medium", volume: 0.38 },
  "enemy-defeated-warg": { filePrefix: "impactSoft_heavy", volume: 0.4 },
  "enemy-defeated-brute": { filePrefix: "impactPunch_medium", volume: 0.42 },
  "enemy-defeated-boss": { filePrefix: "impactBell_heavy", volume: 0.46 },
  "guardian-upgraded": { filePrefix: "impactBell_heavy", volume: 0.42 },
  "life-lost": { filePrefix: "impactSoft_heavy", volume: 0.48 },
  "guardian-placed": { filePrefix: "impactSoft_medium", volume: 0.24 }
};

function createCuePlayers(filePrefix, variations = 5) {
  return Array.from({ length: variations }, (_, index) => {
    const filename = `${filePrefix}_${String(index).padStart(3, "0")}.ogg`;
    const player = new Audio(new URL(filename, AUDIO_DIRECTORY).href);
    player.preload = "auto";
    return player;
  });
}

export function createAudio() {
  const music = new Audio(MUSIC_TRACK);
  music.loop = true;
  music.preload = "auto";
  music.volume = 0.2;

  const cuePlayers = Object.fromEntries(
    Object.entries(CUE_DEFINITIONS).map(([cue, definition]) => [
      cue,
      { ...definition, players: createCuePlayers(definition.filePrefix, definition.variations), nextPlayer: 0 }
    ])
  );
  let musicPlayRequest = 0;
  let musicStarting = false;

  function reportPlaybackError(error, assetName) {
    if (error.name !== "NotAllowedError") {
      console.error(`Unable to play ${assetName}.`, error);
    }
  }

  function playCue(state, cue) {
    if (!state.soundEffectsEnabled) return;

    const definition = cuePlayers[cue];
    if (!definition) throw new Error(`Unknown audio cue: ${cue}`);

    let player;
    for (let attempt = 0; attempt < definition.players.length; attempt++) {
      const index = (definition.nextPlayer + attempt) % definition.players.length;
      if (definition.players[index].paused || definition.players[index].ended) {
        player = definition.players[index];
        definition.nextPlayer = (index + 1) % definition.players.length;
        break;
      }
    }
    if (!player) return;

    player.currentTime = 0;
    player.volume = definition.volume;
    player.playbackRate = cue.startsWith("guardian-fired-") ? state.speed : 1;
    player.play().catch((error) => reportPlaybackError(error, cue));
  }

  function syncMusic(state) {
    const shouldPlay = state.musicEnabled && state.started && !state.paused && !state.gameOver;
    if (!shouldPlay) {
      musicPlayRequest++;
      musicStarting = false;
      music.pause();
      return;
    }
    if (!music.paused || musicStarting) return;

    const request = ++musicPlayRequest;
    musicStarting = true;
    music.play().then(() => {
      if (request === musicPlayRequest) musicStarting = false;
    }).catch((error) => {
      if (request === musicPlayRequest) {
        musicStarting = false;
        reportPlaybackError(error, "background music");
      }
    });
  }

  return { playCue, syncMusic };
}
