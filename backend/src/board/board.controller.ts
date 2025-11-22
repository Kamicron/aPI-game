import { Controller, Get, Query } from '@nestjs/common';
import { Board } from './board.types';
import { BoardService } from './board.service';

@Controller('board')
export class BoardController {
  constructor(private readonly boardService: BoardService) {}

  @Get()
  getBoard(@Query('size') size?: string): Board {
    return this.boardService.generateBoard(undefined, size);
  }
}
