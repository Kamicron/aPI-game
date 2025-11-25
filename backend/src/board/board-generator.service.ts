import { Injectable } from '@nestjs/common';
import { Board, Tile, TileKind } from './board.types';
import {
  BoardGenerationConfig,
  DEFAULT_BOARD_CONFIG,
} from './board-generation.config';
import { randomTileKind, randomInt } from './board.utils';

interface Point {
  x: number;
  y: number;
}

enum CellType {
  EMPTY = 'empty',
  MAIN_PATH = 'main_path',
  SHORTCUT = 'shortcut',
}

@Injectable()
export class BoardGeneratorService {
  private readonly DIRECTIONS: Point[] = [
    { x: 0, y: -1 }, // haut
    { x: 0, y: 1 }, // bas
    { x: -1, y: 0 }, // gauche
    { x: 1, y: 0 }, // droite
  ];

  generateBoard(
    id: string = `board-${Date.now()}`,
    config: BoardGenerationConfig = DEFAULT_BOARD_CONFIG,
  ): Board {
    // Génération simple : chemin case par case avec espacement
    const gridWidth = 20;
    const gridHeight = 14;
    const minPathLength = 30;
    const maxGlobalAttempts = 100;

    for (
      let globalAttempt = 0;
      globalAttempt < maxGlobalAttempts;
      globalAttempt++
    ) {
      const tiles: Tile[] = [];
      const pathCells: Point[] = [];
      const occupied = new Set<string>();

      // Départ
      const startX = 3;
      const startY = 3;
      let currentX = startX;
      let currentY = startY;
      pathCells.push({ x: currentX, y: currentY });
      occupied.add(`${currentX},${currentY}`);

      let attempts = 0;
      const maxAttempts = 500;

      // Générer le chemin case par case
      while (attempts < maxAttempts) {
        // Essayer les 4 directions dans un ordre aléatoire
        const directions = [
          { dx: 1, dy: 0 }, // droite
          { dx: -1, dy: 0 }, // gauche
          { dx: 0, dy: 1 }, // bas
          { dx: 0, dy: -1 }, // haut
        ];

        // Mélanger les directions
        for (let i = directions.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [directions[i], directions[j]] = [directions[j], directions[i]];
        }

        let moved = false;
        for (const dir of directions) {
          const nextX = currentX + dir.dx;
          const nextY = currentY + dir.dy;

          // Vérifier limites
          if (
            nextX < 2 ||
            nextX >= gridWidth - 2 ||
            nextY < 2 ||
            nextY >= gridHeight - 2
          ) {
            continue;
          }

          // Vérifier que la case n'est pas occupée
          if (occupied.has(`${nextX},${nextY}`)) {
            // Exception : si c'est le départ et qu'on a assez de cases, on peut boucler
            if (
              nextX === startX &&
              nextY === startY &&
              pathCells.length >= minPathLength
            ) {
              console.log(`Boucle fermée avec ${pathCells.length} cases`);
              moved = true;
              attempts = maxAttempts; // Forcer la sortie
              break;
            }
            continue;
          }

          // Vérifier l'espacement : pas de collision orthogonale (sauf case précédente)
          let hasSpace = true;
          const orthogonalDirs = [
            { x: 0, y: -1 }, // haut
            { x: 0, y: 1 }, // bas
            { x: -1, y: 0 }, // gauche
            { x: 1, y: 0 }, // droite
          ];

          for (const checkDir of orthogonalDirs) {
            const checkX = nextX + checkDir.x;
            const checkY = nextY + checkDir.y;

            // Ignorer la case d'où on vient
            if (checkX === currentX && checkY === currentY) continue;

            // Ignorer le départ SEULEMENT si on a assez de cases pour boucler
            if (
              checkX === startX &&
              checkY === startY &&
              pathCells.length >= minPathLength
            )
              continue;

            if (occupied.has(`${checkX},${checkY}`)) {
              hasSpace = false;
              break;
            }
          }

          if (!hasSpace) continue;

          // On peut avancer !
          currentX = nextX;
          currentY = nextY;
          pathCells.push({ x: currentX, y: currentY });
          occupied.add(`${currentX},${currentY}`);
          moved = true;
          attempts = 0; // Reset
          break;
        }

        if (!moved) {
          attempts++;
        }
      }

      // Vérifier que la dernière case est bien adjacente au départ
      const lastCell = pathCells[pathCells.length - 1];
      const distLastToStart =
        Math.abs(lastCell.x - startX) + Math.abs(lastCell.y - startY);
      console.log(
        `Tentative ${globalAttempt + 1}: Dernière case: (${lastCell.x}, ${lastCell.y}), Distance: ${distLastToStart}`,
      );

      // Si la boucle n'est pas fermée, recommencer
      if (distLastToStart !== 1) {
        console.log(`Boucle non fermée, on recommence...`);
        continue;
      }

      // Boucle fermée ! Créer les tiles
      console.log(`✓ Boucle fermée avec ${pathCells.length} cases`);
      console.log(`Première case: (${pathCells[0].x}, ${pathCells[0].y})`);
      console.log(
        `Dernière case: (${pathCells[pathCells.length - 1].x}, ${pathCells[pathCells.length - 1].y})`,
      );

      for (let i = 0; i < pathCells.length; i++) {
        const cell = pathCells[i];
        const kind = randomTileKind(i);

        const tile: Tile = {
          id: i,
          kind,
          x: cell.x,
          y: cell.y,
          next: [(i + 1) % pathCells.length],
        };

        if (kind === 'coins') {
          tile.coinsChange = randomInt(3, 8);
        } else if (kind === 'malus') {
          tile.coinsChange = -randomInt(3, 8);
        } else if (kind === 'key_shop') {
          tile.keyPrice = 30;
        }

        tiles.push(tile);
      }

      // GARANTIR start et key_shop
      if (tiles.length > 0) {
        tiles[0].kind = 'start';
        tiles[0].coinsChange = undefined;
        tiles[0].keyPrice = undefined;
      }

      const hasKeyShop = tiles.some((t) => t.kind === 'key_shop');
      if (!hasKeyShop && tiles.length > 1) {
        const midIndex = Math.floor(tiles.length / 2);
        tiles[midIndex].kind = 'key_shop';
        tiles[midIndex].keyPrice = 30;
        tiles[midIndex].coinsChange = undefined;
      }

      return {
        id,
        tiles,
      };
    }

    // Si on arrive ici, toutes les tentatives ont échoué, utiliser le fallback
    console.log('Toutes les tentatives ont échoué, utilisation du fallback');
    return this.generateRectangularFallback(id);
  }

