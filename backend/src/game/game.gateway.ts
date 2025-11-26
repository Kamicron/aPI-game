import {
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable } from '@nestjs/common';
import { BoardService } from '../board/board.service';
import { TileEffectsService } from './tile-effects.service';
import { BonusEffectsService } from './bonus-effects.service';
import { BomberService } from '../bomber/bomber.service';

export interface Player {
  id: string;
  name: string;
  color: string;
  position: number;
  coins: number;
  keys: number;
  bonuses: Bonus[];
  avatar?: string;
  activeBonuses?: {
    shield?: boolean;
    safe?: number; // Nombre de tours restants
    multiplier?: number; // Nombre de tours restants
    lucky?: number; // Nombre de tours restants
    doubleDice?: boolean; // Prochain lancer utilise 2 dés et choix du résultat
  };
}

export type BonusType =
  | 'double_dice'
  | 'extra_turn'
  | 'teleport'
  | 'precision' // Commun
  | 'shield'
  | 'safe'
  | 'swap'
  | 'multiplier' // Rare
  | 'jackpot'
  | 'free_key'
  | 'lucky'; // Légendaire

export type BonusRarity = 'common' | 'rare' | 'legendary';

export interface Bonus {
  id: string;
  type: BonusType;
  rarity: BonusRarity;
  name: string;
  icon: string;
  effect: string;
}

export interface MinigameState {
  gameType: string;
  initiatorId: string;
  playerScores: Map<string, number>; // playerId -> score
  playersFinished: Set<string>; // IDs des joueurs qui ont fini
  startedAt: Date;
}

export interface GameState {
  roomId: string;
  players: Player[];
  // Identifiant du joueur hôte (créateur de la room)
  hostPlayerId: string;
  currentTurnPlayerId: string;
  board: any; // Type du board depuis board.types.ts
  boardSize: number; // Nombre de tuiles sur le plateau
  status: 'waiting' | 'playing' | 'finished';
  winner?: string;
  minigame?: MinigameState; // État du mini-jeu en cours
  // Mode de jeu: plateau complet (party game) ou enchaînement de mini-jeux (arcade)
  mode?: 'board' | 'arcade';
}

interface JoinGamePayload {
  roomId: string;
  playerId: string;
  playerName: string;
  playerColor: string;
}

interface RollDicePayload {
  roomId: string;
  playerId: string;
  result?: number; // Optionnel : résultat choisi (pour double_dice)
}

interface MovePlayerPayload {
  roomId: string;
  playerId: string;
  targetPosition: number;
}

interface SwapPlayersPayload {
  roomId: string;
  playerId: string;
  targetPlayerId: string;
}

interface BuyKeyPayload {
  roomId: string;
  playerId: string;
}

interface UseBonusPayload {
  roomId: string;
  playerId: string;
  bonusId: string;
}

interface MinigameStartPayload {
  roomId: string;
  playerId: string;
  gameType: string;
}

interface MinigameScorePayload {
  roomId: string;
  playerId: string;
  score: number;
}

interface BombermanMovePayload {
  roomId: string;
  playerId: string;
  x: number;
  y: number;
}

interface BombermanBombPayload {
  roomId: string;
  playerId: string;
  bombId: string;
  x: number;
  y: number;
}

interface StartGamePayload {
  roomId: string;
  playerId: string;
  mode?: 'board' | 'arcade';
}

interface ChangeColorPayload {
  roomId: string;
  playerId: string;
  color: string;
}

