import { ENEMIES, PATH, TOWERS, createWaveQueue } from "./config.js";
import { createEnemy, createParticle, createProjectile } from "./entities.js";

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
    const definition = TOWERS[tower.type];
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
    const definition = ENEMIES[enemy.type];
    state.score += definition.score;
    state.gold += definition.reward;
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
      state.running = false;
      effects.push({ type: "game-over" });
      break;
    }
  }
}

export function beginWave(state) {
  state.spawnQueue = createWaveQueue(state.wave);
  state.waveTotal = state.spawnQueue.length;
  state.spawnClock = 0;
  state.running = true;
}

export function updateGame(state, deltaTime) {
  const effects = [];
  if (state.started && !state.gameOver) state.elapsed += deltaTime;
  if (!state.running || state.gameOver) {
    updateParticles(state, deltaTime);
    return effects;
  }

  const scaledDelta = deltaTime * state.speed;
  state.spawnClock -= scaledDelta;
  if (state.spawnQueue.length && state.spawnClock <= 0) {
    state.enemies.push(createEnemy(state.spawnQueue.shift(), state.wave));
    state.spawnClock = Math.max(0.44, 1.02 - state.wave * 0.025);
  }

  fireTowers(state, scaledDelta, effects);
  moveEnemies(state, scaledDelta, effects);
  updateProjectiles(state, scaledDelta, effects);
  updateParticles(state, deltaTime);

  if (!state.spawnQueue.length && !state.enemies.length && !state.gameOver) {
    const reward = 35 + state.wave * 3;
    const clearedWave = state.wave;
    state.running = false;
    state.score += state.wave * 50;
    state.gold += reward;
    state.wave++;
    effects.push({ type: "wave-cleared", wave: clearedWave, reward });
    effects.push({ type: "tone", frequency: 690, duration: 0.22 });
  }

  return effects;
}
