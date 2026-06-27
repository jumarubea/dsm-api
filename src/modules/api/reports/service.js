import { AppError } from '../../../utils/AppError.js';
import { listDeadStock } from '../inventory/repository.js';
import * as repo from './repository.js';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_RE = /^\d{4}-\d{2}$/;

const today = () => new Date().toISOString().slice(0, 10);
const thisMonth = () => new Date().toISOString().slice(0, 7);

export const daily = async (tenantId, date) => {
  const d = date || today();
  if (!DATE_RE.test(d))
    throw new AppError('Tarehe si sahihi (YYYY-MM-DD).', 422, 'VALIDATION_ERROR');
  const { totals, byMethod } = await repo.dailyTotals(tenantId, d);
  return { date: d, count: totals.count, total: totals.total, by_method: byMethod };
};

export const monthly = async (tenantId, month) => {
  const m = month || thisMonth();
  if (!MONTH_RE.test(m)) throw new AppError('Mwezi si sahihi (YYYY-MM).', 422, 'VALIDATION_ERROR');
  const { totals, byMethod } = await repo.monthlyTotals(tenantId, m);
  return { month: m, count: totals.count, total: totals.total, by_method: byMethod };
};

export const profit = async (tenantId, { from, to } = {}) => {
  if (from && !DATE_RE.test(from)) throw new AppError('Tarehe si sahihi.', 422, 'VALIDATION_ERROR');
  if (to && !DATE_RE.test(to)) throw new AppError('Tarehe si sahihi.', 422, 'VALIDATION_ERROR');
  // Default: month-to-date.
  const fromTs = from || thisMonth() + '-01';
  // `to` is exclusive; default to tomorrow so today is included.
  const toTs = to || new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const row = await repo.profit(tenantId, fromTs, toTs);
  return { from: fromTs, to: toTs, revenue: row.revenue, cost: row.cost, profit: row.profit };
};

export const fastMoving = (tenantId) => repo.fastMoving(tenantId);

export const deadStock = (tenantId) => listDeadStock(tenantId);
