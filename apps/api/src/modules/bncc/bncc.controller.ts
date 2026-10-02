import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { BnccService } from './bncc.service';
import { QuerySkillsDto } from './dto/query-skills.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('bncc')
@UseGuards(JwtAuthGuard)
export class BnccController {
  constructor(private readonly bnccService: BnccService) {}

  @Get('skills')
  async getSkills(@Query() query: QuerySkillsDto) {
    return this.bnccService.findSkills(query);
  }
}
