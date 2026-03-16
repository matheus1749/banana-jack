# Sistema de Controle de Compras e Gastos para Restaurantes

## Visão Geral
Sistema web interno focado em controle de despesas com compras para restaurantes, com análise por categoria, fornecedor e período.

## Stack
- Backend: Node.js, Fastify, TypeScript, PostgreSQL.
- Frontend: React, Vite, TypeScript, Recharts.

## Estrutura
- `backend/`: API REST.
- `frontend/`: interface web.
- `db/schema.sql`: criação do banco.
- `db/seed.sql`: dados iniciais de desenvolvimento.
- `docs/`: arquitetura, API e backlog.

## Rodando localmente

### 1) Banco PostgreSQL
1. Crie um banco `banana_jack`.
2. Execute:
   - `psql -d banana_jack -f db/schema.sql`
   - `psql -d banana_jack -f db/seed.sql`

### 2) Backend
1. Em `backend/`, copie `.env.example` para `.env` e ajuste se necessário.
2. Instale dependências: `npm install`.
3. Rode em dev: `npm run dev`.

API disponível em `http://localhost:3333/api/v1`.

### 3) Frontend
1. Em `frontend/`, copie `.env.example` para `.env`.
2. Instale dependências: `npm install`.
3. Rode em dev: `npm run dev`.

Interface em `http://localhost:5173`.

## Login de desenvolvimento
- `tenantId`: `11111111-1111-1111-1111-111111111111`
- `email`: `admin@restaurante.com`
- `senha`: `admin123`

## Módulos já preparados
- Auth (`/auth/login`)
- Categorias (`/categories`)
- Fornecedores (`/suppliers`)
- Compras (`/purchases`)
- Upload de nota fiscal (`/uploads/invoice`)
- Dashboard (`/dashboard/kpis`, `/dashboard/evolution`, `/dashboard/by-category`, `/dashboard/by-supplier`)
- Relatórios (`/reports/category`, `/reports/supplier`, `/reports/period`)
- Alertas (`/alerts`, `/alerts/recalculate`)
- Exportação (`/exports/purchases.csv`, `/exports/reports.pdf`)

## Próximas evoluções
- OCR de nota fiscal para leitura automática de itens.
- Fluxo de aprovação de compras e centro de custo.
- Indicadores de preço médio por item para detectar desvios.
