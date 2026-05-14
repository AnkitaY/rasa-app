-- Migration: add dietary_flags and dietary_other to user_preferences
-- Rollback: ALTER TABLE user_preferences DROP COLUMN IF EXISTS dietary_flags, DROP COLUMN IF EXISTS dietary_other;
ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS dietary_flags text[] DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS dietary_other text DEFAULT NULL;