  // A. Créer la grille vide
  private createEmptyGrid(config: BoardGenerationConfig): CellType[][] {
    const grid: CellType[][] = [];
    for (let y = 0; y < config.gridHeight; y++) {
      grid[y] = [];
      for (let x = 0; x < config.gridWidth; x++) {
        grid[y][x] = CellType.EMPTY;
      }
    }
    return grid;
  }

  // B. Génération du chemin principal avec backtracking
  private generateMainPath(
    grid: CellType[][],
    startCell: Point,
    config: BoardGenerationConfig,
  ): Point[] | null {
    const maxBacktrackAttempts = config.maxBacktrackAttempts;
    let attempts = 0;

    const mainPath: Point[] = [startCell];
    let currentCell: Point = startCell;

    while (attempts < maxBacktrackAttempts) {
      attempts++;

      // B3. Tentative de fermeture de la boucle
      if (mainPath.length >= config.minMainPathLength) {
        if (this.isAdjacent(currentCell, startCell)) {
          // Question D7: Vérifier si la fermeture respecte l'espace
          if (this.canCloseLoop(grid, mainPath, currentCell, startCell)) {
            return mainPath; // Boucle fermée avec succès
          }
        }
      }

      // B2. Chercher les directions possibles
      const possibleDirections = this.getPossibleDirections(
        grid,
        currentCell,
        mainPath,
        config,
      );

      // Question D4: Y a-t-il au moins une direction possible ?
      if (possibleDirections.length > 0) {
        // Choisir une direction au hasard
        const chosenDir =
          possibleDirections[
            Math.floor(Math.random() * possibleDirections.length)
          ];
        const nextCell: Point = {
          x: currentCell.x + chosenDir.x,
          y: currentCell.y + chosenDir.y,
        };

        // Avancer
        mainPath.push(nextCell);
        currentCell = nextCell;
      } else {
        // B4. Gestion de blocage - Backtracking
        if (mainPath.length <= 1) {
          return null; // B5. Échec total
        }

        // Reculer d'une case
        mainPath.pop();
        currentCell = mainPath[mainPath.length - 1];
      }
    }

    return null; // Échec après trop de tentatives
  }

