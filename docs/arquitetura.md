# Arquitetura Técnica

## 1. Contexto
Aplicação web SaaS para controle de gastos de compras de restaurantes.

## 2. Multi-tenant
Estratégia: shared database, shared schema, isolamento lógico por `tenant_id`.

Regras:
- Toda tabela de domínio contém `tenant_id`.
- Todo endpoint filtra por `tenant_id` do usuário autenticado.
- Índices compostos iniciando por `tenant_id`.

## 3. Módulos
- Auth e Usuários
- Categorias
- Fornecedores
- Compras
- Itens de Compra
- Dashboard e Relatórios
- Alertas
- Exportação

## 4. Fluxo de cadastro de compra
1. Usuário registra compra simples com total.
2. Opcionalmente adiciona itens.
3. Se itens forem informados, total pode ser recalculado e sincronizado.
4. Dashboard e relatórios atualizam via consultas agregadas.

## 5. Regras de negócio principais
- Compra deve ter data, fornecedor, categoria, valor total, forma de pagamento.
- Itens são opcionais.
- Meta mensal por tenant para alertas de ultrapassagem.
- Alerta de aumento por categoria quando variação mensal > limiar configurável.

## 6. Indicadores (KPIs)
- Total mês atual
- Total mês anterior
- Variação percentual
- Top categoria por gasto
- Top fornecedor por gasto
- Evolução mensal

## 7. Segurança
- JWT access token curto + refresh token.
- Senha com hash Argon2 ou bcrypt.
- Auditoria mínima: created_at, updated_at, created_by.

## 8. Observabilidade
- Logs estruturados (request_id, tenant_id, user_id).
- Métricas de latência e erro por endpoint.
