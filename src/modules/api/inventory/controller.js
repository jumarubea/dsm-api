import * as service from './service.js';

export const stockIn = async (req, res) => {
  const movement = await service.stockIn(req.tenant.id, req.body, req.idempotencyKey, req.user.id);
  res.status(201).json({ data: movement });
};

export const adjustment = async (req, res) => {
  const movement = await service.adjustment(
    req.tenant.id,
    req.body,
    req.idempotencyKey,
    req.user.id
  );
  res.status(201).json({ data: movement });
};

export const movements = async (req, res) => {
  const { product_id: productId, type, date_from: dateFrom, date_to: dateTo } = req.query;
  res.json({ data: await service.movements(req.tenant.id, { productId, type, dateFrom, dateTo }) });
};

export const lowStock = async (req, res) => {
  res.json({ data: await service.lowStock(req.tenant.id, req.user.role) });
};

export const deadStock = async (req, res) => {
  res.json({ data: await service.deadStock(req.tenant.id) });
};
