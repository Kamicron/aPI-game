import { TileKind } from './board.types';

/**
 * Génère un type de case aléatoire selon des poids prédéfinis
 */
export function randomTileKind(index: number): TileKind {
  if (index === 0) return 'start';

  const weights: { kind: TileKind; weight: number }[] = [
    { kind: 'coins', weight: 20 },      // 20%
    { kind: 'minigame', weight: 45 },   // 45%
    { kind: 'key_shop', weight: 5 },    // 5%
    { kind: 'bonus', weight: 15 },      // 15%
    { kind: 'malus', weight: 15 },      // 15%
  ];

  const total = weights.reduce((sum, w) => sum + w.weight, 0);
  const random = Math.random() * total;
  
  let cumulative = 0;
  for (const entry of weights) {
    cumulative += entry.weight;
    if (random < cumulative) {
      return entry.kind;
    }
  }

  return 'minigame'; // Fallback (le plus probable)
}

/**
 * Génère un nombre aléatoire entre min et max (inclus)
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
