import * as service from './service.js';

export const get = async (req, res) => {
  res.json({ data: await service.get(req.tenant.id) });
};