  // B2. Chercher les directions possibles
  private getPossibleDirections(
    grid: CellType[][],
    currentCell: Point,
    mainPath: Point[],
    config: BoardGenerationConfig,
  ): Point[] {
    const possibleDirs: Point[] = [];

    for (const dir of this.DIRECTIONS) {
      const neighbor: Point = {
        x: currentCell.x + dir.x,
        y: currentCell.y + dir.y,
      };

      // Question D1: La case voisine est-elle dans la grille ?
      if (!this.isInGrid(neighbor, config)) {
        continue;
      }

      // Question D2: La case voisine est-elle vide ?
      if (grid[neighbor.y][neighbor.x] !== CellType.EMPTY) {
        continue;
      }

      // Question D3: Respecte-t-on l'espace de 1 case ?
      if (!this.respectsSpacing(grid, neighbor, currentCell, mainPath)) {
        continue;
      }

      possibleDirs.push(dir);
    }

    return possibleDirs;
  }

  // Question D1: Vérifier si dans la grille (avec marges de 2 cases)
  private isInGrid(cell: Point, config: BoardGenerationConfig): boolean {
    return (
      cell.x >= 2 &&
      cell.x < config.gridWidth - 2 &&
      cell.y >= 2 &&
      cell.y < config.gridHeight - 2
    );
  }

  // Question D3: Respecter l'espace de 1 case
  private respectsSpacing(
    grid: CellType[][],
    neighbor: Point,
    currentCell: Point,
    mainPath: Point[],
  ): boolean {
    // Vérifier toutes les cases autour (8 directions : haut, bas, gauche, droite + diagonales)
    const allDirections = [
      { x: 0, y: -1 }, // haut
      { x: 0, y: 1 }, // bas
      { x: -1, y: 0 }, // gauche
      { x: 1, y: 0 }, // droite
      { x: -1, y: -1 }, // diag haut-gauche
      { x: 1, y: -1 }, // diag haut-droite
      { x: -1, y: 1 }, // diag bas-gauche
      { x: 1, y: 1 }, // diag bas-droite
    ];

    for (const dir of allDirections) {
      const around: Point = {
        x: neighbor.x + dir.x,
        y: neighbor.y + dir.y,
      };

      // Ignorer si c'est la case courante (d'où on vient)
      if (around.x === currentCell.x && around.y === currentCell.y) {
        continue;
      }

      // Vérifier les limites
      if (
        around.y < 0 ||
        around.y >= grid.length ||
        around.x < 0 ||
        around.x >= grid[0].length
      ) {
        continue;
      }

      // Si une case autour est déjà un chemin (même en diagonale), violation
      if (grid[around.y][around.x] !== CellType.EMPTY) {
        return false;
      }
    }

    return true;
  }

  // B3. Vérifier si deux cases sont adjacentes
  private isAdjacent(cell1: Point, cell2: Point): boolean {
    const dx = Math.abs(cell1.x - cell2.x);
    const dy = Math.abs(cell1.y - cell2.y);
    return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
  }

  // Question D7: Vérifier si fermer la boucle respecte l'espace
  private canCloseLoop(
    grid: CellType[][],
    mainPath: Point[],
    currentCell: Point,
    startCell: Point,
  ): boolean {
    const pathSet = new Set(mainPath.map((p) => `${p.x},${p.y}`));

    // Vérifier autour du point de départ
    for (const dir of this.DIRECTIONS) {
      const around: Point = {
        x: startCell.x + dir.x,
        y: startCell.y + dir.y,
      };

      // Ignorer la case courante (qui va se connecter)
      if (around.x === currentCell.x && around.y === currentCell.y) {
        continue;
      }

      // Ignorer les cases déjà dans le chemin principal
      if (pathSet.has(`${around.x},${around.y}`)) {
        continue;
      }

      // Si une case autour n'est pas vide et pas dans le chemin, problème
      if (
        around.y >= 0 &&
        around.y < grid.length &&
        around.x >= 0 &&
        around.x < grid[0].length
      ) {
        if (grid[around.y][around.x] !== CellType.EMPTY) {
          return false;
        }
      }
    }

    return true;
  }

