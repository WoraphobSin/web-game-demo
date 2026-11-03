import { INITIAL_GAME_STATE, TOWERS } from "./config.js";
import { createAudio } from "./audio.js";
import { createTower, getCellFromPosition } from "./entities.js";
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

function showToast(message) {
  ui.showToast(message);
  state.toastRemaining = 1.8;
}

function resetGame() {
  Object.assign(state, structuredClone(INITIAL_GAME_STATE));
  ui.resetOverlay();
}

function startWave() {
  if (state.gameOver) resetGame();

  if (!state.started) {
    state.started = true;
    showToast("Wave 1 — The goblins approach!");
    audio.play(state, 440, 0.15);
  } else if (state.running) {
    return;
  } else {
    showToast(`Wave ${state.wave} — Hold the pass!`);
    audio.play(state, 440 + state.wave * 20, 0.15);
  }

  beginWave(state);
  ui.render(state);
}

function selectTower(type) {
  if (!Object.hasOwn(TOWERS, type)) {
    throw new Error(`Unknown tower selected: ${type}`);
  }
  state.selectedTower = type;
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
  state.towers.push(createTower(state.selectedTower, column, row));
  audio.play(state, 320, 0.11, "triangle");
  ui.render(state);
}

function handleEffects(effects) {
  for (const effect of effects) {
    if (effect.type === "tone") {
      audio.play(state, effect.frequency, effect.duration, effect.wave);
    } else if (effect.type === "wave-cleared") {
      showToast(`Wave ${effect.wave} cleared! +${effect.reward} gold`);
    } else if (effect.type === "game-over") {
      ui.render(state);
    }
  }
}

function update(deltaTime) {
  if (state.toastRemaining > 0) {
    state.toastRemaining -= deltaTime;
    if (state.toastRemaining <= 0) ui.hideToast();
  }
  handleEffects(updateGame(state, deltaTime));
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
ui.elements.soundButton.addEventListener("click", () => {
  state.soundEnabled = !state.soundEnabled;
  ui.render(state);
  audio.play(state, 520, 0.12);
});
ui.elements.speedButton.addEventListener("click", () => {
  state.speed = state.speed === 1 ? 2 : 1;
  ui.render(state);
});
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

ui.render(state);
requestAnimationFrame(frame);
