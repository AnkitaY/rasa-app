-- FEAT-S03-000: add 'global_curated' to recipes.source check constraint
-- Rollback:
--   ALTER TABLE recipes DROP CONSTRAINT IF EXISTS recipes_source_check_v2;
--   ALTER TABLE recipes ADD CONSTRAINT recipes_source_check
--     CHECK (source IN ('ai_generated', 'user_imported'));

ALTER TABLE recipes DROP CONSTRAINT IF EXISTS recipes_source_check;

ALTER TABLE recipes ADD CONSTRAINT recipes_source_check_v2
  CHECK (source IN ('ai_generated', 'user_imported', 'global_curated'));
