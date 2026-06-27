import { AppError } from '../../../utils/AppError.js';
import * as repo from './repository.js';

const notFound = () => new AppError('Mteja haipatikani.', 404, 'NOT_FOUND');

export const list = (tenantId, search) => repo.listCustomers(tenantId, search);

export const detail = async (id, tenantId) => {
  const customer = await repo.findCustomerById(id, tenantId);
  if (!customer) throw notFound();
  return customer;
};

export const create = (tenantId, input) => repo.createCustomer(tenantId, input);

export const update = async (id, tenantId, input) => {
  const customer = await repo.updateCustomer(id, tenantId, input);
  if (!customer) throw notFound();
  return customer;
};

export const history = async (id, tenantId) => {
  const customer = await repo.findCustomerById(id, tenantId);
  if (!customer) throw notFound();
  return repo.purchaseHistory(id, tenantId);
};
