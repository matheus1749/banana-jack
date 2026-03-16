-- Seed inicial para ambiente de desenvolvimento
-- Senha do admin: admin123 (formato de dev: plain:admin123)

INSERT INTO tenants (id, name)
VALUES ('11111111-1111-1111-1111-111111111111', 'Restaurante Demo')
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (id, tenant_id, name, email, password_hash, role)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'Admin',
  'admin@restaurante.com',
  'plain:admin123',
  'owner'
)
ON CONFLICT (tenant_id, email) DO NOTHING;

INSERT INTO categories (tenant_id, name, is_default)
VALUES
('11111111-1111-1111-1111-111111111111', 'Carnes', true),
('11111111-1111-1111-1111-111111111111', 'Bebidas', true),
('11111111-1111-1111-1111-111111111111', 'Hortifruti', true),
('11111111-1111-1111-1111-111111111111', 'Limpeza', true),
('11111111-1111-1111-1111-111111111111', 'Gás', true),
('11111111-1111-1111-1111-111111111111', 'Descartáveis', true),
('11111111-1111-1111-1111-111111111111', 'Outros', true)
ON CONFLICT (tenant_id, name) DO NOTHING;

INSERT INTO suppliers (tenant_id, name, document)
VALUES ('11111111-1111-1111-1111-111111111111', 'Fornecedor Exemplo', NULL)
ON CONFLICT (tenant_id, name) DO NOTHING;
