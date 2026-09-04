-- =====================================================================
-- Torre de Controle — schema do banco (rode no Supabase: SQL Editor)
-- =====================================================================

-- Numeração automática dos fretes: FR-1001, FR-1002, ...
create sequence if not exists public.fretes_numero_seq start 1001;

create table if not exists public.fretes (
  id                uuid primary key default gen_random_uuid(),
  numero            text not null default ('FR-' || nextval('public.fretes_numero_seq')),
  criado_em         timestamptz not null default now(),
  criado_por        uuid not null default auth.uid() references auth.users(id),

  -- rota
  origem            text not null,
  destino           text not null,
  distancia         numeric,
  previsao          date,

  -- carga e veículo
  tipo_carga        text,
  eixos             int,
  veiculo           text,
  peso              int,
  valor_mercadoria  numeric,

  -- partes
  remetente         text,
  remetente_doc     text,
  destinatario      text,
  destinatario_doc  text,
  tomador           text,
  contato_tel       text,

  -- financeiro / motorista
  -- valor_frete = cobrado do cliente; valor_motorista = pago a quem executa o
  -- transporte. A empresa é corretora de frete: a margem é a diferença entre
  -- os dois, e o piso mínimo ANTT compara com valor_motorista (não valor_frete).
  valor_frete       numeric,
  valor_motorista   numeric,
  status            text not null default 'confirmado',
  motorista         text,
  motorista_cpf     text,
  placa_cavalo      text,
  placa_reboque     text,
  obs               text,

  -- cálculo do piso
  inclui_retorno    boolean not null default false,
  piso_ref          numeric
);

create index if not exists fretes_criado_em_idx on public.fretes (criado_em desc);

-- =====================================================================
-- Row Level Security
-- Regra atual: qualquer usuário autenticado enxerga e edita todos os
-- fretes (equipe pequena, uma filial). Para restringir por usuário,
-- troque "auth.uid() is not null" por "auth.uid() = criado_por".
-- =====================================================================
alter table public.fretes enable row level security;

drop policy if exists "fretes_select" on public.fretes;
drop policy if exists "fretes_insert" on public.fretes;
drop policy if exists "fretes_update" on public.fretes;
drop policy if exists "fretes_delete" on public.fretes;

create policy "fretes_select" on public.fretes
  for select to authenticated using (true);

create policy "fretes_insert" on public.fretes
  for insert to authenticated with check (criado_por = auth.uid());

create policy "fretes_update" on public.fretes
  for update to authenticated using (true) with check (true);

create policy "fretes_delete" on public.fretes
  for delete to authenticated using (true);

-- =====================================================================
-- Configurações compartilhadas da equipe (ex.: chave do OpenRouteService).
-- Fica no banco (protegida por login), nunca no repositório do GitHub,
-- e vale para todos os usuários autenticados.
-- =====================================================================
create table if not exists public.app_config (
  chave           text primary key,
  valor           text,
  atualizado_em   timestamptz not null default now(),
  atualizado_por  uuid default auth.uid()
);

alter table public.app_config enable row level security;

drop policy if exists "app_config_select" on public.app_config;
drop policy if exists "app_config_upsert" on public.app_config;
drop policy if exists "app_config_update" on public.app_config;
drop policy if exists "app_config_delete" on public.app_config;

create policy "app_config_select" on public.app_config
  for select to authenticated using (true);

create policy "app_config_upsert" on public.app_config
  for insert to authenticated with check (true);

create policy "app_config_update" on public.app_config
  for update to authenticated using (true) with check (true);

create policy "app_config_delete" on public.app_config
  for delete to authenticated using (true);

-- =====================================================================
-- Migrações incrementais — rode só a que ainda não rodou no seu projeto.
-- (create table acima já cria valor_motorista e app_config para instalações novas)
-- =====================================================================

-- 2026-09-04: separa valor cobrado do cliente e valor pago ao motorista
-- (a empresa é corretora de frete: a margem é a diferença entre os dois)
alter table public.fretes add column if not exists valor_motorista numeric;

-- 2026-09-04: configurações compartilhadas (chave do OpenRouteService etc.)
create table if not exists public.app_config (
  chave           text primary key,
  valor           text,
  atualizado_em   timestamptz not null default now(),
  atualizado_por  uuid default auth.uid()
);
alter table public.app_config enable row level security;
drop policy if exists "app_config_select" on public.app_config;
drop policy if exists "app_config_upsert" on public.app_config;
drop policy if exists "app_config_update" on public.app_config;
drop policy if exists "app_config_delete" on public.app_config;
create policy "app_config_select" on public.app_config for select to authenticated using (true);
create policy "app_config_upsert" on public.app_config for insert to authenticated with check (true);
create policy "app_config_update" on public.app_config for update to authenticated using (true) with check (true);
create policy "app_config_delete" on public.app_config for delete to authenticated using (true);

-- =====================================================================
-- Central de Atendimento — fase 1: registro manual das conversas.
-- Quando a API da Meta (WhatsApp) for conectada (fase 2), o webhook
-- passa a inserir aqui automaticamente em vez do atendente digitar.
-- =====================================================================
create table if not exists public.conversas (
  id                  uuid primary key default gen_random_uuid(),
  criado_em           timestamptz not null default now(),
  telefone            text not null,             -- só dígitos, com DDI: 5541999990000
  nome_contato        text,
  frete_numero        text,                       -- vínculo opcional com um frete (ex.: FR-1001)
  status              text not null default 'aberta', -- aberta | resolvida
  ultima_mensagem_em  timestamptz not null default now()
);

create table if not exists public.mensagens (
  id           uuid primary key default gen_random_uuid(),
  conversa_id  uuid not null references public.conversas(id) on delete cascade,
  criado_em    timestamptz not null default now(),
  direcao      text not null,             -- 'recebida' | 'enviada'
  origem       text not null default 'manual', -- 'manual' (fase 1) | 'whatsapp' | 'ia' (fase 2+)
  texto        text not null,
  autor        uuid default auth.uid()
);

create index if not exists conversas_ultima_msg_idx on public.conversas (ultima_mensagem_em desc);
create index if not exists mensagens_conversa_idx on public.mensagens (conversa_id, criado_em);

alter table public.conversas enable row level security;
alter table public.mensagens enable row level security;

drop policy if exists "conversas_select" on public.conversas;
drop policy if exists "conversas_insert" on public.conversas;
drop policy if exists "conversas_update" on public.conversas;
drop policy if exists "conversas_delete" on public.conversas;
create policy "conversas_select" on public.conversas for select to authenticated using (true);
create policy "conversas_insert" on public.conversas for insert to authenticated with check (true);
create policy "conversas_update" on public.conversas for update to authenticated using (true) with check (true);
create policy "conversas_delete" on public.conversas for delete to authenticated using (true);

drop policy if exists "mensagens_select" on public.mensagens;
drop policy if exists "mensagens_insert" on public.mensagens;
drop policy if exists "mensagens_delete" on public.mensagens;
create policy "mensagens_select" on public.mensagens for select to authenticated using (true);
create policy "mensagens_insert" on public.mensagens for insert to authenticated with check (true);
create policy "mensagens_delete" on public.mensagens for delete to authenticated using (true);
