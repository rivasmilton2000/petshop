CREATE TABLE catalog_categories (
  id text PRIMARY KEY,
  name text NOT NULL
);
INSERT INTO catalog_categories(id, name) VALUES
  ('pet-food', 'Alimentación'), ('eco-toys', 'Juguetes'), ('care-accessories', 'Cuidado y accesorios');

CREATE TABLE catalog_products (
  id varchar(100) PRIMARY KEY CHECK (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name varchar(120) NOT NULL CHECK (length(btrim(name)) BETWEEN 2 AND 120),
  category text NOT NULL REFERENCES catalog_categories(id) ON DELETE RESTRICT,
  animals text[] NOT NULL CHECK (cardinality(animals) > 0 AND animals <@ ARRAY['dogs','cats','birds','small-pets']::text[]),
  image text NOT NULL,
  description text NOT NULL CHECK (length(btrim(description)) BETWEEN 10 AND 2000),
  price numeric(12,2) CHECK (price >= 0),
  active boolean NOT NULL DEFAULT false,
  is_demo boolean NOT NULL DEFAULT true,
  position integer NOT NULL DEFAULT 0,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  updated_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX catalog_products_active_position_idx ON catalog_products(active, position);
CREATE TABLE catalog_variants (
  id uuid PRIMARY KEY,
  product_id varchar(100) NOT NULL REFERENCES catalog_products(id) ON DELETE CASCADE,
  name varchar(60) NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 60),
  image text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  UNIQUE(product_id, name)
);
