import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { N8nModule } from '../n8n/n8n.module';
import { PlansController } from './plans.controller';
import { PlansService } from './plans.service';
import { PlansGenerationService } from './plans-generation.service';

@Module({
  imports: [PrismaModule, N8nModule],
  controllers: [PlansController],
  providers: [PlansService, PlansGenerationService],
  exports: [PlansService, PlansGenerationService],
})
export class PlansModule {}
