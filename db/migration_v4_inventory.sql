-- Migration v4: Inventory System Upgrades
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS weight_grams INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS search_tags JSONB DEFAULT '[]';

-- Rename 'image' to 'images' and convert to JSONB
-- Note: This is a safe migration that preserves existing single image strings by wrapping them in an array
ALTER TABLE products RENAME COLUMN image TO images_old;
ALTER TABLE products ADD COLUMN images JSONB DEFAULT '[]';

-- Migrate existing images to the new format
UPDATE products SET images = json_build_array(images_old) WHERE images_old IS NOT NULL;
ALTER TABLE products DROP COLUMN images_old;

-- Ensure vector column exists for the OpenAI embeddings
ALTER TABLE products ADD COLUMN IF NOT EXISTS vector TEXT;
