import {
  Injectable,
  Logger,
  BadGatewayException,
  GatewayTimeoutException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { N8nRequestPayload, N8nResponse, N8nResponseSchema, N8nRequestSchema } from './n8n.schema';
import { N8nMockService } from './n8n-mock.service';

@Injectable()
export class N8nClient {
  private readonly logger = new Logger(N8nClient.name);
  private readonly timeoutMs: number;
  private readonly isMockMode: boolean;
  private readonly webhookUrl: string;
  private readonly apiKey: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly mockService: N8nMockService,
  ) {
    this.timeoutMs = this.configService.get<number>('N8N_TIMEOUT_MS', 60000);
    this.isMockMode = this.configService.get<string>('N8N_MOCK_MODE', 'true').toLowerCase() === 'true';
    this.webhookUrl = this.configService.get<string>('N8N_WEBHOOK_URL', 'http://localhost:5678/webhook/gerar-plano-bncc');
    this.apiKey = this.configService.get<string>('N8N_API_KEY', '');
  }

  /**
   * Envia a solicitação de geração de rascunho ao workflow do n8n (ou ao mock local)
   */
  async generateDraft(payload: N8nRequestPayload, requestId: string): Promise<N8nResponse> {
    // Validação estrita do payload de saída
    const validation = N8nRequestSchema.safeParse(payload);
    if (!validation.success) {
      throw new BadGatewayException({
        statusCode: 502,
        message: 'Payload inválido para o serviço de IA.',
        error: 'BadGateway',
        requestId,
      });
    }

    // Modo Mock Local
    if (this.isMockMode) {
      this.logger.log(`[n8n-mock] Executando geração em modo mock para requestId: ${requestId}`);
      const rawResult = await this.mockService.executeMock(payload, requestId);
      return this.validateResponse(rawResult, requestId);
    }

    // Modo Real (Workflow externo n8n)
    this.logger.log(`[n8n-client] Disparando requisição externa para requestId: ${requestId}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'x-request-id': requestId,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        this.logger.error(`[n8n-client] Resposta com status ${response.status} para requestId: ${requestId}`);
        throw new BadGatewayException({
          statusCode: 502,
          message: `Serviço de IA indisponível (HTTP ${response.status}).`,
          error: 'BadGateway',
          requestId,
        });
      }

      let data: unknown;
      try {
        data = await response.json();
      } catch {
        throw new BadGatewayException({
          statusCode: 502,
          message: 'Resposta do serviço de IA não é um JSON válido.',
          error: 'BadGateway',
          requestId,
        });
      }

      return this.validateResponse(data, requestId);
    } catch (error: any) {
      clearTimeout(timeoutId);

      // Timeout (>60s)
      if (error.name === 'AbortError' || error instanceof GatewayTimeoutException) {
        this.logger.warn(`[n8n-client] Timeout de ${this.timeoutMs}ms atingido para requestId: ${requestId}`);
        throw new GatewayTimeoutException({
          statusCode: 504,
          message: 'Tempo limite esgotado ao aguardar o retorno do serviço de IA.',
          error: 'GatewayTimeout',
          requestId,
        });
      }

      if (error instanceof BadGatewayException) {
        throw error;
      }

      this.logger.error(`[n8n-client] Erro de conexão com o workflow n8n para requestId: ${requestId}: ${error.message}`);
      throw new BadGatewayException({
        statusCode: 502,
        message: 'Não foi possível conectar ao serviço de IA. Verifique sua conexão e tente novamente.',
        error: 'BadGateway',
        requestId,
      });
    }
  }

  /**
   * Validação rigorosa da estrutura da resposta com o esquema Zod
   */
  private validateResponse(data: unknown, requestId: string): N8nResponse {
    const parseResult = N8nResponseSchema.safeParse(data);

    if (!parseResult.success) {
      this.logger.error(`[n8n-client] Resposta fora do contrato esperado para requestId: ${requestId}: ${parseResult.error.message}`);
      throw new BadGatewayException({
        statusCode: 502,
        message: 'O assistente de IA retornou uma resposta em formato inválido.',
        error: 'BadGateway',
        requestId,
      });
    }

    return parseResult.data;
  }
}
