import { Module } from '@nestjs/common'
import { BomberService } from './bomber.service'
import { BomberController } from './bomber.controller'

@Module({
  controllers: [BomberController],
  providers: [BomberService],
  exports: [BomberService],
})
export class BomberModule {}
