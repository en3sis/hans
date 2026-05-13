ALTER TABLE "configs" ADD COLUMN "default_openai_model" text;
--> statement-breakpoint
-- Seed existing config rows with the catalog default. The column stays
-- nullable so unsetting it still falls back to DEFAULT_OPENAI_MODEL in
-- utils/openai-models.ts; this only ensures prod has a sensible value
-- after the upgrade without a manual UPDATE.
UPDATE "configs" SET "default_openai_model" = 'gpt-5-nano' WHERE "default_openai_model" IS NULL;