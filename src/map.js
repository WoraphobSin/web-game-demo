import { BOARD, PATH } from "./config.js";

export function createPathCells() {
  const cells = new Set();

  for (let index = 0; index < PATH.length - 1; index++) {
    const from = PATH[index];
    const to = PATH[index + 1];
    const x1 = Math.round((from.x - BOARD.cellSize / 2) / BOARD.cellSize);
    const y1 = Math.round((from.y - BOARD.cellSize / 2) / BOARD.cellSize);
    const x2 = Math.round((to.x - BOARD.cellSize / 2) / BOARD.cellSize);
    const y2 = Math.round((to.y - BOARD.cellSize / 2) / BOARD.cellSize);
    const dx = Math.sign(x2 - x1);
    const dy = Math.sign(y2 - y1);
    let column = x1;
    let row = y1;

    cells.add(`${column},${row}`);
    while (column !== x2 || row !== y2) {
      if (column !== x2) column += dx;
      else row += dy;
      cells.add(`${column},${row}`);
    }
  }

  return cells;
}

export const PATH_CELLS = createPathCells();

export function getCellPosition(column, row) {
  return {
    x: column * BOARD.cellSize + BOARD.cellSize / 2,
    y: row * BOARD.cellSize + BOARD.cellSize / 2
  };
}

export function isInsideBoard(column, row) {
  return column >= 0 && column < BOARD.columns && row >= 0 && row < BOARD.rows;
}

export function isPathCell(column, row) {
  return PATH_CELLS.has(`${column},${row}`);
}
