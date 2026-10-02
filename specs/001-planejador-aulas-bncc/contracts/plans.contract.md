# API Contract: Planos de Aula (`/api/plans`)

Este documento estabelece o contrato formal para o gerenciamento de planos de aula e o ciclo transacional de geração por inteligência artificial.

Todas as rotas deste contrato exigem autenticação obrigatória via cabeçalho `Authorization: Bearer <accessToken>`.
Em estrita conformidade com o Princípio III (Privacidade e Multitenancy), todas as operações são filtradas pelo identificador do docente autenticado (`userId`). A tentativa de acessar, modificar ou excluir plano pertencente a outro docente responde estritamente com **HTTP 404 Not Found** para evitar enumeração de recursos (prevenção contra IDOR).

---

## 1. GET `/api/plans`
Lista os rascunhos de planos de aula pertencentes exclusivamente ao professor logado.

- **Headers:** `Authorization: Bearer <accessToken>`
- **Query Parameters (Opcionais):**
  - `status` (`string`): Filtro de status (`RASCUNHO`, padrão).
- **Resposta de Sucesso (`200 OK`):**
  ```json
  {
    "total": 2,
    "items": [
      {
        "id": "cuid-plan-1",
        "title": "Água e vida no território",
        "duration": 50,
        "digitalResources": true,
        "status": "RASCUNHO",
        "isAiAssisted": true,
        "createdAt": "2026-10-02T10:00:00.000Z",
        "updatedAt": "2026-10-02T10:00:00.000Z",
        "skills": [
          {
            "id": "cuid-skill-1",
            "codigo": "EF01CO01",
            "nivel": "Ensino Fundamental",
            "ano": 1,
            "eixo": "Pensamento Computacional (PC)",
            "descricao": "Organizar objetos físicos ou digitais..."
          }
        ]
      }
    ]
  }
  ```
- **Caso de Lista Vazia (`200 OK`):**
  ```json
  {
    "total": 0,
    "items": []
  }
  ```
- **Respostas de Erro:**
  - `401 Unauthorized`: Token ausente, inválido ou expirado.

---

## 2. GET `/api/plans/:id`
Recupera a íntegra de um plano de aula para visualização e edição.

- **Headers:** `Authorization: Bearer <accessToken>`
- **Path Parameters:**
  - `id` (`string`): Identificador do plano.
- **Resposta de Sucesso (`200 OK`):**
  ```json
  {
    "id": "cuid-plan-1",
    "title": "Água e vida no território",
    "duration": 50,
    "digitalResources": true,
    "pedagogicalInstruction": "Criar uma atividade introdutória em dupla focada em padrões.",
    "contentMarkdown": "# Plano de Aula: Água e Vida no Território\n\n## 1. Objetivos de Aprendizagem\n- Compreender a distribuição de recursos hídricos...",
    "status": "RASCUNHO",
    "isAiAssisted": true,
    "createdAt": "2026-10-02T10:00:00.000Z",
    "updatedAt": "2026-10-02T10:15:00.000Z",
    "skills": [
      {
        "id": "cuid-skill-1",
        "codigo": "EF01CO01",
        "nivel": "Ensino Fundamental",
        "ano": 1,
        "eixo": "Pensamento Computacional (PC)",
        "descricao": "Organizar objetos físicos ou digitais considerando diferentes características...",
        "explicacao": "Objetos de um mesmo conjunto podem ser organizados...",
        "exemplos": "O professor pode pedir que os alunos organizem..."
      }
    ],
    "aiRun": {
      "id": "cuid-airun-1",
      "requestId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      "status": "SUCCEEDED",
      "durationMs": 4200
    }
  }
  ```
- **Respostas de Erro:**
  - `401 Unauthorized`: Token ausente ou inválido.
  - `404 Not Found`: Plano inexistente **OU** pertencente a outro docente (IDOR Prevention):
    ```json
    {
      "statusCode": 404,
      "message": "Plano de aula não encontrado.",
      "error": "NotFound"
    }
    ```

---

## 3. POST `/api/plans/generate`
Dispara o ciclo atômico de geração de rascunho com auxílio de IA via integração com n8n.

- **Headers:**
  - `Authorization: Bearer <accessToken>`
  - `Content-Type: application/json`
- **Corpo da Requisição:**
  ```json
  {
    "skillIds": ["cuid-skill-1"],
    "title": "Água e vida no território",
    "duration": 50,
    "digitalResources": true,
    "pedagogicalInstruction": "Criar uma atividade introdutória em dupla focada em identificação de padrões."
  }
  ```
- **Regras de Validação:**
  - `skillIds`: Array de strings, mínimo 1, máximo 5 itens. Cada ID deve existir no catálogo `BnccSkill`.
  - `title`: `string`, opcional (se omitido, o backend deriva automaticamente a partir do código da primeira habilidade), tamanho de 3 a 120 caracteres.
  - `duration`: `number` inteiro, entre 15 e 360 minutos.
  - `digitalResources`: `boolean`, obrigatório.
  - `pedagogicalInstruction`: `string`, mínimo de 10 caracteres e máximo de 1.000 caracteres.
