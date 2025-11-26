import { Controller, Get, Query } from '@nestjs/common'
import { BomberService } from './bomber.service'
import { BomberMap } from './bomber.types'

@Controller('bomber')
export class BomberController {
  constructor(private readonly bomberService: BomberService) {}

  @Get('map')
  getMap(@Query('players') players?: string): BomberMap {
    const playerCount = Number(players ?? 2)
    const safeCount = Number.isFinite(playerCount) && playerCount > 0 ? playerCount : 2
    return this.bomberService.generateMap(safeCount)
  }
}
