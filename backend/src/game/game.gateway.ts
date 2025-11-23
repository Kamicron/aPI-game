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
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  // Stockage en mémoire des parties (à remplacer par une DB plus tard)
  private games: Map<string, GameState> = new Map();

  handleConnection(client: Socket) {
    console.log('Client connected to game:', client.id);
  }

  handleDisconnect(client: Socket) {
    console.log('Client disconnected from game:', client.id);
  }

  @SubscribeMessage('joinGame')
  handleJoinGame(
    @MessageBody() payload: JoinGamePayload,
    @ConnectedSocket() client: Socket,
  ) {
    const { roomId, playerId, playerName, playerColor } = payload;
    
    if (!roomId || !playerId) return;

    client.join(roomId);

    // Récupérer ou créer la partie
    let gameState = this.games.get(roomId);
    
    if (!gameState) {
      // Créer une nouvelle partie
      gameState = {
        roomId,
        players: [],
        currentTurnPlayerId: playerId,
        board: null, // À initialiser avec le board service
        status: 'waiting',
      };
      this.games.set(roomId, gameState);
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
      
      // Si plus de joueurs, supprimer la partie
      if (gameState.players.length === 0) {
        this.games.delete(roomId);
      } else {
        // Sinon, mettre à jour l'état
        this.server.to(roomId).emit('gameState', gameState);
      }
    }

    client.leave(roomId);
    
    // Notifier les autres joueurs
    client.to(roomId).emit('playerLeft', { playerId });
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

    // Lancer les dés (1 à 6)
    const diceResult = Math.floor(Math.random() * 6) + 1;

    // Envoyer le résultat à tous les joueurs
    this.server.to(roomId).emit('diceRolled', {
      playerId,
      result: diceResult,
    });

    return { result: diceResult };
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
}
