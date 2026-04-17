-- ══════════════════════════════════════════════════════════════
-- SDR COMERCIAL — Schema Supabase (PostgreSQL)
-- Multi-tenant com Row Level Security (RLS)
-- Data: 2026-04-12
-- ══════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────
-- 1. EXTENSÕES
-- ──────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";  -- para mapas/geolocalização

-- ──────────────────────────────────────────────────────
-- 2. ENUM TYPES
-- ──────────────────────────────────────────────────────
CREATE TYPE tier_type AS ENUM ('starter', 'pro', 'enterprise');
CREATE TYPE license_status AS ENUM ('trial', 'active', 'past_due', 'cancelled', 'expired');
CREATE TYPE user_role AS ENUM ('owner', 'admin', 'technician', 'viewer');
CREATE TYPE onu_status AS ENUM ('online', 'offline', 'degraded', 'unknown');
CREATE TYPE ticket_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');
CREATE TYPE ticket_priority AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE alert_severity AS ENUM ('info', 'warning', 'critical');
CREATE TYPE infra_type AS ENUM ('pole', 'cto', 'cable', 'splitter', 'olt');
CREATE TYPE erp_type AS ENUM ('mk_solutions', 'ixc_soft', 'hubsoft', 'other');
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');

-- ──────────────────────────────────────────────────────
-- 3. TABELA: TENANTS (Provedores)
-- ──────────────────────────────────────────────────────
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  cnpj TEXT UNIQUE,
  email TEXT NOT NULL,
  phone TEXT,
  tier tier_type NOT NULL DEFAULT 'starter',
  license_status license_status NOT NULL DEFAULT 'trial',
  trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
  subscription_id TEXT,  -- ID assinatura Mercado Pago
  max_clients INT NOT NULL DEFAULT 200,  -- limite por tier
  max_olts INT NOT NULL DEFAULT 1,       -- limite por tier
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────
-- 4. TABELA: USERS (Usuários de cada provedor)
-- ──────────────────────────────────────────────────────
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'viewer',
  avatar_url TEXT,
  phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_tenant ON users(tenant_id);

-- ──────────────────────────────────────────────────────
-- 5. TABELA: ERP_CONNECTIONS (Conexões com ERPs)
-- ──────────────────────────────────────────────────────
CREATE TABLE erp_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  erp_type erp_type NOT NULL,
  api_url TEXT NOT NULL,
  api_token TEXT,  -- criptografado
  api_user TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_sync_at TIMESTAMPTZ,
  sync_interval_min INT NOT NULL DEFAULT 15,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_erp_tenant ON erp_connections(tenant_id);

-- ──────────────────────────────────────────────────────
-- 6. TABELA: OLT_CONNECTIONS (OLTs cadastradas)
-- ──────────────────────────────────────────────────────
CREATE TABLE olt_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  model TEXT,              -- ex: "Fiberhome AN5516-04"
  ip_address TEXT NOT NULL,
  snmp_community TEXT DEFAULT 'public',
  snmp_version TEXT DEFAULT 'v2c',
  location GEOGRAPHY(POINT, 4326),  -- PostGIS
  total_pon_ports INT,
  used_pon_ports INT DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_poll_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_olt_tenant ON olt_connections(tenant_id);

