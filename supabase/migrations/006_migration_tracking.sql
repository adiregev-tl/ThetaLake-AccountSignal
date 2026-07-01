-- ============================================================
-- Create Supabase migration tracking table
--
-- PostgREST exposes the supabase_migrations schema by default.
-- Without this table it logs "42P01: relation does not exist"
-- on every schema cache reload. All previous migrations were
-- applied manually via the SQL Editor, so we seed the history here.
-- ============================================================

CREATE SCHEMA IF NOT EXISTS supabase_migrations;

CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (
  version  text        NOT NULL PRIMARY KEY,
  name     text,
  statements text[]
);

-- Seed records for the migrations already applied manually
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES
  ('001', '001_full_schema'),
  ('003', '003_usage_logs'),
  ('004', '004_security_fixes'),
  ('005', '005_explicit_grants'),
  ('006', '006_migration_tracking')
ON CONFLICT (version) DO NOTHING;
