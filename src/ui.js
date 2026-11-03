import { TOWERS } from "./config.js";

export function createUi() {
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
    selectionNote: document.querySelector("#selection-note"),
    overlay: document.querySelector("#arena-overlay"),
    soundButton: document.querySelector("#sound-toggle"),
    soundIcon: document.querySelector("#sound-icon"),
    speedButton: document.querySelector("#speed-button"),
    toast: document.querySelector("#toast")
  };

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
      eyebrow.textContent = "THE PASS HAS FALLEN";
      heading.textContent = `Your score: ${state.score.toLocaleString()} · The realm remembers.`;
      description.textContent = `You held for ${formatTime(state.elapsed)}. Gather your guardians and try again.`;
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
    elements.waveButton.textContent = state.gameOver
      ? "↻ Play Again"
      : state.running
        ? "⚔ Wave in progress"
        : `▶ Begin Wave ${state.wave}`;
    elements.waveButton.disabled = state.running;

    for (const button of elements.towerList.querySelectorAll(".tower-card")) {
      button.classList.toggle("selected", button.dataset.tower === state.selectedTower);
    }
    const selected = TOWERS[state.selectedTower];
    elements.selectionNote.textContent = `${selected.name} selected — ${selected.cost} gold`;
    elements.soundButton.setAttribute("aria-pressed", String(state.soundEnabled));
    elements.soundIcon.textContent = state.soundEnabled ? "♫" : "♪";
    elements.soundButton.lastChild.textContent = state.soundEnabled ? " Sound on" : " Sound off";
    elements.speedButton.innerHTML = state.speed === 2 ? "<span>»</span> Normal Speed" : "<span>»</span> Double Speed";
    showOverlay(state);
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
    showToast,
    hideToast,
    resetOverlay
  };
}
