import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { pool } from '../lib/db.js';
import { getTenantId } from '../lib/http.js';

const supplierSchema = z.object({
  name: z.string().min(2).max(140),
  document: z.string().max(30).optional().nullable(),
});

export async function supplierRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  app.get('/', async (request) => {
    const tenantId = getTenantId(request);
    const { rows } = await pool.query(
      'SELECT id, name, document, created_at, updated_at FROM suppliers WHERE tenant_id = $1 ORDER BY name',
      [tenantId],
    );
    return rows;
  });

  app.post('/', async (request, reply) => {
    const tenantId = getTenantId(request);
    const parsed = supplierSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: 'Invalid payload', errors: parsed.error.issues });
    }

    const { rows } = await pool.query(
      'INSERT INTO suppliers (tenant_id, name, document) VALUES ($1, $2, $3) RETURNING id, name, document, created_at, updated_at',
      [tenantId, parsed.data.name, parsed.data.document ?? null],
    );

    return reply.code(201).send(rows[0]);
  });

  app.put('/:id', async (request, reply) => {
    const tenantId = getTenantId(request);
    const { id } = request.params as { id: string };
    const parsed = supplierSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: 'Invalid payload', errors: parsed.error.issues });
    }

    const { rows } = await pool.query(
      'UPDATE suppliers SET name = $1, document = $2, updated_at = NOW() WHERE tenant_id = $3 AND id = $4 RETURNING id, name, document, created_at, updated_at',
      [parsed.data.name, parsed.data.document ?? null, tenantId, id],
    );

    if (!rows[0]) {
      return reply.code(404).send({ message: 'Supplier not found' });
    }

    return rows[0];
  });

  app.delete('/:id', async (request, reply) => {
    const tenantId = getTenantId(request);
    const { id } = request.params as { id: string };
    const result = await pool.query('DELETE FROM suppliers WHERE tenant_id = $1 AND id = $2', [tenantId, id]);
    if (!result.rowCount) {
      return reply.code(404).send({ message: 'Supplier not found' });
    }
    return reply.code(204).send();
  });
}
