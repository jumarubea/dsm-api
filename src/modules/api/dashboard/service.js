import { serializeProduct } from '../../../serialisers/product.js';
import { listLowStock, listDeadStock } from '../inventory/repository.js';
import * as repo from './repository.js';

const PRIVILEGED = ['super_admin', 'shop_admin', 'manager'];

export const summary = async (tenantId, role) => {
  const [today, stock_value] = await Promise.all([
    repo.todaySales(tenantId),
    repo.stockValue(tenantId),
  ]);
  const result = {
    today_sales_count: today.count,
    today_sales_total: today.total,
    stock_value,
  };
  // Profit is cost-derived → privileged roles only.
  if (PRIVILEGED.includes(role)) {
    result.monthly_profit = await repo.monthlyProfit(tenantId);
  }
  return result;
};

export const chart = async (tenantId) => {
  const [daily, monthly] = await Promise.all([
    repo.dailySeries(tenantId),
    repo.monthlySeries(tenantId),
  ]);
  return { daily, monthly };
};

export const alerts = async (tenantId, role) => {
  const [low, dead] = await Promise.all([listLowStock(tenantId), listDeadStock(tenantId)]);
  return {
    low_stock: low.map((p) => serializeProduct(p, role)),
    dead_stock: dead,
  };
};

export const orders = (tenantId) => repo.openOrders(tenantId);

export const prices = async (tenantId, role) => {
  const products = await repo.productPrices(tenantId);
  return products.map((p) => serializeProduct(p, role));
};
