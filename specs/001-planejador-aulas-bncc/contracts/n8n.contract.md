# Contrato de Integração HTTP Externa: Serviço n8n (`N8nClient`)

Este documento formaliza o contrato de integração entre o backend NestJS (`apps/api`) e o workflow externo de geração de rascunhos pedagógicos no n8n, conforme definido em `docs/contracts/n8n.md` e nos requisitos da Constituição do projeto.

---

## 1. Princípios de Segurança e Isolamento

1. **Fronteira Segura:** Apenas o backend `apps/api` comunica-se com o n8n. O frontend `apps/web` **nunca** tem acesso à URL, credenciais ou headers de autenticação do n8n.
2. **Autenticação:** A comunicação exige o header de autenticação `x-api-key`. O valor é carregado da variável de ambiente `N8N_API_KEY`.
3. **Rastreabilidade:** Cada requisição inclui um header `x-request-id` contendo um UUID v4 gerado no backend, registrado na entidade de auditoria `AiRun`.
4. **Sem Retry Automático:** Conforme o Princípio V da Constituição, requisições de geração não sofrem re-tentativa automática por loop ou biblioteca para evitar execuções fantasmas, cobranças duplicadas ou condições de corrida.
5. **Timeout Estrito:** Cancelamento forçado via `AbortController` aos **60 segundos**.
6. **Atomicidade:** Em caso de resposta inválida ou falha, o backend aborta a transação e marca a `AiRun` como `FAILED`, garantindo que **nenhum plano de aula parcial seja criado** no banco de dados.

---

## 2. Contrato de Requisição (Outbound)

- **Método HTTP:** `POST`
- **URL Alvo:** `${N8N_WEBHOOK_URL}`
- **Headers HTTP:**
  ```http
  POST /webhook/gerar-plano-bncc HTTP/1.1
  Host: workflow.n8n.cloud
  Content-Type: application/json
  x-api-key: <N8N_API_KEY>
  x-request-id: <uuid-v4>
  ```
- **Corpo JSON:**
  ```json
  {
    "sessao": "ana@demo.bncc.br",
    "habilidade": "EF01CO01 — Organizar objetos físicos ou digitais considerando diferentes características para esta organização, explicitando semelhanças (padrões) e diferenças.",
    "instrucao": "Criar uma atividade introdutória em dupla focada em padrões.",
    "duracao": 50,
    "recursos_digitais": true
  }
  ```

### Especificação dos Campos:

| Campo | Tipo | Obrigatório | Descrição / Regra de Formatação |
|---|---|---|---|
| `sessao` | `string` | Sim | Identificador da sessão do professor (e-mail cadastrado do usuário logado: `user.email`). |
| `habilidade` | `string` | Sim | Texto composto da(s) habilidade(s). Formato canônico: `"${codigo} — ${descricao}"`. Quando múltiplas habilidades forem selecionadas (1 a 5), concatenar cada uma separada por quebra de linha `\n`. |
| `instrucao` | `string` | Sim | Diretriz pedagógica informada pelo professor (10 a 1.000 caracteres). |
| `duracao` | `number` | Sim | Duração estimada da aula em minutos (inteiro de 15 a 360). |
| `recursos_digitais` | `boolean` | Sim | Indicador se o plano deve incluir ferramentas e recursos computacionais/digitais (`true`/`false`). |

---

## 3. Contrato de Resposta (Inbound)

### 3.1. Resposta de Sucesso (`HTTP 200 OK`)

O workflow n8n deve retornar um JSON com a seguinte estrutura canônica:

```json
{
  "success": true,
  "sessao": "ana@demo.bncc.br",
  "habilidade": "EF01CO01 — Organizar objetos físicos ou digitais considerando diferentes características para esta organização, explicitando semelhanças (padrões) e diferenças.",
  "answer": "# Plano de Aula: Identificação de Padrões e Organização\n\n## 1. Objetivos Pedagógicos\n- Identificar características comuns em objetos físicos e digitais.\n- Estimular a cooperação mútua em atividades de pareamento.\n\n## 2. Conteúdo e Desenvolvimento\n### Acolhimento e Contextualização (10 min)\nO professor apresenta diferentes objetos...\n\n### Atividade Prática em Dupla (25 min)\nDistribuir blocos lógicos ou cartões...\n\n### Síntese e Avaliação (15 min)\nCompartilhamento das organizações feitas...\n\n## 3. Recursos Necessários\n- Conjunto de cartões coloridos com figuras geométricas ou objetos reais.",
  "format": "markdown"
}
```

### 3.2. Esquema Zod de Validação Estrita no Backend:

```typescript
import { z } from 'zod';

export const N8nResponseSchema = z.object({
  success: z.literal(true),
  sessao: z.string().min(1),
  habilidade: z.string().min(1),
  answer: z.string().min(10, 'O conteúdo do plano gerado deve ter no mínimo 10 caracteres'),
  format: z.literal('markdown')
});

export type N8nResponse = z.infer<typeof N8nResponseSchema>;
```

---

## 4. Tratamento de Erros e Exceções

Qualquer desvio do contrato acima dispara o fluxo de falha atômica:

| Cenário | Comportamento do `N8nClient` | Status na `AiRun` | Status Retornado pela API |
|---|---|---|---|
| Timeout (> 60 segundos) | Cancela requisição via `AbortSignal` | `FAILED` (`"Tempo limite de 60s excedido"`) | `HTTP 504 Gateway Timeout` |
| Resposta HTTP com status != 2xx (4xx, 5xx) | Captura status e corpo de erro retornado | `FAILED` (`"Serviço n8n indisponível (HTTP ${status})"`) | `HTTP 502 Bad Gateway` |
| Payload JSON não analisável ou malformado | Trata falha de parsing JSON | `FAILED` (`"Resposta inválida do serviço de IA"`) | `HTTP 502 Bad Gateway` |
| Validação Zod rejeitada (`success !== true`, campo `answer` ausente) | Trata erro de schema | `FAILED` (`"Contrato de resposta do n8n não atendido"`) | `HTTP 502 Bad Gateway` |
| Conexão recusada / DNS falhou | Trata exceção de rede | `FAILED` (`"Falha de conexão com o webhook n8n"`) | `HTTP 502 Bad Gateway` |

---

## 5. Modo Mock Local (`N8N_MOCK_MODE=true`)

Para permitir testes de unidade, testes de integração E2E e desenvolvimento offline sem depender da disponibilidade do servidor n8n:

1. Quando `N8N_MOCK_MODE=true` no arquivo `.env` da API:
   - A requisição de rede HTTP externa é interceptada e ignorada.
   - Um delay simulado realista de 800ms é introduzido.
2. **Cenário de Sucesso Simulado:**
   - Retorna um rascunho de aula estruturado com títulos, objetivos, cronograma pedagógico e recursos condizentes com a habilidade solicitada e o valor de `recursos_digitais`.
3. **Cenário de Falha Simulado:**
   - Se a string `instrucao` contiver a palavra-chave `[SIMULAR_ERRO]`, o client simula imediatamente uma falha HTTP 500 do n8n, permitindo validar o fluxo transacional de erro e a preservação dos dados do formulário sem criar plano parcial.
   - Se a string `instrucao` contiver `[SIMULAR_TIMEOUT]`, o client simula um estouro de tempo limite (> 60s).
