-- This file is autogenerated from regen-schema.ts
create table if not exists
  answers (
    color text,
    contract_id text,
    created_time timestamp with time zone default now(),
    id text primary key default random_alphanumeric (12) not null,
    image_url text,
    index integer,
    is_other boolean default false not null,
    pool_no numeric,
    pool_yes numeric,
    prob numeric,
    prob_change_day numeric default 0,
    prob_change_month numeric default 0,
    prob_change_week numeric default 0,
    resolution text,
    resolution_probability numeric,
    resolution_time timestamp with time zone,
    resolver_id text,
    short_text text,
    subsidy_pool numeric default 0,
    text text,
    text_fts tsvector generated always as (to_tsvector('english_extended'::regconfig, text)) stored,
    total_liquidity numeric default 0,
    user_id text
  );

-- Row Level Security
alter table answers enable row level security;

-- Policies
drop policy if exists "public read" on answers;

create policy "public read" on answers for
select
  using (true);

-- Indexes
drop index if exists answer_contract_id;

create index answer_contract_id on public.answers using btree (contract_id);

drop index if exists answer_text_fts;

create index answer_text_fts on public.answers using gin (text_fts);

drop index if exists answers_pkey;

create unique index answers_pkey on public.answers using btree (id);