  // C. Génération des raccourcis
  private generateShortcuts(
    grid: CellType[][],
    mainPath: Point[],
    config: BoardGenerationConfig,
  ): Point[][] {
    const shortcuts: Point[][] = [];
    const maxShortcutAttempts = config.maxShortcutAttempts;

    // C2. Boucle de création des raccourcis
    for (let attempt = 0; attempt < maxShortcutAttempts; attempt++) {
      // Question D9: Nombre de raccourcis suffisant ?
      if (shortcuts.length >= config.minShortcuts) {
        break;
      }

      // Choisir au hasard une case du chemin principal
      const startIndex = Math.floor(Math.random() * mainPath.length);
      const shortcutStart = mainPath[startIndex];

      // Créer une nouvelle branche
      const branch = this.growShortcutBranch(
        grid,
        shortcutStart,
        mainPath,
        startIndex,
        config,
      );

      if (branch && branch.length > 0) {
        shortcuts.push(branch);

        // Marquer les cases du raccourci dans la grille
        for (const cell of branch) {
          grid[cell.y][cell.x] = CellType.SHORTCUT;
        }
      }
    }

    return shortcuts;
  }

  // C2. Croissance d'une branche de raccourci
  private growShortcutBranch(
    grid: CellType[][],
    startCell: Point,
    mainPath: Point[],
    startIndex: number,
    config: BoardGenerationConfig,
  ): Point[] | null {
    const branch: Point[] = [];
    let currentCell: Point = startCell;
    const mainPathSet = new Set(mainPath.map((p) => `${p.x},${p.y}`));

    for (let step = 0; step < config.maxShortcutLength; step++) {
      // Chercher les directions possibles
      const possibleDirs: Point[] = [];

      for (const dir of this.DIRECTIONS) {
        const neighbor: Point = {
          x: currentCell.x + dir.x,
          y: currentCell.y + dir.y,
        };

        // Dans la grille ?
        if (
          neighbor.x < 1 ||
          neighbor.x >= grid[0].length - 1 ||
          neighbor.y < 1 ||
          neighbor.y >= grid.length - 1
        ) {
          continue;
        }

        // Case vide ou chemin principal ?
        const cellType = grid[neighbor.y][neighbor.x];
        if (cellType !== CellType.EMPTY && cellType !== CellType.MAIN_PATH) {
          continue;
        }

        // Si c'est vide, vérifier l'espacement
        if (cellType === CellType.EMPTY) {
          if (!this.respectsShortcutSpacing(grid, neighbor, currentCell)) {
            continue;
          }
        }

        possibleDirs.push(dir);
      }

      // Question D10: Existe-t-il au moins une direction possible ?
      if (possibleDirs.length === 0) {
        return null; // Branche échouée
      }

      // Choisir une direction au hasard
      const chosenDir =
        possibleDirs[Math.floor(Math.random() * possibleDirs.length)];
      const nextCell: Point = {
        x: currentCell.x + chosenDir.x,
        y: currentCell.y + chosenDir.y,
      };

      // Question D11: La nouvelle case appartient-elle au chemin principal ?
      if (mainPathSet.has(`${nextCell.x},${nextCell.y}`)) {
        // Point de sortie potentiel
        const exitIndex = mainPath.findIndex(
          (p) => p.x === nextCell.x && p.y === nextCell.y,
        );

        // Question D12: La distance est-elle suffisante ?
        const distance = this.calculatePathDistance(
          startIndex,
          exitIndex,
          mainPath.length,
        );

        if (distance >= config.minShortcutDistance) {
          // Raccourci valide
          return branch;
        }
      }

      // Ajouter à la branche
      branch.push(nextCell);
      currentCell = nextCell;
    }

    return null;
  }

