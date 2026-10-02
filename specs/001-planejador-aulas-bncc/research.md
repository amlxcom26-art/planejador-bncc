# Technical Research & Architecture Decisions: Planejador BNCC

**Feature**: `001-planejador-aulas-bncc`
**Status**: Completed

Este documento consolida as decisões técnicas, compatibilidade de versões, padrões de arquitetura e mitigação de riscos para o Planejador BNCC, em estrita conformidade com a Constituição do projeto (`.specify/memory/constitution.md`) e os contratos em `docs/contracts/n8n.md`.

---

## 1. Monorepo e Gerenciador de Pacotes

- **Decisão:** Monorepo gerenciado por **pnpm Workspaces** (`pnpm-workspace.yaml`), com duas aplicações principais:
  - `apps/web`: Frontend em Next.js (App Router) + TypeScript na porta `3000`.
  - `apps/api`: Backend em NestJS + TypeScript na porta `3001`.
  - `packages/shared` (opcional/futuro): Interfaces compartilhadas de DTOs e tipos de domínio.
- **Versões Inspecionadas e Compatíveis:**
  - **Node.js:** `v24.21.0` (LTS/current compatível com runtime modern JS).
  - **pnpm:** `12.8.1` (com lockfile `pnpm-lock.yaml` estrito).
  - **TypeScript:** `^5.6.x` em todo o workspace.
- **Scripts Raiz Obrigatórios:**
  - `dev`: Inicia simultaneamente API e Web (`pnpm --parallel --filter "./apps/*" dev`).
  - `lint`: Executa linting no frontend e backend.
  - `typecheck`: Validação de tipos sem emitir código (`tsc --noEmit`).
  - `test`: Execução de testes unitários com Jest/Vitest.
  - `test:integration`: Testes de integração de endpoints e fluxos de banco de dados.
  - `build`: Build de produção de todos os pacotes e apps.
- **Alternativas Consideradas:**
  - *npm/yarn workspaces:* Rejeitado por menor performance em cache e maior consumo de disco em relação ao pnpm.
  - *Nx/Turborepo:* Dispensável nesta fase inicial; pnpm workspaces nativo com scripts paralelos atende com simplicidade e sem overhead de dependências externas.

---

## 2. Frontend: Next.js sem Tailwind (CSS com Tokens e Componentes Reutilizáveis)

- **Decisão:** Next.js 15 (App Router) com TypeScript, utilizando **CSS Modules** e arquivo global de tokens CSS (`tokens.css`) baseado no Design System do Figma (`node-id=2-11440`).
- **Diretriz Estrita:** **NÃO utilizar Tailwind CSS**. Todo o design será implementado com variáveis CSS nativas (`var(--color-blue-900)`, etc.), classes semânticas e componentes reutilizáveis:
  - `Button` (variantes: primary, secondary, destructive, icon, loading).
  - `Input` / `Textarea` (com estados: default, hover, focus, error, valid).
  - `Select` / `Dropdown` (acessível com suporte a teclado).
  - `Checkbox` / `Radio` / `Switch`.
  - `Badge` / `Chip` (com botão de remoção rápida `x` para habilidades da BNCC).
  - `Alert` / `Callout` (variantes: info, success, warning, error).
  - `Modal` (com backdrop, foco aprisionado e confirmação de descarte).
  - `Toast` (notificações efêmeras de sucesso e alerta).
- **Ícones:** Pacote `lucide-react` com espessura de traço (strokeWidth 1.5 a 2px) e tamanhos de 16px a 20px idênticos ao Figma.
- **Renderização e Sanitização Markdown:**
  - Biblioteca `react-markdown` com plugin `rehype-sanitize` e `remark-gfm`.
  - Proibição estrita de execução de HTML arbitrário ou injeção de scripts (XSS).
- **Adaptação Responsiva:**
  - Mobile (360px–767px): Coluna única; catálogo e formulário em abas ou fluxo vertical sequencial; editor Markdown com abas cheias (Edição vs. Pré-visualização); menu lateral em drawer retrátil.
  - Tablet (768px–1023px): Grid flexível adaptado.
  - Desktop (1024px–1440px+): Layout de duas colunas no formulário de criação; split-pane lado a lado no editor de rascunhos.

---

## 3. Backend: NestJS com Prisma ORM e PostgreSQL

- **Decisão:** **NestJS 11** com TypeScript e **Prisma ORM** conectando a uma instância de **PostgreSQL 16** via Docker Compose.
- **Arquitetura Modular:**
  - `AuthModule`: Autenticação, emissão de JWT, validação de cookies, rotação de refresh token.
  - `UsersModule`: Gestão de contas docentes locais (seedadas).
  - `BnccModule`: Consulta e filtragem rápida do catálogo oficial da BNCC.
  - `PlansModule`: Criação, leitura, atualização e exclusão de planos (com filtro de propriedade do professor).
  - `N8nIntegrationModule`: Cliente HTTP dedicado para o webhook n8n, mocks e rastreabilidade via `requestId`.
  - `CommonModule`: Interceptors de logging, filtros globais de exceção, decorators de usuário autenticado e guardas de segurança.
- **Porta:** `3001` com prefixo global `/api`.
- **CORS:** Restrito estritamente a `http://localhost:3000` com `credentials: true`.

---

## 4. Banco de Dados e Docker Compose

