import { query } from '../../../config/db.js';

export const todaySales = async (tenantId) => {
  const { rows } = await query(
    `SELECT COUNT(*)::int AS count, COALESCE(SUM(total), 0) AS total
     FROM sales
     WHERE tenant_id = $1 AND status = 'COMPLETED'
       AND created_at >= date_trunc('day', now())`,
    [tenantId]
  );
  return rows[0];
};

export const stockValue = async (tenantId) => {
  const { rows } = await query(
    `SELECT COALESCE(SUM(stock_qty * retail_price), 0) AS stock_value
     FROM products WHERE tenant_id = $1 AND is_active = true`,
    [tenantId]
  );
  return rows[0].stock_value;
};

export const monthlyProfit = async (tenantId) => {
  const { rows } = await query(
    `SELECT COALESCE(SUM((si.unit_price - p.cost_price) * si.quantity), 0) AS profit
     FROM sale_items si
     JOIN sales s ON s.id = si.sale_id AND s.tenant_id = si.tenant_id
     JOIN products p ON p.id = si.product_id AND p.tenant_id = si.tenant_id
     WHERE si.tenant_id = $1 AND s.status = 'COMPLETED'
       AND s.created_at >= date_trunc('month', now())`,
    [tenantId]
  );
  return rows[0].profit;
};

export const dailySeries = async (tenantId) => {
  const { rows } = await query(
    `SELECT date_trunc('day', created_at)::date AS day, COALESCE(SUM(total), 0) AS total
     FROM sales
     WHERE tenant_id = $1 AND status = 'COMPLETED' AND created_at >= now() - interval '6 days'
     GROUP BY day ORDER BY day`,
    [tenantId]
  );
  return rows;
};

export const monthlySeries = async (tenantId) => {
  const { rows } = await query(
    `SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS month,
            COALESCE(SUM(total), 0) AS total
     FROM sales
     WHERE tenant_id = $1 AND status = 'COMPLETED' AND created_at >= now() - interval '5 months'
     GROUP BY month ORDER BY month`,
    [tenantId]
  );
  return rows;
};

export const openOrders = async (tenantId) => {
  const { rows } = await query(
    `SELECT id, status, customer_id, delivery_address, expected_delivery_at, total, created_at
     FROM sales
     WHERE tenant_id = $1 AND type = 'ORDER' AND status IN ('PENDING', 'PREPARED')
     ORDER BY created_at`,
    [tenantId]
  );
  return rows;
};

export const productPrices = async (tenantId) => {
  const { rows } = await query(
    `SELECT id, tenant_id, name, sku, category_id, unit_of_measure, retail_price,
            wholesale_price, cost_price, stock_qty, min_stock_level, dead_stock_days,
            is_active, created_at
     FROM products WHERE tenant_id = $1 AND is_active = true ORDER BY name`,
    [tenantId]
  );
  return rows;
};
