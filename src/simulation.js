import { DIFFICULTIES, PATH, createWaveQueue } from "./config.js";
import { createEnemy, createParticle, createProjectile, getTowerStats } from "./entities.js";

function distanceBetween(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function updateEnemy(enemy, deltaTime) {
  const target = PATH[enemy.waypoint];
  if (!target) return true;

  const distance = distanceBetween(enemy, target);
  const step = enemy.speed * deltaTime;
  if (distance <= step) {
    enemy.pathProgress += distance;
    enemy.x = target.x;
    enemy.y = target.y;
    enemy.waypoint++;
    return enemy.waypoint >= PATH.length;
  }

  enemy.pathProgress += step;
  enemy.x += (target.x - enemy.x) / distance * step;
  enemy.y += (target.y - enemy.y) / distance * step;
  enemy.wobble += deltaTime * 5;
  return false;
}

function addBurst(state, x, y, color, count = 7) {
  state.particles.push(...createParticle(x, y, color, count));
}

function updateParticles(state, deltaTime) {
  for (const particle of state.particles) {
    particle.life -= deltaTime;
    particle.x += particle.vx * deltaTime;
    particle.y += particle.vy * deltaTime;
    particle.vx *= 0.94;
    particle.vy *= 0.94;
  }
  state.particles = state.particles.filter((particle) => particle.life > 0);
}

function fireTowers(state, deltaTime, effects) {
  for (const tower of state.towers) {
    const definition = getTowerStats(tower);
    tower.cooldownRemaining -= deltaTime;
    tower.pulse = Math.max(0, tower.pulse - deltaTime);
    if (tower.cooldownRemaining > 0) continue;

    const target = state.enemies
      .filter((enemy) => distanceBetween(enemy, tower) <= definition.range)
      .sort((a, b) => b.pathProgress - a.pathProgress)[0];
    if (!target) continue;

    state.projectiles.push(createProjectile(tower, target));
    tower.cooldownRemaining = definition.cooldown;
    tower.pulse = 0.15;
    effects.push({ type: "tone", frequency: tower.type === "mage" ? 620 : tower.type === "stone" ? 210 : 390, duration: 0.045, wave: "triangle" });
  }
}

function damageEnemies(state, projectile, target) {
  const victims = projectile.splashRadius
    ? state.enemies.filter((enemy) => distanceBetween(enemy, target) <= projectile.splashRadius)
    : [target];

  for (const enemy of victims) {
    enemy.hp -= projectile.damage;
    addBurst(state, enemy.x, enemy.y, projectile.color, 3);
    if (enemy.hp > 0) continue;

    state.enemies = state.enemies.filter((candidate) => candidate.id !== enemy.id);
    state.score += enemy.score;
    state.gold += enemy.reward;
  }
}

function updateProjectiles(state, deltaTime, effects) {
  const remaining = [];

  for (const projectile of state.projectiles) {
    const target = state.enemies.find((enemy) => enemy.id === projectile.targetId);
    if (!target) continue;

    const distance = distanceBetween(projectile, target);
    if (distance < projectile.speed * deltaTime + target.radius) {
      damageEnemies(state, projectile, target);
      effects.push({ type: "tone", frequency: projectile.towerType === "mage" ? 760 : 510, duration: 0.055 });
      continue;
    }

    projectile.x += (target.x - projectile.x) / distance * projectile.speed * deltaTime;
    projectile.y += (target.y - projectile.y) / distance * projectile.speed * deltaTime;
    remaining.push(projectile);
  }

  state.projectiles = remaining;
}

function moveEnemies(state, deltaTime, effects) {
  for (const enemy of [...state.enemies]) {
    if (!updateEnemy(enemy, deltaTime)) continue;
    state.enemies = state.enemies.filter((candidate) => candidate.id !== enemy.id);
    state.lives--;
    addBurst(state, enemy.x, enemy.y, "#e88477", 9);
    effects.push({ type: "tone", frequency: 145, duration: 0.17, wave: "sawtooth" });

    if (state.lives <= 0) {
      state.lives = 0;
      state.gameOver = true;
      state.gameOverReason = "lives";
      state.running = false;
      effects.push({ type: "game-over" });
      break;
    }
  }
}

export function beginWave(state) {
  state.spawnQueue = createWaveQueue(state.wave, state.difficulty);
  state.waveTotal = state.spawnQueue.length;
  state.spawnClock = 0;
  state.intermissionRemaining = 0;
  state.waveTimeRemaining = getWaveTimeLimit(state.wave, state.difficulty, state.waveTotal);
  state.running = true;
}

export function getWaveTimeLimit(wave, difficulty, enemyCount) {
  const settings = DIFFICULTIES[difficulty];
  if (!settings) throw new Error(`Unknown difficulty: ${difficulty}`);
  return Math.round((75 + wave * 4 + enemyCount * 1.25) * settings.deadlineMultiplier);
}

export function updateGame(state, deltaTime) {
  const effects = [];
  if (state.paused) return effects;
  if (state.started && !state.gameOver) state.elapsed += deltaTime;
  if (!state.running && state.intermissionRemaining > 0 && !state.gameOver) {
    state.intermissionRemaining = Math.max(0, state.intermissionRemaining - deltaTime * state.speed);
    if (state.intermissionRemaining === 0) {
      beginWave(state);
      effects.push({ type: "wave-started", wave: state.wave });
    }
  }
  if (!state.running || state.gameOver) {
    updateParticles(state, deltaTime);
    return effects;
  }

  const scaledDelta = deltaTime * state.speed;
  state.waveTimeRemaining = Math.max(0, state.waveTimeRemaining - scaledDelta);
  state.spawnClock -= scaledDelta;
  if (state.spawnQueue.length && state.spawnClock <= 0) {
    state.enemies.push(createEnemy(state.spawnQueue.shift(), state.wave, state.difficulty));
    state.spawnClock = Math.max(0.44, 1.02 - state.wave * 0.025);
  }

  fireTowers(state, scaledDelta, effects);
  moveEnemies(state, scaledDelta, effects);
  updateProjectiles(state, scaledDelta, effects);
  updateParticles(state, deltaTime);

  if (state.waveTimeRemaining === 0 && (state.spawnQueue.length || state.enemies.length)) {
    state.gameOver = true;
    state.running = false;
    state.lives = 0;
    state.gameOverReason = "deadline";
    effects.push({ type: "wave-timeout" });
    effects.push({ type: "game-over" });
    return effects;
  }

  if (!state.spawnQueue.length && !state.enemies.length && !state.gameOver) {
    const reward = Math.max(1, Math.round((35 + state.wave * 3) * DIFFICULTIES[state.difficulty].goldRewardMultiplier));
    const clearedWave = state.wave;
    state.running = false;
    state.score += state.wave * 50;
    state.gold += reward;
    state.wave++;
    state.intermissionRemaining = 8;
    effects.push({ type: "wave-cleared", wave: clearedWave, reward });
    effects.push({ type: "tone", frequency: 690, duration: 0.22 });
  }

  return effects;
}
