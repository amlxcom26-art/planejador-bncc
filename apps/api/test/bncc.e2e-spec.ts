import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';

describe('BNCC Catalog (E2E)', () => {
  let app: INestApplication;
  let accessToken: string;

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

    // Obter token autenticado da Profª Ana
    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'ana@demo.bncc.br',
        password: 'demo123',
      });

    accessToken = loginRes.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('deve rejeitar consulta sem autenticação com HTTP 401', async () => {
    await request(app.getHttpServer())
      .get('/api/bncc/skills')
      .expect(401);
  });

  it('deve retornar a lista completa de habilidades do catálogo seedado (5 itens)', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/bncc/skills')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body).toHaveProperty('total', 5);
    expect(response.body.items).toHaveLength(5);
    expect(response.body.items[0]).toHaveProperty('codigo');
    expect(response.body.items[0]).toHaveProperty('descricao');
  });

  it('deve filtrar habilidades por ano escolar (ex: ano=1)', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/bncc/skills?ano=1')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body.total).toBe(2);
    const codigos = response.body.items.map((i: any) => i.codigo);
    expect(codigos).toContain('EF01CO01');
    expect(codigos).toContain('EF01CO02');
  });

  it('deve filtrar habilidades por eixo temático', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/bncc/skills?eixo=Mundo%20Digital')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body.total).toBe(1);
    expect(response.body.items[0].codigo).toBe('EF02CO04');
  });

  it('deve filtrar habilidades por busca textual q', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/bncc/skills?q=algoritmo')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body.total).toBeGreaterThanOrEqual(1);
    const codigos = response.body.items.map((i: any) => i.codigo);
    expect(codigos).toContain('EF01CO02');
  });
});
