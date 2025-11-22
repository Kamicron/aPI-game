/**
 * Configuration pour la génération du plateau de jeu
 * Modifiez ces valeurs pour ajuster le comportement du générateur
 */

export interface BoardGenerationConfig {
  /** Largeur de la grille */
  gridWidth: number;
  
  /** Hauteur de la grille */
  gridHeight: number;
  
  /** Longueur minimale du circuit principal */
  minMainPathLength: number;
  
  /** Nombre minimum de raccourcis à générer */
  minShortcuts: number;
  
  /** Longueur maximale d'un raccourci */
  maxShortcutLength: number;
  
  /** Distance minimale pour qu'un raccourci soit valide */
  minShortcutDistance: number;
  
  /** Nombre maximum de tentatives globales avant fallback */
  maxGlobalAttempts: number;
  
  /** Nombre maximum de tentatives pour créer des raccourcis */
  maxShortcutAttempts: number;
  
  /** Nombre maximum d'itérations de backtracking */
  maxBacktrackAttempts: number;
}

/**
 * Configuration par défaut
 * Optimisée pour un bon équilibre entre complexité et temps de génération
 */
export const DEFAULT_BOARD_CONFIG: BoardGenerationConfig = {
  gridWidth: 20,
  gridHeight: 15,
  minMainPathLength: 15,
  minShortcuts: 0,
  maxShortcutLength: 4,
  minShortcutDistance: 6,
  maxGlobalAttempts: 200,
  maxShortcutAttempts: 30,
  maxBacktrackAttempts: 3000,
};

/**
 * Configuration pour un petit plateau (plus rapide)
 */
export const SMALL_BOARD_CONFIG: BoardGenerationConfig = {
  gridWidth: 15,
  gridHeight: 15,
  minMainPathLength: 20,
  minShortcuts: 1,
  maxShortcutLength: 6,
  minShortcutDistance: 4,
  maxGlobalAttempts: 30,
  maxShortcutAttempts: 50,
  maxBacktrackAttempts: 500,
};

/**
 * Configuration pour un grand plateau (plus complexe)
 */
export const LARGE_BOARD_CONFIG: BoardGenerationConfig = {
  gridWidth: 25,
  gridHeight: 25,
  minMainPathLength: 35,
  minShortcuts: 3,
  maxShortcutLength: 10,
  minShortcutDistance: 6,
  maxGlobalAttempts: 100,
  maxShortcutAttempts: 150,
  maxBacktrackAttempts: 2000,
};
