import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadGatewayException, GatewayTimeoutException } from '@nestjs/common';
import { N8nClient } from './n8n.client';
import { N8nMockService } from './n8n-mock.service';

describe('N8nClient', () => {
  let client: N8nClient;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        N8nClient,
        N8nMockService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              if (key === 'N8N_MOCK_MODE') return 'true';
              if (key === 'N8N_TIMEOUT_MS') return 60000;
              return defaultValue;
            }),
          },
        },
      ],
    }).compile();

    client = module.get<N8nClient>(N8nClient);
  });

  const validPayload = {
    sessao: 'ana@demo.bncc.br',
    habilidade: 'EF01CO01 — Organizar objetos físicos ou digitais',
    instrucao: 'Criar atividade introdutória em dupla.',
    duracao: 50,
    recursos_digitais: true,
  };

  it('deve gerar rascunho com sucesso e validar o contrato Zod', async () => {
    const result = await client.generateDraft(validPayload, 'req-uuid-123');

    expect(result.success).toBe(true);
    expect(result.format).toBe('markdown');
    expect(result.answer).toContain('# Plano de Aula');
    expect(result.sessao).toBe('ana@demo.bncc.br');
  });

  it('deve lançar BadGatewayException (502) quando simular erro [SIMULAR_ERRO]', async () => {
    const payloadComErro = {
      ...validPayload,
      instrucao: 'Atividade [SIMULAR_ERRO] teste de falha.',
    };

    await expect(client.generateDraft(payloadComErro, 'req-uuid-erro')).rejects.toThrow(
      BadGatewayException,
    );
  });

  it('deve lançar GatewayTimeoutException (504) quando simular timeout [SIMULAR_TIMEOUT]', async () => {
    const payloadComTimeout = {
      ...validPayload,
      instrucao: 'Atividade [SIMULAR_TIMEOUT] teste de tempo esgotado.',
    };

    await expect(client.generateDraft(payloadComTimeout, 'req-uuid-timeout')).rejects.toThrow(
      GatewayTimeoutException,
    );
  });

  it('deve lançar BadGatewayException quando a resposta violar o schema Zod', async () => {
    const payloadInvalido = {
      ...validPayload,
      instrucao: 'Atividade [SIMULAR_RESPOSTA_INVALIDA] teste de contrato quebrado.',
    };

    await expect(client.generateDraft(payloadInvalido, 'req-uuid-invalido')).rejects.toThrow(
      BadGatewayException,
    );
  });
});
