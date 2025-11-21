import { Injectable } from '@nestjs/common';
import { Board, Tile, TileKind } from './board.types';

@Injectable()
export class BoardService {
  generateBoard(id: string = `board-${Date.now()}`): Board {
    const minTiles = 20;
    const maxTiles = 32;
    const gridWidth = 20;
    const gridHeight = 20;

    const maxAttempts = 200;

    interface Point {
      x: number;
      y: number;
    }

    const directions: Point[] = [
      { x: 1, y: 0 }, // right
      { x: -1, y: 0 }, // left
      { x: 0, y: 1 }, // down
      { x: 0, y: -1 }, // up
    ];

    function key(p: Point): string {
      return `${p.x},${p.y}`;
    }

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const occupied = new Set<string>();
      const forbidden = new Set<string>();
      const path: Point[] = [];

      // Start near the center to leave room around
      const start: Point = {
        x: this.randomInt(3, gridWidth - 4),
        y: this.randomInt(3, gridHeight - 4),
      };

      path.push(start);
      occupied.add(key(start));

      // Mark immediate neighbours of start as forbidden so we keep a gap
      const startNeighbours: Point[] = [
        { x: start.x + 1, y: start.y },
        { x: start.x - 1, y: start.y },
        { x: start.x, y: start.y + 1 },
        { x: start.x, y: start.y - 1 },
      ];
      for (const n of startNeighbours) {
        if (n.x > 1 && n.x < gridWidth - 1 && n.y > 1 && n.y < gridHeight - 1) {
          forbidden.add(key(n));
        }
      }

      let current: Point = start;
      let prevDir: Point | null = null;

      while (path.length < maxTiles) {
        // Try to stop if we have enough tiles and are adjacent to start
        if (path.length >= minTiles) {
          const distToStart =
            Math.abs(current.x - start.x) + Math.abs(current.y - start.y);
          if (distToStart === 1) {
            // We have a closed loop candidate
            const tiles: Tile[] = [];

            for (let i = 0; i < path.length; i++) {
              const pos = path[i];
              const kind = this.randomTileKind(i);

              const tile: Tile = {
                id: i,
                kind,
                x: pos.x,
                y: pos.y,
                next: [(i + 1) % path.length],
              };

              if (kind === 'coins') {
                tile.coinsChange = this.randomInt(3, 8);
              } else if (kind === 'malus') {
                tile.coinsChange = -this.randomInt(3, 8);
              } else if (kind === 'key_shop') {
                tile.keyPrice = 30;
              }

              tiles.push(tile);
            }

            // Ensure start tile at index 0
            tiles[0].kind = 'start';

            // Ensure at least one key shop
            if (!tiles.some((tile) => tile.kind === 'key_shop')) {
              const index = this.randomInt(1, tiles.length - 1);
              tiles[index].kind = 'key_shop';
              tiles[index].keyPrice = 30;
              tiles[index].coinsChange = undefined;
            }

            return {
              id,
              tiles,
            };
          }
        }

        // Build candidate directions
        const candidates: { dir: Point; weight: number }[] = [];

        for (const dir of directions) {
          const next: Point = { x: current.x + dir.x, y: current.y + dir.y };

          if (
            next.x <= 1 ||
            next.x >= gridWidth - 1 ||
            next.y <= 1 ||
            next.y >= gridHeight - 1
          ) {
            continue;
          }

          const nextKey = key(next);
          if (occupied.has(nextKey) || forbidden.has(nextKey)) {
            continue;
          }

          // Avoid immediate backtracking
          if (prevDir && dir.x === -prevDir.x && dir.y === -prevDir.y) {
            continue;
          }

          let weight = 1;
          if (!prevDir || dir.x !== prevDir.x || dir.y !== prevDir.y) {
            // prefer turns slightly over straight lines
            weight = 2;
          }

          candidates.push({ dir, weight });
        }

        if (candidates.length === 0) {
          // Dead end, give up this attempt
          break;
        }

        // Weighted random choice of direction
        const totalWeight = candidates.reduce((sum, c) => sum + c.weight, 0);
        let r = this.randomInt(1, totalWeight);
        let chosen: Point | null = null;

        for (const c of candidates) {
          if (r <= c.weight) {
            chosen = c.dir;
            break;
          }
          r -= c.weight;
        }

        if (!chosen) {
          break;
        }

        const next: Point = {
          x: current.x + chosen.x,
          y: current.y + chosen.y,
        };
        path.push(next);
        const nextKey = key(next);
        occupied.add(nextKey);

        // Mark neighbours of next as forbidden to keep a one-cell buffer
        const neighbours: Point[] = [
          { x: next.x + 1, y: next.y },
          { x: next.x - 1, y: next.y },
          { x: next.x, y: next.y + 1 },
          { x: next.x, y: next.y - 1 },
        ];

        for (const n of neighbours) {
          const nKey = key(n);
          if (!occupied.has(nKey)) {
            if (
              n.x > 1 &&
              n.x < gridWidth - 1 &&
              n.y > 1 &&
              n.y < gridHeight - 1
            ) {
              forbidden.add(nKey);
            }
          }
        }

        // If we are making a turn, also forbid the diagonal corner cell
        if (prevDir && (chosen.x !== prevDir.x || chosen.y !== prevDir.y)) {
          const diag: Point = {
            x: current.x + prevDir.x + chosen.x,
            y: current.y + prevDir.y + chosen.y,
          };
          const diagKey = key(diag);
          if (!occupied.has(diagKey)) {
            if (
              diag.x > 1 &&
              diag.x < gridWidth - 1 &&
              diag.y > 1 &&
              diag.y < gridHeight - 1
            ) {
              forbidden.add(diagKey);
            }
          }
        }

        current = next;
        prevDir = chosen;
      }
    }

