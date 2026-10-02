# Quickstart: Planejador BNCC

Este guia detalha o passo a passo completo para configurar, executar e validar localmente o **Planejador BNCC** utilizando Docker Compose, NestJS, Next.js e Prisma.

---

## 1. Pré-requisitos do Ambiente

Certifique-se de possuir instalado no ambiente:

- **Node.js**: `v20.x` ou superior (ambiente de referência inspecionado: `v24.21.0`).
- **pnpm**: `v9.x` ou superior (ambiente de referência inspecionado: `12.8.1`).
- **Docker** e **Docker Compose**: Para a instância do PostgreSQL (ambiente inspecionado: Docker `29.8.0` / Compose `v5.5.1`).

Verifique as versões no terminal:
```bash
node -v
pnpm -v
docker --version
docker compose version
```

---

## 2. Configuração de Variáveis de Ambiente

Crie os arquivos `.env` locais para a API e o Frontend a partir dos exemplos:

### Backend (`apps/api/.env`):
```dotenv
NODE_ENV=development
PORT=3001
CORS_ORIGIN=http://localhost:3000

# Conexão PostgreSQL (Docker Compose)
DATABASE_URL=postgresql://planejador:planejador_dev@localhost:5432/planejador_bncc?schema=public

# Autenticação e Criptografia
JWT_ACCESS_SECRET=dev_jwt_access_super_secret_key_12345
JWT_REFRESH_SECRET=dev_jwt_refresh_super_secret_key_67890

# Integração n8n (Ativado em Mock para desenvolvimento offline)
N8N_WEBHOOK_URL=http://localhost:5678/webhook/gerar-plano-bncc
N8N_API_KEY=dev_n8n_api_key_test_token
N8N_MOCK_MODE=true
```

### Frontend (`apps/web/.env.local`):
```dotenv
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

---

## 3. Inicialização dos Serviços

### Passo 1: Subir o Banco de Dados PostgreSQL via Docker
Na raiz do repositório, execute:
```bash
docker compose up -d
```
Verifique se o contêiner está ativo e saudável:
```bash
docker compose ps
```

### Passo 2: Instalar Dependências do Monorepo
Instale todos os pacotes do monorepo de forma estrita via pnpm:
```bash
pnpm install
```

### Passo 3: Executar Migrações do Banco de Dados
Gere as tabelas relacionais a partir do `schema.prisma`:
```bash
pnpm --filter @planejador/api prisma migrate dev --name init
```

### Passo 4: Executar a Semente Idempotente (Seed)
Popule o catálogo BNCC (`docs/data/bncc-recorte.json`) e as duas contas docentes de teste:
```bash
pnpm --filter @planejador/api prisma db seed
```

### Passo 5: Iniciar as Aplicações em Desenvolvimento
Inicie simultaneamente o backend NestJS (`porta 3001`) e o frontend Next.js (`porta 3000`):
```bash
pnpm dev
```

---

## 4. Endereços de Acesso

- **Aplicação Web:** [http://localhost:3000](http://localhost:3000)
- **API NestJS:** [http://localhost:3001/api](http://localhost:3001/api)
- **Documentação de Rotas (Swagger se habilitado em dev):** [http://localhost:3001/api/docs](http://localhost:3001/api/docs)

---

## 5. Contas de Demonstração para Testes

O banco de dados é inicializado com duas contas para permitir validação visual imediata e testes de isolamento/privacidade (Princípio III):

| Professor(a) | E-mail | Senha Padrão | Estado Inicial no Seed | Cenário de Teste |
|---|---|---|---|---|
| **Profª Ana Souza** | `ana@demo.bncc.br` | `demo123` | Possui 4 rascunhos criados e associados a habilidades BNCC | Teste de listagem, navegação de rascunhos, edição Markdown, preview formatado e modal de descarte. |
| **Prof. Marcos Lima** | `marcos@demo.bncc.br` | `demo123` | **0 rascunhos** (base vazia para o usuário) | Teste de estado vazio amigável ("Meus planos - Vazio") e validação de isolamento multitenancy. |

---

## 6. Roteiro de Validação dos Critérios de Aceite

### Cenário 1: Login e Isolamento de Privacidade (Princípio III e US1 / US5)
1. Acesse `http://localhost:3000` e autentique-se com `marcos@demo.bncc.br` / `demo123`.
2. Verifique se a tela exibe o **Estado Vazio** (conforme frame `2-11932`), comprovando que os 4 planos da Profª Ana **não** vazam para o Prof. Marcos.
3. Tente acessar diretamente via URL `/planos/cuid-ana-plano-1`.
4. Observe que o backend responde com **HTTP 404** e o frontend redireciona para `/planos` com um alerta informativo amigável.

### Cenário 2: Catálogo BNCC e Formulário de Planejamento (US2)
1. Clique em **"Novo plano"**.
2. No seletor de habilidades, digite `"algoritmo"` ou filtre por `"Ensino Fundamental"` e ano `"1"`.
3. Selecione a habilidade `EF01CO01` e adicione ao formulário como chip com remoção rápida.
4. Preencha uma instrução com menos de 10 caracteres ou deixe a duração em 0.
5. Verifique o bloqueio e realce visual dos campos inválidos conforme o Design System.

### Cenário 3: Geração com IA, Loading e Sucesso Atômico (Princípio V e US3)
1. Preencha os campos válidos:
   - Habilidade: `EF01CO01`
   - Duração: `50`
   - Recursos Digitais: `Sim`
   - Instrução Pedagógica: `"Criar atividade desplugada em dupla explorando classificação de cartões."`
2. Clique em **"Gerar rascunho"**.
3. Observe a tela de transição com spinner e mensagem de progresso (conforme frame `2-12155`).
4. Ao concluir, o sistema redireciona automaticamente para o editor do rascunho criado com badges `RASCUNHO` e `Auxiliado por IA`.

### Cenário 4: Simulação de Falha Atômica de IA (Princípio V)
1. Retorne a **"Novo plano"**.
2. Preencha o formulário e inclua na instrução pedagógica a tag `[SIMULAR_ERRO]`.
3. Clique em **"Gerar rascunho"**.
4. Observe que o modal de falha é exibido (conforme frame `2-12329`), todos os campos preenchidos permanecem intactos na tela e **nenhum plano parcial** foi inserido no banco de dados.

### Cenário 5: Edição Markdown, Pré-visualização e Modal de Saída (US4)
1. Abra um rascunho existente.
2. Modifique o texto no editor Markdown.
3. Alterne para a aba "Pré-visualização" e valide a renderização segura do HTML.
4. Tente clicar no menu "Meus planos" sem clicar em "Salvar".
5. Verifique o disparo do modal de confirmação do Design System: `"Sair sem salvar?"` (frame `2-12608`).

---

## 7. Comandos de Verificação e Qualidade

Na raiz do repositório, os scripts obrigatórios executam os testes e checagens estáticas:

```bash
# Executar verificação de tipos TypeScript em todo o monorepo
pnpm typecheck

# Executar análise estática e padrões de formatação
pnpm lint

# Executar testes unitários (frontend e backend)
pnpm test

# Executar testes de integração (banco de dados, autorização 404 e cliente n8n mock)
pnpm test:integration

# Executar build de produção de todos os pacotes e apps
pnpm build
```
