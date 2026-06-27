import { AppError } from '../../../utils/AppError.js';
import { isUuid } from '../sales/validation.js';
import * as service from './service.js';

export const initiate = async (req, res) => {
  res.json({ data: await service.initiate(req.tenant.id, req.body) });
};

export const status = async (req, res) => {
  if (!isUuid(req.params.saleId)) {
    throw new AppError('Mauzo hayapatikani.', 404, 'NOT_FOUND');
  }
  res.json({ data: await service.status(req.tenant.id, req.params.saleId) });
};
