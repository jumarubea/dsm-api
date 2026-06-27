import * as service from './service.js';

export const summary = async (req, res) => {
  res.json({ data: await service.summary() });
};

export const tenantsHealth = async (req, res) => {
  res.json({ data: await service.tenantsHealth() });
};
