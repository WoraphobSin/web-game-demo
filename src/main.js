import { DIFFICULTIES, INITIAL_GAME_STATE, TOWERS } from "./config.js";
import { createAudio } from "./audio.js";
import { createTower, getCellFromPosition, getTowerSaleValue } from "./entities.js";
import { isInsideBoard, isPathCell } from "./map.js";
import { createRenderer } from "./renderer.js";
import { beginWave, updateGame } from "./simulation.js";
import { createUi } from "./ui.js";

const canvas = document.querySelector("#game-canvas");
if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error("The game board canvas could not be found.");
}

const state = structuredClone(INITIAL_GAME_STATE);
const ui = createUi();
const audio = createAudio();
const renderer = createRenderer(canvas);
let lastFrameTime = 0;
let settingsReturnScreen = "menu";
let selectedDifficulty = state.difficulty;

const screens = {
  landing: document.querySelector("#landing-screen"),
  menu: document.querySelector("#menu-screen"),
  difficulty: document.querySelector("#difficulty-screen"),
  settings: document.querySelector("#settings-screen"),
  guide: document.querySelector("#how-to-screen"),
  game: document.querySelector("#game-screen")
};

function showScreen(name) {
  for (const [screenName, element] of Object.entries(screens)) {
    element.hidden = screenName !== name;
  }
}

function showToast(message) {
  ui.showToast(message);
  state.toastRemaining = 1.8;
}

function resetGame(difficulty = selectedDifficulty) {
  const settings = {
    soundEffectsEnabled: state.soundEffectsEnabled,
    musicEnabled: state.musicEnabled,
    speed: state.speed
  };
  Object.assign(state, structuredClone(INITIAL_GAME_STATE), settings, {
    difficulty,
    gold: DIFFICULTIES[difficulty].startingGold
  });
  ui.selectDifficulty(difficulty);
  ui.resetOverlay();
  ui.render(state);
}

function openSettings(returnScreen) {
  settingsReturnScreen = returnScreen;
  showScreen("settings");
  ui.render(state);
}

function toggleSound() {
  state.soundEffectsEnabled = !state.soundEffectsEnabled;
  ui.render(state);
}

function toggleMusic() {
  state.musicEnabled = !state.musicEnabled;
  ui.render(state);
  audio.syncMusic(state);
}

function resumeDefense() {
  state.paused = false;
  showScreen("game");
  ui.render(state);
  audio.syncMusic(state);
}

function startWave() {
  if (state.gameOver) resetGame();

  if (!state.started) {
    state.started = true;
    showToast("Wave 1 — The goblins approach!");
  } else if (state.running) {
    return;
  } else {
    showToast(`Wave ${state.wave} — Hold the pass!`);
  }

  beginWave(state);
  audio.syncMusic(state);
  ui.render(state);
}

function selectTower(type) {
  if (!Object.hasOwn(TOWERS, type)) {
    throw new Error(`Unknown tower selected: ${type}`);
  }
  state.selectedTower = type;
  state.selectedTowerId = null;
  ui.render(state);
}

function placeTower(event) {
  if (!state.started || state.gameOver) return;

  const bounds = canvas.getBoundingClientRect();
  const position = {
    x: (event.clientX - bounds.left) * canvas.width / bounds.width,
    y: (event.clientY - bounds.top) * canvas.height / bounds.height
  };
  const { column, row } = getCellFromPosition(position.x, position.y);

  if (!isInsideBoard(column, row)) return;
  const placedTower = state.towers.find((tower) => tower.column === column && tower.row === row);
  if (placedTower) {
    state.selectedTowerId = placedTower.id;
    ui.render(state);
    return;
  }
  state.selectedTowerId = null;
  if (isPathCell(column, row)) {
    showToast("The ancient road must remain clear.");
    return;
  }
  if (state.towers.some((tower) => tower.column === column && tower.row === row)) {
    showToast("A guardian already stands here.");
    return;
  }

  const definition = TOWERS[state.selectedTower];
  if (state.gold < definition.cost) {
    showToast("Not enough gold for this guardian.");
    return;
  }

  state.gold -= definition.cost;
  const tower = createTower(state.selectedTower, column, row);
  state.towers.push(tower);
  state.selectedTowerId = tower.id;
  audio.syncMusic(state);
  audio.playCue(state, "guardian-placed");
  ui.render(state);
}

function handleEffects(effects) {
  for (const effect of effects) {
    if (effect.type === "guardian-fired") {
      audio.playCue(state, `${effect.type}-${effect.towerType}`);
    } else if (effect.type === "wave-cleared") {
      showToast(`Wave ${effect.wave} cleared! +${effect.reward} gold`);
    } else if (effect.type === "wave-started") {
      showToast(`Wave ${effect.wave} begins!`);
    } else if (effect.type === "wave-timeout") {
      showToast("The wave deadline has passed. The pass is lost.");
    } else if (effect.type === "enemy-defeated") {
      audio.playCue(state, `${effect.type}-${effect.enemyType}`);
    } else if (effect.type === "life-lost") {
      audio.playCue(state, effect.type);
    } else if (effect.type === "game-over") {
      audio.syncMusic(state);
      ui.render(state);
    }
  }
}

