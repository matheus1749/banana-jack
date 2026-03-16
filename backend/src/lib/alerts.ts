import { pool } from './db.js';

type RecalcOptions = {
  tenantId: string;
  monthRef?: string;
  variationThreshold?: number;
};

function monthStart(input?: string): string {
  if (input && /^\d{4}-\d{2}$/.test(input)) {
    return `${input}-01`;
  }

  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
}

export async function recalculateMonthlyAlerts(options: RecalcOptions): Promise<void> {
  const tenantId = options.tenantId;
  const targetMonth = monthStart(options.monthRef);
  const threshold = options.variationThreshold ?? 15;

  await pool.query(
    `DELETE FROM alerts
     WHERE tenant_id = $1
       AND reference_month = $2::date
       AND alert_type IN ('monthly_goal_exceeded', 'category_increase')`,
    [tenantId, targetMonth],
  );

  const totalResult = await pool.query(
    `SELECT COALESCE(SUM(total_amount), 0) AS total
     FROM purchases
     WHERE tenant_id = $1
       AND date_trunc('month', purchase_date) = $2::date`,
    [tenantId, targetMonth],
  );

  const goalResult = await pool.query(
    `SELECT goal_amount
     FROM monthly_goals
     WHERE tenant_id = $1 AND month_ref = $2::date
     LIMIT 1`,
    [tenantId, targetMonth],
  );

  const total = Number(totalResult.rows[0]?.total ?? 0);
  const goal = goalResult.rows[0] ? Number(goalResult.rows[0].goal_amount) : null;

  if (goal !== null && total > goal) {
    const exceedPercent = goal > 0 ? (((total - goal) / goal) * 100).toFixed(2) : '100.00';
    await pool.query(
      `INSERT INTO alerts (id, tenant_id, alert_type, severity, title, description, reference_month)
       VALUES (gen_random_uuid(), $1, 'monthly_goal_exceeded', 'high', $2, $3, $4::date)`,
      [
        tenantId,
        'Meta mensal ultrapassada',
        `Gasto mensal de R$ ${total.toFixed(2)} acima da meta (R$ ${goal.toFixed(2)}), excedendo ${exceedPercent}%.`,
        targetMonth,
      ],
    );
  }

  const categoryVariation = await pool.query(
    `WITH current_month AS (
       SELECT category_id, SUM(total_amount) AS total
       FROM purchases
       WHERE tenant_id = $1
         AND date_trunc('month', purchase_date) = $2::date
       GROUP BY category_id
     ),
     previous_month AS (
       SELECT category_id, SUM(total_amount) AS total
       FROM purchases
       WHERE tenant_id = $1
         AND date_trunc('month', purchase_date) = ($2::date - INTERVAL '1 month')
       GROUP BY category_id
     )
     SELECT c.name AS category_name,
            COALESCE(cm.total, 0) AS current_total,
            COALESCE(pm.total, 0) AS previous_total
     FROM categories c
     LEFT JOIN current_month cm ON cm.category_id = c.id
     LEFT JOIN previous_month pm ON pm.category_id = c.id
     WHERE c.tenant_id = $1`,
    [tenantId, targetMonth],
  );

  for (const row of categoryVariation.rows) {
    const currentTotal = Number(row.current_total);
    const previousTotal = Number(row.previous_total);
    if (previousTotal <= 0 || currentTotal <= previousTotal) {
      continue;
    }

    const variationPercent = ((currentTotal - previousTotal) / previousTotal) * 100;
    if (variationPercent < threshold) {
      continue;
    }

    const severity = variationPercent >= 30 ? 'high' : 'medium';
    await pool.query(
      `INSERT INTO alerts (id, tenant_id, alert_type, severity, title, description, reference_month)
       VALUES (gen_random_uuid(), $1, 'category_increase', $2, $3, $4, $5::date)`,
      [
        tenantId,
        severity,
        `Aumento em ${row.category_name}`,
        `Os gastos com ${row.category_name} aumentaram ${variationPercent.toFixed(2)}% em relação ao mês anterior.`,
        targetMonth,
      ],
    );
  }
}

