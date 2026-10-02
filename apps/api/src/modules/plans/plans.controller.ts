import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PlansService } from './plans.service';
import { PlansGenerationService } from './plans-generation.service';
import { GeneratePlanDto } from './dto/generate-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('plans')
@UseGuards(JwtAuthGuard)
export class PlansController {
  constructor(
    private readonly plansService: PlansService,
    private readonly plansGenerationService: PlansGenerationService,
  ) {}

  /**
   * Listar todos os planos do docente autenticado
   */
  @Get()
  async getPlans(@CurrentUser('id') userId: string) {
    return this.plansService.findUserPlans(userId);
  }

  /**
   * Obter a íntegra de um plano pelo ID garantindo isolamento por docente (HTTP 404 anti-IDOR)
   */
  @Get(':id')
  async getPlanById(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.plansService.findPlanById(id, userId);
  }

  /**
   * Disparar o ciclo atômico de geração de novo plano via n8n/mock
   */
  @Post('generate')
  @HttpCode(HttpStatus.CREATED)
  async generatePlan(
    @CurrentUser() user: { id: string; email: string; name: string },
    @Body() dto: GeneratePlanDto,
  ) {
    return this.plansGenerationService.generatePlan(user, dto);
  }

  /**
   * Atualizar rascunho com o conteúdo em Markdown editado pelo docente
   */
  @Put(':id')
  async updatePlan(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdatePlanDto,
  ) {
    return this.plansService.updatePlan(id, userId, dto);
  }

  /**
   * Excluir um plano de aula do docente
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deletePlan(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.plansService.deletePlan(id, userId);
  }
}
