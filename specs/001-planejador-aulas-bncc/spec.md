# Feature Specification: Planejador de Aulas BNCC

**Feature Branch**: `docs/especificacao`

**Created**: 2026-10-01

**Status**: Draft

**Input**: User description: "Desenvolver o Planejador BNCC para uso de professores. O professor entra com uma conta de demonstração previamente cadastrada. Após o login, consulta habilidades BNCC por nível, ano quando aplicável, eixo, código ou texto e seleciona uma ou mais habilidades. Informa uma instrução pedagógica, duração em minutos e se utilizará recursos digitais. Ao confirmar, visualiza um estado de preparação. O serviço de IA recebe a solicitação. Se a resposta for válida, a aplicação salva um plano privado em estado RASCUNHO, com indicação de auxílio por IA. O professor vê o Markdown, pode editá-lo, visualizar sua apresentação, salvar explicitamente e consultar a lista de seus rascunhos. Se a geração falhar, os campos são preservados e nenhum plano parcial é salvo. Uma nova tentativa é iniciada somente por ação do professor. Outro professor não pode ler nem editar o rascunho. Incluir login, logout, sessão, catálogo mínimo e duas contas de demonstração para testar o acesso privado. Sem cadastro público nem administração. Sem PDF, finalização, versionamento de planos ou publicação pública deles. Defina histórias priorizadas e critérios de aceitação verificáveis. Ainda não implemente código."

## Clarifications

### Session 2026-10-01
- Q: Como o sistema deve responder quando um professor tenta acessar diretamente (seja por URL ou identificador de requisição) um rascunho pertencente a outro docente? → A: A API retorna HTTP 404 (Não Encontrado) para evitar enumeração de recursos alheios e o frontend redireciona o professor para "Meus planos" com alerta informativo discreto.
- Q: Como deve ser gerenciada a expiração da sessão do professor para evitar a perda de dados durante a elaboração ou edição de um plano de aula? → A: Sessão de 8h com renovação por atividade; se expirar durante a edição, o sistema preserva o texto no cache local do navegador e solicita reautenticação sem descartar o texto digitado.
- Q: Quais devem ser os limites e regras de validação para os campos do formulário de planejamento (habilidades BNCC, duração e instrução pedagógica)? → A: De 1 a 5 habilidades BNCC selecionadas; duração entre 15 e 360 minutos (inteiro); instrução pedagógica contendo entre 10 e 1.000 caracteres.
- Q: Como a interface deve apresentar a mensagem de falha da IA e disponibilizar a ação de nova tentativa ao professor? → A: Abre uma janela modal de falha explicando o ocorrido e oferecendo duas ações: 'Tentar novamente' (reenvio imediato dos mesmos dados) ou 'Voltar ao formulário para ajustar' (mantendo todos os campos preenchidos e editáveis).
- Q: O que a aplicação deve fazer quando o professor tentar sair da tela de edição contendo alterações no rascunho que ainda não foram salvas explicitamente? → A: Interceptar a navegação e exibir o modal de confirmação do Design System ('Sair sem salvar? As alterações feitas neste rascunho serão perdidas.'), oferecendo as opções 'Continuar editando' (permanece na tela) e 'Sair sem salvar' (descarta as edições locais e prossegue com a navegação).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Acesso e Sessão do Docente com Contas Demo (Priority: P1)

Como professor, quero autenticar-me na aplicação utilizando uma das contas de demonstração pré-configuradas e manter minha sessão ativa para acessar com segurança meus recursos pedagógicos.

**Why this priority**: A autenticação é a base de segurança e isolamento do sistema; nenhum dado ou plano privado pode ser manipulado sem identificação docente prévia.

**Independent Test**: Pode ser testado de ponta a ponta realizando login com uma conta de demonstração válida, navegando pela aplicação protegida e finalizando com logout, comprovando que acessos anônimos são barrados.

**Acceptance Scenarios**:

