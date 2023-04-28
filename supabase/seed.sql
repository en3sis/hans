create table "public"."config" (
    "id" bigint generated by default as identity not null,
    "created_at" timestamp with time zone default now(),
    "name" text,
    "notify_channel_id" text,
    "bot_dev_folder" text,
    "bot_guild_id" text,
    "website" text,
    "perma_invite" text,
    "disable_commands" text[],
    "bot_id" text not null,
    "activity_type" bigint,
    "activity_name" text
);


CREATE UNIQUE INDEX config_id_key ON public.config USING btree (id);

CREATE UNIQUE INDEX config_pkey ON public.config USING btree (id);

alter table "public"."config" add constraint "config_pkey" PRIMARY KEY using index "config_pkey";

alter table "public"."config" add constraint "config_id_key" UNIQUE using index "config_id_key";


create table "public"."guilds" (
    "id" bigint generated by default as identity not null,
    "created_at" timestamp with time zone default now(),
    "guild_id" text,
    "name" text,
    "avatar" text,
    "premium" boolean,
    "plugins" text[]
);


CREATE UNIQUE INDEX guilds_id_key ON public.guilds USING btree (id);

CREATE UNIQUE INDEX guilds_pkey ON public.guilds USING btree (id);

alter table "public"."guilds" add constraint "guilds_pkey" PRIMARY KEY using index "guilds_pkey";

alter table "public"."guilds" add constraint "guilds_id_key" UNIQUE using index "guilds_id_key";

alter table "public"."config" add column "discord_client_id" text;
