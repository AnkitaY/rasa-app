-- S02 schema additions — FEAT-001 (meal types), FEAT-002 (recipe bank), FEAT-005 (learning loop)
-- Applied: 2026-05-11
--
-- Rollback:
--   ALTER TABLE meals DROP CONSTRAINT IF EXISTS meals_meal_type_check;
--   ALTER TABLE recipes DROP COLUMN IF EXISTS raw_text, source, recipe_type, prep_friendly, assembly_time_mins, excluded_from_plans;
--   ALTER TABLE user_preferences DROP COLUMN IF EXISTS meal_types_default, meal_days_default, meal_prefs, health_goals;


-- ── meals ──────────────────────────────────────────────────────────────────
-- meal_type column already exists (text NOT NULL DEFAULT 'dinner').
-- ADD COLUMN IF NOT EXISTS is a no-op; adding the check constraint separately.
ALTER TABLE meals
  ADD COLUMN IF NOT EXISTS meal_type text NOT NULL DEFAULT 'dinner';

ALTER TABLE meals
  ADD CONSTRAINT meals_meal_type_check
    CHECK (meal_type IN ('breakfast', 'brunch', 'lunch', 'dinner'));


-- ── recipes ────────────────────────────────────────────────────────────────
-- Skipped: meal_type (already exists; has a 'lunch/dinner' value that blocks safe check constraint)
-- Skipped: source_url (already exists)
-- Note: source_raw_text already exists; raw_text is a new separate column
ALTER TABLE recipes
  ADD COLUMN IF NOT EXISTS raw_text            text,
  ADD COLUMN IF NOT EXISTS source              text DEFAULT 'ai_generated'
    CHECK (source IN ('ai_generated', 'user_imported')),
  ADD COLUMN IF NOT EXISTS recipe_type         text DEFAULT 'complete_meal'
    CHECK (recipe_type IN ('main', 'side', 'salad', 'complete_meal')),
  ADD COLUMN IF NOT EXISTS prep_friendly       boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS assembly_time_mins  integer,
  ADD COLUMN IF NOT EXISTS excluded_from_plans boolean DEFAULT false;


-- ── user_preferences ───────────────────────────────────────────────────────
ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS meal_types_default text[]  DEFAULT ARRAY['brunch', 'dinner'],
  ADD COLUMN IF NOT EXISTS meal_days_default  jsonb   DEFAULT '{"brunch":5,"dinner":2}'::jsonb,
  ADD COLUMN IF NOT EXISTS meal_prefs         jsonb   DEFAULT '{"brunch":{"prep_ahead":true,"max_assembly_mins":30},"dinner":{"prep_ahead":false}}'::jsonb,
  ADD COLUMN IF NOT EXISTS health_goals       text    DEFAULT 'high protein, balanced';
