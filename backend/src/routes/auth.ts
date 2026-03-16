import type { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { pool, withTx } from '../lib/db.js';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  tenantId: z.string().uuid(),
});

const firstAccessSchema = z.object({
  restaurantName: z.string().min(2).max(120),
  userName: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(6),
});

export async function authRoutes(app: FastifyInstance) {
  app.post('/login', async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: 'Invalid payload', errors: parsed.error.issues });
    }

    const { email, password, tenantId } = parsed.data;
    const result = await pool.query(
      `SELECT id, tenant_id, email, name, password_hash
       FROM users
       WHERE tenant_id = $1 AND email = $2`,
      [tenantId, email],
    );

    const user = result.rows[0];
    if (!user) {
      return reply.code(401).send({ message: 'Invalid credentials' });
    }

    const valid = user.password_hash.startsWith('plain:')
      ? password === user.password_hash.slice(6)
      : await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return reply.code(401).send({ message: 'Invalid credentials' });
    }

    const token = await reply.jwtSign({
      sub: user.id,
      tenantId: user.tenant_id,
      email: user.email,
      name: user.name,
    });

    return { token };
  });

  app.post('/register-first-access', async (request, reply) => {
    const parsed = firstAccessSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: 'Invalid payload', errors: parsed.error.issues });
    }

    const { restaurantName, userName, email, password } = parsed.data;
    const passwordHash = await bcrypt.hash(password, 10);

    const created = await withTx(async (client) => {
      const tenantId = randomUUID();
      const userId = randomUUID();

      const tenantResult = await client.query(
        `INSERT INTO tenants (id, name)
         VALUES ($1, $2)
         RETURNING id, name`,
        [tenantId, restaurantName],
      );

      const tenant = tenantResult.rows[0];

      const userResult = await client.query(
        `INSERT INTO users (id, tenant_id, name, email, password_hash, role)
         VALUES ($1, $2, $3, $4, $5, 'owner')
         RETURNING id, tenant_id, email, name`,
        [userId, tenant.id, userName, email, passwordHash],
      );

      const user = userResult.rows[0];
      const defaultCategories = ['Carnes', 'Bebidas', 'Hortifruti', 'Limpeza', 'Gas', 'Descartaveis', 'Outros'];

      for (const category of defaultCategories) {
        await client.query(
          `INSERT INTO categories (tenant_id, name, is_default)
           VALUES ($1, $2, TRUE)
           ON CONFLICT (tenant_id, name) DO NOTHING`,
          [tenant.id, category],
        );
      }

      return { tenant, user };
    });

    const token = await reply.jwtSign({
      sub: created.user.id,
      tenantId: created.user.tenant_id,
      email: created.user.email,
      name: created.user.name,
    });

    return reply.code(201).send({
      token,
      tenantId: created.tenant.id,
      tenantName: created.tenant.name,
      userName: created.user.name,
    });
  });

  app.post('/refresh', async (_, reply) => reply.code(501).send({ message: 'Not implemented in MVP skeleton' }));
  app.post('/logout', async (_, reply) => reply.send({ ok: true }));
}
