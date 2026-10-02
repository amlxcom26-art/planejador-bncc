import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import { AiRunStatus, PlanStatus } from '@prisma/client';

process.env.N8N_MOCK_MODE = 'true';

describe('Plans Generation Flow (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let anaToken: string;
  let anaUserId: string;
  let validSkillId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );

    await app.init();
    prisma = app.get<PrismaService>(PrismaService);

    // 1. Obter usuário e token da Profª Ana
    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'ana@demo.bncc.br',
        password: 'demo123',
      })
      .expect(200);

    anaToken = loginRes.body.accessToken;
    anaUserId = loginRes.body.user.id;

    // 2. Obter habilidade BNCC válida do banco
    const skill = await prisma.bnccSkill.findFirst();
    if (!skill) {
      throw new Error('Nenhuma habilidade BNCC encontrada no banco de dados para os testes.');
    }
    validSkillId = skill.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/plans/generate (Modo Mock & Validações)', () => {
    it('deve rejeitar requisição sem token JWT com HTTP 401 Unauthorized', async () => {
      await request(app.getHttpServer())
        .post('/api/plans/generate')
        .send({
          skillIds: [validSkillId],
          duration: 50,
          digitalResources: true,
          pedagogicalInstruction: 'Instrução pedagógica válida com mais de dez caracteres.',
        })
        .expect(401);
    });

    it('deve rejeitar payload com validações inválidas com HTTP 400', async () => {
      // Menos de 1 habilidade
      await request(app.getHttpServer())
        .post('/api/plans/generate')
        .set('Authorization', `Bearer ${anaToken}`)
        .send({
          skillIds: [],
          duration: 50,
          digitalResources: false,
          pedagogicalInstruction: 'Instrução pedagógica válida.',
        })
        .expect(400);

      // Duração menor que 15 min
      await request(app.getHttpServer())
        .post('/api/plans/generate')
        .set('Authorization', `Bearer ${anaToken}`)
        .send({
          skillIds: [validSkillId],
          duration: 10,
          digitalResources: false,
          pedagogicalInstruction: 'Instrução pedagógica válida.',
        })
        .expect(400);

      // Duração maior que 360 min
      await request(app.getHttpServer())
        .post('/api/plans/generate')
        .set('Authorization', `Bearer ${anaToken}`)
        .send({
          skillIds: [validSkillId],
          duration: 400,
          digitalResources: false,
          pedagogicalInstruction: 'Instrução pedagógica válida.',
        })
        .expect(400);

      // Instrução com menos de 10 caracteres
      await request(app.getHttpServer())
        .post('/api/plans/generate')
        .set('Authorization', `Bearer ${anaToken}`)
        .send({
          skillIds: [validSkillId],
          duration: 50,
          digitalResources: false,
          pedagogicalInstruction: 'Curto',
        })
        .expect(400);
    });

    it('deve gerar plano de aula com sucesso em modo mock, criando Plan RASCUNHO e AiRun SUCCEEDED', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/plans/generate')
        .set('Authorization', `Bearer ${anaToken}`)
        .send({
          title: 'Aula Teste E2E Sucesso',
          skillIds: [validSkillId],
          duration: 50,
          digitalResources: true,
          pedagogicalInstruction: 'Desenvolver raciocínio computacional com foco em algoritmos.',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe('Aula Teste E2E Sucesso');
      expect(response.body.status).toBe(PlanStatus.RASCUNHO);
      expect(response.body.isAiAssisted).toBe(true);
      expect(response.body.contentMarkdown).toContain('# Plano de Aula:');
      expect(response.body.skills).toHaveLength(1);
      expect(response.body.aiRun).toBeDefined();
      expect(response.body.aiRun.status).toBe(AiRunStatus.SUCCEEDED);

      // Verificar persistência no banco
      const planInDb = await prisma.plan.findUnique({
        where: { id: response.body.id },
        include: { aiRuns: true },
      });

      expect(planInDb).toBeDefined();
      expect(planInDb?.status).toBe(PlanStatus.RASCUNHO);
      expect(planInDb?.isAiAssisted).toBe(true);
      expect(planInDb?.aiRuns).toHaveLength(1);
      expect(planInDb?.aiRuns[0].status).toBe(AiRunStatus.SUCCEEDED);
    });

    it('deve simular falha com [SIMULAR_ERRO]: retornar HTTP 502, marcar AiRun FAILED e gravar ZERO planos parciais', async () => {
      const initialPlansCount = await prisma.plan.count({
        where: { userId: anaUserId },
      });

      const response = await request(app.getHttpServer())
        .post('/api/plans/generate')
        .set('Authorization', `Bearer ${anaToken}`)
        .send({
          title: 'Aula Teste E2E Falha',
          skillIds: [validSkillId],
          duration: 50,
          digitalResources: false,
          pedagogicalInstruction: 'Aula de algoritmos desplugada [SIMULAR_ERRO] com cartões.',
        })
        .expect(502);

      expect(response.body.message).toContain('n8n retornou erro 500 simulado');

      // Verificar que ZERO novos planos foram criados
      const finalPlansCount = await prisma.plan.count({
        where: { userId: anaUserId },
      });
      expect(finalPlansCount).toBe(initialPlansCount);

      // Verificar que AiRun foi registrado como FAILED
      const failedAiRun = await prisma.aiRun.findFirst({
        where: {
          userId: anaUserId,
          status: AiRunStatus.FAILED,
        },
        orderBy: { createdAt: 'desc' },
      });

      expect(failedAiRun).toBeDefined();
      expect(failedAiRun?.planId).toBeNull();
      expect(failedAiRun?.errorMessage).toBeDefined();
    });

    it('deve simular timeout com [SIMULAR_TIMEOUT]: retornar HTTP 504, marcar AiRun FAILED e gravar ZERO planos parciais', async () => {
      const initialPlansCount = await prisma.plan.count({
        where: { userId: anaUserId },
      });

      const response = await request(app.getHttpServer())
        .post('/api/plans/generate')
        .set('Authorization', `Bearer ${anaToken}`)
        .send({
          title: 'Aula Teste E2E Timeout',
          skillIds: [validSkillId],
          duration: 50,
          digitalResources: false,
          pedagogicalInstruction: 'Aula prática de lógica [SIMULAR_TIMEOUT] tempo excedido.',
        })
        .expect(504);

      expect(response.body.message).toContain('Tempo limite esgotado');

      // Verificar que ZERO novos planos foram criados
      const finalPlansCount = await prisma.plan.count({
        where: { userId: anaUserId },
      });
      expect(finalPlansCount).toBe(initialPlansCount);

      // Verificar que AiRun foi registrado como FAILED com duração registrada
      const timedOutAiRun = await prisma.aiRun.findFirst({
        where: {
          userId: anaUserId,
          status: AiRunStatus.FAILED,
        },
        orderBy: { createdAt: 'desc' },
      });

      expect(timedOutAiRun).toBeDefined();
      expect(timedOutAiRun?.planId).toBeNull();
      expect(timedOutAiRun?.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('deve simular resposta inválida com [SIMULAR_RESPOSTA_INVALIDA]: retornar HTTP 502 por quebra de contrato Zod', async () => {
      const initialPlansCount = await prisma.plan.count({
        where: { userId: anaUserId },
      });

      const response = await request(app.getHttpServer())
        .post('/api/plans/generate')
        .set('Authorization', `Bearer ${anaToken}`)
        .send({
          title: 'Aula Resposta Inválida',
          skillIds: [validSkillId],
          duration: 50,
          digitalResources: false,
          pedagogicalInstruction: 'Aula de matemática [SIMULAR_RESPOSTA_INVALIDA] contrato corrompido.',
        })
        .expect(502);

      expect(response.body.message).toContain('formato inválido');

      // Verificar que ZERO novos planos foram criados
      const finalPlansCount = await prisma.plan.count({
        where: { userId: anaUserId },
      });
      expect(finalPlansCount).toBe(initialPlansCount);
    });
  });
});
