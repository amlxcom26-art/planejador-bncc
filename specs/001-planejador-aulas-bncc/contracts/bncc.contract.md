# API Contract: Catálogo BNCC (`/api/bncc`)

## 1. GET `/api/bncc/skills`
Consulta as habilidades da BNCC disponíveis no catálogo oficial com suporte a filtros combinados.

- **Headers:** `Authorization: Bearer <accessToken>`
- **Query Parameters (Opcionais):**
  - `nivel` (`string`): Filtro de nível (ex.: `"Ensino Fundamental"`).
  - `ano` (`number`): Filtro por ano escolar (ex.: `1`, `2`, `5`).
  - `eixo` (`string`): Filtro por eixo/componente (ex.: `"Pensamento Computacional (PC)"`).
  - `q` (`string`): Termo de busca textual por código ou palavras da descrição/explicação (ex.: `"água"`, `"EF01CO01"`).
- **Resposta de Sucesso (`200 OK`):**
  ```json
  {
    "total": 3,
    "items": [
      {
        "id": "cuid-skill-1",
        "codigo": "EF01CO01",
        "nivel": "Ensino Fundamental",
        "ano": 1,
        "eixo": "Pensamento Computacional (PC)",
        "descricao": "Organizar objetos físicos ou digitais considerando diferentes características...",
        "explicacao": "Objetos de um mesmo conjunto podem ser organizados e agrupados...",
        "exemplos": "O professor pode pedir que os alunos organizem um conjunto..."
      }
    ]
  }
  ```
- **Respostas de Erro:**
  - `401 Unauthorized`: Caso o usuário não esteja autenticado.
