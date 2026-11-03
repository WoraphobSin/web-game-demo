const AUDIO_DIRECTORY = new URL("../assets/audio/", import.meta.url);
const MUSIC_TRACK = new URL("battle-theme-a.mp3", AUDIO_DIRECTORY).href;
const CUE_DEFINITIONS = {
  "enemy-defeated": { filePrefix: "impactPunch_medium", volume: 0.38 },
  "guardian-upgraded": { filePrefix: "impactBell_heavy", volume: 0.42 },
  "life-lost": { filePrefix: "impactSoft_heavy", volume: 0.48 },
  "guardian-placed": { filePrefix: "impactSoft_medium", volume: 0.24 }
};

function createCuePlayers(filePrefix) {
  return Array.from({ length: 5 }, (_, index) => {
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
      { ...definition, players: createCuePlayers(definition.filePrefix), nextPlayer: 0 }
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
    if (!state.soundEnabled) return;

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
    player.play().catch((error) => reportPlaybackError(error, cue));
  }

  function syncMusic(state) {
    const shouldPlay = state.soundEnabled && state.started && !state.paused && !state.gameOver;
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
