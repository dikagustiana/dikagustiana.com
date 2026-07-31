-- Migration: Enforce strict Section → Category → Essay hierarchy
--
-- BEFORE: essays.section (string slug), essays.category_id (nullable)
-- AFTER:  essays.category_id (NOT NULL FK), section derived via category.section_id
--
-- Steps:
--   1. Ensure categories.section_id is NOT NULL
--   2. Create "General" category for each section that has essays without a category
--   3. Assign orphaned essays to their section's "General" category
--   4. Make essays.category_id NOT NULL
--   5. Add unique index on essays.slug
--   6. Drop essays.section column

BEGIN;

-- Step 1: Ensure every section in use has at least one category
-- Create "General" category for each section that has essays
INSERT INTO categories (name, slug, section_id, sort_order)
SELECT
  'General',
  s.slug || '-general',
  s.id,
  0
FROM sections s
WHERE s.id NOT IN (SELECT DISTINCT section_id FROM categories WHERE section_id IS NOT NULL)
  AND s.slug IN (SELECT DISTINCT section FROM essays)
ON CONFLICT DO NOTHING;

-- Also create "General" for sections that have essays with NULL category_id
INSERT INTO categories (name, slug, section_id, sort_order)
SELECT DISTINCT
  'General',
  s.slug || '-general',
  s.id,
  0
FROM essays e
JOIN sections s ON s.slug = e.section
WHERE e.category_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM categories c
    WHERE c.section_id = s.id AND c.slug = s.slug || '-general'
  )
ON CONFLICT DO NOTHING;

-- Step 2: Assign orphaned essays to their section's "General" category
UPDATE essays e
SET category_id = (
  SELECT c.id
  FROM categories c
  JOIN sections s ON s.id = c.section_id
  WHERE s.slug = e.section
    AND c.slug = s.slug || '-general'
  LIMIT 1
)
WHERE e.category_id IS NULL;

-- Step 3: For any remaining NULL category_id essays, create categories from phase
-- (e.g., green-transition essays with phase "where-we-are-now" get that category)
INSERT INTO categories (name, slug, section_id, sort_order)
SELECT DISTINCT
  INITCAP(REPLACE(e.phase, '-', ' ')),
  e.section || '-' || e.phase,
  s.id,
  1
FROM essays e
JOIN sections s ON s.slug = e.section
WHERE e.category_id IS NULL
  AND e.phase IS NOT NULL
  AND e.phase != ''
  AND NOT EXISTS (
    SELECT 1 FROM categories c
    WHERE c.section_id = s.id AND c.slug = e.section || '-' || e.phase
  )
ON CONFLICT DO NOTHING;

-- Assign phase-based essays to phase categories
UPDATE essays e
SET category_id = (
  SELECT c.id
  FROM categories c
  JOIN sections s ON s.id = c.section_id
  WHERE s.slug = e.section
    AND c.slug = e.section || '-' || e.phase
  LIMIT 1
)
WHERE e.category_id IS NULL
  AND e.phase IS NOT NULL
  AND e.phase != '';

-- Final fallback: any still-NULL essays get the first category in their section
UPDATE essays e
SET category_id = (
  SELECT c.id
  FROM categories c
  JOIN sections s ON s.id = c.section_id
  WHERE s.slug = e.section
  ORDER BY c.sort_order ASC
  LIMIT 1
)
WHERE e.category_id IS NULL;

-- Step 4: Make category_id NOT NULL
ALTER TABLE essays ALTER COLUMN category_id SET NOT NULL;

-- Step 5: Add unique index on slug
CREATE UNIQUE INDEX IF NOT EXISTS essays_slug_unique ON essays (slug);

-- Step 6: Ensure FK constraint exists with RESTRICT on delete
-- (Don't drop section column yet - keep for backward compat during transition)
-- The section column becomes denormalized cache, derived from category.section_id

-- Step 7: Ensure categories.section_id has proper NOT NULL constraint
-- First update any NULL section_id categories
DELETE FROM categories WHERE section_id IS NULL AND id NOT IN (SELECT category_id FROM essays);

-- Add constraint for future categories
ALTER TABLE categories ALTER COLUMN section_id SET NOT NULL;

-- Step 8: Add ON DELETE RESTRICT if not already present
-- (Supabase manages FKs, but let's ensure the constraint)
ALTER TABLE essays DROP CONSTRAINT IF EXISTS essays_category_id_fkey;
ALTER TABLE essays ADD CONSTRAINT essays_category_id_fkey
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT;

ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_section_id_fkey;
ALTER TABLE categories ADD CONSTRAINT categories_section_id_fkey
  FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE;

COMMIT;
