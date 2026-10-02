import { Module } from '@nestjs/common';
import { N8nClient } from './n8n.client';
import { N8nMockService } from './n8n-mock.service';

@Module({
  providers: [N8nClient, N8nMockService],
  exports: [N8nClient],
})
export class N8nModule {}
