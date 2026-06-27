import { AppError } from '../../../utils/AppError.js';
import * as service from './service.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const list = async (req, res) => {
  res.json({ data: await service.list(req.tenant.id, req.user.role) });
};

export const markRead = async (req, res) => {
  if (!UUID_RE.test(req.params.id)) {
    throw new AppError('Taarifa haipatikani.', 404, 'NOT_FOUND');
  }
  await service.markRead(req.params.id, req.tenant.id, req.user.role);
  res.status(204).send();
};