1. **Given** que o professor não está autenticado, **When** insere as credenciais de uma conta de demonstração válida na tela de login e aciona o botão de acesso, **Then** o sistema autentica o docente, inicia a sessão e o redireciona para a visão principal ("Meus planos"), exibindo seu nome e avatar na barra superior.
2. **Given** que o professor preenche credenciais inválidas, **When** tenta realizar login, **Then** o sistema exibe alerta visual de erro e impede o acesso, mantendo o usuário na tela de login.
3. **Given** que o professor está autenticado, **When** aciona a ação de logout no menu do usuário, **Then** a sessão é encerrada de forma segura e o usuário é redirecionado para a tela de login.
4. **Given** um usuário não autenticado, **When** tenta acessar diretamente qualquer tela ou endpoint interno de planejamento, **Then** o sistema bloqueia o acesso e o redireciona para o login.

---

### User Story 2 - Consulta e Seleção de Habilidades BNCC (Priority: P1)

Como professor, quero consultar o catálogo oficial da BNCC filtrando por nível, ano escolar, eixo/componente, código ou texto da habilidade, e selecionar uma ou mais habilidades para fundamentar meu plano de aula.

**Why this priority**: A vinculação precisa às diretrizes curriculares da BNCC é a essência pedagógica do aplicativo e o insumo fundamental para a geração do plano.

**Independent Test**: Pode ser testado de forma autônoma acessando o catálogo, aplicando filtros combinados (ex.: Ensino Fundamental, 5º ano, Ciências, busca por palavra-chave), selecionando itens e visualizando os chips de habilidades correspondentes.

**Acceptance Scenarios**:

1. **Given** que o professor está na tela de novo plano, **When** aplica filtros por nível de ensino, ano escolar ou componente curricular, **Then** a lista de habilidades exibe apenas as normas correspondentes aos critérios selecionados.
2. **Given** que o professor digita um código (ex.: "EF05CI02") ou termo pedagógico (ex.: "fotossíntese") no campo de busca, **When** a pesquisa é executada, **Then** o catálogo filtra instantaneamente os resultados correspondentes.
3. **Given** a exibição de resultados do catálogo, **When** o professor marca uma ou mais habilidades, **Then** o sistema apresenta cada habilidade selecionada como um chip identificador destacado com opção de exclusão rápida (`x`).
4. **Given** que há chips de habilidades selecionados, **When** o professor clica no ícone de remoção (`x`) de um chip, **Then** a habilidade é desmarcada e retirada do resumo de seleção.

---

### User Story 3 - Solicitação de Geração de Rascunho com IA e Resiliência a Falhas (Priority: P1)

Como professor, quero preencher os parâmetros pedagógicos da aula (instrução, duração e recursos digitais) e solicitar a geração assistida por IA, visualizando o estado de preparação e tendo garantia de que falhas não corrompem nem apagam meus dados digitados.

**Why this priority**: É o valor central do produto (automação docente). Deve possuir resiliência transacional absoluta: falhas de IA nunca podem salvar lixo no banco nem fazer o professor perder seus insumos.

**Independent Test**: Pode ser testado submetendo o formulário com dados válidos e verificando o estado de loading e criação do plano íntegro; em caso de simulação de erro de IA, verifica-se que nenhum plano parcial foi criado e os campos permaneceram preservados para retry com 1 clique.

**Acceptance Scenarios**:

1. **Given** que o professor selecionou ao menos uma habilidade BNCC, preencheu a instrução pedagógica, informou duração em minutos maior que zero e definiu o uso de recursos digitais, **When** aciona "Gerar rascunho", **Then** a interface entra em estado visual de preparação (barra de progresso, mensagem informativa e tempo estimado de até 60s), desabilitando cliques duplicados.
2. **Given** que o serviço de IA retornou uma resposta válida e estruturada, **When** o processamento é concluído, **Then** o sistema persiste o plano com status `RASCUNHO`, marcado com "Auxílio por IA", associado exclusivamente ao professor logado, e redireciona o docente para a tela de visualização/edição do rascunho.
3. **Given** que o serviço de IA falhou (tempo limite esgotado, erro de rede ou resposta inválida), **When** a falha é detectada, **Then** o sistema NÃO persiste nenhum registro parcial ou corrompido, abre uma janela modal de falha informando o motivo e oferecendo duas opções explícitas: "Tentar novamente" (para reenvio imediato com os mesmos dados) ou "Voltar ao formulário para ajustar" (preservando todos os campos intactos e editáveis).
4. **Given** uma falha de geração, **When** o professor não toma nenhuma ação, **Then** o sistema permanece aguardando e NUNCA dispara tentativas automáticas em loop sem consentimento explícito.