  // Vérifier l'espacement pour les raccourcis
  private respectsShortcutSpacing(
    grid: CellType[][],
    neighbor: Point,
    currentCell: Point,
  ): boolean {
    for (const dir of this.DIRECTIONS) {
      const around: Point = {
        x: neighbor.x + dir.x,
        y: neighbor.y + dir.y,
      };

      if (around.x === currentCell.x && around.y === currentCell.y) {
        continue;
      }

      if (
        around.y < 0 ||
        around.y >= grid.length ||
        around.x < 0 ||
        around.x >= grid[0].length
      ) {
        continue;
      }

      // Pour les raccourcis, on autorise le chemin principal mais pas d'autres raccourcis
      if (grid[around.y][around.x] === CellType.SHORTCUT) {
        return false;
      }
    }

    return true;
  }

  // Calculer la distance le long du circuit principal
  private calculatePathDistance(
    index1: number,
    index2: number,
    pathLength: number,
  ): number {
    const forward = Math.abs(index2 - index1);
    const backward = pathLength - forward;
    return Math.min(forward, backward);
  }

  // Créer le Board final à partir des chemins
  private createBoardFromPaths(
    id: string,
    mainPath: Point[],
    shortcuts: Point[][],
  ): Board {
    const tiles: Tile[] = [];
    let tileId = 0;

    // Créer les tiles du chemin principal
    const mainPathTiles: Tile[] = [];
    for (let i = 0; i < mainPath.length; i++) {
      const pos = mainPath[i];
      const kind = randomTileKind(i);

      const tile: Tile = {
        id: tileId++,
        kind,
        x: pos.x,
        y: pos.y,
        next: [],
      };

      if (kind === 'coins') {
        tile.coinsChange = randomInt(3, 8);
      } else if (kind === 'malus') {
        tile.coinsChange = -randomInt(3, 8);
      } else if (kind === 'key_shop') {
        tile.keyPrice = 30;
      }

      mainPathTiles.push(tile);
    }

    // Connecter le chemin principal en boucle
    for (let i = 0; i < mainPathTiles.length; i++) {
      mainPathTiles[i].next = [
        mainPathTiles[(i + 1) % mainPathTiles.length].id,
      ];
    }

    tiles.push(...mainPathTiles);

    // Créer les tiles des raccourcis
    for (const shortcut of shortcuts) {
      const shortcutTiles: Tile[] = [];

      for (const pos of shortcut) {
        const kind: TileKind = 'bonus';

        const tile: Tile = {
          id: tileId++,
          kind,
          x: pos.x,
          y: pos.y,
          next: [],
        };

        shortcutTiles.push(tile);
      }

      // Connecter les tiles du raccourci entre elles
      for (let i = 0; i < shortcutTiles.length - 1; i++) {
        shortcutTiles[i].next = [shortcutTiles[i + 1].id];
      }

      tiles.push(...shortcutTiles);
    }

    // GARANTIR la case de départ (toujours la première)
    if (tiles.length > 0) {
      tiles[0].kind = 'start';
      tiles[0].coinsChange = undefined;
      tiles[0].keyPrice = undefined;
    }

    // GARANTIR au moins un key shop dans le circuit principal
    const keyShopExists = mainPathTiles.some(
      (tile) => tile.kind === 'key_shop',
    );
    if (!keyShopExists && mainPathTiles.length > 1) {
      // Placer le key shop vers le milieu du circuit
      const keyShopIndex = Math.floor(mainPathTiles.length / 2);
      mainPathTiles[keyShopIndex].kind = 'key_shop';
      mainPathTiles[keyShopIndex].keyPrice = 30;
      mainPathTiles[keyShopIndex].coinsChange = undefined;
    }

    return {
      id,
      tiles,
    };
  }

  private generateRectangularFallback(id: string): Board {
    const tileCount = 20;
    const tiles: Tile[] = [];

    for (let i = 0; i < tileCount; i++) {
      const tile: Tile = {
        id: i,
        kind: randomTileKind(i),
        x: i % 10,
        y: Math.floor(i / 10),
        next: [(i + 1) % tileCount],
      };
      tiles.push(tile);
    }

    tiles[0].kind = 'start';

    return { id, tiles };
  }
}
