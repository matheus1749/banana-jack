import type { FastifyInstance } from 'fastify';
import PDFDocument from 'pdfkit';
import { pool } from '../lib/db.js';
import { getTenantId } from '../lib/http.js';

function csvEscape(value: unknown): string {
  const text = String(value ?? '');
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function buildCsv(rows: Array<Record<string, unknown>>): string {
  if (!rows.length) {
    return 'sem_dados\n';
  }

  const headers = Object.keys(rows[0]);
  const lines = [headers.join(',')];

  for (const row of rows) {
    lines.push(headers.map((header) => csvEscape(row[header])).join(','));
  }

  return lines.join('\n');
}

function buildPdfBuffer(title: string, rows: Array<Record<string, unknown>>): Promise<Buffer> {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ margin: 40 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    doc.on('end', () => resolve(Buffer.concat(chunks)));

    doc.fontSize(16).text(title);
    doc.moveDown();
    doc.fontSize(10).text(`Gerado em: ${new Date().toISOString()}`);
    doc.moveDown();

    if (!rows.length) {
      doc.text('Sem dados para o período selecionado.');
    } else {
      for (const row of rows) {
        doc.text(Object.entries(row).map(([k, v]) => `${k}: ${v ?? ''}`).join(' | '));
      }
    }

    doc.end();
  });
}

export async function exportRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  app.get('/purchases.csv', async (request, reply) => {
    const tenantId = getTenantId(request);
    const { from, to } = request.query as { from?: string; to?: string };

    const { rows } = await pool.query(
      `SELECT p.purchase_date AS data,
              s.name AS fornecedor,
              c.name AS categoria,
              p.payment_method AS forma_pagamento,
              p.total_amount AS valor_total,
              p.notes AS observacoes
       FROM purchases p
       JOIN suppliers s ON s.id = p.supplier_id
       JOIN categories c ON c.id = p.category_id
       WHERE p.tenant_id = $1
         AND ($2::date IS NULL OR p.purchase_date >= $2::date)
         AND ($3::date IS NULL OR p.purchase_date <= $3::date)
       ORDER BY p.purchase_date DESC`,
      [tenantId, from ?? null, to ?? null],
    );

    const csv = buildCsv(rows);
    reply.header('Content-Type', 'text/csv; charset=utf-8');
    reply.header('Content-Disposition', 'attachment; filename="compras.csv"');
    return reply.send(csv);
  });

  app.get('/reports.pdf', async (request, reply) => {
    const tenantId = getTenantId(request);
    const { type = 'category', from, to } = request.query as {
      type?: 'category' | 'supplier';
      from?: string;
      to?: string;
    };

    const query =
      type === 'supplier'
        ? `SELECT s.name AS fornecedor, SUM(p.total_amount) AS total
           FROM purchases p
           JOIN suppliers s ON s.id = p.supplier_id
           WHERE p.tenant_id = $1
             AND ($2::date IS NULL OR p.purchase_date >= $2::date)
             AND ($3::date IS NULL OR p.purchase_date <= $3::date)
           GROUP BY s.name
           ORDER BY total DESC`
        : `SELECT c.name AS categoria, SUM(p.total_amount) AS total
           FROM purchases p
           JOIN categories c ON c.id = p.category_id
           WHERE p.tenant_id = $1
             AND ($2::date IS NULL OR p.purchase_date >= $2::date)
             AND ($3::date IS NULL OR p.purchase_date <= $3::date)
           GROUP BY c.name
           ORDER BY total DESC`;

    const { rows } = await pool.query(query, [tenantId, from ?? null, to ?? null]);

    const title = type === 'supplier' ? 'Relatorio por Fornecedor' : 'Relatorio por Categoria';
    const pdf = await buildPdfBuffer(title, rows);

    reply.header('Content-Type', 'application/pdf');
    reply.header('Content-Disposition', `attachment; filename="${type}-report.pdf"`);
    return reply.send(pdf);
  });
}
