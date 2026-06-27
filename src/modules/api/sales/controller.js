import { AppError } from '../../../utils/AppError.js';
import { isUuid } from './validation.js';
import * as service from './service.js';

const requireUuid = (id) => {
  if (!isUuid(id)) throw new AppError('Mauzo hayapatikani.', 404, 'NOT_FOUND');
};

export const create = async (req, res) => {
  const sale = await service.create(req.tenant.id, req.body, req.user, req.idempotencyKey);
  res.status(201).json({ data: sale });
};

export const list = async (req, res) => {
  const {
    date_from: dateFrom,
    date_to: dateTo,
    type,
    status,
    payment_method: paymentMethod,
  } = req.query;
  res.json({
    data: await service.list(req.tenant.id, { dateFrom, dateTo, type, status, paymentMethod }),
  });
};

export const detail = async (req, res) => {
  requireUuid(req.params.id);
  res.json({ data: await service.detail(req.params.id, req.tenant.id) });
};

export const receipt = async (req, res) => {
  requireUuid(req.params.id);
  res.json({ data: await service.receipt(req.params.id, req.tenant.id) });
};

export const confirmPayment = async (req, res) => {
  requireUuid(req.params.id);
  res.json({ data: await service.confirmPayment(req.params.id, req.tenant.id, req.body) });
};

export const voidSale = async (req, res) => {
  requireUuid(req.params.id);
  res.json({
    data: await service.voidSale(req.params.id, req.tenant.id, req.body.reason, req.user),
  });
};

export const updateOrderStatus = async (req, res) => {
  requireUuid(req.params.id);
  res.json({
    data: await service.updateOrderStatus(req.params.id, req.tenant.id, req.body.status),
  });
};
