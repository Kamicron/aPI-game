import { Controller, Get } from '@nestjs/common';
import { Board } from './board.types';
import { BoardService } from './board.service';

@Controller('board')
export class BoardController {
  constructor(private readonly boardService: BoardService) {}

  @Get()
  getBoard(): Board {
    return this.boardService.generateBoard();
  }
}
