import type { FastifyInstance } from 'fastify';
import { pool } from '../lib/db.js';
import { getTenantId } from '../lib/http.js';
import { recalculateMonthlyAlerts } from '../lib/alerts.js';

export async function alertRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  app.get('/', async (request) => {
    const tenantId = getTenantId(request);
    const { month, auto = 'true' } = request.query as { month?: string; auto?: string };

    if (auto !== 'false') {
      await recalculateMonthlyAlerts({ tenantId, monthRef: month });
    }

    const monthRef = month && /^\d{4}-\d{2}$/.test(month) ? `${month}-01` : null;

    const { rows } = await pool.query(
      `SELECT id, alert_type, severity, title, description, reference_month, is_read, created_at
       FROM alerts
       WHERE tenant_id = $1
         AND ($2::date IS NULL OR reference_month = $2::date)
       ORDER BY created_at DESC`,
      [tenantId, monthRef],
    );

    return rows;
  });

  app.post('/recalculate', async (request) => {
    const tenantId = getTenantId(request);
    const { month, threshold } = request.query as { month?: string; threshold?: string };

    await recalculateMonthlyAlerts({
      tenantId,
      monthRef: month,
      variationThreshold: threshold ? Number(threshold) : undefined,
    });

    return { ok: true };
  });

  app.post('/:id/read', async (request, reply) => {
    const tenantId = getTenantId(request);
    const { id } = request.params as { id: string };

    const result = await pool.query(
      `UPDATE alerts
       SET is_read = TRUE
       WHERE tenant_id = $1 AND id = $2`,
      [tenantId, id],
    );

    if (!result.rowCount) {
      return reply.code(404).send({ message: 'Alert not found' });
    }

    return { ok: true };
  });
}
