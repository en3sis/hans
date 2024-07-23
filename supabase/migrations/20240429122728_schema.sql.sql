alter table "public"."guilds" drop constraint "guilds_pkey";

drop index if exists "public"."guilds_pkey";

alter table "public"."guilds" drop column "id";

CREATE UNIQUE INDEX guilds_pkey ON public.guilds USING btree (guild_id);

alter table "public"."guilds" add constraint "guilds_pkey" PRIMARY KEY using index "guilds_pkey";


