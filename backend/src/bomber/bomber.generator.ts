import {
  BomberMap,
  BomberTile,
  BomberTileKind,
  BomberSpawn,
  BomberPowerUpKind,
} from './bomber.types';

function computeSize(playerCount: number): number {
  if (playerCount <= 2) return 11;
  if (playerCount <= 4) return 13;
  if (playerCount <= 6) return 15;
  return 17;
}

function inBounds(
  x: number,
  y: number,
  width: number,
  height: number,
): boolean {
  return x >= 0 && x < width && y >= 0 && y < height;
}

function createEmptyGrid(width: number, height: number): BomberTile[][] {
  const grid: BomberTile[][] = [];

  for (let y = 0; y < height; y++) {
    const row: BomberTile[] = [];

    for (let x = 0; x < width; x++) {
      row.push({ x, y, kind: 'empty' });
    }

    grid.push(row);
  }

  return grid;
}

function placeIndestructibleWalls(grid: BomberTile[][]): void {
  const height = grid.length;
  const width = grid[0]?.length ?? 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const border = x === 0 || y === 0 || x === width - 1 || y === height - 1;
      const pattern = x % 2 === 1 && y % 2 === 1;

      if (border || pattern) {
        grid[y][x].kind = 'indestructible';
      }
    }
  }
}

function chooseSpawnPositions(
  width: number,
  height: number,
  playerCount: number,
): { x: number; y: number }[] {
  const positions: { x: number; y: number }[] = [];

  const add = (x: number, y: number) => {
    if (positions.length < playerCount) {
      positions.push({ x, y });
    }
  };

  // Coins
  add(1, 1);
  add(width - 2, height - 2);
  add(width - 2, 1);
  add(1, height - 2);

  // Milieux des côtés si plus de 4 joueurs
  const midX = Math.floor(width / 2);
  const midY = Math.floor(height / 2);

  add(midX, 1);
  add(midX, height - 2);
  add(1, midY);
  add(width - 2, midY);

  // Si jamais il reste des joueurs, on complète grossièrement en balayant
  let x = 2;
  let y = 2;
  while (positions.length < playerCount && y < height - 2) {
    add(x, y);
    x += 2;
    if (x >= width - 2) {
      x = 2;
      y += 2;
    }
  }

  return positions.slice(0, playerCount);
}

function clearSpawnArea(grid: BomberTile[][], x: number, y: number): void {
  const height = grid.length;
  const width = grid[0]?.length ?? 0;

  const offsets = [
    [0, 0],
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ] as const;

  for (const [dx, dy] of offsets) {
    const nx = x + dx;
    const ny = y + dy;

    if (
      inBounds(nx, ny, width, height) &&
      grid[ny][nx].kind !== 'indestructible'
    ) {
      grid[ny][nx].kind = 'empty';
      delete grid[ny][nx].hiddenPowerUp;
    }
  }
}

function placeDestructibleBlocksAndPowerUps(
  grid: BomberTile[][],
  spawnPositions: { x: number; y: number }[],
): void {
  const height = grid.length;
  const width = grid[0]?.length ?? 0;

  const isSpawnOrNear = (x: number, y: number): boolean => {
    return spawnPositions.some(
      (s) => Math.abs(s.x - x) <= 1 && Math.abs(s.y - y) <= 1,
    );
  };

  const possiblePowerUps: BomberPowerUpKind[] = ['extra_bomb', 'bomb_power'];
  let hiddenPowerUpCount = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const tile = grid[y][x];

      if (tile.kind !== 'empty') continue;
      if (isSpawnOrNear(x, y)) continue;

      // 70% de chances de placer un bloc destructible
      if (Math.random() < 0.7) {
        tile.kind = 'destructible';

        // 40% de chances que ce bloc contienne un power-up caché
        if (Math.random() < 0.4) {
          const index = Math.floor(Math.random() * possiblePowerUps.length);
          tile.hiddenPowerUp = possiblePowerUps[index];
          hiddenPowerUpCount++;
        }
      }
    }
  }

  // Si la map est pauvre en power-ups, en ajouter quelques-uns aléatoirement
  const minPowerUps = Math.max(4, Math.floor((width * height) / 40));
  if (hiddenPowerUpCount < minPowerUps) {
    const remaining = minPowerUps - hiddenPowerUpCount;
    const candidates: BomberTile[] = [];

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const tile = grid[y][x];
        if (
          tile.kind === 'destructible' &&
          !tile.hiddenPowerUp &&
          !isSpawnOrNear(x, y)
        ) {
          candidates.push(tile);
        }
      }
    }

    for (let i = 0; i < remaining && candidates.length > 0; i++) {
      const idx = Math.floor(Math.random() * candidates.length);
      const tile = candidates.splice(idx, 1)[0];
      const index = Math.floor(Math.random() * possiblePowerUps.length);
      tile.hiddenPowerUp = possiblePowerUps[index];
    }
  }
}

export function generateBomberMap(playerCount: number): BomberMap {
  const clampedPlayers = Math.max(2, Math.min(playerCount, 8));
  const size = computeSize(clampedPlayers);

  const width = size;
  const height = size;

  const grid = createEmptyGrid(width, height);

  // 1) Murs indestructibles
  placeIndestructibleWalls(grid);

  // 2) Spawns
  const spawnPositions = chooseSpawnPositions(width, height, clampedPlayers);
  const spawns: BomberSpawn[] = [];

  spawnPositions.forEach((pos, index) => {
    clearSpawnArea(grid, pos.x, pos.y);
    const tile = grid[pos.y][pos.x];
    tile.kind = 'spawn';
    delete tile.hiddenPowerUp;

    spawns.push({ playerIndex: index, x: pos.x, y: pos.y });
  });

  // 3) Blocs destructibles et power-ups
  placeDestructibleBlocksAndPowerUps(grid, spawnPositions);

  const tiles: BomberTile[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      tiles.push(grid[y][x]);
    }
  }

  const map: BomberMap = {
    width,
    height,
    tiles,
    spawns,
  };

  return map;
}
