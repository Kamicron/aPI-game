import { Module } from '@nestjs/common';
import { BoardController } from './board.controller';
import { BoardService } from './board.service';
import { BoardGeneratorService } from './board-generator.service';

@Module({
  controllers: [BoardController],
  providers: [BoardService, BoardGeneratorService],
  exports: [BoardService],
})
export class BoardModule {}
