import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';

describe('Auth Flow (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

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
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/auth/login', () => {
    it('deve autenticar com sucesso a conta demo da Profª Ana e emitir cookie HttpOnly', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'ana@demo.bncc.br',
          password: 'demo123',
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body.user).toEqual({
        id: expect.any(String),
        name: 'Profª Ana Souza',
        email: 'ana@demo.bncc.br',
      });

      const cookies = response.headers['set-cookie'] as unknown as string[];
      expect(cookies).toBeDefined();
      const refreshCookie = cookies.find((c) => c.startsWith('refreshToken='));
      expect(refreshCookie).toBeDefined();
      expect(refreshCookie).toContain('HttpOnly');
      expect(refreshCookie).toContain('SameSite=Strict');
      expect(refreshCookie).toContain('Path=/api/auth');
    });

    it('deve rejeitar credenciais inválidas com HTTP 401', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'ana@demo.bncc.br',
          password: 'senha_errada_123',
        })
        .expect(401);

      expect(response.body.message).toContain('E-mail ou senha incorretos');
    });
  });

  describe('GET /api/auth/me e POST /api/auth/refresh', () => {
    let accessToken: string;
    let rawCookie: string;

    beforeEach(async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'ana@demo.bncc.br',
          password: 'demo123',
        });

      accessToken = loginRes.body.accessToken;
      const cookies = loginRes.headers['set-cookie'] as unknown as string[];
      rawCookie = cookies.find((c) => c.startsWith('refreshToken='))!;
    });

    it('deve retornar os dados do docente autenticado via Bearer Token', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.email).toBe('ana@demo.bncc.br');
      expect(response.body.name).toBe('Profª Ana Souza');
    });

    it('deve rejeitar acesso sem token com HTTP 401', async () => {
      await request(app.getHttpServer())
        .get('/api/auth/me')
        .expect(401);
    });

    it('deve renovar sessão com sucesso usando o cookie HttpOnly', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .set('Cookie', [rawCookie])
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body.user.email).toBe('ana@demo.bncc.br');

      const cookies = response.headers['set-cookie'] as unknown as string[];
      const newCookie = cookies.find((c) => c.startsWith('refreshToken='));
      expect(newCookie).toBeDefined();
    });

    it('deve encerrar sessão no logout e limpar o cookie', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Cookie', [rawCookie])
        .expect(200);

      expect(response.body.success).toBe(true);

      // Tentar usar o token revogado no refresh deve retornar 401
      await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .set('Cookie', [rawCookie])
        .expect(401);
    });
  });
});