---

### User Story 4 - Edição, Pré-visualização e Salvamento Explícito do Rascunho (Priority: P2)

Como professor, quero visualizar o plano de aula gerado em Markdown, alternar entre edição do texto e pré-visualização formatada, realizar ajustes pedagógicos e salvar explicitamente minhas alterações.

**Why this priority**: Assegura a soberania e supervisão docente sobre o conteúdo gerado por IA (Princípio IV da Constituição), permitindo adequação da aula à realidade dos estudantes.

**Independent Test**: Pode ser testado abrindo um rascunho gerado, editando seções do Markdown, chaveando para a aba de pré-visualização para checar a formatação, clicando em "Salvar" e recarregando para confirmar que as alterações foram persistidas.

**Acceptance Scenarios**:

1. **Given** que o professor abriu seu rascunho, **When** visualiza o cabeçalho do documento, **Then** a interface exibe com clareza o badge de status `RASCUNHO` e o badge identificador `Auxílio por IA`.
2. **Given** que o professor está na aba "Editor Markdown", **When** digita e modifica o conteúdo do plano, **Then** as alterações ficam ativas no editor.
3. **Given** que o professor realizou modificações no Markdown, **When** clica na aba "Pré-visualização", **Then** o sistema renderiza a formatação visual legível do documento (títulos, listas, ênfases pedagógicas) de acordo com o Design System.
4. **Given** que o professor concluiu suas edições, **When** aciona a ação explícita de "Salvar", **Then** as alterações são gravadas no banco de dados e uma notificação flutuante de sucesso (Toast: "Alterações salvas com sucesso.") é exibida.
5. **Given** que o professor realizou modificações no rascunho e não as salvou, **When** tenta navegar para outra rota (ex.: menu "Meus planos", link externo ou botão voltar), **Then** o sistema intercepta a navegação e exibe o modal de confirmação do Design System ("Sair sem salvar?"), permitindo optar entre "Continuar editando" (mantendo as alterações na tela) ou "Sair sem salvar" (descartando as alterações pendentes e liberando a navegação).

---

### User Story 5 - Gestão e Isolamento Privado dos Rascunhos (Priority: P2)

Como professor, quero consultar a lista dos meus rascunhos criados e ter garantia de que nenhum outro professor tem acesso de leitura ou modificação aos meus planos.

**Why this priority**: Garante privacidade docente e governança multitenancy (Princípio III da Constituição).

**Independent Test**: Pode ser testado criando planos com a Conta Demo 1 e listando-os; em seguida, autenticando-se com a Conta Demo 2 e conferindo que a lista da Conta Demo 2 não contém planos da Conta Demo 1, e que tentativas de acesso direto por URL/ID aos planos da Conta Demo 1 são negadas com erro 403/404.

**Acceptance Scenarios**:

1. **Given** que o professor possui rascunhos salvos, **When** acessa a seção "Meus planos", **Then** visualiza a tabela/cards com seus planos, contendo título, componente curricular, ano escolar, data/hora da última atualização e status `RASCUNHO`.
2. **Given** que o professor não possui nenhum plano cadastrado, **When** acessa "Meus planos", **Then** visualiza o estado vazio amigável ("Nenhum rascunho ainda") com orientação e botão de ação para criar novo plano.
3. **Given** que o Professor A possui um plano de ID `X`, **When** o Professor B tenta acessar o plano `X` (seja por URL direta ou requisição de API), **Then** a API retorna HTTP 404 (Não Encontrado) para impedir enumeração de recursos e o frontend redireciona o Professor B para sua própria tela "Meus planos" com notificação informativa.

---

### Edge Cases

