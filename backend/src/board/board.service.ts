import { Injectable } from '@nestjs/common';
import { Board } from './board.types';
import { BoardGeneratorService } from './board-generator.service';
import {
  DEFAULT_BOARD_CONFIG,
  SMALL_BOARD_CONFIG,
  LARGE_BOARD_CONFIG,
  BoardGenerationConfig,
} from './board-generation.config';

/**
 * Service principal pour la génération de plateaux
 * Délègue la génération au BoardGeneratorService
 */
@Injectable()
export class BoardService {
  constructor(private readonly generator: BoardGeneratorService) {}

  /**
   * Génère un nouveau plateau de jeu
   * @param id Identifiant du plateau
   * @param size Taille du plateau (small, default, large)
   */
  generateBoard(
    id: string = `board-${Date.now()}`,
    size?: string,
  ): Board {
    let config: BoardGenerationConfig = DEFAULT_BOARD_CONFIG;

    if (size === 'small') {
      config = SMALL_BOARD_CONFIG;
    } else if (size === 'large') {
      config = LARGE_BOARD_CONFIG;
    }

    return this.generator.generateBoard(id, config);
  }
}

