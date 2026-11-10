-- Preserve all catalog rows and prices. Unknown legacy inventory is not invented.
ALTER TABLE catalog_products
  ADD COLUMN stock integer NOT NULL DEFAULT 0 CHECK (stock BETWEEN 0 AND 1000000),
  ADD COLUMN archived_at timestamptz,
  ADD CONSTRAINT catalog_products_archived_inactive CHECK (archived_at IS NULL OR NOT active);
CREATE INDEX catalog_products_out_of_stock_idx ON catalog_products(id)
  WHERE active AND archived_at IS NULL AND stock = 0;

CREATE TABLE inventory_movements (
  id uuid PRIMARY KEY,
  product_id varchar(100) NOT NULL REFERENCES catalog_products(id) ON DELETE RESTRICT,
  previous_stock integer NOT NULL CHECK (previous_stock >= 0),
  new_stock integer NOT NULL CHECK (new_stock >= 0),
  changed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  reason text NOT NULL CHECK (reason IN ('created', 'edited', 'replenished')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX inventory_movements_product_idx ON inventory_movements(product_id, created_at);

-- Verified snapshots for the next checkout stage. These are NOT paid orders or reservations.
CREATE TABLE checkout_preparations (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  idempotency_key uuid NOT NULL,
  fingerprint char(64) NOT NULL,
  total_cents bigint NOT NULL CHECK (total_cents >= 0),
  currency char(3) NOT NULL DEFAULT 'USD' CHECK (currency = 'USD'),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '15 minutes',
  UNIQUE(user_id, idempotency_key)
);
CREATE TABLE checkout_preparation_items (
  preparation_id uuid NOT NULL REFERENCES checkout_preparations(id) ON DELETE CASCADE,
  product_id varchar(100) NOT NULL REFERENCES catalog_products(id) ON DELETE RESTRICT,
  color varchar(60) NOT NULL DEFAULT '',
  name varchar(120) NOT NULL,
  image text NOT NULL,
  quantity integer NOT NULL CHECK (quantity BETWEEN 1 AND 99),
  unit_price_cents bigint NOT NULL CHECK (unit_price_cents >= 0),
  PRIMARY KEY(preparation_id, product_id, color)
);
