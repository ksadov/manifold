-- This file is autogenerated from regen-schema.ts
create table if not exists
  daily_stats (
    activation numeric,
    active_d1_to_d3 numeric,
    avg_user_actions numeric,
    bet_amount numeric,
    bet_count numeric,
    cash_bet_amount numeric,
    cash_avg_user_actions numeric,
    cash_bet_count numeric,
    cash_comment_count numeric,
    cash_contract_count numeric,
    cash_d1 numeric,
    cash_dau numeric,
    cash_m1 numeric,
    cash_mau numeric,
    cash_w1 numeric,
    cash_wau numeric,
    cash_sales numeric,
    comment_count numeric,
    contract_count numeric,
    d1 numeric,
    d1_bet_3_day_average numeric,
    d1_bet_average numeric,
    dau numeric,
    engaged_users numeric,
    feed_conversion numeric,
    m1 numeric,
    mau numeric,
    nd1 numeric,
    nw1 numeric,
    sales numeric,
    signups numeric,
    signups_real numeric,
    start_date date primary key not null,
    topic_daus jsonb,
    w1 numeric,
    wau numeric,
    dav numeric,
    mav numeric,
    wav numeric
  );

-- Row Level Security
alter table daily_stats enable row level security;

-- Policies
drop policy if exists "public read" on daily_stats;

create policy "public read" on daily_stats for
select
  using (true);

-- Indexes
drop index if exists daily_stats_pkey;

create unique index daily_stats_pkey on public.daily_stats using btree (start_date);
