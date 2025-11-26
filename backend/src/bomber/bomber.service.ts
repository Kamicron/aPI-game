import { Injectable } from '@nestjs/common'
import { BomberMap } from './bomber.types'
import { generateBomberMap } from './bomber.generator'

@Injectable()
export class BomberService {
  generateMap(playerCount: number): BomberMap {
    return generateBomberMap(playerCount)
  }
}
