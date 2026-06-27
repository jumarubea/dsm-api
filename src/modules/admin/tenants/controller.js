import { AppError } from '../../../utils/AppError.js';
import { isUuid } from './validation.js';
import * as service from './service.js';

const requireUuid = (id) => {
  // Malformed id is treated as not-found — never leak whether it could exist.
  if (!isUuid(id)) throw new AppError('Tenant haipatikani.', 404, 'NOT_FOUND');
};

export const list = async (req, res) => {
  res.json({ data: await service.list() });
};

export const detail = async (req, res) => {
  requireUuid(req.params.id);
  res.json({ data: await service.detail(req.params.id) });
};

export const create = async (req, res) => {
  const result = await service.create(req.body, req.user);
  res.status(201).json({
    data: {
      tenant: result.tenant,
      owner: result.owner,
      subscription: result.subscription,
      onboarding_email: result.email,
    },
  });
};

export const update = async (req, res) => {
  requireUuid(req.params.id);
  res.json({ data: await service.update(req.params.id, req.body) });
};

export const suspend = async (req, res) => {
  requireUuid(req.params.id);
  res.json({ data: await service.suspend(req.params.id, req.user) });
};

export const activate = async (req, res) => {
  requireUuid(req.params.id);
  res.json({ data: await service.activate(req.params.id, req.user) });
};

export const remove = async (req, res) => {
  requireUuid(req.params.id);
  await service.softDelete(req.params.id, req.user);
  res.status(204).send();
};

export const impersonate = async (req, res) => {
  requireUuid(req.params.id);
  res.json({ data: await service.impersonate(req.params.id, req.user) });
};

export const listBilling = async (req, res) => {
  requireUuid(req.params.id);
  res.json({ data: await service.listBilling(req.params.id) });
};

export const recordBilling = async (req, res) => {
  requireUuid(req.params.id);
  res.status(201).json({ data: await service.recordBilling(req.params.id, req.body, req.user) });
};
