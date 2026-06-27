import * as service from './service.js';

export const summary = async (req, res) => {
  res.json({ data: await service.summary(req.tenant.id, req.user.role) });
};

export const chart = async (req, res) => {
  res.json({ data: await service.chart(req.tenant.id) });
};

export const alerts = async (req, res) => {
  res.json({ data: await service.alerts(req.tenant.id, req.user.role) });
};

export const orders = async (req, res) => {
  res.json({ data: await service.orders(req.tenant.id) });
};

export const prices = async (req, res) => {
  res.json({ data: await service.prices(req.tenant.id, req.user.role) });
};
