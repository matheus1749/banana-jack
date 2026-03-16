import type { FastifyInstance } from 'fastify';
import { pool } from '../lib/db.js';
import { getTenantId } from '../lib/http.js';

function pct(current: number, previous: number) {
  if (!previous) return current ? 100 : 0;
  return Number((((current - previous) / previous) * 100).toFixed(2));
}

export async function dashboardRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  app.get('/kpis', async (request) => {
    const tenantId = getTenantId(request);

    const current = await pool.query(
      `SELECT COALESCE(SUM(total_amount), 0) AS total
       FROM purchases
       WHERE tenant_id = $1
         AND date_trunc('month', purchase_date) = date_trunc('month', CURRENT_DATE)`,
      [tenantId],
    );

    const previous = await pool.query(
      `SELECT COALESCE(SUM(total_amount), 0) AS total
       FROM purchases
       WHERE tenant_id = $1
         AND date_trunc('month', purchase_date) = date_trunc('month', CURRENT_DATE - INTERVAL '1 month')`,
      [tenantId],
    );

    const topCategory = await pool.query(
      `SELECT c.name, SUM(p.total_amount) AS total
       FROM purchases p
       JOIN categories c ON c.id = p.category_id
       WHERE p.tenant_id = $1
         AND date_trunc('month', p.purchase_date) = date_trunc('month', CURRENT_DATE)
       GROUP BY c.name
       ORDER BY total DESC
       LIMIT 1`,
      [tenantId],
    );

    const topSupplier = await pool.query(
      `SELECT s.name, SUM(p.total_amount) AS total
       FROM purchases p
       JOIN suppliers s ON s.id = p.supplier_id
       WHERE p.tenant_id = $1
         AND date_trunc('month', p.purchase_date) = date_trunc('month', CURRENT_DATE)
       GROUP BY s.name
       ORDER BY total DESC
       LIMIT 1`,
      [tenantId],
    );

    const currentTotal = Number(current.rows[0].total);
    const previousTotal = Number(previous.rows[0].total);

    return {
      currentMonthTotal: currentTotal,
      previousMonthTotal: previousTotal,
      variationPercent: pct(currentTotal, previousTotal),
      topCategory: topCategory.rows[0] ?? null,
      topSupplier: topSupplier.rows[0] ?? null,
    };
  });

  app.get('/evolution', async (request) => {
    const tenantId = getTenantId(request);
    const months = Number((request.query as { months?: string }).months ?? '12');

    const { rows } = await pool.query(
      `SELECT to_char(date_trunc('month', purchase_date), 'YYYY-MM') AS month,
              SUM(total_amount) AS total
       FROM purchases
       WHERE tenant_id = $1
         AND purchase_date >= date_trunc('month', CURRENT_DATE) - ($2::int - 1) * INTERVAL '1 month'
       GROUP BY date_trunc('month', purchase_date)
       ORDER BY date_trunc('month', purchase_date)`,
      [tenantId, months],
    );

    return rows;
  });

  app.get('/by-category', async (request) => {
    const tenantId = getTenantId(request);
    const { from, to } = request.query as { from?: string; to?: string };

    const { rows } = await pool.query(
      `SELECT c.name AS category, SUM(p.total_amount) AS total
       FROM purchases p
       JOIN categories c ON c.id = p.category_id
       WHERE p.tenant_id = $1
         AND ($2::date IS NULL OR p.purchase_date >= $2::date)
         AND ($3::date IS NULL OR p.purchase_date <= $3::date)
       GROUP BY c.name
       ORDER BY total DESC`,
      [tenantId, from ?? null, to ?? null],
    );

    return rows;
  });

  app.get('/by-supplier', async (request) => {
    const tenantId = getTenantId(request);
    const { from, to } = request.query as { from?: string; to?: string };

    const { rows } = await pool.query(
      `SELECT s.name AS supplier, SUM(p.total_amount) AS total
       FROM purchases p
       JOIN suppliers s ON s.id = p.supplier_id
       WHERE p.tenant_id = $1
         AND ($2::date IS NULL OR p.purchase_date >= $2::date)
         AND ($3::date IS NULL OR p.purchase_date <= $3::date)
       GROUP BY s.name
       ORDER BY total DESC`,
      [tenantId, from ?? null, to ?? null],
    );

    return rows;
  });
}
