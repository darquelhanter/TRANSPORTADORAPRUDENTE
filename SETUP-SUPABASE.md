# Configurar o login e o banco (Supabase)

Tempo: ~10 min. Não precisa instalar nada — o cliente Supabase carrega via CDN.

## 1. Criar o projeto

1. Acesse <https://supabase.com> → **Start your project** → entre com o GitHub.
2. **New project**:
   - Name: `torre-de-controle`
   - Database Password: gere uma forte e **guarde** (não é a senha de login do painel).
   - Region: `South America (São Paulo)`.
3. Espere ~2 min o projeto subir.

## 2. Criar as tabelas

1. Menu lateral → **SQL Editor** → **New query**.
2. Cole todo o conteúdo de [`db/schema.sql`](db/schema.sql) e clique **Run**.
3. Deve aparecer *Success. No rows returned*.

## 3. Ajustar a autenticação

1. Menu lateral → **Authentication** → **Providers** → **Email**: deixe **Enabled**.
2. Para agilizar o protótipo: **Authentication** → **Providers** → **Email** →
   desligue **Confirm email** (assim a conta já entra sem confirmar). Pode religar depois.
3. **Authentication** → **URL Configuration** → em **Site URL** coloque a URL onde o
   site vai rodar (ex.: `https://darquelhanter.github.io/TRANSPORTADORAPRUDENTE/`
   ou `http://localhost:5500` se testar local).

## 4. Pegar as chaves e colar no código

1. Menu lateral → **Project Settings** (engrenagem) → **API**.
2. Copie:
   - **Project URL** → ex.: `https://abcdxyz.supabase.co`
   - **anon / public** key → um token longo começando com `eyJ...`
3. Abra [`supabase.js`](supabase.js) e substitua:
   ```js
   const SUPABASE_URL      = 'https://abcdxyz.supabase.co';
   const SUPABASE_ANON_KEY = 'eyJ...sua-anon-key...';
   ```
   > A **anon key** foi feita para ficar no navegador — quem protege os dados são as
   > políticas RLS do passo 2. Nunca use a **service_role** key aqui.

## 5. Testar

- Abra `login.html` → **Criar conta** com seu e-mail e uma senha (6+).
- Se "Confirm email" estiver ligado, confirme pelo e-mail e volte.
- Ao entrar, cai no `index.html`. Vá em **Cadastro de Frete**, cadastre um frete —
  ele agora salva no Supabase (confira em **Table Editor → fretes**).
- Botão **Sair** no topo encerra a sessão.

## Depois (opcional)

- **Confirm email** religado + template de e-mail em português.
- Política RLS por usuário (cada operador vê só os próprios fretes) — comentário no `schema.sql`.
- Tabelas `clientes`, `veiculos`, `motoristas` com seleção em vez de digitar.
- Migrations versionadas com a CLI do Supabase (aí sim precisa de Node).
