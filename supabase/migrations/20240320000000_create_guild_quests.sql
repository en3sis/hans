-- Create guild_quests table
create table if not exists public.guild_quests (
  id uuid not null primary key,
  guild_id integer not null references public.guilds(id) on delete cascade,
  title text not null,
  description text not null,
  question text,
  answer text,
  mode text not null check (mode in ('quiz', 'raffle')),
  winners_count integer,
  reward text not null,
  reward_code text,
  channel_id text not null,
  thread_id text,
  message_id text,
  created_by text not null,
  created_at timestamp with time zone not null default now(),
  expiration_date timestamp with time zone not null,
  is_claimed boolean not null default false,
  is_pending_claim boolean not null default false,
  winner jsonb,
  winners jsonb,
  
  -- Add indexes
  constraint guild_quests_guild_id_idx unique (guild_id, id)
);

-- Add RLS policies
alter table public.guild_quests enable row level security;

-- Allow all authenticated users to view quests
create policy "Guild quests are viewable by authenticated users."
  on public.guild_quests for select
  using (auth.role() = 'authenticated');

-- Allow all authenticated users to insert quests
create policy "Guild quests are insertable by authenticated users."
  on public.guild_quests for insert
  with check (auth.role() = 'authenticated');

-- Allow all authenticated users to update quests
create policy "Guild quests are updatable by authenticated users."
  on public.guild_quests for update
  using (auth.role() = 'authenticated');

-- Allow all authenticated users to delete quests
create policy "Guild quests are deletable by authenticated users."
  on public.guild_quests for delete
  using (auth.role() = 'authenticated');

-- Add migration to move existing quests from guild_plugins metadata to guild_quests
insert into public.guild_quests (
  id,
  guild_id,
  title,
  description,
  question,
  answer,
  mode,
  winners_count,
  reward,
  reward_code,
  channel_id,
  thread_id,
  message_id,
  created_by,
  created_at,
  expiration_date,
  is_claimed,
  is_pending_claim,
  winner,
  winners
)
select
  (quest->>'id')::uuid,
  (select id from public.guilds where guild_id = gp.owner),
  quest->>'title',
  quest->>'description',
  quest->>'question',
  quest->>'answer',
  quest->>'mode',
  (quest->>'winners_count')::integer,
  quest->>'reward',
  quest->>'reward_code',
  quest->>'channel_id',
  quest->>'thread_id',
  quest->>'message_id',
  quest->>'created_by',
  (quest->>'created_at')::timestamp with time zone,
  (quest->>'expiration_date')::timestamp with time zone,
  (quest->>'is_claimed')::boolean,
  (quest->>'is_pending_claim')::boolean,
  quest->'winner',
  quest->'winners'
from
  public.guilds_plugins gp,
  jsonb_array_elements(gp.metadata->'quests') quest
where
  gp.name = 'quests';

-- Update guild_plugins to remove quests from metadata
update public.guilds_plugins
set metadata = jsonb_build_object('settings', metadata->'settings')
where name = 'quests'; 