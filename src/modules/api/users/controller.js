import { AppError } from '../../../utils/AppError.js';
import { isUuid } from './validation.js';
import * as service from './service.js';

const requireUuid = (id) => {
  if (!isUuid(id)) throw new AppError('Mtumiaji haipatikani.', 404, 'NOT_FOUND');
};

export const list = async (req, res) => {
  res.json({ data: await service.list(req.tenant.id) });
};

export const create = async (req, res) => {
  res.status(201).json({ data: await service.create(req.tenant.id, req.body) });
};

export const update = async (req, res) => {
  requireUuid(req.params.id);
  res.json({ data: await service.update(req.params.id, req.tenant.id, req.body, req.user) });
};

export const remove = async (req, res) => {
  requireUuid(req.params.id);
  res.json({ data: await service.deactivate(req.params.id, req.tenant.id, req.user) });
};

export const updateOwnLanguage = async (req, res) => {
  res.json({ data: await service.updateOwnLanguage(req.user.id, req.body.language_preference) });
};
