import { Board } from './board.types';

/**
 * Visualise un plateau dans la console (mode texte)
 * Utile pour déboguer et vérifier la génération
 */
export function visualizeBoard(board: Board): void {
  // Trouver les dimensions
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const tile of board.tiles) {
    minX = Math.min(minX, tile.x);
    maxX = Math.max(maxX, tile.x);
    minY = Math.min(minY, tile.y);
    maxY = Math.max(maxY, tile.y);
  }

  const width = maxX - minX + 1;
  const height = maxY - minY + 1;

  // Créer la grille
  const grid: string[][] = [];
  for (let y = 0; y < height; y++) {
    grid[y] = [];
    for (let x = 0; x < width; x++) {
      grid[y][x] = '·'; // Case vide
    }
  }

  // Placer les tiles
  const tileMap = new Map<string, number>();
  for (let i = 0; i < board.tiles.length; i++) {
    const tile = board.tiles[i];
    const x = tile.x - minX;
    const y = tile.y - minY;
    tileMap.set(`${tile.x},${tile.y}`, i);

    // Symbole selon le type
    let symbol = '?';
    switch (tile.kind) {
      case 'start':
        symbol = 'S';
        break;
      case 'coins':
        symbol = '$';
        break;
      case 'minigame':
        symbol = 'M';
        break;
      case 'key_shop':
        symbol = 'K';
        break;
      case 'bonus':
        symbol = '+';
        break;
      case 'malus':
        symbol = '-';
        break;
    }

    grid[y][x] = symbol;
  }

  // Afficher
  console.log('\n' + '='.repeat(width * 2 + 2));
  console.log(`Plateau: ${board.id}`);
  console.log(`Taille: ${width}x${height}`);
  console.log(`Nombre de cases: ${board.tiles.length}`);
  console.log('='.repeat(width * 2 + 2));
  console.log('\nLégende:');
  console.log('  S = Start (départ)');
  console.log('  $ = Coins (pièces)');
  console.log('  M = Minigame');
  console.log('  K = Key shop');
  console.log('  + = Bonus');
  console.log('  - = Malus');
  console.log('  · = Vide');
  console.log('\n' + '='.repeat(width * 2 + 2) + '\n');

  for (let y = 0; y < height; y++) {
    let line = '';
    for (let x = 0; x < width; x++) {
      line += grid[y][x] + ' ';
    }
    console.log(line);
  }

  console.log('\n' + '='.repeat(width * 2 + 2) + '\n');

  // Statistiques
  const stats = {
    start: 0,
    coins: 0,
    minigame: 0,
    key_shop: 0,
    bonus: 0,
    malus: 0,
  };

  for (const tile of board.tiles) {
    stats[tile.kind]++;
  }

  console.log('Statistiques:');
  console.log(`  Start: ${stats.start}`);
  console.log(`  Coins: ${stats.coins}`);
  console.log(`  Minigames: ${stats.minigame}`);
  console.log(`  Key shops: ${stats.key_shop}`);
  console.log(`  Bonus: ${stats.bonus}`);
  console.log(`  Malus: ${stats.malus}`);
  console.log('');
}

/**
 * Exemple d'utilisation:
 * 
 * import { BoardGeneratorService } from './board-generator.service';
 * import { visualizeBoard } from './visualize-board';
 * 
 * const generator = new BoardGeneratorService();
 * const board = generator.generateBoard();
 * visualizeBoard(board);
 */
