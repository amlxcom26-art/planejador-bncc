import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdatePlanDto } from './dto/update-plan.dto';

@Injectable()
export class PlansService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lista os planos pertencentes exclusivamente ao docente logado
   */
  async findUserPlans(userId: string) {
    const plans = await this.prisma.plan.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        skills: {
          include: {
            skill: true,
          },
        },
      },
    });

    const items = plans.map((plan) => ({
      id: plan.id,
      title: plan.title,
      duration: plan.duration,
      digitalResources: plan.digitalResources,
      status: plan.status,
      isAiAssisted: plan.isAiAssisted,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
      skills: plan.skills.map((ps) => ps.skill),
    }));

    return {
      total: items.length,
      items,
    };
  }

  /**
   * Obtém a íntegra de um plano pelo ID garantindo isolamento por docente.
   * Tentativas de acesso a plano inexistente OU de outro professor retornam HTTP 404 (anti-IDOR).
   */
  async findPlanById(id: string, userId: string) {
    const plan = await this.prisma.plan.findFirst({
      where: { id, userId },
      include: {
        skills: {
          include: {
            skill: true,
          },
        },
        aiRuns: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!plan) {
      throw new NotFoundException('Plano de aula não encontrado.');
    }

    const latestAiRun = plan.aiRuns[0];

    return {
      id: plan.id,
      title: plan.title,
      duration: plan.duration,
      digitalResources: plan.digitalResources,
      pedagogicalInstruction: plan.pedagogicalInstruction,
      contentMarkdown: plan.contentMarkdown,
      status: plan.status,
      isAiAssisted: plan.isAiAssisted,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
      skills: plan.skills.map((ps) => ps.skill),
      aiRun: latestAiRun
        ? {
            id: latestAiRun.id,
            requestId: latestAiRun.requestId,
            status: latestAiRun.status,
            durationMs: latestAiRun.durationMs,
          }
        : null,
    };
  }

  /**
   * Atualiza as edições realizadas pelo professor (Markdown e/ou título).
   * Garante isolamento por docente (HTTP 404 para plano alheio).
   */
  async updatePlan(id: string, userId: string, dto: UpdatePlanDto) {
    // Verificar existência e posse do plano
    await this.findPlanById(id, userId);

    const updated = await this.prisma.plan.update({
      where: { id },
      data: {
        ...(dto.title ? { title: dto.title.trim() } : {}),
        contentMarkdown: dto.contentMarkdown,
      },
    });

    return {
      id: updated.id,
      title: updated.title,
      contentMarkdown: updated.contentMarkdown,
      status: updated.status,
      isAiAssisted: updated.isAiAssisted,
      updatedAt: updated.updatedAt,
    };
  }

  /**
   * Exclui um rascunho de plano do professor.
   * Garante isolamento por docente (HTTP 404 para plano alheio).
   */
  async deletePlan(id: string, userId: string) {
    await this.findPlanById(id, userId);

    await this.prisma.plan.delete({
      where: { id },
    });

    return {
      success: true,
      message: 'Plano de aula excluído com sucesso.',
    };
  }
}
