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
  /**
   * Applique les effets d'une tuile sur un joueur
   */
  applyTileEffect(player: Player, tile: Tile, diceResult?: number): TileEffect {
    const effect: TileEffect = {};
    
    // Préfixe avec le résultat du dé si disponible
    const dicePrefix = diceResult ? `🎲 ${player.name} fait ${diceResult} - ` : '';

    switch (tile.kind) {
      case 'start':
        // Case départ : bonus de passage
        effect.coinsChange = 5;
        effect.message = `${dicePrefix}Passe par la case départ et gagne 5 pièces ! 💰`;
        player.coins += 5;
        break;

      case 'coins':
        // Case pièces : gain ou perte selon coinsChange
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
        // Case bonus : gain d'un bonus aléatoire
        const bonusTypes: Bonus['type'][] = ['double_dice', 'extra_turn', 'shield', 'teleport'];
        const randomBonus = bonusTypes[Math.floor(Math.random() * bonusTypes.length)];
        
        const bonus: Bonus = {
          id: `bonus-${Date.now()}`,
          type: randomBonus,
          name: this.getBonusName(randomBonus),
          icon: this.getBonusIcon(randomBonus),
          effect: this.getBonusEffect(randomBonus),
        };
        
        player.bonuses.push(bonus);
        effect.bonusGained = bonus;
        effect.message = `${dicePrefix}Gagne un bonus : ${bonus.icon} ${bonus.name} !`;
        break;

      case 'malus':
        // Case malus : perte de pièces ou de clés
        const malusType = Math.random() > 0.5 ? 'coins' : 'keys';
        
        if (malusType === 'coins') {
          const loss = Math.floor(Math.random() * 30) + 10; // 10-40 pièces
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

  private getBonusName(type: Bonus['type']): string {
    const names = {
      double_dice: 'Dés Doubles',
      extra_turn: 'Tour Supplémentaire',
      shield: 'Bouclier',
      teleport: 'Téléportation',
    };
    return names[type] || 'Bonus';
  }

  private getBonusIcon(type: Bonus['type']): string {
    const icons = {
      double_dice: '🎲🎲',
      extra_turn: '⏭️',
      shield: '🛡️',
      teleport: '✨',
    };
    return icons[type] || '🎁';
  }

  private getBonusEffect(type: Bonus['type']): string {
    const effects = {
      double_dice: 'Lance les dés deux fois et choisis le meilleur résultat',
      extra_turn: 'Rejoue immédiatement après ton tour',
      shield: 'Protège contre le prochain malus',
      teleport: 'Téléporte-toi sur n\'importe quelle case',
    };
    return effects[type] || 'Effet spécial';
  }
}
