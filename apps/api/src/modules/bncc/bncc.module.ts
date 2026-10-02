import { Module } from '@nestjs/common';
import { BnccService } from './bncc.service';
import { BnccController } from './bncc.controller';

@Module({
  controllers: [BnccController],
  providers: [BnccService],
  exports: [BnccService],
})
export class BnccModule {}