@WebSocketGateway({
  cors: {
    origin: process.env.FRONT_URL || 'http://localhost:3000',
    credentials: true,
  },
})
@Injectable()
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  // Stockage en mémoire des parties (à remplacer par une DB plus tard)
  private games: Map<string, GameState> = new Map();

  // Map pour tracker quel client est dans quelle room et quel joueur
  private clientToPlayer: Map<string, { roomId: string; playerId: string }> =
    new Map();

  constructor(
    private readonly boardService: BoardService,
    private readonly tileEffectsService: TileEffectsService,
    private readonly bonusEffectsService: BonusEffectsService,
    private readonly bomberService: BomberService,
  ) {}

  handleConnection(client: Socket) {
    console.log('Client connected to game:', client.id);
  }

  handleDisconnect(client: Socket) {
    console.log('Client disconnected from game:', client.id);

    // Récupérer les infos du joueur
    const playerInfo = this.clientToPlayer.get(client.id);

    if (playerInfo) {
      const { roomId, playerId } = playerInfo;
      const gameState = this.games.get(roomId);

      if (gameState) {
        // Trouver le nom du joueur avant de le retirer
        const player = gameState.players.find((p) => p.id === playerId);
        const playerName = player?.name || playerId;

        // Retirer le joueur de la partie
        gameState.players = gameState.players.filter((p) => p.id !== playerId);

        // Si c'était le tour de ce joueur, passer au suivant
        if (
          gameState.currentTurnPlayerId === playerId &&
          gameState.players.length > 0
        ) {
          gameState.currentTurnPlayerId = gameState.players[0].id;
        }

        // Si plus de joueurs, supprimer la partie
        if (gameState.players.length === 0) {
          this.games.delete(roomId);
          console.log(`Room ${roomId} deleted (no players left)`);
        } else {
          // Sinon, notifier les autres joueurs
          this.server.to(roomId).emit('gameState', gameState);
          this.server.to(roomId).emit('playerLeft', { playerId, playerName });

          // Envoyer un message système dans le chat
          this.emitSystemMessage(roomId, `${playerName} a quitté la partie`);

          console.log(`Player ${playerName} disconnected from room ${roomId}`);
        }
      }

      // Retirer le mapping
      this.clientToPlayer.delete(client.id);
    }
  }

  @SubscribeMessage('joinGame')
  handleJoinGame(
    @MessageBody() payload: JoinGamePayload,
    @ConnectedSocket() client: Socket,
  ) {
    const { roomId, playerId, playerName, playerColor } = payload;

    if (!roomId || !playerId) return;

    client.join(roomId);

    // Tracker le client
    this.clientToPlayer.set(client.id, { roomId, playerId });

    // Récupérer ou créer la partie
    let gameState = this.games.get(roomId);

    if (!gameState) {
      // Créer une nouvelle partie avec un plateau généré
      const board = this.boardService.generateBoard(roomId);

      gameState = {
        roomId,
        players: [],
        hostPlayerId: playerId,
        currentTurnPlayerId: playerId,
        board: board,
        boardSize: board.tiles.length, // Nombre réel de tuiles du plateau généré
        status: 'waiting',
      };
      this.games.set(roomId, gameState);

      console.log(
        `New game created for room ${roomId} with ${board.tiles.length} tiles`,
      );
    }

    // Vérifier si le joueur existe déjà
    const existingPlayer = gameState.players.find((p) => p.id === playerId);

    if (!existingPlayer) {
      // Ajouter le nouveau joueur
      const newPlayer: Player = {
        id: playerId,
        name: playerName,
        color: playerColor,
        position: 0,
        coins: 0,
        keys: 0,
        bonuses: [],
      };

      gameState.players.push(newPlayer);

      // Envoyer un message système dans le chat
      this.emitSystemMessage(roomId, `${playerName} a rejoint la partie`);

      console.log(`Player ${playerName} (${playerId}) joined room ${roomId}`);
    }

    // Envoyer l'état du jeu à tous les joueurs de la room
    this.server.to(roomId).emit('gameState', gameState);

    // Notifier les autres joueurs
    client.to(roomId).emit('playerJoined', {
      playerId,
      playerName,
    });
  }

  @SubscribeMessage('leaveGame')
  handleLeaveGame(
    @MessageBody() payload: { roomId: string; playerId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { roomId, playerId } = payload;

    if (!roomId) return;

    const gameState = this.games.get(roomId);

    if (gameState) {
      // Retirer le joueur
      gameState.players = gameState.players.filter((p) => p.id !== playerId);

      // Si c'était le tour de ce joueur, passer au suivant
      if (
        gameState.currentTurnPlayerId === playerId &&
        gameState.players.length > 0
      ) {
        gameState.currentTurnPlayerId = gameState.players[0].id;
      }

      // Si plus de joueurs, supprimer la partie
      if (gameState.players.length === 0) {
        this.games.delete(roomId);
        console.log(`Room ${roomId} deleted (no players left)`);
      } else {
        // Sinon, mettre à jour l'état
        this.server.to(roomId).emit('gameState', gameState);
      }
    }

    client.leave(roomId);

    // Retirer le tracking
    this.clientToPlayer.delete(client.id);

    // Notifier les autres joueurs
    client.to(roomId).emit('playerLeft', { playerId });

    console.log(`Player ${playerId} left room ${roomId}`);
  }

  @SubscribeMessage('rollDice')
  handleRollDice(@MessageBody() payload: RollDicePayload) {
    const { roomId, playerId, result } = payload;

    const gameState = this.games.get(roomId);
    if (!gameState) return;

    // Vérifier que c'est le tour du joueur
    if (gameState.currentTurnPlayerId !== playerId) {
      return { error: "Ce n'est pas votre tour" };
    }

    // Trouver le joueur
    const player = gameState.players.find((p) => p.id === playerId);
    if (!player) return;

    // Déterminer le résultat du dé (1 à 6)
    let diceResult: number;

    // Si un résultat est fourni et que le joueur a le bonus double_dice actif,
    // on utilise ce résultat et on consomme le bonus.
    const hasDoubleDice = !!player.activeBonuses?.doubleDice;

    if (
      typeof result === 'number' &&
      result >= 1 &&
      result <= 6 &&
      hasDoubleDice
    ) {
      diceResult = result;
      // Consommer le bonus double_dice après utilisation
      delete player.activeBonuses!.doubleDice;
    } else {
      // Lancer classique (1 à 6)
      diceResult = Math.floor(Math.random() * 6) + 1;
    }

    // Calculer la nouvelle position (plateau circulaire)
    const newPosition = (player.position + diceResult) % gameState.boardSize;

    // Mettre à jour la position du joueur
    player.position = newPosition;

    // Appliquer les effets de la tuile
    const tile = gameState.board?.tiles.find((t) => t.id === newPosition);
    let tileEffect = null;

    if (tile) {
      tileEffect = this.tileEffectsService.applyTileEffect(
        player,
        tile,
        diceResult,
      );
      console.log(`Tile effect applied:`, tileEffect);
    }

    // Décrémenter les bonus actifs du joueur à la fin de son tour
    this.bonusEffectsService.decrementActiveBonuses(player);

    // Passer au joueur suivant
    const currentIndex = gameState.players.findIndex((p) => p.id === playerId);
    const nextIndex = (currentIndex + 1) % gameState.players.length;
    gameState.currentTurnPlayerId = gameState.players[nextIndex].id;

    // Envoyer le résultat du dé et la nouvelle position à tous les joueurs
    this.server.to(roomId).emit('diceRolled', {
      playerId,
      result: diceResult,
      newPosition,
      nextPlayerId: gameState.currentTurnPlayerId,
      tileEffect, // Envoyer l'effet de la tuile
    });

    // Envoyer l'état mis à jour
    this.server.to(roomId).emit('gameState', gameState);

    this.server.to(roomId).emit('playerMoved', {
      playerId,
      position: newPosition,
      nextPlayerId: gameState.currentTurnPlayerId,
      tileEffect, // Envoyer l'effet de la tuile
    });

    // Envoyer un message dans le chat si l'effet a un message
    if (tileEffect?.message) {
      this.emitSystemMessage(roomId, tileEffect.message);
    }

    return { result: diceResult, newPosition };
  }

  @SubscribeMessage('movePlayer')
  handleMovePlayer(@MessageBody() payload: MovePlayerPayload) {
    const { roomId, playerId, targetPosition } = payload;

    const gameState = this.games.get(roomId);
    if (!gameState) return;

    // Trouver le joueur
    const player = gameState.players.find((p) => p.id === playerId);
    if (!player) return;

    // Mettre à jour la position (téléportation ou déplacement forcé)
    player.position = targetPosition;

    // Appliquer les effets de la tuile atteinte
    const tile = gameState.board?.tiles.find((t) => t.id === targetPosition);
    let tileEffect = null;

    if (tile) {
      // Pour une téléportation, il n'y a pas de résultat de dé : on passe 0
      tileEffect = this.tileEffectsService.applyTileEffect(player, tile, 0);
      console.log(`Tile effect applied after movePlayer:`, tileEffect);
    }

    // Si le joueur possède un bonus de type teleport, on le consomme ici
    const teleportIndex = player.bonuses.findIndex(
      (b) => b.type === 'teleport',
    );
    if (teleportIndex !== -1) {
      const [teleportBonus] = player.bonuses.splice(teleportIndex, 1);
      this.emitSystemMessage(
        roomId,
        `${player.name} utilise ${teleportBonus.icon} Téléportation !`,
      );
    }

    // Décrémenter les bonus actifs à la fin du tour
    this.bonusEffectsService.decrementActiveBonuses(player);

    // Passer au joueur suivant
    const currentIndex = gameState.players.findIndex((p) => p.id === playerId);
    const nextIndex = (currentIndex + 1) % gameState.players.length;
    gameState.currentTurnPlayerId = gameState.players[nextIndex].id;

    // Envoyer l'état mis à jour
    this.server.to(roomId).emit('gameState', gameState);

    this.server.to(roomId).emit('playerMoved', {
      playerId,
      position: targetPosition,
      nextPlayerId: gameState.currentTurnPlayerId,
      tileEffect,
    });

    // Envoyer un message dans le chat si l'effet a un message
    if (tileEffect?.message) {
      this.emitSystemMessage(roomId, tileEffect.message);
    }
  }

  @SubscribeMessage('swapPlayers')
  handleSwapPlayers(@MessageBody() payload: SwapPlayersPayload) {
    const { roomId, playerId, targetPlayerId } = payload;

    const gameState = this.games.get(roomId);
    if (!gameState) return;

    const player = gameState.players.find((p) => p.id === playerId);
    const targetPlayer = gameState.players.find((p) => p.id === targetPlayerId);

    if (!player || !targetPlayer) return;

    if (playerId === targetPlayerId) {
      return;
    }

    // Vérifier que le joueur possède bien un bonus d'échange
    const swapIndex = player.bonuses.findIndex((b) => b.type === 'swap');
    if (swapIndex === -1) {
      return;
    }

    const [swapBonus] = player.bonuses.splice(swapIndex, 1);

    // Échanger les positions
    const tempPos = player.position;
    player.position = targetPlayer.position;
    targetPlayer.position = tempPos;

    // Décrémenter les bonus actifs du joueur qui utilise le bonus
    this.bonusEffectsService.decrementActiveBonuses(player);

    // Passer au joueur suivant (après le joueur qui a utilisé le bonus)
    const currentIndex = gameState.players.findIndex((p) => p.id === playerId);
    const nextIndex = (currentIndex + 1) % gameState.players.length;
    gameState.currentTurnPlayerId = gameState.players[nextIndex].id;

    // Notifier tous les joueurs
    this.server.to(roomId).emit('gameState', gameState);

    this.server.to(roomId).emit('playerMoved', {
      playerId,
      position: player.position,
      nextPlayerId: gameState.currentTurnPlayerId,
    });

    this.server.to(roomId).emit('playerMoved', {
      playerId: targetPlayerId,
      position: targetPlayer.position,
      nextPlayerId: gameState.currentTurnPlayerId,
    });

    // Message système
    this.emitSystemMessage(
      roomId,
      `${player.name} utilise ${swapBonus.icon} Échange et échange sa position avec ${targetPlayer.name} !`,
    );
  }

  @SubscribeMessage('getGameState')
  handleGetGameState(
    @MessageBody() payload: { roomId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { roomId } = payload;
    const gameState = this.games.get(roomId);

    if (gameState) {
      client.emit('gameState', gameState);
    }
  }

  @SubscribeMessage('startGame')
  handleStartGame(@MessageBody() payload: StartGamePayload) {
    const { roomId, playerId, mode } = payload;

    const gameState = this.games.get(roomId);
    if (!gameState) return;

    // Seul l'hôte peut démarrer la partie
    if (gameState.hostPlayerId !== playerId) {
      this.emitSystemMessage(
        roomId,
        `${gameState.players.find((p) => p.id === playerId)?.name ?? 'Un joueur'} a tenté de démarrer la partie mais n'est pas l'hôte.`,
      );
      return;
    }

    if (gameState.status === 'playing') {
      return;
    }

    gameState.status = 'playing';
    // Définir le mode de jeu (par défaut: plateau classique)
    gameState.mode = mode || 'board';

    this.server.to(roomId).emit('gameState', gameState);
  }

  @SubscribeMessage('changeColor')
  handleChangeColor(@MessageBody() payload: ChangeColorPayload) {
    const { roomId, playerId, color } = payload;

    const gameState = this.games.get(roomId);
    if (!gameState) return;

    const player = gameState.players.find((p) => p.id === playerId);
    if (!player) return;

    player.color = color;

    this.server.to(roomId).emit('gameState', gameState);
  }

  @SubscribeMessage('buyKey')
  handleBuyKey(@MessageBody() payload: BuyKeyPayload) {
    const { roomId, playerId } = payload;

    const gameState = this.games.get(roomId);
    if (!gameState) {
      return { success: false, error: 'Partie introuvable' };
    }

    // Trouver le joueur
    const player = gameState.players.find((p) => p.id === playerId);
    if (!player) {
      return { success: false, error: 'Joueur introuvable' };
    }

    // Trouver la tuile actuelle
    const currentTile = gameState.board?.tiles.find(
      (t) => t.id === player.position,
    );
    if (!currentTile || currentTile.kind !== 'key_shop') {
      return {
        success: false,
        error: "Vous n'êtes pas sur une boutique de clés",
      };
    }

    const keyPrice = currentTile.keyPrice || 100;

    // Vérifier si le joueur a assez de pièces
    if (player.coins < keyPrice) {
      this.emitSystemMessage(
        roomId,
        `${player.name} n'a pas assez de pièces pour acheter une clé (${keyPrice} pièces nécessaires)`,
      );
      return { success: false, error: 'Pas assez de pièces' };
    }

    // Effectuer l'achat
    player.coins -= keyPrice;
    player.keys += 1;

    // Notifier tous les joueurs
    this.server.to(roomId).emit('gameState', gameState);
    this.emitSystemMessage(
      roomId,
      `🔑 ${player.name} achète une clé pour ${keyPrice} pièces !`,
    );

    return { success: true, newCoins: player.coins, newKeys: player.keys };
  }

  @SubscribeMessage('useBonus')
  handleUseBonus(@MessageBody() payload: UseBonusPayload) {
    const { roomId, playerId, bonusId } = payload;

    const gameState = this.games.get(roomId);
    if (!gameState) {
      return { success: false, error: 'Partie introuvable' };
    }

    // Vérifier que c'est le tour du joueur
    if (gameState.currentTurnPlayerId !== playerId) {
      return { success: false, error: "Ce n'est pas votre tour" };
    }

    // Trouver le joueur
    const player = gameState.players.find((p) => p.id === playerId);
    if (!player) {
      return { success: false, error: 'Joueur introuvable' };
    }

    // Utiliser le bonus
    const result = this.bonusEffectsService.useBonus(player, bonusId);

    if (!result.success) {
      return result;
    }

    // Notifier tous les joueurs
    this.server.to(roomId).emit('gameState', gameState);
    this.emitSystemMessage(roomId, result.message);

    return result;
  }

  @SubscribeMessage('minigameStart')
  handleMinigameStart(
    @MessageBody() payload: MinigameStartPayload,
    @ConnectedSocket() client: Socket,
  ) {
    const { roomId, playerId, gameType } = payload;
    const gameState = this.games.get(roomId);

    if (!gameState) {
      return { success: false, message: 'Partie non trouvée' };
    }

    // Seul l'hôte peut lancer un mini-jeu (board ou arcade)
    if (gameState.hostPlayerId !== playerId) {
      this.emitSystemMessage(
        roomId,
        `${gameState.players.find((p) => p.id === playerId)?.name ?? 'Un joueur'} a tent� de lancer un mini-jeu mais n'est pas l'h�te.`,
      );
      return { success: false, message: '' };
    }

    // Initialiser l'état du mini-jeu
    gameState.minigame = {
      gameType,
      initiatorId: playerId,
      playerScores: new Map(),
      playersFinished: new Set(),
      startedAt: new Date(),
    };

    // Si c'est Bomberman, générer et envoyer la map via WebSocket
    if (gameType === 'bomberman') {
      const playerCount = gameState.players.length;
      const bomberMap = this.bomberService.generateMap(playerCount);

      this.server.to(roomId).emit('bombermanInit', {
        roomId,
        map: bomberMap,
      });
    }

    // Notifier TOUS les joueurs que le mini-jeu commence
    this.server.to(roomId).emit('minigameStarted', {
      gameType,
      initiatorId: playerId,
      initiatorName: gameState.players.find((p) => p.id === playerId)?.name,
    });

    this.emitSystemMessage(
      roomId,
      `🎮 ${gameState.players.find((p) => p.id === playerId)?.name} a lancé un mini-jeu : ${gameType} !`,
    );

    return { success: true, message: 'Mini-jeu démarré' };
  }

  @SubscribeMessage('minigameScore')
  handleMinigameScore(
    @MessageBody() payload: MinigameScorePayload,
    @ConnectedSocket() client: Socket,
  ) {
    const { roomId, playerId, score } = payload;
    const gameState = this.games.get(roomId);

    if (!gameState || !gameState.minigame) {
      return { success: false, message: 'Mini-jeu non trouvé' };
    }

    // Enregistrer le score du joueur
    gameState.minigame.playerScores.set(playerId, score);
    gameState.minigame.playersFinished.add(playerId);

    const player = gameState.players.find((p) => p.id === playerId);
    console.log(`Player ${player?.name} finished with score: ${score}`);

    // Vérifier si tous les joueurs ont fini
    const allPlayersFinished = gameState.players.every((p) =>
      gameState.minigame!.playersFinished.has(p.id),
    );

    console.log(
      `Players finished: ${gameState.minigame.playersFinished.size}/${gameState.players.length}`,
    );
    console.log(`All players finished: ${allPlayersFinished}`);

    if (allPlayersFinished) {
      // Calculer le classement
      const gameType = gameState.minigame.gameType;

      const results = Array.from(gameState.minigame.playerScores.entries())
        .map(([pId, pScore]) => {
          const p = gameState.players.find((player) => player.id === pId);
          return {
            playerId: pId,
            playerName: p?.name || 'Unknown',
            playerColor: p?.color || '#000',
            score: pScore,
          };
        })
        .sort((a, b) => {
          // Jeux de réflexes : plus petit temps = meilleur
          if (gameType === 'reaction') {
            return a.score - b.score;
          }
          // Jeux de type "niveau" (ex: mémoire) : plus grand niveau = meilleur
          if (gameType === 'memory') {
            return b.score - a.score;
          }
          // Jeux de type "points" (ex: précision, bomberman) : plus grand score = meilleur
          if (gameType === 'precision' || gameType === 'bomberman') {
            return b.score - a.score;
          }
          // Par défaut, garder un tri croissant
          return a.score - b.score;
        });

      // Attribuer les pièces selon le classement
      const coinsDistribution = [5, 3, 1]; // 1er, 2ème, 3ème
      const resultsWithCoins = results.map((result, index) => ({
        ...result,
        rank: index + 1,
        coinsEarned: coinsDistribution[index] || 0,
      }));

      // Distribuer les pièces
      for (const result of resultsWithCoins) {
        const player = gameState.players.find((p) => p.id === result.playerId);
        if (player && result.coinsEarned > 0) {
          player.coins += result.coinsEarned;
        }
      }

      // Notifier tous les joueurs des résultats
      this.server.to(roomId).emit('minigameResults', resultsWithCoins);
      this.server.to(roomId).emit('gameState', gameState);

      // Message système
      const winner = resultsWithCoins[0];
      this.emitSystemMessage(
        roomId,
        `🏆 ${winner.playerName} remporte le mini-jeu et gagne ${winner.coinsEarned} pièces !`,
      );

      // Nettoyer l'état du mini-jeu
      gameState.minigame = undefined;
    } else {
      // Notifier les autres joueurs qu'un joueur a fini
      this.server.to(roomId).emit('minigamePlayerFinished', {
        playerId,
        playerName: player?.name,
        finishedCount: gameState.minigame.playersFinished.size,
        totalPlayers: gameState.players.length,
      });
    }

    return { success: true, message: 'Score enregistré' };
  }

  @SubscribeMessage('bombermanMove')
  handleBombermanMove(@MessageBody() payload: BombermanMovePayload) {
    const { roomId, playerId, x, y } = payload;

    const gameState = this.games.get(roomId);
    if (
      !gameState ||
      !gameState.minigame ||
      gameState.minigame.gameType !== 'bomberman'
    ) {
      return;
    }

    // Pour l'instant, le serveur est seulement un relais :
    // on se contente de diffuser le mouvement à tous les joueurs de la room.
    this.server.to(roomId).emit('bombermanPlayerMoved', {
      roomId,
      playerId,
      x,
      y,
    });
  }

  @SubscribeMessage('bombermanBomb')
  handleBombermanBomb(@MessageBody() payload: BombermanBombPayload) {
    const { roomId, playerId, bombId, x, y } = payload;

    const gameState = this.games.get(roomId);
    if (
      !gameState ||
      !gameState.minigame ||
      gameState.minigame.gameType !== 'bomberman'
    ) {
      return;
    }

    this.server.to(roomId).emit('bombermanBombPlaced', {
      roomId,
      playerId,
      bombId,
      x,
      y,
    });
  }

  // Méthode utilitaire pour envoyer un message système dans le chat
  emitSystemMessage(roomId: string, content: string) {
    const message = {
      type: 'system',
      roomId,
      content,
      timestamp: new Date().toISOString(),
    };

    this.server.to(roomId).emit('message', message);
  }
}
