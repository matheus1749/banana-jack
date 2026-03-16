import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { pool } from '../lib/db.js';
import { getTenantId } from '../lib/http.js';
import { randomUUID } from 'node:crypto';

const goalSchema = z.object({
  monthRef: z.string().regex(/^\d{4}-\d{2}$/, 'Format YYYY-MM'),
  goalAmount: z.number().min(0),
});

export async function goalRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  app.get('/', async (request) => {
    const tenantId = getTenantId(request);
    const { rows } = await pool.query(
      `SELECT id, to_char(month_ref, 'YYYY-MM') AS month_ref, goal_amount, created_at
       FROM monthly_goals
       WHERE tenant_id = $1
       ORDER BY month_ref DESC`,
      [tenantId],
    );
    return rows;
  });

  app.post('/', async (request, reply) => {
    const tenantId = getTenantId(request);
    const parsed = goalSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: 'Invalid payload', errors: parsed.error.issues });
    }

    const { monthRef, goalAmount } = parsed.data;
    const monthDate = `${monthRef}-01`;

    const { rows } = await pool.query(
      `INSERT INTO monthly_goals (id, tenant_id, month_ref, goal_amount)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (tenant_id, month_ref)
       DO UPDATE SET goal_amount = EXCLUDED.goal_amount
       RETURNING id, to_char(month_ref, 'YYYY-MM') AS month_ref, goal_amount, created_at`,
      [randomUUID(), tenantId, monthDate, goalAmount],
    );

    return reply.code(201).send(rows[0]);
  });

  app.delete('/:id', async (request, reply) => {
    const tenantId = getTenantId(request);
    const { id } = request.params as { id: string };
    const result = await pool.query(
      'DELETE FROM monthly_goals WHERE tenant_id = $1 AND id = $2',
      [tenantId, id],
    );
    if (!result.rowCount) {
      return reply.code(404).send({ message: 'Goal not found' });
    }
    return reply.code(204).send();
  });
}
