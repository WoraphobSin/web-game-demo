import { DIFFICULTIES, TOWERS } from "./config.js";
import { getTowerSaleValue, getTowerStats } from "./entities.js";

export function createUi() {
  let selectedDifficulty = "medium";
  let inspectorMarkup = "";

  const elements = {
    lives: document.querySelector("#lives"),
    gold: document.querySelector("#gold"),
    score: document.querySelector("#score"),
    timer: document.querySelector("#timer"),
    wave: document.querySelector("#wave"),
    progress: document.querySelector("#wave-progress"),
    waveButton: document.querySelector("#wave-button"),
    enemyCount: document.querySelector("#enemy-count"),
    towerList: document.querySelector("#tower-list"),
    overlay: document.querySelector("#arena-overlay"),
    soundButton: document.querySelector("#sound-toggle"),
    soundIcon: document.querySelector("#sound-icon"),
    musicButton: document.querySelector("#music-toggle"),
    musicIcon: document.querySelector("#music-icon"),
    speedButton: document.querySelector("#speed-button"),
    toast: document.querySelector("#toast"),
    pauseModal: document.querySelector("#pause-modal"),
    settingsSound: document.querySelector("#settings-sound"),
    settingsMusic: document.querySelector("#settings-music"),
    settingsSpeed: document.querySelector("#settings-speed"),
    continueButton: document.querySelector("#continue-button"),
    difficultyOptions: document.querySelector("#difficulty-options"),
    difficultyLabel: document.querySelector("#difficulty-label"),
    startDefenseButton: document.querySelector("#start-defense-button"),
    inspector: document.querySelector("#guardian-inspector"),
    deadline: document.querySelector("#wave-deadline"),
    deadlineLabel: document.querySelector("#deadline-label")
  };

  function selectDifficulty(difficulty) {
    if (!Object.hasOwn(DIFFICULTIES, difficulty)) {
      throw new Error(`Unknown difficulty: ${difficulty}`);
    }

    selectedDifficulty = difficulty;
    for (const button of elements.difficultyOptions.querySelectorAll(".difficulty-option")) {
      const selected = button.dataset.difficulty === difficulty;
      button.classList.toggle("selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    }
    elements.startDefenseButton.innerHTML = `Begin on ${DIFFICULTIES[difficulty].name} <span>→</span>`;
  }

  function renderTowerOptions(onSelectTower) {
    elements.towerList.replaceChildren();

    for (const [type, definition] of Object.entries(TOWERS)) {
      const button = document.createElement("button");
      button.className = "tower-card";
      button.dataset.tower = type;
      button.type = "button";
      button.style.setProperty("--tower-color", definition.color);
      button.style.setProperty("--tower-base", definition.baseColor);

      const emblem = document.createElement("span");
      emblem.className = "tower-emblem";
      emblem.setAttribute("aria-hidden", "true");
      emblem.textContent = definition.symbol;

      const copy = document.createElement("span");
      copy.className = "tower-copy";
      const name = document.createElement("strong");
      name.textContent = definition.name;
      const description = document.createElement("small");
      description.textContent = definition.description;
      copy.append(name, description);
      const stats = document.createElement("small");
      stats.className = "tower-card-stats";
      stats.textContent = `${definition.damage} dmg · ${(1 / definition.cooldown).toFixed(1)}/sec · ${definition.splashRadius ? `${definition.splashRadius} m area` : "single target"}`;
      copy.append(stats);

      const cost = document.createElement("span");
      cost.className = "tower-cost";
      cost.textContent = `◉ ${definition.cost}`;
      button.append(emblem, copy, cost);
      button.addEventListener("click", () => onSelectTower(type));
      elements.towerList.append(button);
    }
  }

  function showOverlay(state) {
    if (state.gameOver) {
      const eyebrow = elements.overlay.querySelector(".eyebrow");
      const heading = elements.overlay.querySelector("h2");
      const description = elements.overlay.querySelector("p");
      const button = elements.overlay.querySelector("#start-button");
      eyebrow.textContent = state.gameOverReason === "deadline" ? "THE WAVE DEADLINE HAS PASSED" : "THE PASS HAS FALLEN";
      heading.textContent = state.gameOverReason === "deadline"
        ? `Wave ${state.wave} overwhelmed the pass.`
        : `Your score: ${state.score.toLocaleString()} · The realm remembers.`;
      description.textContent = state.gameOverReason === "deadline"
        ? `The enemies were not defeated in time. You held for ${formatTime(state.elapsed)}.`
        : `You held for ${formatTime(state.elapsed)}. Gather your guardians and try again.`;
      button.textContent = "Defend the realm again";
      elements.overlay.classList.remove("hidden");
      return;
    }

    if (state.started) {
      elements.overlay.classList.add("hidden");
      return;
    }

    resetOverlay();
    elements.overlay.classList.remove("hidden");
  }

  function formatTime(elapsed) {
    const seconds = Math.floor(elapsed);
    return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  }

  function render(state) {
    elements.lives.textContent = state.lives;
    elements.gold.textContent = state.gold;
    elements.score.textContent = state.score.toLocaleString();
    elements.wave.textContent = state.wave;
    elements.enemyCount.textContent = state.enemies.length;
    elements.timer.textContent = formatTime(state.elapsed);

    const defeated = Math.max(0, state.waveTotal - state.spawnQueue.length - state.enemies.length);
    elements.progress.style.width = state.waveTotal ? `${Math.min(100, defeated / state.waveTotal * 100)}%` : "0%";
    if (state.running) {
      elements.deadlineLabel.textContent = "TIME TO CLEAR";
      elements.deadline.textContent = formatTime(state.waveTimeRemaining);
      elements.deadline.classList.toggle("urgent", state.waveTimeRemaining <= 15);
    } else if (state.intermissionRemaining > 0) {
      elements.deadlineLabel.textContent = "NEXT WAVE IN";
      elements.deadline.textContent = formatTime(state.intermissionRemaining);
      elements.deadline.classList.remove("urgent");
    } else {
      elements.deadlineLabel.textContent = "WAVE DEADLINE";
      elements.deadline.textContent = "--:--";
      elements.deadline.classList.remove("urgent");
    }

    elements.waveButton.textContent = state.gameOver
      ? "↻ Play Again"
      : state.running
        ? "⚔ Wave in progress"
        : state.intermissionRemaining > 0
          ? `Next wave in ${formatTime(state.intermissionRemaining)}`
          : `▶ Begin Wave ${state.wave}`;
    elements.waveButton.disabled = state.running || state.intermissionRemaining > 0;

    for (const button of elements.towerList.querySelectorAll(".tower-card")) {
      button.classList.toggle("selected", button.dataset.tower === state.selectedTower);
    }
    renderInspector(state);
    elements.soundButton.setAttribute("aria-pressed", String(state.soundEffectsEnabled));
    elements.soundIcon.textContent = state.soundEffectsEnabled ? "♫" : "♪";
    elements.soundButton.lastChild.textContent = state.soundEffectsEnabled ? " Effects on" : " Effects off";
    elements.musicButton.setAttribute("aria-pressed", String(state.musicEnabled));
    elements.musicIcon.textContent = state.musicEnabled ? "♫" : "♪";
    elements.musicButton.lastChild.textContent = state.musicEnabled ? " Music on" : " Music off";
    elements.speedButton.innerHTML = state.speed === 2 ? "<span>»</span> Normal Speed" : "<span>»</span> Double Speed";
    elements.settingsSound.checked = state.soundEffectsEnabled;
    elements.settingsMusic.checked = state.musicEnabled;
    elements.settingsSpeed.checked = state.speed === 2;
    elements.continueButton.hidden = !state.started || state.gameOver;
    elements.pauseModal.hidden = !state.paused || state.gameOver;
    elements.difficultyLabel.textContent = DIFFICULTIES[state.difficulty].name.toUpperCase();
    showOverlay(state);
  }

  function renderInspector(state) {
    const placed = state.towers.find((tower) => tower.id === state.selectedTowerId);
    const definition = TOWERS[placed?.type ?? state.selectedTower];
    const tower = placed ?? { type: state.selectedTower, level: 1 };
    const stats = getTowerStats(tower);
    const nextCost = placed ? definition.upgradeCosts[placed.level - 1] : undefined;
    const isMaxLevel = placed && nextCost === undefined;
    const nextLevelStats = placed && !isMaxLevel
      ? getTowerStats({ ...placed, level: placed.level + 1 })
      : undefined;
    const saleValue = placed ? getTowerSaleValue(placed) : undefined;
    const area = stats.splashRadius ? `${stats.splashRadius} m radius` : "Single target";
    const heading = placed ? `${definition.name} · Level ${placed.level}` : `${definition.name} · Placement stats`;
    const upgradeButton = placed
      ? isMaxLevel
        ? '<button class="secondary-button upgrade-button" type="button" disabled>Maximum level reached</button>'
        : `<button class="primary-button upgrade-button" type="button" data-upgrade-tower ${state.gold < nextCost ? "disabled" : ""}>Upgrade · ◉ ${nextCost} <span>→</span></button>`
      : '<p class="inspector-hint">Place a guardian, then select it on the battlefield to upgrade it.</p>';
    const sellButton = placed
      ? `<button class="secondary-button upgrade-button sell-button" type="button" data-sell-tower>Sell guardian · ◉ ${saleValue} gold</button>`
      : "";

    const markup = `
      <div class="inspector-heading">
        <span class="tower-emblem" style="--tower-color:${definition.color};--tower-base:${definition.baseColor}" aria-hidden="true">${definition.symbol}</span>
        <div><p class="stat-label">${placed ? "SELECTED GUARDIAN" : "GUARDIAN DETAILS"}</p><h3>${heading}</h3></div>
      </div>
      <div class="inspector-stats">
        <div><span>Damage / hit</span><strong>${stats.damage}</strong></div>
        <div><span>Attack speed</span><strong>${(1 / stats.cooldown).toFixed(2)} / sec</strong></div>
        <div><span>Attack area</span><strong>${area}</strong></div>
        <div><span>Range</span><strong>${stats.range} m</strong></div>
      </div>
      ${nextLevelStats ? `<p class="upgrade-hint">Damage: ${stats.damage} → ${nextLevelStats.damage} · Attack speed: ${(1 / stats.cooldown).toFixed(2)} → ${(1 / nextLevelStats.cooldown).toFixed(2)} / sec · Range: ${stats.range} → ${nextLevelStats.range} m${stats.splashRadius ? ` · Area: ${stats.splashRadius} → ${nextLevelStats.splashRadius} m` : ""}</p>` : ""}
      ${upgradeButton}
      ${sellButton}`;
    if (markup !== inspectorMarkup) {
      elements.inspector.innerHTML = markup;
      inspectorMarkup = markup;
    }
  }

  function showToast(message) {
    elements.toast.textContent = message;
    elements.toast.classList.add("visible");
  }

  function hideToast() {
    elements.toast.classList.remove("visible");
  }

  function resetOverlay() {
    const eyebrow = elements.overlay.querySelector(".eyebrow");
    const heading = elements.overlay.querySelector("h2");
    const description = elements.overlay.querySelector("p");
    const button = elements.overlay.querySelector("#start-button");
    eyebrow.textContent = "A MYTHIC DEFENSE BEGINS";
    heading.innerHTML = "Darkness stirs<br>beyond the pass.";
    description.textContent = "Raise your guardians. Protect the ancient road.";
    button.textContent = "Enter the battlefield →";
  }

  return {
    elements,
    render,
    renderTowerOptions,
    selectDifficulty,
    showToast,
    hideToast,
    resetOverlay
  };
}