- **Tempo limite (timeout) ou indisponibilidade da API de IA:** O sistema aborta a operação sem criar registros órfãos, preserva as seleções e textos digitados pelo professor e exibe callout de erro amigável com opção de re-tentativa.
- **Submissão com dados incompletos ou inválidos:** Se o professor submeter o formulário com duração zero, negativa, sem instrução ou sem nenhuma habilidade selecionada, a interface bloqueia o envio, destaca os campos inválidos com contorno vermelho e exibe mensagem de correção imediata.
- **Sessão expirada durante a edição:** Caso a sessão expire enquanto o professor edita o Markdown, o texto digitado é retido em cache local, sendo exibido diálogo para reautenticação sem recarregar a tela, viabilizando o salvamento subsequente sem perda de trabalho.
- **Tentativa de adulteração de ID de recurso (Insecure Direct Object Reference - IDOR):** Qualquer requisição de leitura ou gravação de plano cujo proprietário não corresponda ao docente da sessão ativa deve ser barrada sumariamente.
- **Tentativa de injeção ou caracteres incomuns no retorno da IA:** O renderizador de Markdown deve sanitizar tags HTML e scripts inseguros antes da exibição na aba de pré-visualização.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema DEVE autenticar o professor exclusivamente através de duas contas de demonstração pré-configuradas em semente de banco de dados (seed).
- **FR-002**: O sistema DEVE gerenciar a sessão do docente com duração de 8 horas e renovação por atividade; caso a sessão expire durante a edição, o sistema DEVE reter o rascunho em cache local e permitir reautenticação direta sem recarregar a tela nem perder dados, além de fornecer encerramento de sessão explícito (logout).
- **FR-003**: O sistema DEVE disponibilizar um catálogo mínimo funcional de habilidades da BNCC estruturado com código, nível de ensino, ano escolar, componente curricular/eixo e texto descritivo.
- **FR-004**: O sistema DEVE permitir a pesquisa e filtragem de habilidades BNCC por nível, ano escolar (quando aplicável), eixo/componente, código alfanumérico e busca textual.
- **FR-005**: O sistema DEVE possibilitar a seleção de no mínimo 1 e no máximo 5 habilidades da BNCC, exibindo cada uma como chip informativo com botão de exclusão rápida.
- **FR-006**: O sistema DEVE fornecer um formulário de planejamento validando estritamente:
  - Instrução pedagógica (texto de 10 a 1.000 caracteres).
  - Duração prevista da aula (numérico inteiro entre 15 e 360 minutos).
  - Indicação sobre a utilização de recursos digitais (Sim/Não).
- **FR-007**: O sistema DEVE validar todas as entradas tanto no cliente (com destaque visual nos campos inválidos) quanto no backend, rejeitando envios com durações fora da faixa de 15–360 min, sem habilidades vinculadas ou com instrução inferior a 10 caracteres.
- **FR-008**: O sistema DEVE exibir um estado visual de preparação com animação/progresso e tempo estimado durante o processamento da solicitação pelo serviço de IA.
- **FR-009**: O sistema DEVE persistir o plano de aula gerado com status `RASCUNHO`, data/hora de criação/atualização e identificador visual de `Auxílio por IA`, vinculado unicamente ao professor autenticado.
- **FR-010**: O sistema DEVE garantir atomicidade transacional: caso a chamada ao serviço de IA falhe, retorne payload inválido ou sofra timeout, nenhum registro parcial de plano de aula DEVE ser gravado na base de dados.
- **FR-011**: O sistema DEVE abrir janela modal de falha caso o processamento de IA seja interrompido ou inválido, mantendo todos os campos do formulário preenchidos e fornecendo botões explícitos para "Tentar novamente" (reenvio direto) e "Voltar ao formulário para ajustar" (edição dos campos), sem persistência parcial de dados.
- **FR-012**: O sistema DEVE fornecer um editor de plano de aula com abas alternáveis entre "Editor Markdown" (código editável) e "Pré-visualização" (apresentação formatada acessível).
- **FR-013**: O sistema DEVE permitir ao professor salvar explicitamente suas alterações no rascunho a qualquer momento (confirmando com Toast de sucesso) e DEVE interceptar qualquer tentativa de navegação externa ou descarte contendo alterações não salvas exibindo o modal de confirmação do Design System ("Sair sem salvar?").
- **FR-014**: O sistema DEVE listar apenas os planos de aula pertencentes ao professor atualmente logado, exibindo título, componente, ano, data da última atualização e status.
- **FR-015**: O sistema DEVE responder com HTTP 404 (Não Encontrado) na API e redirecionar para a tela "Meus planos" com alerta informativo diante de qualquer tentativa de consulta, modificação ou exclusão de plano pertencente a outro docente, impedindo enumeração de identificadores e vazamento de dados.

