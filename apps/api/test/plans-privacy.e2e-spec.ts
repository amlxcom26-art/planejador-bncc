import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';

describe('Plans Privacy & Multi-tenancy IDOR (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let anaToken: string;
  let anaUserId: string;
  let marcosToken: string;
  let marcosUserId: string;
  let anaPlanId: string;

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

    // 1. Login Profª Ana
    const anaLoginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'ana@demo.bncc.br',
        password: 'demo123',
      })
      .expect(200);

    anaToken = anaLoginRes.body.accessToken;
    anaUserId = anaLoginRes.body.user.id;

    // 2. Login Prof. Marcos
    const marcosLoginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'marcos@demo.bncc.br',
        password: 'demo123',
      })
      .expect(200);

    marcosToken = marcosLoginRes.body.accessToken;
    marcosUserId = marcosLoginRes.body.user.id;

    // 3. Garantir que a Profª Ana possui pelo menos 1 plano
    const plan = await prisma.plan.findFirst({
      where: { userId: anaUserId },
    });

    if (!plan) {
      throw new Error('Nenhum plano encontrado para a Profª Ana no seed do banco.');
    }
    anaPlanId = plan.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Isolamento de Listagem (GET /api/plans)', () => {
    it('deve retornar os planos pertencentes à Profª Ana', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/plans')
        .set('Authorization', `Bearer ${anaToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('total');
      expect(response.body.total).toBeGreaterThanOrEqual(1);
      expect(Array.isArray(response.body.items)).toBe(true);

      const planIds = response.body.items.map((p: any) => p.id);
      expect(planIds).toContain(anaPlanId);
    });

    it('deve retornar total 0 para o Prof. Marcos (sem planos iniciais)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/plans')
        .set('Authorization', `Bearer ${marcosToken}`)
        .expect(200);

      expect(response.body.total).toBe(0);
      expect(response.body.items).toHaveLength(0);
    });
  });

  describe('Prevenção a IDOR (Anti-enumeração com HTTP 404)', () => {
    it('deve retornar estritamente HTTP 404 quando o Prof. Marcos tentar ler um plano da Profª Ana', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/plans/${anaPlanId}`)
        .set('Authorization', `Bearer ${marcosToken}`)
        .expect(404);

      expect(response.body.message).toContain('Plano de aula não encontrado');
    });

    it('deve retornar estritamente HTTP 404 quando o Prof. Marcos tentar atualizar um plano da Profª Ana', async () => {
      const originalPlan = await prisma.plan.findUnique({
        where: { id: anaPlanId },
      });

      const response = await request(app.getHttpServer())
        .put(`/api/plans/${anaPlanId}`)
        .set('Authorization', `Bearer ${marcosToken}`)
        .send({
          title: 'Tentativa de Hack por Marcos',
          contentMarkdown: 'Conteúdo adulterado maliciosamente.',
        })
        .expect(404);

      expect(response.body.message).toContain('Plano de aula não encontrado');

      // Garantir integridade dos dados no banco
      const planAfterAttempt = await prisma.plan.findUnique({
        where: { id: anaPlanId },
      });
      expect(planAfterAttempt?.title).toBe(originalPlan?.title);
      expect(planAfterAttempt?.contentMarkdown).toBe(originalPlan?.contentMarkdown);
    });

    it('deve retornar estritamente HTTP 404 quando o Prof. Marcos tentar deletar um plano da Profª Ana', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/plans/${anaPlanId}`)
        .set('Authorization', `Bearer ${marcosToken}`)
        .expect(404);

      expect(response.body.message).toContain('Plano de aula não encontrado');

      // Garantir que o plano continua intacto no banco
      const planInDb = await prisma.plan.findUnique({
        where: { id: anaPlanId },
      });
      expect(planInDb).not.toBeNull();
    });

    it('deve retornar HTTP 404 para ID inexistente', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      await request(app.getHttpServer())
        .get(`/api/plans/${nonExistentId}`)
        .set('Authorization', `Bearer ${anaToken}`)
        .expect(404);
    });
  });

  describe('Operações Legítimas do Próprio Docente (Profª Ana)', () => {
    it('deve permitir que a Profª Ana leia o seu próprio plano por ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/plans/${anaPlanId}`)
        .set('Authorization', `Bearer ${anaToken}`)
        .expect(200);

      expect(response.body.id).toBe(anaPlanId);
      expect(response.body).toHaveProperty('title');
      expect(response.body).toHaveProperty('contentMarkdown');
      expect(response.body).toHaveProperty('skills');
    });

    it('deve permitir que a Profª Ana edite o conteúdo em Markdown e título do seu plano', async () => {
      const updatedMarkdown = '## Conteúdo Atualizado pela Professora Ana\n\n- Novo objetivo de aprendizagem.\n- Avaliação formativa.';
      const updatedTitle = 'Plano de Aula Revisado pela Ana';

      const response = await request(app.getHttpServer())
        .put(`/api/plans/${anaPlanId}`)
        .set('Authorization', `Bearer ${anaToken}`)
        .send({
          title: updatedTitle,
          contentMarkdown: updatedMarkdown,
        })
        .expect(200);

      expect(response.body.title).toBe(updatedTitle);
      expect(response.body.contentMarkdown).toBe(updatedMarkdown);

      // Conferir no banco
      const planInDb = await prisma.plan.findUnique({
        where: { id: anaPlanId },
      });
      expect(planInDb?.title).toBe(updatedTitle);
      expect(planInDb?.contentMarkdown).toBe(updatedMarkdown);
    });

    it('deve permitir que a Profª Ana exclua um plano próprio', async () => {
      // Criar um plano temporário para exclusão
      const tempPlan = await prisma.plan.create({
        data: {
          userId: anaUserId,
          title: 'Plano Temporário para Deletar',
          duration: 30,
          digitalResources: false,
          pedagogicalInstruction: 'Instrução para exclusão.',
          contentMarkdown: '# Plano Temporário',
          status: 'RASCUNHO',
          isAiAssisted: false,
        },
      });

      const response = await request(app.getHttpServer())
        .delete(`/api/plans/${tempPlan.id}`)
        .set('Authorization', `Bearer ${anaToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Confirmar que não existe mais
      const deletedPlan = await prisma.plan.findUnique({
        where: { id: tempPlan.id },
      });
      expect(deletedPlan).toBeNull();
    });
  });
});
