export type BomberTileKind = 'empty' | 'indestructible' | 'destructible' | 'powerup' | 'spawn'

export type BomberPowerUpKind = 'extra_bomb' | 'bomb_power' | 'speed'

export interface BomberTile {
  x: number
  y: number
  kind: BomberTileKind
  /** Power-up caché qui apparaît si le bloc destructible est détruit */
  hiddenPowerUp?: BomberPowerUpKind
}

export interface BomberSpawn {
  /** Index logique du joueur (0,1,2,...) */
  playerIndex: number
  x: number
  y: number
}

export interface BomberMap {
  width: number
  height: number
  tiles: BomberTile[]
  spawns: BomberSpawn[]
}
