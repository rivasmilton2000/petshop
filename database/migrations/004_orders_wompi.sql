ALTER TABLE catalog_products ADD COLUMN reserved_stock integer NOT NULL DEFAULT 0;
ALTER TABLE catalog_products ADD CONSTRAINT catalog_products_reserved_check CHECK (reserved_stock >= 0 AND reserved_stock <= stock);
ALTER TABLE inventory_movements DROP CONSTRAINT inventory_movements_reason_check;
ALTER TABLE inventory_movements ADD CONSTRAINT inventory_movements_reason_check CHECK (reason IN ('created','edited','replenished','sold'));

CREATE TABLE shop_orders (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  idempotency_key uuid NOT NULL,
  fingerprint char(64) NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','failed','expired','paid_review')),
  stock_state text NOT NULL DEFAULT 'reserved' CHECK (stock_state IN ('reserved','released','consumed')),
  fulfillment text NOT NULL CHECK (fulfillment IN ('delivery','pickup')),
  recipient_name varchar(80) NOT NULL,
  email varchar(254) NOT NULL,
  phone varchar(25) NOT NULL DEFAULT '',
  address jsonb,
  pickup_instructions text,
  subtotal_cents bigint NOT NULL CHECK (subtotal_cents >= 0),
  shipping_cents bigint NOT NULL CHECK (shipping_cents >= 0),
  total_cents bigint NOT NULL CHECK (total_cents > 0 AND total_cents=subtotal_cents+shipping_cents),
  currency char(3) NOT NULL DEFAULT 'USD' CHECK (currency='USD'),
  payment_mode text NOT NULL CHECK (payment_mode IN ('test','live')),
  payment_initialization text NOT NULL DEFAULT 'not_started' CHECK (payment_initialization IN ('not_started','creating','ready','uncertain','failed')),
  payment_link_id integer UNIQUE,
  payment_url text,
  payment_transaction_id varchar(100) UNIQUE,
  payment_issue text,
  expires_at timestamptz NOT NULL,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id,idempotency_key),
  CHECK ((fulfillment='delivery' AND address IS NOT NULL) OR (fulfillment='pickup' AND address IS NULL)),
  CHECK (status NOT IN ('paid','paid_review') OR paid_at IS NOT NULL),
  CHECK (status <> 'paid' OR stock_state='consumed')
);
CREATE INDEX shop_orders_pending_expiry_idx ON shop_orders(expires_at) WHERE status='pending';
CREATE INDEX shop_orders_user_idx ON shop_orders(user_id,created_at DESC);

CREATE TABLE shop_order_items (
  order_id uuid NOT NULL REFERENCES shop_orders(id) ON DELETE RESTRICT,
  product_id varchar(100) NOT NULL REFERENCES catalog_products(id) ON DELETE RESTRICT,
  color varchar(60) NOT NULL DEFAULT '',
  name varchar(120) NOT NULL,
  image text NOT NULL,
  quantity integer NOT NULL CHECK (quantity BETWEEN 1 AND 99),
  unit_price_cents bigint NOT NULL CHECK (unit_price_cents >= 0),
  PRIMARY KEY(order_id,product_id,color)
);

CREATE TABLE shop_payment_events (
  transaction_id varchar(100) PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES shop_orders(id) ON DELETE RESTRICT,
  approved boolean NOT NULL,
  real_payment boolean NOT NULL,
  amount_cents bigint NOT NULL CHECK (amount_cents > 0),
  currency char(3) NOT NULL CHECK (currency='USD'),
  received_at timestamptz NOT NULL DEFAULT now()
);
