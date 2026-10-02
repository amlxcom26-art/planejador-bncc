import { Injectable, BadGatewayException, GatewayTimeoutException } from '@nestjs/common';
import { N8nRequestPayload, N8nResponse } from './n8n.schema';

@Injectable()
export class N8nMockService {
  async executeMock(payload: N8nRequestPayload, requestId: string): Promise<N8nResponse> {
    const instrucao = payload.instrucao || '';

    // Simulação determinística de erro HTTP 500 do n8n
    if (instrucao.includes('[SIMULAR_ERRO]')) {
      throw new BadGatewayException({
        statusCode: 502,
        message: 'Falha na resposta do serviço de IA (n8n retornou erro 500 simulado).',
        error: 'BadGateway',
        requestId,
      });
    }

    // Simulação determinística de timeout (>60s)
    if (instrucao.includes('[SIMULAR_TIMEOUT]')) {
      throw new GatewayTimeoutException({
        statusCode: 504,
        message: 'Tempo limite esgotado ao aguardar o retorno do serviço de IA.',
        error: 'GatewayTimeout',
        requestId,
      });
    }

    // Simulação determinística de resposta fora do contrato esperado
    if (instrucao.includes('[SIMULAR_RESPOSTA_INVALIDA]')) {
      // Retorna objeto que viola o schema Zod (success false)
      return {
        success: false,
        sessao: payload.sessao,
        habilidade: payload.habilidade,
        answer: '',
        format: 'markdown',
      } as unknown as N8nResponse;
    }

    // Resposta de sucesso pedagógica e estruturada em Markdown
    const digitalText = payload.recursos_digitais
      ? '- Dispositivos computacionais e recursos digitais da escola.'
      : '- Atividade desplugada, utilizando apenas materiais físicos e interação entre estudantes.';

    const answer = `# Plano de Aula: Planejamento Pedagógico BNCC

## 1. Habilidade Normativa
${payload.habilidade}

## 2. Objetivos de Aprendizagem
- Desenvolver o raciocínio estruturado e a compreensão prática do tema abordado.
- Promover a colaboração mútua e a resolução de problemas em grupo.

## 3. Metodologia e Desenvolvimento (${payload.duracao} minutos)
### Acolhimento e Sondagem Inicial (10 min)
Apresentação do contexto da aula, levantamento de conhecimentos prévios e estímulo à curiosidade dos alunos.

### Atividade Central (${Math.max(15, payload.duracao - 25)} min)
Execução da atividade prática conforme a orientação do docente: "${payload.instrucao}".

### Sistematização e Fechamento (15 min)
Roda de conversa para compartilhamento das conclusões e registro das aprendizagens construídas.

## 4. Recursos Necessários
${digitalText}
- Caderno de registros e cartões de apoio pedagógico.

## 5. Avaliação Formativa
Acompanhamento contínuo da participação, raciocínio explicativo e cooperação durante as tarefas propostas.`;

    return {
      success: true,
      sessao: payload.sessao,
      habilidade: payload.habilidade,
      answer,
      format: 'markdown',
    };
  }
}