    // Fallback: if for some reason we could not build a loop, use a simple
    // rectangular perimeter so that we always return a valid board.
    return this.generateRectangularFallback(id);
  }

  private generateRectangularFallback(id: string): Board {
    const tileCount = 20;
    const gridWidth = 8;
    const gridHeight = 6;

    const minX = 2;
    const minY = 2;
    const maxX = minX + gridWidth - 1;
    const maxY = minY + gridHeight - 1;

    const perimeter: { x: number; y: number }[] = [];

    // Top edge left -> right
    for (let x = minX; x <= maxX; x++) {
      perimeter.push({ x, y: minY });
    }
    // Right edge top -> bottom (sans le coin déjà pris)
    for (let y = minY + 1; y <= maxY; y++) {
      perimeter.push({ x: maxX, y });
    }
    // Bottom edge right -> left (sans le coin déjà pris)
    for (let x = maxX - 1; x >= minX; x--) {
      perimeter.push({ x, y: maxY });
    }
    // Left edge bottom -> top (sans les coins déjà pris)
    for (let y = maxY - 1; y > minY; y--) {
      perimeter.push({ x: minX, y });
    }

    const tiles: Tile[] = [];

    for (let i = 0; i < tileCount; i++) {
      const pos = perimeter[i % perimeter.length];
      const kind = this.randomTileKind(i);

      const tile: Tile = {
        id: i,
        kind,
        x: pos.x,
        y: pos.y,
        next: [(i + 1) % tileCount],
      };

      if (kind === 'coins') {
        tile.coinsChange = this.randomInt(3, 8);
      } else if (kind === 'malus') {
        tile.coinsChange = -this.randomInt(3, 8);
      } else if (kind === 'key_shop') {
        tile.keyPrice = 30;
      }

      tiles.push(tile);
    }

    tiles[0].kind = 'start';

    if (!tiles.some((tile) => tile.kind === 'key_shop')) {
      const index = this.randomInt(1, tileCount - 1);
      tiles[index].kind = 'key_shop';
      tiles[index].keyPrice = 30;
      tiles[index].coinsChange = undefined;
    }

    return {
      id,
      tiles,
    };
  }

  private randomTileKind(index: number): TileKind {
    if (index === 0) return 'start';

    const weights: { kind: TileKind; weight: number }[] = [
      { kind: 'coins', weight: 20 },
      { kind: 'minigame', weight: 45 },
      { kind: 'key_shop', weight: 5 },
      { kind: 'bonus', weight: 15 },
      { kind: 'malus', weight: 15 },
    ];

    const total = weights.reduce((sum, w) => sum + w.weight, 0);
    let r = this.randomInt(1, total);

    for (const entry of weights) {
      if (r <= entry.weight) {
        return entry.kind;
      }
      r -= entry.weight;
    }

    return 'coins';
  }

  private randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}
