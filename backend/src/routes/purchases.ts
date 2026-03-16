import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { pool, withTx } from '../lib/db.js';
import { getTenantId } from '../lib/http.js';
import { recalculateMonthlyAlerts } from '../lib/alerts.js';

const itemSchema = z.object({
  productName: z.string().min(1).max(160),
  quantity: z.number().positive(),
  unitPrice: z.number().min(0),
  categoryId: z.string().uuid().optional(),
});

const purchaseSchema = z.object({
  purchaseDate: z.string(),
  supplierId: z.string().uuid(),
  categoryId: z.string().uuid(),
  totalAmount: z.number().min(0),
  paymentMethod: z.string().min(2).max(30),
  notes: z.string().optional(),
  invoiceImageUrl: z.string().url().optional(),
  items: z.array(itemSchema).optional(),
});

export async function purchaseRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  app.get('/', async (request) => {
    const tenantId = getTenantId(request);
    const { from, to, categoryId, supplierId } = request.query as {
      from?: string;
      to?: string;
      categoryId?: string;
      supplierId?: string;
    };

    const values: any[] = [tenantId];
    const filters: string[] = ['p.tenant_id = $1'];

    if (from) {
      values.push(from);
      filters.push(`p.purchase_date >= $${values.length}`);
    }
    if (to) {
      values.push(to);
      filters.push(`p.purchase_date <= $${values.length}`);
    }
    if (categoryId) {
      values.push(categoryId);
      filters.push(`p.category_id = $${values.length}`);
    }
    if (supplierId) {
      values.push(supplierId);
      filters.push(`p.supplier_id = $${values.length}`);
    }

    const { rows } = await pool.query(
      `SELECT p.id, p.purchase_date, p.total_amount, p.payment_method, p.notes,
              s.name AS supplier_name, c.name AS category_name
       FROM purchases p
       JOIN suppliers s ON s.id = p.supplier_id
       JOIN categories c ON c.id = p.category_id
       WHERE ${filters.join(' AND ')}
       ORDER BY p.purchase_date DESC, p.created_at DESC`,
      values,
    );

    return rows;
  });

  app.get('/:id', async (request, reply) => {
    const tenantId = getTenantId(request);
    const { id } = request.params as { id: string };

    const purchaseResult = await pool.query(
      `SELECT id, purchase_date, supplier_id, category_id, total_amount, payment_method, notes, invoice_image_url
       FROM purchases
       WHERE tenant_id = $1 AND id = $2`,
      [tenantId, id],
    );

    const purchase = purchaseResult.rows[0];
    if (!purchase) {
      return reply.code(404).send({ message: 'Purchase not found' });
    }

    const itemsResult = await pool.query(
      `SELECT id, product_name, quantity, unit_price, line_total, category_id
       FROM purchase_items
       WHERE tenant_id = $1 AND purchase_id = $2
       ORDER BY created_at ASC`,
      [tenantId, id],
    );

    return { ...purchase, items: itemsResult.rows };
  });

  app.post('/', async (request, reply) => {
    const tenantId = getTenantId(request);
    const parsed = purchaseSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: 'Invalid payload', errors: parsed.error.issues });
    }

    const data = parsed.data;

    const created = await withTx(async (client) => {
      let totalAmount = data.totalAmount;
      if (data.items?.length) {
        totalAmount = data.items.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0);
      }

      const purchaseResult = await client.query(
        `INSERT INTO purchases
         (tenant_id, supplier_id, category_id, purchase_date, total_amount, payment_method, notes, invoice_image_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, purchase_date, total_amount, payment_method, notes, invoice_image_url`,
        [
          tenantId,
          data.supplierId,
          data.categoryId,
          data.purchaseDate,
          totalAmount,
          data.paymentMethod,
          data.notes ?? null,
          data.invoiceImageUrl ?? null,
        ],
      );

      const purchase = purchaseResult.rows[0];

      if (data.items?.length) {
        for (const item of data.items) {
          await client.query(
            `INSERT INTO purchase_items (tenant_id, purchase_id, product_name, quantity, unit_price, category_id)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [tenantId, purchase.id, item.productName, item.quantity, item.unitPrice, item.categoryId ?? null],
          );
        }
      }

      return purchase;
    });

    await recalculateMonthlyAlerts({ tenantId });

    return reply.code(201).send(created);
  });

  app.put('/:id', async (request, reply) => {
    const tenantId = getTenantId(request);
    const { id } = request.params as { id: string };

    const updateSchema = purchaseSchema.partial();
    const parsed = updateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: 'Invalid payload', errors: parsed.error.issues });
    }

    const data = parsed.data;
    const fields: string[] = [];
    const values: any[] = [];

    function add(col: string, val: any) {
      values.push(val);
      fields.push(`${col} = $${values.length}`);
    }

    if (data.purchaseDate !== undefined) add('purchase_date', data.purchaseDate);
    if (data.supplierId !== undefined) add('supplier_id', data.supplierId);
    if (data.categoryId !== undefined) add('category_id', data.categoryId);
    if (data.totalAmount !== undefined) add('total_amount', data.totalAmount);
    if (data.paymentMethod !== undefined) add('payment_method', data.paymentMethod);
    if (data.notes !== undefined) add('notes', data.notes);
    if (data.invoiceImageUrl !== undefined) add('invoice_image_url', data.invoiceImageUrl);

    if (!fields.length) {
      return reply.code(400).send({ message: 'No fields to update' });
    }

    add('updated_at', new Date());
    values.push(tenantId, id);

    const { rows } = await pool.query(
      `UPDATE purchases SET ${fields.join(', ')} WHERE tenant_id = $${values.length - 1} AND id = $${values.length} RETURNING *`,
      values,
    );

    if (!rows[0]) {
      return reply.code(404).send({ message: 'Purchase not found' });
    }

    return rows[0];
  });

  app.delete('/:id', async (request, reply) => {
    const tenantId = getTenantId(request);
    const { id } = request.params as { id: string };
    const result = await pool.query('DELETE FROM purchases WHERE tenant_id = $1 AND id = $2', [tenantId, id]);
    if (!result.rowCount) {
      return reply.code(404).send({ message: 'Purchase not found' });
    }
    return reply.code(204).send();
  });
}
