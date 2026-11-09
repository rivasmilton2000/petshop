CREATE TABLE roles (
  name text PRIMARY KEY CHECK (name IN ('usuario', 'administrador')),
  label text NOT NULL
);
INSERT INTO roles (name, label) VALUES ('usuario', 'Usuario'), ('administrador', 'Administrador');

CREATE TABLE users (
  id uuid PRIMARY KEY,
  email varchar(254) NOT NULL UNIQUE CHECK (email = lower(btrim(email))),
  name varchar(80) NOT NULL CHECK (length(btrim(name)) BETWEEN 2 AND 80),
  password_hash text,
  role text NOT NULL DEFAULT 'usuario' REFERENCES roles(name) ON UPDATE RESTRICT ON DELETE RESTRICT,
  email_verified boolean NOT NULL DEFAULT false,
  seed_key text UNIQUE CHECK (seed_key IN ('usuario', 'administrador')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sessions (
  token_hash char(64) PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL CHECK (expires_at > created_at)
);
CREATE INDEX sessions_user_id_idx ON sessions(user_id);
CREATE INDEX sessions_expires_at_idx ON sessions(expires_at);

CREATE TABLE oauth_accounts (
  provider text NOT NULL CHECK (provider = 'google'),
  subject text NOT NULL CHECK (length(subject) BETWEEN 1 AND 255),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (provider, subject),
  UNIQUE (provider, user_id)
);

CREATE TABLE oauth_flows (
  state_hash char(64) PRIMARY KEY,
  browser_hash char(64) NOT NULL,
  nonce text NOT NULL,
  code_verifier text NOT NULL,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX oauth_flows_expiry_idx ON oauth_flows(expires_at);

CREATE TABLE auth_rate_limits (
  key_hash char(64) PRIMARY KEY,
  attempts integer NOT NULL CHECK (attempts > 0),
  expires_at timestamptz NOT NULL
);
