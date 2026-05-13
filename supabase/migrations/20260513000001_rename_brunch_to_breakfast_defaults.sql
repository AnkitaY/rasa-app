-- ENG-RENAME-001: update user_preferences column defaults from 'brunch' → 'breakfast'
-- Existing rows are NOT updated (per spec: keep 'brunch' for backward compat)
-- meals.meal_type CHECK constraint already includes 'breakfast' — no change needed

ALTER TABLE user_preferences
  ALTER COLUMN meal_types_default SET DEFAULT ARRAY['breakfast','dinner'],
  ALTER COLUMN meal_days_default SET DEFAULT '{"breakfast":5,"dinner":2}'::jsonb,
  ALTER COLUMN meal_prefs SET DEFAULT '{"breakfast":{"prep_ahead":true,"max_assembly_mins":30},"dinner":{"prep_ahead":false}}'::jsonb;