- **Decisão:** PostgreSQL 16 oficial rodando em contêiner Docker via `docker-compose.yml` na raiz do projeto.
- **Configuração do Contêiner:**
  - Serviço: `postgres`
  - Porta exposta: `5432:5432`
  - Volume persistente: `pgdata:/var/lib/postgresql/data`
  - Credenciais de desenvolvimento locais: `POSTGRES_USER=planejador`, `POSTGRES_PASSWORD=planejador_dev`, `POSTGRES_DB=planejador_bncc`.
- **Prisma ORM:**
  - Migrações determinísticas versionadas (`prisma migrate dev`).
  - Semente de dados (`prisma db seed` via `ts-node`) idempotente (`upsert`).

---

## 5. Estratégia de Autenticação, Sessão e Proteção de Segredos

- **Fronteira de Dados e Isolamento:**
  - A API NestJS é a única fronteira de dados do frontend.
  - Segredos externos (token de webhook n8n, chaves de criptografia e senhas de banco) residem exclusivamente nas variáveis de ambiente da API, nunca expostos ao cliente Next.js.
- **Tokens de Autenticação:**
  - **Access Token:** JWT de curta duração (15 minutos), assinado com `JWT_ACCESS_SECRET`. Mantido **estritamente em memória** no cliente web (estado React / context) para mitigar riscos de roubo por XSS.
  - **Refresh Token:** Token criptograficamente seguro (UUID v4 ou string aleatória de 64 bytes) com validade de 8 horas (conforme decisão na Clarification 2).
  - **Armazenamento Seguro do Refresh Token:**
    - Enviado ao navegador através de cookie `HttpOnly`, `Path=/api/auth`, `SameSite=Strict`.
    - Flag `Secure=true` em produção (HTTPS). Em ambiente de desenvolvimento local (`localhost`), a flag `Secure` é configurada como condicional (`process.env.NODE_ENV === 'production'`) para permitir testes via HTTP.
    - No banco de dados, o backend armazena **somente o hash criptográfico (SHA-256 ou bcrypt)** do refresh token, garantindo que mesmo um vazamento da base não comprometa sessões ativas.
- **Proteção CSRF:**
  - Rotas de mutação baseadas em cookie (`/api/auth/refresh` e `/api/auth/logout`) exigem validação `SameSite=Strict` e cabeçalho customizado (ex.: `X-Requested-With: XMLHttpRequest` ou token CSRF stateless).

---

## 6. Cliente de Integração n8n e Transações Atômicas

- **Contrato de Integração:** Baseado estritamente em `docs/contracts/n8n.md`.
- **Autenticação:** Header HTTP `x-api-key: <N8N_API_KEY>` injetado pelo backend.
- **Rastreabilidade:** Cada requisição gera um `x-request-id` (UUID) para correlação em logs e auditoria.
- **Timeout:** 60 segundos com cancelamento via `AbortController` (sem retry automático na integração externa).
- **Validação Estrita:** A resposta deve conter `{ success: true, sessao: string, habilidade: string, answer: string, format: "markdown" }`. Qualquer divergência é tratada como exceção de integração.
- **Máquina de Estados e Ciclo de Vida da Geração (`AiRun`):**
  1. O professor submete o formulário com dados validados.
  2. O backend abre um registro de auditoria `AiRun` com status `PENDING`, registrando o `requestId`, o professor e o payload.
  3. O backend dispara o POST HTTP para o n8n.
  4. **Em caso de Sucesso:**
     - Em uma transação atômica única no Prisma (`prisma.$transaction`), o sistema:
       - Cria o registro na tabela `Plan` com status `RASCUNHO`, `isAiAssisted = true`, conteúdo Markdown e habilidades associadas.
       - Atualiza o registro `AiRun` para status `SUCCEEDED` associando o `planId`.
  5. **Em caso de Falha (Timeout, Erro 5xx, JSON inválido ou resposta success=false):**
     - O backend atualiza o registro `AiRun` para status `FAILED` gravando a mensagem amigável de erro.
     - **Nenhum registro parcial é inserido na tabela `Plan`** (garantia absoluta do Princípio V da Constituição).
     - A API retorna HTTP 502/504 estruturado para o frontend exibir a modal/alerta de falha, mantendo os dados no formulário para nova tentativa acionada pelo professor.
- **Modo Mock Local:**
  - Variável de ambiente `N8N_MOCK_MODE=true` permite que o cliente de integração simule respostas válidas e cenários de falha determinísticos sem necessidade de conexão com o servidor n8n real durante testes automatizados e desenvolvimento offline.

---

## 7. Privacidade, Autorização e Prevenção de IDOR

- **Isolamento de Recurso por Docente:**
  - Todas as consultas ao banco de dados injetam o filtro de posse `WHERE userId = :currentUserId`.
  - Quando um docente tentar acessar `GET /api/plans/:id`, `PUT /api/plans/:id` ou `DELETE /api/plans/:id` informando um ID pertencente a outro professor ou inexistente, a API responderá estritamente com **HTTP 404 (Not Found)** (decisão da Clarification 1), impossibilitando a enumeração de planos privados.
- **Contas de Demonstração Pré-configuradas no Seed:**
  - `Profª Ana Souza`: `ana@demo.bncc.br` / senha seedada (hash).
  - `Prof. Marcos Lima`: `marcos@demo.bncc.br` / senha seedada (hash).
  - Ambas as contas recebem rascunhos pré-criados distintos para validação visual imediata do isolamento no primeiro login.
