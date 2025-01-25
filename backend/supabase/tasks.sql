-- This file is autogenerated from regen-schema.ts
create table if not exists
  tasks (
    archived boolean default false not null,
    assignee_id text not null,
    category_id bigint not null,
    completed boolean default false not null,
    created_time timestamp with time zone default now() not null,
    creator_id text not null,
    id bigint primary key generated always as identity not null,
    priority integer default 0 not null,
    text text not null
  );

-- Foreign Keys
alter table tasks
add constraint tasks_assignee_id_fkey foreign key (assignee_id) references users (id);

alter table tasks
add constraint tasks_creator_id_fkey foreign key (creator_id) references users (id);

-- Row Level Security
alter table tasks enable row level security;

-- Indexes
drop index if exists tasks_assignee_id_idx;

create index tasks_assignee_id_idx on public.tasks using btree (assignee_id);

drop index if exists tasks_category_id_idx;

create index tasks_category_id_idx on public.tasks using btree (category_id);

drop index if exists tasks_creator_id_idx;

create index tasks_creator_id_idx on public.tasks using btree (creator_id);

drop index if exists tasks_pkey;

create unique index tasks_pkey on public.tasks using btree (id);