---

### Key Entities *(include if feature involves data)*

- **Docente (Usuário de Demonstração)**:
  - Representa o professor autenticado.
  - Atributos principais: identificador único, nome de exibição, e-mail de acesso e credencial de autenticação.
  - Duas contas pré-configuradas no seed para validação de privacidade e multitenancy.

- **Habilidade BNCC**:
  - Unidade de competência/habilidade curricular da base nacional.
  - Atributos principais: código alfanumérico normativo (ex.: `EF05CI02`), nível de ensino (ex.: Ensino Fundamental), ano escolar (ex.: 5º ano), componente curricular/eixo (ex.: Ciências), texto da habilidade.

- **Plano de Aula (Rascunho)**:
  - Documento pedagógico estruturado elaborado com auxílio de IA e sob tutela do professor.
  - Atributos principais: identificador único, identificador do docente proprietário (chave estrangeira obrigatória), título da aula, lista de habilidades BNCC vinculadas, duração estimada (minutos), sinalizador de uso de recursos digitais (booleano), instrução pedagógica de apoio, conteúdo integral em Markdown, status do ciclo de vida (`RASCUNHO`), sinalizador de geração com auxílio de IA (booleano), data/hora de criação e data/hora da última alteração.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% dos planos de aula criados via serviço de IA recebem a classificação de status `RASCUNHO` e o selo visual explícito de "Auxílio por IA".
- **SC-002**: 100% de integridade transacional: zero planos parciais ou corrompidos gravados no banco de dados quando ocorrer qualquer falha no serviço de IA ou na validação externa.
- **SC-003**: 100% dos dados informados no formulário permanecem preservados após falha de geração, permitindo nova tentativa com 1 único clique do professor.
- **SC-004**: 100% de isolamento de privacidade: zero planos de aula de um docente são exibidos ou acessíveis para outro docente em testes de autorização cruzada.
- **SC-005**: Tempo de resposta do filtro e busca no catálogo da BNCC inferior a 200 milissegundos para qualquer consulta textual ou combinada.
- **SC-006**: Chaveamento entre as abas "Editor Markdown" e "Pré-visualização" ocorre de forma imediata (inferior a 100 milissegundos).
- **SC-007**: Interface plenamente responsiva e acessível (contraste WCAG AA conforme os tokens do Design System) em telas mobile (360px+), tablets (768px+) e desktops (1024px+).

---

## Assumptions

- **Contas de Demonstração**: O sistema disporá em sua semente de dados de duas contas de demonstração funcionais (ex.: `prof.ana@escola.gov.br` e `prof.carlos@escola.gov.br`) para facilitar o teste cruzado de autorização.
- **Catálogo BNCC**: O catálogo de sementes conterá uma amostragem funcional de habilidades da BNCC do Ensino Fundamental com dados canônicos do Ministério da Educação.
- **Serviço de IA**: O modelo gerador de IA será integrado através do backend (com segredos protegidos conforme Princípio II da Constituição) e formatará a saída estruturada em Markdown pedagógico.
- **Limites de Escopo Deliberados**:
  - Não inclui cadastro público de usuários nem recuperação de senha.
  - Não inclui painel administrativo.
  - Não inclui exportação para PDF nem comandos de impressão dedicados.
  - Não inclui etapa de "Finalização", publicação ou compartilhamento público de planos.
  - Não inclui versionamento histórico de revisões dos planos.
