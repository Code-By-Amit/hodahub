-- Apply before deploying code that reads brands.sort_order. Zero means unranked.
ALTER TABLE brands ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS brands_sort_order_idx ON brands (sort_order, name);
