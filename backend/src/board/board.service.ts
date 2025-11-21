import { Injectable } from '@nestjs/common';
import { Board, Tile, TileKind } from './board.types';

@Injectable()
export class BoardService {
  generateBoard(id: string = `board-${Date.now()}`): Board {
    const tileCount = 24;
    const radius = 200;

    const tiles: Tile[] = [];

    // Create main circular path
    for (let i = 0; i < tileCount; i++) {
      const angle = (2 * Math.PI * i) / tileCount;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;

      const kind = this.randomTileKind(i);

      const tile: Tile = {
        id: i,
        kind,
        x,
        y,
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

    // Ensure there is exactly one start tile
    tiles[0].kind = 'start';

    // Add a few branches
    this.addBranches(tiles, radius * 0.6);

    return {
      id,
      tiles,
    };
  }

  private randomTileKind(index: number): TileKind {
    if (index === 0) return 'start';

    const weights: { kind: TileKind; weight: number }[] = [
      { kind: 'coins', weight: 40 },
      { kind: 'minigame', weight: 20 },
      { kind: 'key_shop', weight: 10 },
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

  private addBranches(tiles: Tile[], innerRadius: number) {
    const tileCount = tiles.length;
    const branchCount = 3;

    for (let b = 0; b < branchCount; b++) {
      const startIndex = this.randomInt(1, tileCount - 4);
      const endIndex = (startIndex + this.randomInt(3, 8)) % tileCount;

      const branchLength = this.randomInt(2, 4);
      const baseTile = tiles[startIndex];

      const startAngle = Math.atan2(baseTile.y, baseTile.x);

      let previousId = baseTile.id;

      for (let i = 0; i < branchLength; i++) {
        const id = tiles.length;
        const t = i / (branchLength - 1 || 1);
        const angle = startAngle + (t - 0.5) * 0.7;

        const x = Math.cos(angle) * innerRadius;
        const y = Math.sin(angle) * innerRadius;

        const kind: TileKind = Math.random() < 0.5 ? 'coins' : 'malus';

        const tile: Tile = {
          id,
          kind,
          x,
          y,
          next: [],
        };

        if (kind === 'coins') {
          tile.coinsChange = this.randomInt(4, 10);
        } else if (kind === 'malus') {
          tile.coinsChange = -this.randomInt(4, 10);
        }

        tiles.push(tile);

        const prevTile = tiles.find((t) => t.id === previousId);
        if (prevTile && !prevTile.next.includes(id)) {
          prevTile.next.push(id);
        }

        previousId = id;
      }

      const branchEndTile = tiles.find((t) => t.id === previousId);
      if (branchEndTile && !branchEndTile.next.includes(endIndex)) {
        branchEndTile.next.push(endIndex);
      }
    }
  }

  private randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}
