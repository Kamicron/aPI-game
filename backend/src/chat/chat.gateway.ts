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

export type ChatMessageType = 'user' | 'system';

export interface ChatMessage {
  type: ChatMessageType;
  roomId: string;
  content: string;
  authorId?: string;
  timestamp: string;
}

interface JoinRoomPayload {
  roomId: string;
  playerId: string;
}

interface SendMessagePayload {
  roomId: string;
  authorId: string;
  content: string;
}

interface NotifyRollPayload {
  roomId: string;
  playerId: string;
  result: number[];
}

@WebSocketGateway({
  cors: {
    origin: process.env.FRONT_URL || 'http://localhost:3000',
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket) {
    // On pourrait authentifier ici plus tard
    // console.log('Client connected', client.id)
  }

  handleDisconnect(client: Socket) {
    // console.log('Client disconnected', client.id)
  }

  @SubscribeMessage('joinRoom')
  handleJoinRoom(
    @MessageBody() payload: JoinRoomPayload,
    @ConnectedSocket() client: Socket,
  ) {
    const { roomId, playerId } = payload;
    if (!roomId) return;

    client.join(roomId);

    this.emitSystemMessage(roomId, `Player ${playerId} joined the room`);
  }

  @SubscribeMessage('leaveRoom')
  handleLeaveRoom(
    @MessageBody() payload: JoinRoomPayload,
    @ConnectedSocket() client: Socket,
  ) {
    const { roomId, playerId } = payload;
    if (!roomId) return;

    client.leave(roomId);

    this.emitSystemMessage(roomId, `Player ${playerId} left the room`);
  }

  @SubscribeMessage('sendMessage')
  handleSendMessage(@MessageBody() payload: SendMessagePayload) {
    const { roomId, authorId, content } = payload;
    if (!roomId || !content) return;

    const message: ChatMessage = {
      type: 'user',
      roomId,
      authorId,
      content,
      timestamp: new Date().toISOString(),
    };

    this.server.to(roomId).emit('message', message);
  }

  @SubscribeMessage('notifyRoll')
  handleNotifyRoll(@MessageBody() payload: NotifyRollPayload) {
    const { roomId, playerId, result } = payload;
    if (!roomId) return;

    const content = `Joueur ${playerId} a lancé les dés: ${result.join(', ')}`;
    this.emitSystemMessage(roomId, content);
  }

  emitSystemMessage(roomId: string, content: string) {
    const message: ChatMessage = {
      type: 'system',
      roomId,
      content,
      timestamp: new Date().toISOString(),
    };

    this.server.to(roomId).emit('message', message);
  }
}
