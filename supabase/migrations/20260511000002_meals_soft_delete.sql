-- Add soft-delete support to meals table (FEAT-001 Remove action)
-- Rollback: ALTER TABLE meals DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE meals ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
