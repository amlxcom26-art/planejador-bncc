<!--
Sync Impact Report
Version change: 0.0.0 (template) -> 1.0.0
Modified principles: N/A (initial constitution definition)
Added sections:
  - Core Principles (8 principles: Especificação Prévia, Arquitetura em Camadas, Autenticação e Autorização, IA como Rascunho, Validação Estrita, Persistência Estruturada, Conformidade com Design System, Testabilidade e Higiene de Repositório)
  - Padrões de Segurança e Confiabilidade
  - Fluxo de Desenvolvimento e Garantia de Qualidade
  - Governance
Removed sections: None
Follow-up TODOs: None
-->

# Planejador BNCC Constitution

## Core Principles

### I. Especificação Prévia (Specification-First)
O comportamento do sistema e os critérios de aceitação DEVEM ser formalmente definidos antes da implementação de código. Nenhuma funcionalidade é codificada sem especificação revisada e critérios de aceitação mensuráveis e testáveis.

### II. Arquitetura em Camadas e Proteção de Segredos
Frontend, API e integrações externas DEVEM permanecer estritamente desacoplados. Segredos, chaves de API e credenciais de serviços externos residem exclusivamente no backend, sendo estritamente proibida sua exposição direta ao cliente web.

### III. Autenticação e Autorização por Docente
Todo acesso à aplicação DEVE autenticar a identidade do professor. Cada operação de consulta, modificação ou exclusão de plano de aula DEVE validar expressamente a posse do recurso pelo docente requisitante, impedindo acesso indevido entre usuários.

### IV. IA como Rascunho sob Supervisão Docente
Toda saída gerada por modelos de Inteligência Artificial DEVE ser tratada como rascunho preliminar sujeito à edição docente. O sistema não publica planos de forma autônoma e DEVE indicar visualmente o auxílio por IA até a aprovação explícita do professor.

### V. Validação Estrita e Atomicidade Transacional
Entradas de usuário e respostas de integrações externas DEVEM passar por validação rigorosa de esquema. Falhas de validação, erros de rede ou inconsistências de resposta externa NÃO DEVEM criar planos parciais ou corrompidos no banco de dados.

### VI. Persistência Estruturada com Migrations e Seeds Reproduzíveis
A estrutura de dados DEVE ser gerenciada exclusivamente por migrações versionadas. O catálogo de habilidades da BNCC e massas essenciais de teste DEVEM ser populados via seeds idempotentes e reproduzíveis em qualquer ambiente.

### VII. Conformidade com Design System, Acessibilidade e Responsividade
A interface DEVE seguir rigorosamente os componentes, estados e tokens do Design System do Figma (tipografia Inter, paleta cívica Azul 900/700/100, raios e sombras padronizados). A usabilidade DEVE garantir contraste WCAG AA e adaptação responsiva fluida para celular, tablet e desktop.

### VIII. Testabilidade Crítica, Documentação e Higiene de Repositório
Fluxos essenciais (cálculo de carga horária, integridade BNCC, autorização e persistência) DEVEM possuir testes automatizados e roteiros de execução documentados. Arquivos locais de configuração (`.env`, segredos e tokens) NUNCA DEVEM ser versionados no repositório.

## Padrões de Segurança e Confiabilidade

- **Gestão de Segredos:** Variáveis de ambiente sensíveis devem ser injetadas exclusivamente no ambiente de execução do servidor ou via cofre de segredos, nunca embutidas no build do cliente.
- **Resiliência a Falhas de IA:** Timeouts e indisponibilidades de APIs de IA devem apresentar mensagens informativas acionáveis ao usuário sem derrubar a aplicação.
- **Integridade Referencial:** Toda associação a códigos de habilidades da BNCC deve validar a existência prévia do código no catálogo local seedado.

## Fluxo de Desenvolvimento e Garantia de Qualidade

- **Ciclo de Desenvolvimento:** Especificação (Spec Kit) -> Testes / Validação de Contrato -> Implementação -> Verificação -> Commit.
- **Portões de Qualidade (Quality Gates):** Todos os testes automatizados devem passar antes da integração; nenhum arquivo de segredo ou dependência de máquina local pode ser introduzido no controle de versão.
- **Revisão Visual e Semântica:** Novas telas e componentes devem ser validados contra o frame do Design System de referência antes de serem considerados prontos.

## Governance

- Esta constituição é a referência suprema para decisões arquiteturais e de código do projeto Planejador BNCC.
- Emendas a estes princípios exigem registro formal de justificativa e incremento de versão semântica:
  - **MAJOR:** Mudanças que revoguem, alterem a essência de princípios ou quebrem diretrizes fundamentais anteriores.
  - **MINOR:** Adição de novos princípios ou seções complementares.
  - **PATCH:** Correções gramaticais, refinamentos de texto e esclarecimentos pontuais.
- Toda contribuição, pull request e tarefa de implementação deve ser checada quanto à conformidade com esta constituição.

**Version**: 1.0.0 | **Ratified**: 2026-10-01 | **Last Amended**: 2026-10-01