-- ──────────────────────────────────────────────────────
-- 7. TABELA: INFRASTRUCTURE (Infra no mapa)
-- ──────────────────────────────────────────────────────
CREATE TABLE infrastructure (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type infra_type NOT NULL,
  name TEXT,
  code TEXT,                          -- código do poste, CTO, etc
  location GEOGRAPHY(POINT, 4326),   -- ponto no mapa
  route GEOGRAPHY(LINESTRING, 4326), -- rota de cabo (polyline)
  properties JSONB DEFAULT '{}',     -- dados flexíveis por tipo
  -- Para CTOs/Splitters:
  total_ports INT,
  used_ports INT DEFAULT 0,
  -- Para Postes:
  concessionaria TEXT,
  -- Para Cabos:
  length_meters FLOAT,
  fiber_count INT,
  -- Metadados:
  photo_url TEXT,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_infra_tenant ON infrastructure(tenant_id);
CREATE INDEX idx_infra_type ON infrastructure(type);
CREATE INDEX idx_infra_location ON infrastructure USING GIST(location);

-- ──────────────────────────────────────────────────────
-- 8. TABELA: CLIENTS (Clientes do provedor)
-- ──────────────────────────────────────────────────────
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  erp_client_id TEXT,              -- ID no ERP (MK/IXC/HubSoft)
  name TEXT NOT NULL,
  cpf_cnpj TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  location GEOGRAPHY(POINT, 4326), -- ponto no mapa
  -- Plano:
  plan_name TEXT,
  plan_speed_down INT,             -- Mbps
  plan_speed_up INT,               -- Mbps
  plan_price DECIMAL(10,2),
  -- Financeiro:
  financial_status TEXT DEFAULT 'adimplente', -- adimplente/inadimplente
  last_payment_at TIMESTAMPTZ,
  next_due_at TIMESTAMPTZ,
  -- Vínculo infra:
  pole_id UUID REFERENCES infrastructure(id),
  cto_id UUID REFERENCES infrastructure(id),
  cto_port INT,
  olt_id UUID REFERENCES olt_connections(id),
  -- Metadados:
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  erp_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_clients_tenant ON clients(tenant_id);
CREATE INDEX idx_clients_location ON clients USING GIST(location);
CREATE INDEX idx_clients_name ON clients(tenant_id, name);
CREATE INDEX idx_clients_erp ON clients(tenant_id, erp_client_id);

-- ──────────────────────────────────────────────────────
-- 9. TABELA: ONUS (ONUs vinculadas a clientes)
-- ──────────────────────────────────────────────────────
CREATE TABLE onus (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  olt_id UUID REFERENCES olt_connections(id),
  serial_number TEXT NOT NULL,
  model TEXT,
  status onu_status NOT NULL DEFAULT 'unknown',
  rx_power FLOAT,          -- dBm (sinal recebido)
  tx_power FLOAT,          -- dBm (sinal transmitido)
  uptime_seconds BIGINT,
  ip_address TEXT,
  pon_port TEXT,            -- ex: "0/1/3"
  last_online_at TIMESTAMPTZ,
  last_offline_at TIMESTAMPTZ,
  last_poll_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_onus_tenant ON onus(tenant_id);
CREATE INDEX idx_onus_client ON onus(client_id);
CREATE INDEX idx_onus_serial ON onus(tenant_id, serial_number);
CREATE INDEX idx_onus_status ON onus(tenant_id, status);

-- ──────────────────────────────────────────────────────
-- 10. TABELA: ONU_HISTORY (Histórico de sinal/status)
-- ──────────────────────────────────────────────────────
CREATE TABLE onu_history (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  onu_id UUID NOT NULL REFERENCES onus(id) ON DELETE CASCADE,
  status onu_status NOT NULL,
  rx_power FLOAT,
  tx_power FLOAT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_onu_hist_onu ON onu_history(onu_id, recorded_at DESC);
CREATE INDEX idx_onu_hist_tenant ON onu_history(tenant_id, recorded_at DESC);

-- ──────────────────────────────────────────────────────
-- 11. TABELA: TICKETS (Ordens de Serviço)
-- ──────────────────────────────────────────────────────
CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id),
  onu_id UUID REFERENCES onus(id),
  title TEXT NOT NULL,
  description TEXT,
  status ticket_status NOT NULL DEFAULT 'open',
  priority ticket_priority NOT NULL DEFAULT 'medium',
  assigned_to UUID REFERENCES users(id),
  location GEOGRAPHY(POINT, 4326),
  -- Resolução:
  resolution_notes TEXT,
  resolution_photo_url TEXT,
  resolved_at TIMESTAMPTZ,
  -- Auto-gerado:
  auto_generated BOOLEAN NOT NULL DEFAULT FALSE,
  -- Metadados:
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tickets_tenant ON tickets(tenant_id);
CREATE INDEX idx_tickets_status ON tickets(tenant_id, status);
CREATE INDEX idx_tickets_client ON tickets(client_id);

-- ──────────────────────────────────────────────────────
-- 12. TABELA: ALERTS (Alertas inteligentes)
-- ──────────────────────────────────────────────────────
CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id),
  onu_id UUID REFERENCES onus(id),
  infra_id UUID REFERENCES infrastructure(id),
  severity alert_severity NOT NULL DEFAULT 'warning',
  title TEXT NOT NULL,
  message TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  acknowledged_by UUID REFERENCES users(id),
  acknowledged_at TIMESTAMPTZ,
  auto_resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alerts_tenant ON alerts(tenant_id, is_active);
CREATE INDEX idx_alerts_severity ON alerts(tenant_id, severity);

-- ──────────────────────────────────────────────────────
-- 13. TABELA: PAYMENTS (Pagamentos Mercado Pago)
-- ──────────────────────────────────────────────────────
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  mercadopago_id TEXT,
  amount DECIMAL(10,2) NOT NULL,
  status payment_status NOT NULL DEFAULT 'pending',
  method TEXT,            -- pix, boleto, cartão
  paid_at TIMESTAMPTZ,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_tenant ON payments(tenant_id);

-- ──────────────────────────────────────────────────────
-- 14. ROW LEVEL SECURITY (RLS)
-- ──────────────────────────────────────────────────────

-- Helper: pegar tenant_id do usuário autenticado
CREATE OR REPLACE FUNCTION get_user_tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM users WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Ativar RLS em todas as tabelas
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE olt_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE infrastructure ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE onus ENABLE ROW LEVEL SECURITY;
ALTER TABLE onu_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Policies: cada tenant só vê seus dados
CREATE POLICY "Tenant isolation" ON tenants
  FOR ALL USING (id = get_user_tenant_id());

CREATE POLICY "Tenant isolation" ON users
  FOR ALL USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Tenant isolation" ON erp_connections
  FOR ALL USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Tenant isolation" ON olt_connections
  FOR ALL USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Tenant isolation" ON infrastructure
  FOR ALL USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Tenant isolation" ON clients
  FOR ALL USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Tenant isolation" ON onus
  FOR ALL USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Tenant isolation" ON onu_history
  FOR ALL USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Tenant isolation" ON tickets
  FOR ALL USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Tenant isolation" ON alerts
  FOR ALL USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Tenant isolation" ON payments
  FOR ALL USING (tenant_id = get_user_tenant_id());

-- ──────────────────────────────────────────────────────
-- 15. FUNCTIONS: Auto-update updated_at
-- ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tenants_updated BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_infra_updated BEFORE UPDATE ON infrastructure
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_clients_updated BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_onus_updated BEFORE UPDATE ON onus
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_tickets_updated BEFORE UPDATE ON tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ══════════════════════════════════════════════════════════════
-- FIM DO SCHEMA v1.0
-- ══════════════════════════════════════════════════════════════
