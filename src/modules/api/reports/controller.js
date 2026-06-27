import { toCsv } from '../../../utils/csv.js';
import * as service from './service.js';

const respond = (req, res, data, csvRows) => {
  if (req.query.format === 'csv') {
    res.type('text/csv').send(toCsv(csvRows));
    return;
  }
  res.json({ data });
};

export const daily = async (req, res) => {
  const data = await service.daily(req.tenant.id, req.query.date);
  respond(req, res, data, data.by_method);
};

export const monthly = async (req, res) => {
  const data = await service.monthly(req.tenant.id, req.query.month);
  respond(req, res, data, data.by_method);
};

export const profit = async (req, res) => {
  const data = await service.profit(req.tenant.id, { from: req.query.from, to: req.query.to });
  respond(req, res, data, [data]);
};

export const fastMoving = async (req, res) => {
  const data = await service.fastMoving(req.tenant.id);
  respond(req, res, data, data);
};

export const deadStock = async (req, res) => {
  const data = await service.deadStock(req.tenant.id);
  respond(req, res, data, data);
};
