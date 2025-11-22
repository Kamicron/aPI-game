export type TileKind =
  | 'start'
  | 'coins'
  | 'minigame'
  | 'key_shop'
  | 'malus'
  | 'bonus';

export type MinigameCategory = 'skill' | 'luck' | 'quiz' | 'other';

export interface Tile {
  id: number;
  kind: TileKind;
  x: number;
  y: number;
  next: number[];
  coinsChange?: number;
  minigameCategory?: MinigameCategory;
  keyPrice?: number;
}

export interface Board {
  id: string;
  tiles: Tile[];
}
