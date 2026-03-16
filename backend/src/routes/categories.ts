import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { pool } from '../lib/db.js';
import { getTenantId } from '../lib/http.js';

const categorySchema = z.object({ name: z.string().min(2).max(80) });

export async function categoryRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  app.get('/', async (request) => {
    const tenantId = getTenantId(request);
    const { rows } = await pool.query(
      'SELECT id, name, is_default, created_at, updated_at FROM categories WHERE tenant_id = $1 ORDER BY name',
      [tenantId],
    );
    return rows;
  });

  app.post('/', async (request, reply) => {
    const tenantId = getTenantId(request);
    const parsed = categorySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: 'Invalid payload', errors: parsed.error.issues });
    }

    const { rows } = await pool.query(
      'INSERT INTO categories (tenant_id, name) VALUES ($1, $2) RETURNING id, name, is_default, created_at, updated_at',
      [tenantId, parsed.data.name],
    );

    return reply.code(201).send(rows[0]);
  });

  app.put('/:id', async (request, reply) => {
    const tenantId = getTenantId(request);
    const { id } = request.params as { id: string };
    const parsed = categorySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: 'Invalid payload', errors: parsed.error.issues });
    }

    const { rows } = await pool.query(
      'UPDATE categories SET name = $1, updated_at = NOW() WHERE tenant_id = $2 AND id = $3 RETURNING id, name, is_default, created_at, updated_at',
      [parsed.data.name, tenantId, id],
    );

    if (!rows[0]) {
      return reply.code(404).send({ message: 'Category not found' });
    }

    return rows[0];
  });

  app.delete('/:id', async (request, reply) => {
    const tenantId = getTenantId(request);
    const { id } = request.params as { id: string };
    const result = await pool.query('DELETE FROM categories WHERE tenant_id = $1 AND id = $2', [tenantId, id]);
    if (!result.rowCount) {
      return reply.code(404).send({ message: 'Category not found' });
    }
    return reply.code(204).send();
  });
}