- **Ciclo Transacional e Resposta de Sucesso (`201 Created`):**
  1. Cria registro `AiRun` com status `PENDING` e `requestId` único.
  2. Dispara POST HTTP para n8n com header `x-api-key` e `x-request-id`.
  3. Ao receber `{ success: true, answer: "..." }`, executa transação no Prisma:
     - Cria `Plan` (`status: RASCUNHO`, `isAiAssisted: true`, `contentMarkdown: answer`).
     - Vincula `PlanSkill` às habilidades solicitadas.
     - Atualiza `AiRun` para `SUCCEEDED` associando o `planId`.
  ```json
  {
    "id": "cuid-plan-new",
    "title": "Água e vida no território",
    "duration": 50,
    "digitalResources": true,
    "pedagogicalInstruction": "Criar uma atividade introdutória em dupla focada em identificação de padrões.",
    "contentMarkdown": "# Plano de Aula\n\n## Introdução\nNesta aula os alunos irão...",
    "status": "RASCUNHO",
    "isAiAssisted": true,
    "createdAt": "2026-10-02T10:20:00.000Z",
    "updatedAt": "2026-10-02T10:20:00.000Z",
    "skills": [
      {
        "id": "cuid-skill-1",
        "codigo": "EF01CO01",
        "descricao": "Organizar objetos físicos ou digitais..."
      }
    ]
  }
  ```
- **Ciclo Transacional em Falha (Atomicidade Garantida):**
  - Caso ocorra timeout (> 60s), falha de conexão, erro HTTP 5xx do n8n ou resposta inválida:
    - O backend atualiza o registro `AiRun` para `FAILED` com mensagem de erro.
    - **Nenhum registro parcial é inserido na tabela `Plan`**.
    - Retorna erro com status HTTP correspondente (`502` ou `504`):
  - `502 Bad Gateway` (Falha na resposta do serviço de IA):
    ```json
    {
      "statusCode": 502,
      "message": "Não foi possível gerar o rascunho com o assistente de IA. Seus dados foram preservados para uma nova tentativa.",
      "error": "BadGateway",
      "requestId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d"
    }
    ```
  - `504 Gateway Timeout` (Tempo limite de 60s excedido):
    ```json
    {
      "statusCode": 504,
      "message": "O assistente de IA demorou mais do que o esperado para responder. Tente novamente.",
      "error": "GatewayTimeout",
      "requestId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d"
    }
    ```
  - `400 Bad Request` (Validação de entrada):
    ```json
    {
      "statusCode": 400,
      "message": [
        "A instrução pedagógica deve conter entre 10 e 1000 caracteres.",
        "A duração deve ser entre 15 e 360 minutos.",
        "Selecione de 1 a 5 habilidades da BNCC."
      ],
      "error": "BadRequest"
    }
    ```

---

## 4. PUT `/api/plans/:id`
Salva explicitamente as alterações efetuadas pelo professor no plano de aula (texto Markdown e/ou título).

- **Headers:**
  - `Authorization: Bearer <accessToken>`
  - `Content-Type: application/json`
- **Path Parameters:**
  - `id` (`string`): Identificador do plano.
- **Corpo da Requisição:**
  ```json
  {
    "title": "Água e vida no território - Revisado",
    "contentMarkdown": "# Plano de Aula: Água e Vida no Território (Ajustado)\n\n## 1. Objetivos\nTexto editado pelo professor..."
  }
  ```
- **Regras de Validação:**
  - `title`: `string`, opcional, mínimo 3 e máximo 120 caracteres.
  - `contentMarkdown`: `string`, obrigatório, mínimo de 10 caracteres.
- **Resposta de Sucesso (`200 OK`):**
  ```json
  {
    "id": "cuid-plan-1",
    "title": "Água e vida no território - Revisado",
    "contentMarkdown": "# Plano de Aula: Água e Vida no Território (Ajustado)\n\n## 1. Objetivos\nTexto editado pelo professor...",
    "status": "RASCUNHO",
    "isAiAssisted": true,
    "updatedAt": "2026-10-02T10:35:00.000Z"
  }
  ```
- **Respostas de Erro:**
  - `400 Bad Request`: Conteúdo Markdown vazio ou inválido.
  - `401 Unauthorized`: Token ausente ou inválido.
  - `404 Not Found`: Plano inexistente **OU** pertencente a outro docente.

---

## 5. DELETE `/api/plans/:id`
Exclui um rascunho de plano de aula do professor.

- **Headers:** `Authorization: Bearer <accessToken>`
- **Path Parameters:**
  - `id` (`string`): Identificador do plano.
- **Resposta de Sucesso (`200 OK`):**
  ```json
  {
    "success": true,
    "message": "Plano de aula excluído com sucesso."
  }
  ```
- **Respostas de Erro:**
  - `401 Unauthorized`: Token ausente ou inválido.
  - `404 Not Found`: Plano inexistente **OU** pertencente a outro docente.
