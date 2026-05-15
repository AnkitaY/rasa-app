-- FEAT-S03-000: add 'global_curated' to recipes.source check constraint
-- Applied: 2026-05-15
-- Constraint name 'recipes_source_check' confirmed via pg_constraint pre-check before applying.
-- Rollback:
--   ALTER TABLE recipes DROP CONSTRAINT IF EXISTS recipes_source_check_v2;
--   ALTER TABLE recipes ADD CONSTRAINT recipes_source_check
--     CHECK (source IN ('ai_generated', 'user_imported'));

ALTER TABLE recipes DROP CONSTRAINT IF EXISTS recipes_source_check;

ALTER TABLE recipes ADD CONSTRAINT recipes_source_check_v2
  CHECK (source IN ('ai_generated', 'user_imported', 'global_curated'));
