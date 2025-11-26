import { Module } from '@nestjs/common';
import { GameGateway } from './game.gateway';
import { TileEffectsService } from './tile-effects.service';
import { BonusEffectsService } from './bonus-effects.service';
import { BoardModule } from '../board/board.module';
import { BomberModule } from '../bomber/bomber.module';

@Module({
  imports: [BoardModule, BomberModule],
  providers: [GameGateway, TileEffectsService, BonusEffectsService],
  exports: [GameGateway],
})
export class GameModule {}
