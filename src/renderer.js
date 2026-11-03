import { BOARD, ENEMIES, PATH, TOWERS } from "./config.js";
import { isPathCell, PATH_CELLS } from "./map.js";

export function createRenderer(canvas) {
  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser does not support canvas rendering.");
  const pathCells = [...PATH_CELLS].map((key) => {
    const [column, row] = key.split(",").map(Number);
    return { x: column * BOARD.cellSize, y: row * BOARD.cellSize };
  });

  function drawBackground(time) {
    const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, "#192633");
    gradient.addColorStop(0.55, "#18272b");
    gradient.addColorStop(1, "#1c2929");
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);

    for (let index = 0; index < 62; index++) {
      const x = (index * 173 + 39) % canvas.width;
      const y = (index * 97 + 23) % canvas.height;
      context.fillStyle = `rgba(218, 210, 178, ${0.18 + 0.12 * Math.sin(time * 0.001 + index * 2)})`;
      context.beginPath();
      context.arc(x, y, index % 4 === 0 ? 1.4 : 0.8, 0, Math.PI * 2);
      context.fill();
    }

    context.strokeStyle = "rgba(151, 174, 166, .08)";
    context.lineWidth = 1;
    for (let x = 0; x <= canvas.width; x += BOARD.cellSize) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, canvas.height);
      context.stroke();
    }
    for (let y = 0; y <= canvas.height; y += BOARD.cellSize) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(canvas.width, y);
      context.stroke();
    }

    for (const cell of pathCells) {
      context.fillStyle = "rgba(133, 111, 75, .48)";
      context.fillRect(cell.x + 1, cell.y + 1, BOARD.cellSize - 2, BOARD.cellSize - 2);
      context.fillStyle = "rgba(194, 164, 112, .09)";
      context.fillRect(cell.x + 5, cell.y + 5, BOARD.cellSize - 10, BOARD.cellSize - 10);
    }

    context.save();
    context.setLineDash([3, 10]);
    context.strokeStyle = "rgba(232, 198, 129, .18)";
    context.lineWidth = 1;
    context.beginPath();
    PATH.forEach((point, index) => index ? context.lineTo(point.x, point.y) : context.moveTo(point.x, point.y));
    context.stroke();
    context.restore();

    const exit = PATH[PATH.length - 1];
    const gateGlow = context.createRadialGradient(exit.x, exit.y, 3, exit.x, exit.y, 48);
    gateGlow.addColorStop(0, "rgba(239, 154, 98, .28)");
    gateGlow.addColorStop(1, "rgba(239, 154, 98, 0)");
    context.fillStyle = gateGlow;
    context.fillRect(exit.x - 50, exit.y - 50, 100, 100);
    context.strokeStyle = "rgba(238, 170, 116, .48)";
    context.lineWidth = 2;
    context.strokeRect(exit.x - 13, exit.y - 16, 26, 32);
    context.fillStyle = "#e8bb7e";
    context.font = "8px sans-serif";
    context.textAlign = "center";
    context.fillText("GATE", exit.x, exit.y + 29);
  }

  function isHovered(state, tower) {
    return state.pointer &&
      tower.column === Math.floor(state.pointer.x / BOARD.cellSize) &&
      tower.row === Math.floor(state.pointer.y / BOARD.cellSize);
  }

  function drawTower(state, tower, time) {
    const definition = TOWERS[tower.type];
    if (isHovered(state, tower)) {
      context.beginPath();
      context.arc(tower.x, tower.y, definition.range, 0, Math.PI * 2);
      context.fillStyle = `${definition.color}12`;
      context.fill();
      context.strokeStyle = `${definition.color}55`;
      context.setLineDash([5, 6]);
      context.stroke();
      context.setLineDash([]);
    }

    context.save();
    context.translate(tower.x, tower.y + Math.sin(time * 0.003 + tower.column) * 1.5);
    context.fillStyle = "rgba(4, 9, 12, .48)";
    context.beginPath();
    context.ellipse(0, 10, 17, 8, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = definition.baseColor;
    context.strokeStyle = definition.color;
    context.lineWidth = 1.5;
    context.beginPath();
    context.arc(0, -2, 13 + tower.pulse * 8, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    context.fillStyle = definition.color;
    context.shadowColor = definition.color;
    context.shadowBlur = 12;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.font = "18px sans-serif";
    context.fillText(definition.symbol, 0, -2);
    context.restore();
  }

  function drawEnemy(enemy) {
    const definition = ENEMIES[enemy.type];
    const radius = enemy.radius;
    context.save();
    context.translate(enemy.x, enemy.y + Math.sin(enemy.wobble) * 1.5);
    context.fillStyle = "rgba(4, 8, 10, .45)";
    context.beginPath();
    context.ellipse(0, radius * 0.78, radius * 1.1, radius * 0.45, 0, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = definition.color;
    context.strokeStyle = definition.outline;
    context.lineWidth = 1.5;
    context.beginPath();
    if (definition.shape === "brute" || definition.shape === "boss") {
      context.roundRect(-radius, -radius, radius * 2, radius * 2, radius * 0.3);
    } else {
      context.arc(0, 0, radius, 0, Math.PI * 2);
    }
    context.fill();
    context.stroke();

    if (definition.shape === "boss") {
      context.fillStyle = "#f3d288";
      context.beginPath();
      context.moveTo(-radius * 0.7, -radius * 0.6);
      context.lineTo(-radius * 0.5, -radius * 1.1);
      context.lineTo(0, -radius * 0.75);
      context.lineTo(radius * 0.5, -radius * 1.1);
      context.lineTo(radius * 0.7, -radius * 0.6);
      context.closePath();
      context.fill();
    } else if (definition.shape !== "brute") {
      context.strokeStyle = definition.outline;
      context.beginPath();
      context.moveTo(-radius * 0.45, -radius * 0.55);
      context.lineTo(-radius * 0.7, -radius - 4);
      context.moveTo(radius * 0.45, -radius * 0.55);
      context.lineTo(radius * 0.7, -radius - 4);
      context.stroke();
    }

    context.fillStyle = "#161b1b";
    context.beginPath();
    context.arc(-radius * 0.28, -1, 1.7, 0, Math.PI * 2);
    context.arc(radius * 0.28, -1, 1.7, 0, Math.PI * 2);
    context.fill();

    const healthWidth = radius * 2.2;
    context.fillStyle = "rgba(12, 15, 17, .75)";
    context.fillRect(-healthWidth / 2, -radius - 8, healthWidth, 3);
    context.fillStyle = enemy.hp / enemy.maxHp > 0.5 ? "#a5c78b" : "#e28472";
    context.fillRect(-healthWidth / 2, -radius - 8, healthWidth * Math.max(0, enemy.hp / enemy.maxHp), 3);
    context.restore();
  }

  function draw(state, time) {
    drawBackground(time);
    for (const tower of state.towers) drawTower(state, tower, time);
    for (const enemy of state.enemies) drawEnemy(enemy);

    for (const projectile of state.projectiles) {
      context.save();
      context.shadowColor = projectile.color;
      context.shadowBlur = 14;
      context.fillStyle = projectile.color;
      context.beginPath();
      context.arc(projectile.x, projectile.y, projectile.towerType === "arrow" ? 3 : 4, 0, Math.PI * 2);
      context.fill();
      context.restore();
    }

    for (const particle of state.particles) {
      context.globalAlpha = Math.max(0, particle.life / particle.maxLife);
      context.fillStyle = particle.color;
      context.beginPath();
      context.arc(particle.x, particle.y, 2, 0, Math.PI * 2);
      context.fill();
      context.globalAlpha = 1;
    }

    if (state.pointer && state.started && !state.gameOver) {
      const column = Math.floor(state.pointer.x / BOARD.cellSize);
      const row = Math.floor(state.pointer.y / BOARD.cellSize);
      if (column >= 0 && column < BOARD.columns && row >= 0 && row < BOARD.rows) {
        const occupied = state.towers.some((tower) => tower.column === column && tower.row === row);
        context.globalAlpha = 0.6;
        context.fillStyle = isPathCell(column, row) || occupied ? "#e47168" : TOWERS[state.selectedTower].color;
        context.beginPath();
        context.arc(column * BOARD.cellSize + BOARD.cellSize / 2, row * BOARD.cellSize + BOARD.cellSize / 2, 12, 0, Math.PI * 2);
        context.fill();
        context.globalAlpha = 1;
      }
    }
  }

  return { draw };
}
