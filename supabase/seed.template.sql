-- This file is the template for your local supabase database. Remove the .template from the filename to use for seeding your local database.

-- Seed data for 'timezones' table, change the USER_ID_ONE and USER_ID_TWO to the user ids you want to seed.

INSERT INTO users_settings (id, created_at, user_id, metadata, type) VALUES
(1, '2023-09-13 08:05:31+00', USER_ID_ONE, '{"timezone":"Europe/Berlin"}', 'timezone'),
(2, '2023-09-13 08:06:04.711699+00', USER_ID_TWO, '{"timezone":"Africa/Ceuta"}', 'timezone');
