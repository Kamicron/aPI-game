import { Module } from '@nestjs/common';
import { GameGateway } from './game.gateway';
import { BoardModule } from '../board/board.module';

@Module({
  imports: [BoardModule],
  providers: [GameGateway],
  exports: [GameGateway],
})
export class GameModule {}
