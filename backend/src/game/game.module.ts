import { Module } from '@nestjs/common';
import { GameGateway } from './game.gateway';
import { TileEffectsService } from './tile-effects.service';
import { BonusEffectsService } from './bonus-effects.service';
import { BoardModule } from '../board/board.module';

@Module({
  imports: [BoardModule],
  providers: [GameGateway, TileEffectsService, BonusEffectsService],
  exports: [GameGateway],
})
export class GameModule {}
