-- FEAT-S02-000: migrate meals.meal_type brunch→breakfast, tighten CHECK to 3 types
-- Rollback:
--   UPDATE meals SET meal_type = 'brunch' WHERE meal_type = 'breakfast';
--   ALTER TABLE meals DROP CONSTRAINT IF EXISTS meals_meal_type_check_v2;
--   ALTER TABLE meals ADD CONSTRAINT meals_meal_type_check CHECK (meal_type IN ('breakfast','brunch','lunch','dinner'));

-- 1. Migrate existing brunch rows
UPDATE meals SET meal_type = 'breakfast' WHERE meal_type = 'brunch';

-- 2. Update the check constraint (drop old, add new without 'brunch')
ALTER TABLE meals DROP CONSTRAINT IF EXISTS meals_meal_type_check;
ALTER TABLE meals ADD CONSTRAINT meals_meal_type_check_v2
  CHECK (meal_type IN ('breakfast', 'lunch', 'dinner'));
