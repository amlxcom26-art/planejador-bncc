# Implementation Plan: Planejador BNCC

**Branch**: `docs/planejamento` | **Date**: 2026-10-02 | **Spec**: [specs/001-planejador-aulas-bncc/spec.md](file:///c:/Users/espaco40-9/Desktop/workspace/planejador-bncc/specs/001-planejador-aulas-bncc/spec.md)

**Input**: Feature specification from `specs/001-planejador-aulas-bncc/spec.md`, Design Reference from `docs/design-reference.md`, n8n contract from `docs/contracts/n8n.md`, and BNCC seed data from `docs/data/bncc-recorte.json`.

---

## 1. Summary

O **Planejador BNCC** é uma aplicação web fullstack desenhada para apoiar professores da Educação Básica no planejamento de aulas alinhadas à Base Nacional Comum Curricular (com recorte inicial em Pensamento Computacional e Cultura Digital), utilizando inteligência artificial assistida de forma ética, supervisionada e segura.

A arquitetura adota um **monorepo pnpm** modular com duas aplicações principais:
1. `apps/web`: Frontend em **Next.js 15 (App Router)** com TypeScript, estilizado exclusivamente com **CSS Modules e Design Tokens nativos** extraídos do Figma (`node-id=2-11440`), com **proibição estrita de Tailwind CSS**.
2. `apps/api`: Backend em **NestJS 11** com TypeScript, atuando como a única fronteira de dados e segurança do sistema. Conecta-se a um banco relacional **PostgreSQL 16** (orquestrado via Docker Compose) através do **Prisma ORM**.

A autenticação é baseada em sessões seguras com **Access Token JWT de 15 minutos em memória** no cliente web e **Refresh Token de 8 horas em cookie HttpOnly** com `SameSite=Strict` e `Path=/api/auth`. No banco, apenas o hash SHA-256 do refresh token e o hash bcrypt da senha são persistidos.

A integração com o workflow n8n é executada estritamente pelo backend através de HTTP Header Auth (`x-api-key`), com rastreabilidade por `x-request-id`, timeout de 60s e sem retry automático. O ciclo de geração (`AiRun`) garante **atomicidade transacional**: se a IA falhar ou sofrer timeout, nenhum plano parcial é gravado no banco e todos os dados preenchidos pelo docente permanecem intactos na interface para nova tentativa com um clique. A privacidade multitenancy é protegida por filtros automáticos na API, retornando **HTTP 404** diante de tentativas de acesso a planos alheios.

---

## 2. Technical Context

- **Language/Version:** TypeScript `^5.6.x`, Node.js `v24.21.0` (ambiente de referência), pnpm `12.8.1`.
- **Primary Dependencies:**
  - *Frontend (`apps/web`):* Next.js `^15.x` (App Router), React `^19.x`, `react-markdown`, `rehype-sanitize`, `remark-gfm`, `lucide-react`.
  - *Backend (`apps/api`):* NestJS `^11.x`, `@nestjs/jwt`, `@nestjs/passport`, `passport-jwt`, `bcryptjs`, `class-validator`, `class-transformer`, `zod`.
  - *ORM / Banco:* Prisma ORM `^6.x`, `@prisma/client`.
- **Storage:** PostgreSQL 16 oficial rodando em contêiner Docker via `docker-compose.yml` (`porta 5432`).
- **Testing:**
  - *Unitário:* Jest / Vitest em `apps/api` e `apps/web`.
  - *Integração:* Supertest + Prisma Test Environment em `apps/api` (isolamento de tenant, integridade transacional de IA e validação de schema).
- **Target Platform:** Node.js runtime para API (`http://localhost:3001/api`) e navegadores web modernos para frontend (`http://localhost:3000`).
- **Project Type:** Fullstack Monorepo Web Application.
- **Performance Goals:**
  - Busca textual e filtragem no catálogo da BNCC: < 200ms p95.
  - Alternância entre abas "Editor Markdown" e "Pré-visualização": < 100ms (execução imediata no client).
  - Timeout máximo do cliente n8n: 60s com cancelamento ativo via `AbortController`.
- **Constraints:**
  - **Zero Tailwind CSS:** Uso estrito de CSS Modules e variáveis/tokens nativos do Design System.
  - **Zero Planos Parciais:** Falha no n8n aborta transação e marca `AiRun` como `FAILED`.
  - **Prevenção contra IDOR:** Acesso a plano de outro docente retorna estritamente `HTTP 404 Not Found`.
  - **Proteção de Segredos:** O frontend nunca recebe credenciais, chaves ou URLs internas do webhook n8n.
- **Scale/Scope:** 2 contas locais no seed (`ana@demo.bncc.br`, `marcos@demo.bncc.br`), 5 habilidades no recorte inicial da BNCC, 5 histórias de usuário (P1/P2), 9 telas/frames do Design System aprovados.

---

## 3. Constitution Check

*Todos os 8 princípios da Constituição do Planejador BNCC (`.specify/memory/constitution.md`) foram avaliados e aprovados:*

| Portão Constitucional | Requisito Avaliado | Status | Evidência no Plano e Contratos |
|---|---|:---:|---|
| **Princípio I: Fidelidade ao Design e Experiência do Usuário** | Aderência aos 9 frames aprovados do Figma (`node-id=2-11440` a `2-12608`). Proibição de Tailwind CSS. Uso de tokens e componentes reutilizáveis. | **PASS** | Mapeamento completo dos 9 frames na Seção 5 deste documento; CSS Modules com `tokens.css`; biblioteca de componentes reutilizáveis (`Button`, `Input`, `Badge`, `Modal`). |
| **Princípio II: Segurança, Autenticação e Fronteira de Dados** | NestJS como única fronteira de dados. Access token em memória, refresh token em cookie HttpOnly `SameSite=Strict`. Hash no banco. Proteção de segredos do n8n. | **PASS** | Contrato `contracts/auth.contract.md` e `research.md` (Seção 5). CORS restrito a `localhost:3000`. Headers sanitizados. |
| **Princípio III: Privacidade e Multitenancy Docente** | Isolamento total entre docentes. Proibição de vazamento de planos alheios. Prevenção de IDOR retornando 404. Duas contas no seed. | **PASS** | `contracts/plans.contract.md` exige `userId` em todas as queries. Plano alheio responde 404. Seed com Profª Ana (com planos) e Prof. Marcos (sem planos). |
| **Princípio IV: Supervisão Docente e Alinhamento à BNCC** | Catálogo oficial com código, nível, ano, eixo, descrição, explicação e exemplos. Badge `RASCUNHO` e `Auxílio por IA`. Editor Markdown com preview sanitizado. | **PASS** | Modelo `BnccSkill` em `data-model.md` reflete `docs/data/bncc-recorte.json`. Sanitização via `rehype-sanitize`. Modal de descarte ("Sair sem salvar?"). |
| **Princípio V: Atomicidade, Resiliência e Integridade na Geração por IA** | `AiRun` com máquina de estados (PENDING -> SUCCEEDED / FAILED). Transação atômica. Zero planos parciais em falha. Preservação dos dados do form. Sem retry em loop. | **PASS** | `contracts/plans.contract.md` (Seção 3) e `contracts/n8n.contract.md`. `prisma.$transaction` garante integridade total. Preservação de inputs no estado do formulário. |
| **Princípio VI: Acessibilidade, Ergonomia e Responsividade** | Responsividade para Mobile (360px+), Tablet (768px+) e Desktop (1024px+). Contraste WCAG AA. Navegação por teclado. | **PASS** | Especificação de layout responsivo na Seção 6. Elementos acessíveis com rótulos `aria-label`, foco visível e contraste aprovado. |
| **Princípio VII: Testabilidade, Reprodutibilidade e Observabilidade** | Scripts raiz obrigatórios. Modo mock para n8n (`N8N_MOCK_MODE=true`). Rastreabilidade via `x-request-id`. Quickstart funcional. | **PASS** | `quickstart.md` detalhado. Contrato `contracts/n8n.contract.md` com simulação de erro determinístico (`[SIMULAR_ERRO]`). Scripts raiz no `package.json`. |
| **Princípio VIII: Simplicidade e Evolução Contínua** | Proibição de escopos inflados (sem PDF, sem painel admin, sem registro público). Arquitetura limpa e enxuta. | **PASS** | Escopo contido estritamente às 5 histórias de usuário planejadas. Zero rotas administrativas. |

---

## 4. Project Structure

### 4.1. Estrutura de Documentação do Planejador

```text
specs/001-planejador-aulas-bncc/
├── spec.md                       # Especificação do produto e histórias de usuário
├── research.md                   # Pesquisa técnica e decisões de arquitetura (Phase 0)
├── data-model.md                 # Modelo relacional, ERD e schema.prisma (Phase 1)
├── quickstart.md                 # Guia de inicialização local e testes com comandos reais (Phase 1)
├── plan.md                       # Este plano de implementação técnica (/speckit-plan)
├── checklists/
│   └── requirements.md           # Checklist de validação de qualidade da especificação
└── contracts/                    # Contratos de API e integrações externas (Phase 1)
    ├── auth.contract.md          # Contrato de autenticação, login, refresh e logout
    ├── bncc.contract.md          # Contrato de consulta ao catálogo curricular da BNCC
    ├── plans.contract.md         # Contrato de planos de aula e ciclo atômico de IA
    └── n8n.contract.md           # Contrato do cliente HTTP n8n e modo mock
```

### 4.2. Estrutura do Código-Fonte no Monorepo (`apps/` e `packages/`)

```text
planejador-bncc/
├── .specify/                     # Memória de especificação e governança
│   └── memory/
│       └── constitution.md       # Constituição do projeto v1.0.0
├── docker-compose.yml            # Orquestração do PostgreSQL 16 para desenvolvimento
├── package.json                  # Scripts raiz (dev, lint, typecheck, test, test:integration, build)
├── pnpm-workspace.yaml           # Configuração de workspaces do pnpm
├── pnpm-lock.yaml                # Lockfile determinístico do monorepo
├── tsconfig.base.json            # Configurações TypeScript base compartilhadas
├── docs/                         # Documentação técnica e design
│   ├── contracts/n8n.md          # Contrato de referência original do n8n
│   ├── data/bncc-recorte.json    # Catálogo original de habilidades BNCC
│   ├── design-reference.md       # Mapeamento oficial dos links e frames Figma
│   └── design/                   # Capturas PNG baixadas dos 9 frames aprovados
│
├── apps/
│   ├── api/                      # Backend em NestJS 11 + TypeScript (porta 3001)
│   │   ├── prisma/
│   │   │   ├── schema.prisma     # Esquema do banco de dados relacional
│   │   │   ├── migrations/       # Migrações determinísticas versionadas
│   │   │   └── seed.ts           # Script de seed idempotente (contas demo + BNCC)
│   │   ├── src/
│   │   │   ├── common/           # Decorators, interceptors de logging e filtros de exceção
│   │   │   ├── modules/
│   │   │   │   ├── auth/         # Autenticação JWT, cookies HttpOnly e guards
│   │   │   │   ├── users/        # Gestão de usuários docentes
│   │   │   │   ├── bncc/         # Catálogo e busca de habilidades
│   │   │   │   ├── plans/        # Gestão de planos e atomicidade de geração
│   │   │   │   └── n8n/          # Cliente HTTP n8n com timeout, Zod e modo mock
│   │   │   ├── app.module.ts     # Módulo raiz do NestJS
│   │   │   └── main.ts           # Ponto de entrada (prefixo /api, CORS, porta 3001)
│   │   ├── test/                 # Testes unitários e de integração E2E
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── web/                      # Frontend em Next.js 15 (App Router) + TS (porta 3000)
│       ├── public/               # Ativos estáticos e ícones
│       ├── src/
│       │   ├── app/              # Estrutura App Router do Next.js
│       │   │   ├── (auth)/
│       │   │   │   └── login/    # Tela de Login (Frame 2-11755)
│       │   │   ├── (dashboard)/
│       │   │   │   ├── layout.tsx# Layout autenticado com header e navegação
│       │   │   │   ├── planos/   # Meus planos: listagem e vazio (Frames 2-11830 e 2-11932)
│       │   │   │   └── novo/     # Formulário de criação, loading e falha (Frames 2-11990, 2-12155, 2-12329)
│       │   │   │   └── plano/[id]# Editor Markdown, preview e modal (Frames 2-12495 e 2-12608)
│       │   │   ├── layout.tsx    # Layout raiz global com injeção de tokens.css
│       │   │   └── page.tsx      # Redirecionamento inicial
│       │   ├── components/       # Componentes reutilizáveis (sem Tailwind)
│       │   │   ├── ui/           # Button, Input, Textarea, Badge, Modal, Alert, Spinner
│       │   │   └── layout/       # Header, UserMenu, Navigation
│       │   ├── context/          # AuthContext (token em memória)
│       │   ├── lib/              # Cliente HTTP fetcher, sanitizador Markdown e helpers
│       │   └── styles/
│       │       ├── tokens.css    # Variáveis CSS nativas baseadas no Figma (2-11440)
│       │       └── globals.css   # Estilos base, resets e tipografia
│       ├── tsconfig.json
│       └── package.json
```

---

## 5. Integração dos Frames Aprovados do Figma e Design System

Com base na inspeção do arquivo `docs/design-reference.md` e nas capturas aprovadas em `docs/design/`, cada tela da aplicação integra um frame oficial do Design System:

| Frame ID | Nome do Frame no Figma | Rota / Componente na Aplicação Web | Integração e Elementos Principais |
|---|---|---|---|
| `2-11440` | **Design System — Planejador BNCC** | `apps/web/src/styles/tokens.css` e `apps/web/src/components/ui/` | Consolida os Design Tokens globais: Paleta de cores (`--color-blue-900`, `--color-blue-600`, `--color-emerald-500`, `--color-amber-500`, `--color-rose-500`, `--color-slate-50` a `900`), Tipografia Inter, Raios de borda (`border-radius`), Sombras (`box-shadow`), e componentes reutilizáveis (`Button`, `Input`, `Badge`, `Alert`, `Modal`). |
| `2-11755` | **Login — Credenciais inválidas** | `/login` (`apps/web/src/app/(auth)/login/page.tsx`) | Tela de autenticação com campos de E-mail e Senha, estado de foco/hover, botão "Entrar" com estado de loading e callout de erro de credenciais inválidas destacado em vermelho com ícone de alerta. |
| `2-11830` | **Meus planos — Rascunhos** | `/planos` (`apps/web/src/app/(dashboard)/planos/page.tsx`) | Lista de planos em formato grid de cards contendo título da aula, badge `RASCUNHO`, identificador `Auxílio por IA`, chips com códigos das habilidades BNCC vinculadas, tempo de duração, data da última edição e ações de navegação/exclusão. |
| `2-11932` | **Meus planos — Estado vazio** | `/planos` (renderizado quando `total === 0`) | Exibição de estado vazio amigável quando o professor (ex.: Prof. Marcos) não possui rascunhos: ilustração temática, texto acolhedor de orientação e botão de Ação Primária (CTA) "Criar novo plano". |
| `2-11990` | **Novo plano — Formulário com validações** | `/novo` (`apps/web/src/app/(dashboard)/novo/page.tsx`) | Seletor de habilidades BNCC com campo de busca textual e filtros de nível/ano, adição em chips informativos com remoção rápida `x`, campo de duração em minutos (15–360), switch de recursos digitais, textarea de instrução pedagógica com contador de caracteres (10–1.000) e validação em tempo real com realce de borda vermelha e texto de ajuda. |
| `2-12155` | **Novo plano — Preparando rascunho** | `/novo` (estado visual de loading ativo) | Overlay / tela de transição com spinner animado, barra de progresso suave, mensagem informativa ("A IA está estruturando seu rascunho com base nas diretrizes da BNCC...") e desabilitação completa de cliques para evitar envios duplicados. |
| `2-12329` | **Novo plano — Falha de geração** | `/novo` (estado visual de erro após falha da API) | Exibição de banner/callout de erro no topo da página detalhando o motivo da indisponibilidade, preservação de 100% dos dados já digitados no formulário e alteração do botão de submissão para "Tentar gerar novamente". |
| `2-12495` | **Rascunho gerado — Editor e pré-visualização** | `/plano/[id]` (`apps/web/src/app/(dashboard)/plano/[id]/page.tsx`) | Cabeçalho com título editável, badges de status `RASCUNHO` e `Auxílio por IA`, botão primário "Salvar alterações". Área de trabalho com alternância entre "Editor Markdown" (textarea monoespaçado) e "Pré-visualização" (HTML sanitizado com tipografia pedagógica). |
| `2-12608` | **Rascunho — Confirmação de saída** | Modal em `/plano/[id]` (`apps/web/src/components/ui/Modal.tsx`) | Diálogo modal acessível disparado ao tentar navegar para fora da página com alterações não salvas no rascunho: mensagem clara "Sair sem salvar?", botão secundário "Continuar editando" e botão destrutivo "Descartar alterações". |

---

## 6. Adaptações de Layout Responsivo

Em cumprimento estrito ao Princípio VI da Constituição, a interface adota estratégia de design responsivo fluida e acessível:

### 6.1. Mobile (Viewport 360px até 767px)
- **Navegação:** O cabeçalho fixa o logotipo e recolhe os links de navegação e o menu do professor em um menu suspenso ou drawer retrátil acessível via botão hamburguer.
- **Meus Planos:** Os cards de planos são dispostos em coluna única (`grid-template-columns: 1fr`), ocupando 100% da largura útil da tela com espaçamentos otimizados de 16px.
- **Formulário de Criação:** Organização vertical linear. O seletor de habilidades BNCC ocupa a largura total e a lista de chips selecionados permite rolagem horizontal suave ou quebra automática de linha com espaçamento de toque mínimo de 44x44px.
- **Editor Markdown:** Modo de tela cheia com abas exclusivas no topo ("Editor" / "Pré-visualização"). O usuário visualiza apenas uma das visualizações por vez para maximizar a área de leitura e digitação em telas pequenas.

### 6.2. Tablet (Viewport 768px até 1023px)
- **Navegação:** Cabeçalho horizontal compacto com nome do docente resumido.
- **Meus Planos:** Grid balanceado de 2 colunas para os cards de rascunhos.
- **Formulário de Criação:** Layout em bloco com agrupamento de campos de metadados (Duração e Recursos Digitais) lado a lado na mesma linha.
- **Editor Markdown:** Alternância rápida de abas superiores ou modo split proporcional caso a orientação esteja em modo paisagem (*landscape*).

### 6.3. Desktop (Viewport 1024px até 1440px+)
- **Navegação:** Cabeçalho completo com logotipo, navegação centralizada ("Meus Planos", "Novo Plano") e menu do docente com avatar e botão de logout explícito.
- **Meus Planos:** Grid responsivo de 3 colunas com alinhamento uniforme de cards.
- **Formulário de Criação:** Layout em duas colunas complementares: à esquerda, o seletor do catálogo BNCC e visualizador de habilidades; à direita, os parâmetros da aula (duração, recursos, instrução pedagógica e botão de ação).
- **Editor Markdown:** Split-pane lado a lado opcional ou alternância de abas largas com pré-visualização contínua e barra superior fixa com status de salvamento.

---

## 7. Scripts Raiz Obrigatórios

No `package.json` da raiz do repositório, os scripts orquestram a suíte de desenvolvimento e testes:

```json
{
  "name": "planejador-bncc-monorepo",
  "private": true,
  "scripts": {
    "dev": "pnpm --parallel --filter \"./apps/*\" dev",
    "build": "pnpm --filter \"./apps/*\" build",
    "lint": "pnpm --filter \"./apps/*\" lint",
    "typecheck": "pnpm --parallel --filter \"./apps/*\" typecheck",
    "test": "pnpm --parallel --filter \"./apps/*\" test",
    "test:integration": "pnpm --filter @planejador/api test:integration",
    "db:migrate": "pnpm --filter @planejador/api prisma migrate dev",
    "db:seed": "pnpm --filter @planejador/api prisma db seed"
  }
}
```

---

## 8. Complexity Tracking

| Decisão Técnica | Por Que É Necessária | Alternativa Mais Simples Rejeitada e Motivo |
|---|---|---|
| **Tokens CSS nativos em vez de Tailwind** | O projeto possui um Design System consolidado no Figma (`2-11440`) com tokens semânticos estritos e uma exigência explícita de não usar Tailwind. Variáveis CSS nativas evitam dependências externas, garantem fidelidade visual de 100% aos componentes e simplificam o bundle. | *Tailwind CSS:* Rejeitado por solicitação expressa do cliente e pela necessidade de aderência estrita aos tokens nativos de design. |
| **Retorno de HTTP 404 para ID alheio (em vez de 403)** | Previne ataques de enumeração de identificadores (IDOR). Responder 403 revela ao invasor que o plano existe, confirmando a validade do ID. Responder 404 oculta a existência do plano. | *HTTP 403 Forbidden:* Rejeitado pois confirma a existência de recursos privados de outros professores. |
| **Access Token em memória e Refresh em Cookie HttpOnly** | O Access Token mantido em memória elimina a persistência em `localStorage`, mitigando roubo via ataques XSS. O cookie HttpOnly com `SameSite=Strict` garante proteção contra roubo de sessão e ataques CSRF em navegadores modernos. | *Guardar JWT em localStorage:* Rejeitado por vulnerabilidade a scripts maliciosos injetados (XSS). |
| **Modo Mock Local para n8n (`N8N_MOCK_MODE`)** | Permite que a suíte de testes de integração, pipelines de CI/CD e desenvolvedores trabalhem sem depender da infraestrutura em nuvem ativa do n8n, sem gerar custos ou consumir cotas de IA durante testes rotineiros. | *Conectar sempre ao webhook real do n8n:* Rejeitado por fragilidade de rede em testes automatizados e risco de indisponibilidade externa. |
| **`AiRun` e Transação Atômica única no Prisma** | Garante integridade absoluta de dados (Princípio V): se o n8n falhar no meio do caminho, nenhum registro parcial de plano de aula poluído é gravado na base de dados. | *Salvar plano antes da chamada e atualizar depois:* Rejeitado porque gera planos inconsistentes e rascunhos fantasmas no banco caso ocorra timeout. |
