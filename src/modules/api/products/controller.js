import { AppError } from '../../../utils/AppError.js';
import { isUuid } from './validation.js';
import * as service from './service.js';

const requireUuid = (id) => {
  if (!isUuid(id)) throw new AppError('Bidhaa haipatikani.', 404, 'NOT_FOUND');
};

export const list = async (req, res) => {
  res.json({ data: await service.list(req.tenant.id, req.user.role) });
};

export const detail = async (req, res) => {
  requireUuid(req.params.id);
  res.json({ data: await service.detail(req.params.id, req.tenant.id, req.user.role) });
};

export const create = async (req, res) => {
  res.status(201).json({ data: await service.create(req.tenant.id, req.body, req.user.role) });
};

export const update = async (req, res) => {
  requireUuid(req.params.id);
  res.json({ data: await service.update(req.params.id, req.tenant.id, req.body, req.user.role) });
};

export const remove = async (req, res) => {
  requireUuid(req.params.id);
  await service.softDelete(req.params.id, req.tenant.id);
  res.status(204).send();
};

export const addPricingRule = async (req, res) => {
  requireUuid(req.params.id);
  res
    .status(201)
    .json({ data: await service.addPricingRule(req.params.id, req.tenant.id, req.body) });
};

export const removePricingRule = async (req, res) => {
  requireUuid(req.params.id);
  requireUuid(req.params.rid);
  await service.removePricingRule(req.params.id, req.params.rid, req.tenant.id);
  res.status(204).send();
};
