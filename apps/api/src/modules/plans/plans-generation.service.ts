import {
  Injectable,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { N8nClient } from '../n8n/n8n.client';
import { GeneratePlanDto } from './dto/generate-plan.dto';
import { PlanStatus, AiRunStatus } from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class PlansGenerationService {
  private readonly logger = new Logger(PlansGenerationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly n8nClient: N8nClient,
  ) {}

  /**
   * Ciclo de vida transacional da geração com IA (AiRun e Plan atômico)
   */
  async generatePlan(user: { id: string; email: string; name: string }, dto: GeneratePlanDto) {
    // 1. Validar existência das habilidades informadas
    const skills = await this.prisma.bnccSkill.findMany({
      where: { id: { in: dto.skillIds } },
    });

    if (skills.length !== dto.skillIds.length) {
      throw new BadRequestException('Uma ou mais habilidades informadas não existem no catálogo.');
    }

    // 2. Definir título padrão se não fornecido
    const title =
      dto.title?.trim() ||
      `Plano ${skills[0].codigo} — ${skills[0].eixo}`;

    // 3. Montar texto canônico de habilidades para o n8n
    const habilidadeFormatted = skills
      .map((s) => `${s.codigo} — ${s.descricao}`)
      .join('\n');

    const promptPayload = {
      sessao: user.email,
      habilidade: habilidadeFormatted,
      instrucao: dto.pedagogicalInstruction,
      duracao: dto.duration,
      recursos_digitais: dto.digitalResources,
    };

    // 4. Iniciar auditoria AiRun com status PENDING
    const requestId = crypto.randomUUID();
    const startTime = Date.now();

    const aiRun = await this.prisma.aiRun.create({
      data: {
        userId: user.id,
        requestId,
        status: AiRunStatus.PENDING,
        promptPayload,
      },
    });

    try {
      // 5. Enviar ao cliente n8n (com headers x-api-key e x-request-id)
      const n8nResponse = await this.n8nClient.generateDraft(promptPayload, requestId);
      const durationMs = Date.now() - startTime;

      // 6. Transação atômica única: criar Plan e marcar AiRun como SUCCEEDED
      const createdPlan = await this.prisma.$transaction(async (tx) => {
        const plan = await tx.plan.create({
          data: {
            userId: user.id,
            title,
            duration: dto.duration,
            digitalResources: dto.digitalResources,
            pedagogicalInstruction: dto.pedagogicalInstruction,
            contentMarkdown: n8nResponse.answer,
            status: PlanStatus.RASCUNHO,
            isAiAssisted: true,
            skills: {
              create: dto.skillIds.map((skillId) => ({ skillId })),
            },
          },
          include: {
            skills: {
              include: {
                skill: true,
              },
            },
          },
        });

        await tx.aiRun.update({
          where: { id: aiRun.id },
          data: {
            status: AiRunStatus.SUCCEEDED,
            planId: plan.id,
            responsePayload: n8nResponse as any,
            durationMs,
          },
        });

        return plan;
      });

      this.logger.log(`[generation] Plano ${createdPlan.id} gerado com sucesso para requestId: ${requestId}`);

      return {
        id: createdPlan.id,
        title: createdPlan.title,
        duration: createdPlan.duration,
        digitalResources: createdPlan.digitalResources,
        pedagogicalInstruction: createdPlan.pedagogicalInstruction,
        contentMarkdown: createdPlan.contentMarkdown,
        status: createdPlan.status,
        isAiAssisted: createdPlan.isAiAssisted,
        createdAt: createdPlan.createdAt,
        updatedAt: createdPlan.updatedAt,
        skills: createdPlan.skills.map((ps) => ps.skill),
        aiRun: {
          id: aiRun.id,
          requestId,
          status: AiRunStatus.SUCCEEDED,
          durationMs,
        },
      };
    } catch (error: any) {
      const durationMs = Date.now() - startTime;

      // 7. Em falha: registrar FAILED na AiRun sem criar nenhum registro na tabela Plan
      await this.prisma.aiRun.update({
        where: { id: aiRun.id },
        data: {
          status: AiRunStatus.FAILED,
          errorMessage: error.message || 'Falha ao processar rascunho com o serviço de IA.',
          durationMs,
        },
      });

      this.logger.warn(`[generation] Falha ao gerar plano para requestId: ${requestId} (${error.message}). Zero planos gravados.`);
      throw error;
    }
  }
}
