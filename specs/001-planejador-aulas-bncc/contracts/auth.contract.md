# API Contract: Autenticação e Sessão (`/api/auth`)

## 1. POST `/api/auth/login`
Autentica o professor utilizando credenciais cadastradas na base.

- **Requisição:**
  ```json
  {
    "email": "ana@demo.bncc.br",
    "password": "demo123"
  }
  ```
- **Validação de Entrada:**
  - `email`: `string`, formato válido de e-mail, obrigatório.
  - `password`: `string`, mínimo de 6 caracteres, obrigatório.
- **Resposta de Sucesso (`200 OK`):**
  - **Headers de Resposta:**
    - `Set-Cookie`: `refreshToken=<uuid-token>; HttpOnly; Path=/api/auth; SameSite=Strict; Max-Age=28800; [Secure em produção]`
  - **Corpo:**
    ```json
    {
      "accessToken": "eyJhbGciOi...",
      "user": {
        "id": "cuid-ana",
        "name": "Profª Ana Souza",
        "email": "ana@demo.bncc.br"
      }
    }
    ```
- **Respostas de Erro:**
  - `401 Unauthorized`:
    ```json
    {
      "statusCode": 401,
      "message": "E-mail ou senha incorretos. Confira os dados e tente novamente.",
      "error": "Unauthorized"
    }
    ```

---

## 2. POST `/api/auth/refresh`
Renova o Access Token em memória utilizando o Refresh Token persistido no cookie HttpOnly.

- **Requisição:**
  - Sem corpo.
  - **Cookie Obrigatório:** `refreshToken=<token>`
- **Resposta de Sucesso (`200 OK`):**
  - Novo cookie `refreshToken` rotacionado emitido via `Set-Cookie`.
  - **Corpo:**
    ```json
    {
      "accessToken": "eyJhbGciOi...",
      "user": {
        "id": "cuid-ana",
        "name": "Profª Ana Souza",
        "email": "ana@demo.bncc.br"
      }
    }
    ```
- **Respostas de Erro:**
  - `401 Unauthorized`: Caso o cookie esteja ausente, expirado ou revogado.

---

## 3. POST `/api/auth/logout`
Encerra a sessão do docente, revogando o refresh token no banco de dados e limpando o cookie no navegador.

- **Requisição:**
  - Cookie: `refreshToken=<token>`
- **Resposta de Sucesso (`200 OK`):**
  - **Headers de Resposta:**
    - `Set-Cookie`: `refreshToken=; HttpOnly; Path=/api/auth; Max-Age=0`
  - **Corpo:**
    ```json
    {
      "success": true,
      "message": "Sessão encerrada com sucesso."
    }
    ```

---

## 4. GET `/api/auth/me`
Retorna os dados do docente autenticado na sessão ativa.

- **Headers:** `Authorization: Bearer <accessToken>`
- **Resposta (`200 OK`):**
  ```json
  {
    "id": "cuid-ana",
    "name": "Profª Ana Souza",
    "email": "ana@demo.bncc.br"
  }
  ```
