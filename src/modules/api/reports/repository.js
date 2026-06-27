import { query } from '../../../config/db.js';

export const dailyTotals = async (tenantId, date) => {
  const totals = await query(
    `SELECT COUNT(*)::int AS count, COALESCE(SUM(total), 0) AS total
     FROM sales
     WHERE tenant_id = $1 AND status = 'COMPLETED'
       AND created_at >= $2::date AND created_at < $2::date + interval '1 day'`,
    [tenantId, date]
  );
  const byMethod = await query(
    `SELECT payment_method, COUNT(*)::int AS count, COALESCE(SUM(total), 0) AS total
     FROM sales
     WHERE tenant_id = $1 AND status = 'COMPLETED'
       AND created_at >= $2::date AND created_at < $2::date + interval '1 day'
     GROUP BY payment_method ORDER BY payment_method`,
    [tenantId, date]
  );
  return { totals: totals.rows[0], byMethod: byMethod.rows };
};

export const monthlyTotals = async (tenantId, month) => {
  const totals = await query(
    `SELECT COUNT(*)::int AS count, COALESCE(SUM(total), 0) AS total
     FROM sales
     WHERE tenant_id = $1 AND status = 'COMPLETED'
       AND created_at >= to_date($2, 'YYYY-MM')
       AND created_at < to_date($2, 'YYYY-MM') + interval '1 month'`,
    [tenantId, month]
  );
  const byMethod = await query(
    `SELECT payment_method, COUNT(*)::int AS count, COALESCE(SUM(total), 0) AS total
     FROM sales
     WHERE tenant_id = $1 AND status = 'COMPLETED'
       AND created_at >= to_date($2, 'YYYY-MM')
       AND created_at < to_date($2, 'YYYY-MM') + interval '1 month'
     GROUP BY payment_method ORDER BY payment_method`,
    [tenantId, month]
  );
  return { totals: totals.rows[0], byMethod: byMethod.rows };
};

export const profit = async (tenantId, from, to) => {
  const { rows } = await query(
    `SELECT COALESCE(SUM(si.unit_price * si.quantity), 0) AS revenue,
            COALESCE(SUM(p.cost_price * si.quantity), 0) AS cost,
            COALESCE(SUM((si.unit_price - p.cost_price) * si.quantity), 0) AS profit
     FROM sale_items si
     JOIN sales s ON s.id = si.sale_id AND s.tenant_id = si.tenant_id
     JOIN products p ON p.id = si.product_id AND p.tenant_id = si.tenant_id
     WHERE si.tenant_id = $1 AND s.status = 'COMPLETED'
       AND s.created_at >= $2 AND s.created_at < $3`,
    [tenantId, from, to]
  );
  return rows[0];
};

export const fastMoving = async (tenantId) => {
  const { rows } = await query(
    `SELECT p.id, p.name, COALESCE(SUM(si.quantity), 0)::int AS units_sold
     FROM products p
     LEFT JOIN sale_items si ON si.product_id = p.id AND si.tenant_id = p.tenant_id
     LEFT JOIN sales s ON s.id = si.sale_id AND s.tenant_id = p.tenant_id AND s.status = 'COMPLETED'
     WHERE p.tenant_id = $1 AND p.is_active = true
     GROUP BY p.id ORDER BY units_sold DESC, p.name LIMIT 20`,
    [tenantId]
  );
  return rows;
};