function update(deltaTime) {
  if (!state.paused && state.toastRemaining > 0) {
    state.toastRemaining -= deltaTime;
    if (state.toastRemaining <= 0) ui.hideToast();
  }
  handleEffects(updateGame(state, deltaTime));
  audio.syncMusic(state);
  ui.render(state);
}

function frame(timestamp) {
  const deltaTime = Math.min(0.04, (timestamp - (lastFrameTime || timestamp)) / 1000);
  lastFrameTime = timestamp;
  update(deltaTime);
  renderer.draw(state, timestamp);
  requestAnimationFrame(frame);
}

ui.renderTowerOptions(selectTower);
ui.elements.waveButton.addEventListener("click", startWave);
ui.elements.overlay.querySelector("#start-button").addEventListener("click", startWave);
ui.elements.soundButton.addEventListener("click", toggleSound);
ui.elements.musicButton.addEventListener("click", toggleMusic);
ui.elements.speedButton.addEventListener("click", () => {
  state.speed = state.speed === 1 ? 2 : 1;
  ui.render(state);
});
document.querySelector("#landing-play").addEventListener("click", () => showScreen("menu"));
document.querySelector("#menu-back-button").addEventListener("click", () => showScreen("landing"));
document.querySelector("#new-game-button").addEventListener("click", () => showScreen("difficulty"));
document.querySelector("#difficulty-back-button").addEventListener("click", () => showScreen("menu"));
document.querySelectorAll(".difficulty-option").forEach((button) => {
  button.addEventListener("click", () => {
    selectedDifficulty = button.dataset.difficulty;
    ui.selectDifficulty(selectedDifficulty);
    ui.render(state);
  });
});
document.querySelector("#start-defense-button").addEventListener("click", () => {
  resetGame(selectedDifficulty);
  showScreen("game");
});
ui.elements.continueButton.addEventListener("click", resumeDefense);
document.querySelector("#settings-button").addEventListener("click", () => openSettings("menu"));
document.querySelector("#how-to-button").addEventListener("click", () => showScreen("guide"));
document.querySelector("#settings-back-button").addEventListener("click", () => showScreen(settingsReturnScreen));
document.querySelector("#guide-back-button").addEventListener("click", () => showScreen("menu"));
document.querySelector("#settings-sound").addEventListener("change", (event) => {
  state.soundEffectsEnabled = event.currentTarget.checked;
  ui.render(state);
});
document.querySelector("#settings-music").addEventListener("change", (event) => {
  state.musicEnabled = event.currentTarget.checked;
  ui.render(state);
  audio.syncMusic(state);
});
document.querySelector("#settings-speed").addEventListener("change", (event) => {
  state.speed = event.currentTarget.checked ? 2 : 1;
  ui.render(state);
});
ui.elements.inspector.addEventListener("click", (event) => {
  if (!(event.target instanceof Element)) return;
  if (event.target.closest("[data-upgrade-tower]")) {
    upgradeSelectedTower();
  } else if (event.target.closest("[data-sell-tower]")) {
    sellSelectedTower();
  }
});
document.querySelector("#pause-button").addEventListener("click", () => {
  if (!state.started || state.gameOver) {
    showScreen("menu");
    return;
  }
  state.paused = true;
  ui.render(state);
});
document.querySelector("#resume-button").addEventListener("click", () => {
  resumeDefense();
});
document.querySelector("#pause-settings-button").addEventListener("click", () => openSettings("game"));
document.querySelector("#pause-menu-button").addEventListener("click", () => showScreen("menu"));
canvas.addEventListener("click", placeTower);
canvas.addEventListener("mousemove", (event) => {
  const bounds = canvas.getBoundingClientRect();
  state.pointer = {
    x: (event.clientX - bounds.left) * canvas.width / bounds.width,
    y: (event.clientY - bounds.top) * canvas.height / bounds.height
  };
});
canvas.addEventListener("mouseleave", () => {
  state.pointer = null;
});
canvas.addEventListener("contextmenu", (event) => {
  event.preventDefault();
  selectTower("arrow");
  showToast("Placement selection reset.");
});

function upgradeSelectedTower() {
  const tower = state.towers.find((candidate) => candidate.id === state.selectedTowerId);
  if (!tower) return;
  const definition = TOWERS[tower.type];
  const cost = definition.upgradeCosts[tower.level - 1];
  if (cost === undefined || tower.level >= 3) return;
  if (state.gold < cost) {
    showToast("Not enough gold to upgrade this guardian.");
    return;
  }

  state.gold -= cost;
  tower.level++;
  audio.playCue(state, "guardian-upgraded");
  ui.render(state);
  showToast(`${definition.name} upgraded to level ${tower.level}!`);
}

function sellSelectedTower() {
  const towerIndex = state.towers.findIndex((tower) => tower.id === state.selectedTowerId);
  if (towerIndex === -1) return;

  const [tower] = state.towers.splice(towerIndex, 1);
  const refund = getTowerSaleValue(tower);
  state.gold += refund;
  state.selectedTowerId = null;
  ui.render(state);
  showToast(`${TOWERS[tower.type].name} sold for ${refund} gold.`);
}

ui.render(state);
ui.selectDifficulty(selectedDifficulty);
showScreen("landing");
requestAnimationFrame(frame);
