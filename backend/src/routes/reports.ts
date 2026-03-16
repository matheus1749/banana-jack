import type { FastifyInstance } from 'fastify';
import { pool } from '../lib/db.js';
import { getTenantId } from '../lib/http.js';

function parseDate(value?: string): Date | null {
  if (!value) return null;
  const d = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function toDateString(value: Date): string {
  const y = value.getUTCFullYear();
  const m = String(value.getUTCMonth() + 1).padStart(2, '0');
  const d = String(value.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function previousRange(from: string, to: string): { from: string; to: string } {
  const fromDate = parseDate(from);
  const toDate = parseDate(to);
  if (!fromDate || !toDate) {
    throw new Error('Invalid date range');
  }

  const diffMs = toDate.getTime() - fromDate.getTime();
  const lengthDays = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;

  const prevTo = new Date(fromDate);
  prevTo.setUTCDate(prevTo.getUTCDate() - 1);

  const prevFrom = new Date(prevTo);
  prevFrom.setUTCDate(prevFrom.getUTCDate() - (lengthDays - 1));

  return { from: toDateString(prevFrom), to: toDateString(prevTo) };
}

export async function reportRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  app.get('/category', async (request, reply) => {
    const tenantId = getTenantId(request);
    const { from, to, compare } = request.query as { from?: string; to?: string; compare?: string };

    if (!from || !to) {
      return reply.code(400).send({ message: 'from and to are required' });
    }

    const currentResult = await pool.query(
      `SELECT c.id,
              c.name AS category,
              SUM(p.total_amount) AS total
       FROM purchases p
       JOIN categories c ON c.id = p.category_id
       WHERE p.tenant_id = $1
         AND p.purchase_date BETWEEN $2::date AND $3::date
       GROUP BY c.id, c.name
       ORDER BY total DESC`,
      [tenantId, from, to],
    );

    const currentRows = currentResult.rows.map((row: any) => ({
      categoryId: row.id as string,
      category: row.category as string,
      total: Number(row.total),
    }));

    const totalAll = currentRows.reduce((sum: number, row: any) => sum + row.total, 0);

    if (compare !== 'true') {
      return currentRows.map((row: any) => ({
        ...row,
        percentTotal: totalAll ? Number(((row.total / totalAll) * 100).toFixed(2)) : 0,
      }));
    }

    const prev = previousRange(from, to);
    const prevResult = await pool.query(
      `SELECT category_id, SUM(total_amount) AS total
       FROM purchases
       WHERE tenant_id = $1
         AND purchase_date BETWEEN $2::date AND $3::date
       GROUP BY category_id`,
      [tenantId, prev.from, prev.to],
    );

    const prevMap = new Map<string, number>();
    for (const row of prevResult.rows) {
      prevMap.set(row.category_id as string, Number(row.total));
    }

    return currentRows.map((row: any) => {
      const previousTotal = prevMap.get(row.categoryId) ?? 0;
      const variationPercent = previousTotal
        ? Number((((row.total - previousTotal) / previousTotal) * 100).toFixed(2))
        : row.total
          ? 100
          : 0;

      return {
        category: row.category,
        total: row.total,
        percentTotal: totalAll ? Number(((row.total / totalAll) * 100).toFixed(2)) : 0,
        previousTotal,
        variationPercent,
      };
    });
  });

  app.get('/supplier', async (request, reply) => {
    const tenantId = getTenantId(request);
    const { from, to, compare } = request.query as { from?: string; to?: string; compare?: string };

    if (!from || !to) {
      return reply.code(400).send({ message: 'from and to are required' });
    }

    const currentResult = await pool.query(
      `SELECT s.id,
              s.name AS supplier,
              SUM(p.total_amount) AS total,
              COUNT(*) AS frequency
       FROM purchases p
       JOIN suppliers s ON s.id = p.supplier_id
       WHERE p.tenant_id = $1
         AND p.purchase_date BETWEEN $2::date AND $3::date
       GROUP BY s.id, s.name
       ORDER BY total DESC`,
      [tenantId, from, to],
    );

    const currentRows = currentResult.rows.map((row: any) => ({
      supplierId: row.id as string,
      supplier: row.supplier as string,
      total: Number(row.total),
      frequency: Number(row.frequency),
    }));

    if (compare !== 'true') {
      return currentRows;
    }

    const prev = previousRange(from, to);
    const prevResult = await pool.query(
      `SELECT supplier_id, SUM(total_amount) AS total
       FROM purchases
       WHERE tenant_id = $1
         AND purchase_date BETWEEN $2::date AND $3::date
       GROUP BY supplier_id`,
      [tenantId, prev.from, prev.to],
    );

    const prevMap = new Map<string, number>();
    for (const row of prevResult.rows) {
      prevMap.set(row.supplier_id as string, Number(row.total));
    }

    return currentRows.map((row: any) => {
      const previousTotal = prevMap.get(row.supplierId) ?? 0;
      const variationPercent = previousTotal
        ? Number((((row.total - previousTotal) / previousTotal) * 100).toFixed(2))
        : row.total
          ? 100
          : 0;

      return {
        supplier: row.supplier,
        total: row.total,
        frequency: row.frequency,
        previousTotal,
        variationPercent,
      };
    });
  });

  app.get('/period', async (request, reply) => {
    const tenantId = getTenantId(request);
    const { groupBy = 'day', from, to } = request.query as {
      groupBy?: 'day' | 'week' | 'month';
      from?: string;
      to?: string;
    };

    if (!from || !to) {
      return reply.code(400).send({ message: 'from and to are required' });
    }

    const allowed = new Set(['day', 'week', 'month']);
    if (!allowed.has(groupBy)) {
      return reply.code(400).send({ message: 'groupBy must be day, week, or month' });
    }

    const { rows } = await pool.query(
      `SELECT to_char(date_trunc($4, purchase_date),
                      CASE WHEN $4 = 'day' THEN 'YYYY-MM-DD'
                           WHEN $4 = 'week' THEN 'IYYY-"W"IW'
                           ELSE 'YYYY-MM' END) AS period,
              SUM(total_amount) AS total,
              COUNT(*) AS purchases
       FROM purchases
       WHERE tenant_id = $1
         AND purchase_date BETWEEN $2::date AND $3::date
       GROUP BY date_trunc($4, purchase_date)
       ORDER BY date_trunc($4, purchase_date)`,
      [tenantId, from, to, groupBy],
    );

    return rows.map((row: any) => ({
      period: row.period,
      total: Number(row.total),
      purchases: Number(row.purchases),
    }));
  });
}
