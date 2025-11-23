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

export interface Player {
  id: string;
  name: string;
  color: string;
  position: number;
  coins: number;
  keys: number;
  bonuses: Bonus[];
  avatar?: string;
}

export interface Bonus {
  id: string;
  name: string;
  icon: string;
  effect: string;
}

export interface GameState {
  roomId: string;
  players: Player[];
  currentTurnPlayerId: string;
  board: any; // Type du board depuis board.types.ts
  boardSize: number; // Nombre de tuiles sur le plateau
  status: 'waiting' | 'playing' | 'finished';
  winner?: string;
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
}

interface MovePlayerPayload {
  roomId: string;
  playerId: string;
  targetPosition: number;
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
  private clientToPlayer: Map<string, { roomId: string; playerId: string }> = new Map();

  constructor(private readonly boardService: BoardService) {}

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
        const player = gameState.players.find(p => p.id === playerId);
        const playerName = player?.name || playerId;
        
        // Retirer le joueur de la partie
        gameState.players = gameState.players.filter(p => p.id !== playerId);
        
        // Si c'était le tour de ce joueur, passer au suivant
        if (gameState.currentTurnPlayerId === playerId && gameState.players.length > 0) {
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
        currentTurnPlayerId: playerId,
        board: board,
        boardSize: board.tiles.length, // Nombre réel de tuiles du plateau généré
        status: 'waiting',
      };
      this.games.set(roomId, gameState);
      
      console.log(`New game created for room ${roomId} with ${board.tiles.length} tiles`);
    }

    // Vérifier si le joueur existe déjà
    const existingPlayer = gameState.players.find(p => p.id === playerId);
    
    if (!existingPlayer) {
      // Ajouter le nouveau joueur
      const newPlayer: Player = {
        id: playerId,
        name: playerName,
        color: playerColor,
        position: 0,
        coins: 150,
        keys: 3,
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
      gameState.players = gameState.players.filter(p => p.id !== playerId);
      
      // Si c'était le tour de ce joueur, passer au suivant
      if (gameState.currentTurnPlayerId === playerId && gameState.players.length > 0) {
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
    const { roomId, playerId } = payload;
    
    const gameState = this.games.get(roomId);
    if (!gameState) return;

    // Vérifier que c'est le tour du joueur
    if (gameState.currentTurnPlayerId !== playerId) {
      return { error: 'Ce n\'est pas votre tour' };
    }

    // Trouver le joueur
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) return;

    // Lancer les dés (1 à 6)
    const diceResult = Math.floor(Math.random() * 6) + 1;

    // Calculer la nouvelle position (plateau circulaire)
    const newPosition = (player.position + diceResult) % gameState.boardSize;

    // Mettre à jour la position du joueur
    player.position = newPosition;

    // TODO: Appliquer les effets de la tuile

    // Passer au joueur suivant
    const currentIndex = gameState.players.findIndex(p => p.id === playerId);
    const nextIndex = (currentIndex + 1) % gameState.players.length;
    gameState.currentTurnPlayerId = gameState.players[nextIndex].id;

    // Envoyer le résultat du dé et la nouvelle position à tous les joueurs
    this.server.to(roomId).emit('diceRolled', {
      playerId,
      result: diceResult,
      newPosition,
      nextPlayerId: gameState.currentTurnPlayerId,
    });

    // Envoyer l'état mis à jour
    this.server.to(roomId).emit('gameState', gameState);

    return { result: diceResult, newPosition };
  }

  @SubscribeMessage('movePlayer')
  handleMovePlayer(@MessageBody() payload: MovePlayerPayload) {
    const { roomId, playerId, targetPosition } = payload;
    
    const gameState = this.games.get(roomId);
    if (!gameState) return;

    // Trouver le joueur
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) return;

    // Mettre à jour la position
    player.position = targetPosition;

    // TODO: Appliquer les effets de la tuile (gain/perte pièces, clés, etc.)

    // Passer au joueur suivant
    const currentIndex = gameState.players.findIndex(p => p.id === playerId);
    const nextIndex = (currentIndex + 1) % gameState.players.length;
    gameState.currentTurnPlayerId = gameState.players[nextIndex].id;

    // Envoyer l'état mis à jour
    this.server.to(roomId).emit('gameState', gameState);
    
    this.server.to(roomId).emit('playerMoved', {
      playerId,
      position: targetPosition,
      nextPlayerId: gameState.currentTurnPlayerId,
    });
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
