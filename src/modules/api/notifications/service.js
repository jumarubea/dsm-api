import { AppError } from '../../../utils/AppError.js';
import * as repo from './repository.js';

export const list = (tenantId, role) => repo.listForRole(tenantId, role);

export const markRead = async (id, tenantId, role) => {
  const updated = await repo.markRead(id, tenantId, role);
  if (!updated) throw new AppError('Taarifa haipatikani.', 404, 'NOT_FOUND');
};
