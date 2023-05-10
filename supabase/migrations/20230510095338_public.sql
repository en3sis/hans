alter table "public"."configs" drop column "debug_channel";

alter table "public"."configs" add column "monitoring_channel_id" text;


