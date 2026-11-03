import { BOARD, DIFFICULTIES, ENEMIES, PATH, TOWERS } from "./config.js";
import { getCellPosition } from "./map.js";

export function createTower(type, column, row) {
  if (!TOWERS[type]) throw new Error(`Unknown tower type: ${type}`);

  return {
    id: crypto.randomUUID(),
    type,
    column,
    row,
    ...getCellPosition(column, row),
    level: 1,
    cooldownRemaining: 0,
    pulse: 0
  };
}

export function getTowerStats(tower) {
  const definition = TOWERS[tower.type];
  const upgradeCount = tower.level - 1;
  const damageMultiplier = 1.35 ** upgradeCount;
  const cooldownMultiplier = 0.88 ** upgradeCount;
  const rangeMultiplier = 1.05 ** upgradeCount;
  const splashMultiplier = 1.1 ** upgradeCount;

  return {
    ...definition,
    damage: Math.round(definition.damage * damageMultiplier),
    cooldown: definition.cooldown * cooldownMultiplier,
    range: Math.round(definition.range * rangeMultiplier),
    splashRadius: definition.splashRadius
      ? Math.round(definition.splashRadius * splashMultiplier)
      : 0
  };
}

export function createEnemy(type, wave, difficulty = "medium") {
  const definition = ENEMIES[type];
  if (!definition) throw new Error(`Unknown enemy type: ${type}`);
  const settings = DIFFICULTIES[difficulty];
  if (!settings) throw new Error(`Unknown difficulty: ${difficulty}`);

  const baseHp = definition.hp + (wave - 1) * definition.hpPerWave;
  const hp = Math.round(baseHp * settings.enemyHealthMultiplier);
  const baseSpeed = Math.min(
    definition.speed + (wave - 1) * definition.speedPerWave,
    definition.maxSpeed
  );
  const speed = baseSpeed * settings.enemySpeedMultiplier;
  const reward = Math.max(1, Math.round(definition.reward * settings.goldRewardMultiplier));

  return {
    id: crypto.randomUUID(),
    type,
    x: PATH[0].x,
    y: PATH[0].y,
    waypoint: 1,
    pathProgress: 0,
    hp,
    maxHp: hp,
    speed,
    reward,
    score: definition.score,
    radius: definition.radius,
    wobble: Math.random() * Math.PI * 2
  };
}

export function createProjectile(tower, target) {
  const definition = getTowerStats(tower);
  return {
    id: crypto.randomUUID(),
    towerType: tower.type,
    targetId: target.id,
    x: tower.x,
    y: tower.y - 7,
    damage: definition.damage,
    speed: definition.projectileSpeed,
    color: definition.projectileColor,
    splashRadius: definition.splashRadius
  };
}

export function createParticle(x, y, color, count = 7) {
  return Array.from({ length: count }, () => {
    const angle = Math.random() * Math.PI * 2;
    const speed = 25 + Math.random() * 75;

    return {
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.35 + Math.random() * 0.35,
      maxLife: 0.7,
      color
    };
  });
}

export function getCellFromPosition(x, y) {
  return {
    column: Math.floor(x / BOARD.cellSize),
    row: Math.floor(y / BOARD.cellSize)
  };
}
