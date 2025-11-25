import { Injectable } from '@nestjs/common';
import { Bonus, Player } from './game.gateway';

export interface BonusUsageResult {
  success: boolean;
  message: string;
  requiresChoice?: boolean; // Pour téléportation, swap, precision
  instantEffect?: {
    coinsGained?: number;
    keysGained?: number;
  };
}

@Injectable()
export class BonusEffectsService {
  /**
   * Utilise un bonus et applique ses effets
   */
  useBonus(player: Player, bonusId: string): BonusUsageResult {
    const bonusIndex = player.bonuses.findIndex(b => b.id === bonusId);
    
    if (bonusIndex === -1) {
      return { success: false, message: 'Bonus introuvable' };
    }

    const bonus = player.bonuses[bonusIndex];
    
    // Initialiser activeBonuses si nécessaire
    if (!player.activeBonuses) {
      player.activeBonuses = {};
    }

    let result: BonusUsageResult;

    switch (bonus.type) {
      case 'double_dice':
        // Active un lancer spécial (double dés avec choix du résultat)
        player.activeBonuses.doubleDice = true;
        result = {
          success: true,
          message: `${player.name} active ${bonus.icon} Dés Doubles ! Lance 2 dés.`,
        };
        break;

      case 'extra_turn':
        // Sera géré après le tour
        result = {
          success: true,
          message: `${player.name} active ${bonus.icon} Tour Supplémentaire ! Rejoue après ce tour.`,
        };
        break;

      case 'teleport':
        result = {
          success: true,
          message: `${player.name} active ${bonus.icon} Téléportation ! Choisis ta destination.`,
          requiresChoice: true,
        };
        break;

      case 'precision':
        result = {
          success: true,
          message: `${player.name} active ${bonus.icon} Précision ! Choisis combien de cases avancer (1-6).`,
          requiresChoice: true,
        };
        break;

      case 'shield':
        player.activeBonuses.shield = true;
        result = {
          success: true,
          message: `${player.name} active ${bonus.icon} Bouclier ! Protégé contre le prochain malus.`,
        };
        break;

      case 'safe':
        player.activeBonuses.safe = 2;
        result = {
          success: true,
          message: `${player.name} active ${bonus.icon} Coffre-Fort ! Pièces protégées pendant 2 tours.`,
        };
        break;

      case 'swap':
        result = {
          success: true,
          message: `${player.name} active ${bonus.icon} Échange ! Choisis un joueur avec qui échanger de position.`,
          requiresChoice: true,
        };
        break;

      case 'multiplier':
        player.activeBonuses.multiplier = 2;
        result = {
          success: true,
          message: `${player.name} active ${bonus.icon} Multiplicateur x2 ! Pièces doublées pendant 2 tours.`,
        };
        break;

      case 'jackpot':
        player.coins += 50;
        result = {
          success: true,
          message: `${player.name} active ${bonus.icon} Jackpot ! Gagne 50 pièces !`,
          instantEffect: { coinsGained: 50 },
        };
        break;

      case 'free_key':
        player.keys += 1;
        result = {
          success: true,
          message: `${player.name} active ${bonus.icon} Clé Gratuite ! Gagne 1 clé !`,
          instantEffect: { keysGained: 1 },
        };
        break;

      case 'lucky':
        player.activeBonuses.lucky = 2;
        result = {
          success: true,
          message: `${player.name} active ${bonus.icon} Chance ! Les malus deviennent des bonus pendant 2 tours.`,
        };
        break;

      default:
        return { success: false, message: 'Bonus inconnu' };
    }

    // Retirer le bonus de l'inventaire (sauf si nécessite un choix)
    if (!result.requiresChoice) {
      player.bonuses.splice(bonusIndex, 1);
    }

    return result;
  }

  /**
   * Décrémente les bonus actifs à la fin du tour
   */
  decrementActiveBonuses(player: Player): void {
    if (!player.activeBonuses) return;

    if (player.activeBonuses.safe !== undefined) {
      player.activeBonuses.safe--;
      if (player.activeBonuses.safe <= 0) {
        delete player.activeBonuses.safe;
      }
    }

    if (player.activeBonuses.multiplier !== undefined) {
      player.activeBonuses.multiplier--;
      if (player.activeBonuses.multiplier <= 0) {
        delete player.activeBonuses.multiplier;
      }
    }

    if (player.activeBonuses.lucky !== undefined) {
      player.activeBonuses.lucky--;
      if (player.activeBonuses.lucky <= 0) {
        delete player.activeBonuses.lucky;
      }
    }
  }
}
