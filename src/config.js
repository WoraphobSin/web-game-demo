export const BOARD = {
  cellSize: 48,
  columns: 20,
  rows: 11,
  width: 960,
  height: 528
};

export const PATH = [
  [0, 5], [4, 5], [4, 2], [9, 2],
  [9, 8], [14, 8], [14, 4], [19, 4]
].map(([column, row]) => ({
  x: column * BOARD.cellSize + BOARD.cellSize / 2,
  y: row * BOARD.cellSize + BOARD.cellSize / 2
}));

export const TOWERS = {
  arrow: {
    name: "Archer Shrine",
    description: "Swift · Single target",
    cost: 70,
    range: 142,
    cooldown: 0.62,
    damage: 18,
    projectileSpeed: 420,
    color: "#a9dfbf",
    projectileColor: "#d8f6df",
    symbol: "➶",
    baseColor: "#375d56"
  },
  mage: {
    name: "Moon Mage",
    description: "Arcane · Long range",
    cost: 110,
    range: 190,
    cooldown: 1.18,
    damage: 40,
    projectileSpeed: 290,
    color: "#c5a5f4",
    projectileColor: "#ead6ff",
    symbol: "✧",
    baseColor: "#51416a"
  },
  stone: {
    name: "Stone Warden",
    description: "Heavy · Area burst",
    cost: 135,
    range: 124,
    cooldown: 1.55,
    damage: 34,
    projectileSpeed: 290,
    splashRadius: 58,
    color: "#e5c994",
    projectileColor: "#ffdda0",
    symbol: "♜",
    baseColor: "#65533a"
  }
};

export const ENEMIES = {
  goblin: {
    name: "Goblin",
    hp: 46,
    hpPerWave: 13,
    speed: 34,
    speedPerWave: 2,
    maxSpeed: 54,
    radius: 11,
    color: "#a6bd79",
    outline: "#d5d9a8",
    reward: 12,
    score: 25,
    shape: "beast"
  },
  warg: {
    name: "Frost Warg",
    hp: 34,
    hpPerWave: 10,
    speed: 53,
    speedPerWave: 1.5,
    maxSpeed: 69,
    radius: 10,
    color: "#9aa7cb",
    outline: "#d0dcff",
    reward: 15,
    score: 35,
    shape: "warg"
  },
  brute: {
    name: "Cave Brute",
    hp: 108,
    hpPerWave: 22,
    speed: 23,
    speedPerWave: 1,
    maxSpeed: 32,
    radius: 15,
    color: "#c38ca1",
    outline: "#edc2d2",
    reward: 24,
    score: 55,
    shape: "brute"
  },
  boss: {
    name: "Stone Colossus",
    hp: 220,
    hpPerWave: 54,
    speed: 18,
    speedPerWave: 0.5,
    maxSpeed: 25,
    radius: 19,
    color: "#c87853",
    outline: "#e7a171",
    reward: 60,
    score: 120,
    shape: "boss"
  }
};

export function getWaveComposition(wave) {
  const composition = [{ type: "goblin", count: 8 + (wave - 1) * 3 }];

  if (wave >= 2) composition.push({ type: "warg", count: 2 + Math.floor(wave / 2) });
  if (wave >= 3) composition.push({ type: "brute", count: 1 + Math.floor(wave / 3) });
  if (wave % 4 === 0) composition.push({ type: "boss", count: 1 });

  return composition;
}

export function createWaveQueue(wave) {
  const remaining = getWaveComposition(wave).map(({ type, count }) => ({ type, count }));
  const queue = [];
  let hasEnemies = true;

  while (hasEnemies) {
    hasEnemies = false;
    for (const group of remaining) {
      if (group.count > 0) {
        queue.push(group.type);
        group.count--;
        hasEnemies = true;
      }
    }
  }

  return queue;
}

export const INITIAL_GAME_STATE = {
  gold: 220,
  lives: 20,
  score: 0,
  wave: 1,
  selectedTower: "arrow",
  elapsed: 0,
  speed: 1,
  soundEnabled: false,
  started: false,
  running: false,
  gameOver: false,
  spawnQueue: [],
  waveTotal: 0,
  spawnClock: 0,
  toastRemaining: 0,
  towers: [],
  enemies: [],
  projectiles: [],
  particles: [],
  pointer: null
};
