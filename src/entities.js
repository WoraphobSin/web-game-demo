import { BOARD, ENEMIES, PATH, TOWERS } from "./config.js";
import { getCellPosition } from "./map.js";

export function createTower(type, column, row) {
  if (!TOWERS[type]) throw new Error(`Unknown tower type: ${type}`);

  return {
    id: crypto.randomUUID(),
    type,
    column,
    row,
    ...getCellPosition(column, row),
    cooldownRemaining: 0,
    pulse: 0
  };
}

export function createEnemy(type, wave) {
  const definition = ENEMIES[type];
  if (!definition) throw new Error(`Unknown enemy type: ${type}`);

  const hp = definition.hp + (wave - 1) * definition.hpPerWave;
  const speed = Math.min(
    definition.speed + (wave - 1) * definition.speedPerWave,
    definition.maxSpeed
  );

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
    radius: definition.radius,
    wobble: Math.random() * Math.PI * 2
  };
}

export function createProjectile(tower, target) {
  const definition = TOWERS[tower.type];
  return {
    id: crypto.randomUUID(),
    towerType: tower.type,
    targetId: target.id,
    x: tower.x,
    y: tower.y - 7,
    damage: definition.damage,
    speed: definition.projectileSpeed,
    color: definition.projectileColor,
    splashRadius: definition.splashRadius ?? 0
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
