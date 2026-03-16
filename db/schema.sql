-- Schema inicial do Sistema de Controle de Compras e Gastos
-- Banco alvo: PostgreSQL 14+

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(120) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name VARCHAR(120) NOT NULL,
  email VARCHAR(180) NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'owner',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, email)
);

CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name VARCHAR(80) NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, name)
);

CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name VARCHAR(140) NOT NULL,
  document VARCHAR(30),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, name)
);

CREATE TABLE IF NOT EXISTS purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  category_id UUID NOT NULL REFERENCES categories(id),
  purchase_date DATE NOT NULL,
  total_amount NUMERIC(12,2) NOT NULL CHECK (total_amount >= 0),
  payment_method VARCHAR(30) NOT NULL,
  notes TEXT,
  invoice_image_url TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  purchase_id UUID NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  product_name VARCHAR(160) NOT NULL,
  quantity NUMERIC(12,3) NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
  category_id UUID REFERENCES categories(id),
  line_total NUMERIC(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS monthly_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  month_ref DATE NOT NULL,
  goal_amount NUMERIC(12,2) NOT NULL CHECK (goal_amount >= 0),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, month_ref)
);

CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  alert_type VARCHAR(40) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  title VARCHAR(160) NOT NULL,
  description TEXT NOT NULL,
  reference_month DATE,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_purchases_tenant_date ON purchases (tenant_id, purchase_date);
CREATE INDEX IF NOT EXISTS idx_purchases_tenant_supplier ON purchases (tenant_id, supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchases_tenant_category ON purchases (tenant_id, category_id);
CREATE INDEX IF NOT EXISTS idx_items_tenant_purchase ON purchase_items (tenant_id, purchase_id);
CREATE INDEX IF NOT EXISTS idx_alerts_tenant_month ON alerts (tenant_id, reference_month);
