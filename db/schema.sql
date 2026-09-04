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
-- Migrações incrementais — rode só a que ainda não rodou no seu projeto.
-- (create table acima já cria valor_motorista para instalações novas)
-- =====================================================================

-- 2026-09-04: separa valor cobrado do cliente e valor pago ao motorista
-- (a empresa é corretora de frete: a margem é a diferença entre os dois)
alter table public.fretes add column if not exists valor_motorista numeric;
