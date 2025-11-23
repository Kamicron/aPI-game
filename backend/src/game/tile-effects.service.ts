import { Injectable } from '@nestjs/common';
import { Tile } from '../board/board.types';
import { Bonus, Player } from './game.gateway';

export interface TileEffect {
  coinsChange?: number;
  keysChange?: number;
  bonusGained?: Bonus;
  message?: string;
}

@Injectable()
export class TileEffectsService {
  applyTileEffect(player: Player, tile: Tile, diceResult?: number): TileEffect {
    const effect: TileEffect = {};
    
    const dicePrefix = diceResult ? `🎲 ${player.name} fait ${diceResult} - ` : '';

    switch (tile.kind) {
      case 'start':
        effect.coinsChange = 5;
        effect.message = `${dicePrefix}Passe par la case départ et gagne 5 pièces ! 💰`;
        player.coins += 5;
        break;

      case 'coins':
        if (tile.coinsChange) {
          effect.coinsChange = tile.coinsChange;
          player.coins += tile.coinsChange;
          
          if (tile.coinsChange > 0) {
            effect.message = `${dicePrefix}Gagne ${tile.coinsChange} pièces ! 💰`;
          } else {
            effect.message = `${dicePrefix}Perd ${Math.abs(tile.coinsChange)} pièces ! 💸`;
          }
        }
        break;

      case 'key_shop':
        // Boutique de clés : possibilité d'acheter une clé
        effect.message = `${dicePrefix}Arrive à la boutique de clés 🔑 Prix: ${tile.keyPrice || 100} pièces`;
        break;

      case 'bonus':
        // Case bonus : gain d'un bonus aléatoire avec système de rareté
        const bonus = this.generateRandomBonus();
        
        player.bonuses.push(bonus);
        effect.bonusGained = bonus;
        
        const rarityEmoji = bonus.rarity === 'legendary' ? '✨' : bonus.rarity === 'rare' ? '⭐' : '🎁';
        effect.message = `${dicePrefix}Gagne un bonus ${rarityEmoji} ${bonus.icon} ${bonus.name} !`;
        break;

      case 'malus':
        const malusType = Math.random() > 0.5 ? 'coins' : 'keys';
        
        if (malusType === 'coins') {
          const loss = Math.floor(Math.random() * 30) + 10;
          effect.coinsChange = -loss;
          player.coins = Math.max(0, player.coins - loss);
          effect.message = `${dicePrefix}Tombe sur un malus ⚠️ et perd ${loss} pièces !`;
        } else {
          if (player.keys > 0) {
            effect.keysChange = -1;
            player.keys -= 1;
            effect.message = `${dicePrefix}Tombe sur un malus ⚠️ et perd 1 clé !`;
          } else {
            effect.message = `${dicePrefix}Tombe sur un malus ⚠️ mais n'a pas de clé à perdre`;
          }
        }
        break;

      case 'minigame':
        // Case mini-jeu : à implémenter plus tard
        effect.message = `${dicePrefix}Arrive sur un mini-jeu 🎮 (${tile.minigameCategory})`;
        break;

      default:
        effect.message = `${dicePrefix}Arrive sur la case ${tile.id}`;
    }

    return effect;
  }

  /**
   * Génère un bonus aléatoire avec système de rareté
   */
  private generateRandomBonus(): Bonus {
    const random = Math.random() * 100;
    
    let rarity: Bonus['rarity'];
    let bonusType: Bonus['type'];
    
    // Système de rareté avec poids
    // Commun: 60%, Rare: 30%, Légendaire: 10%
    if (random < 60) {
      // Commun (60%)
      rarity = 'common';
      const commonBonuses: Bonus['type'][] = ['double_dice', 'extra_turn', 'teleport', 'precision'];
      bonusType = commonBonuses[Math.floor(Math.random() * commonBonuses.length)];
    } else if (random < 90) {
      // Rare (30%)
      rarity = 'rare';
      const rareBonuses: Bonus['type'][] = ['shield', 'safe', 'swap', 'multiplier'];
      bonusType = rareBonuses[Math.floor(Math.random() * rareBonuses.length)];
    } else {
      // Légendaire (10%)
      rarity = 'legendary';
      const legendaryBonuses: Bonus['type'][] = ['jackpot', 'free_key', 'lucky'];
      bonusType = legendaryBonuses[Math.floor(Math.random() * legendaryBonuses.length)];
    }
    
    return {
      id: `bonus-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      type: bonusType,
      rarity: rarity,
      name: this.getBonusName(bonusType),
      icon: this.getBonusIcon(bonusType),
      effect: this.getBonusEffect(bonusType),
    };
  }

  private getBonusName(type: Bonus['type']): string {
    const names: Record<Bonus['type'], string> = {
      // Commun
      double_dice: 'Dés Doubles',
      extra_turn: 'Tour Supplémentaire',
      teleport: 'Téléportation',
      precision: 'Précision',
      // Rare
      shield: 'Bouclier',
      safe: 'Coffre-Fort',
      swap: 'Échange',
      multiplier: 'Multiplicateur x2',
      // Légendaire
      jackpot: 'Jackpot',
      free_key: 'Clé Gratuite',
      lucky: 'Chance',
    };
    return names[type] || 'Bonus';
  }

  private getBonusIcon(type: Bonus['type']): string {
    const icons: Record<Bonus['type'], string> = {
      // Commun
      double_dice: '🎲🎲',
      extra_turn: '⏭️',
      teleport: '✨',
      precision: '🎯',
      // Rare
      shield: '🛡️',
      safe: '🔒',
      swap: '🔄',
      multiplier: '💎',
      // Légendaire
      jackpot: '💰',
      free_key: '🔑',
      lucky: '🎰',
    };
    return icons[type] || '🎁';
  }

  private getBonusEffect(type: Bonus['type']): string {
    const effects: Record<Bonus['type'], string> = {
      // Commun
      double_dice: 'Lance 2 dés et choisis le meilleur résultat',
      extra_turn: 'Rejoue immédiatement après ton tour',
      teleport: 'Choisis n\'importe quelle case du plateau',
      precision: 'Choisis exactement où aller (1-6 cases)',
      // Rare
      shield: 'Annule le prochain malus',
      safe: 'Tes pièces sont protégées pendant 2 tours',
      swap: 'Échange ta position avec un autre joueur',
      multiplier: 'Les pièces gagnées sont doublées (2 tours)',
      // Légendaire
      jackpot: 'Gagne 50 pièces instantanément',
      free_key: 'Obtiens une clé gratuitement',
      lucky: 'Les malus deviennent des bonus (2 tours)',
    };
    return effects[type] || 'Effet spécial';
  }
}
