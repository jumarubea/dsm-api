import { AppError } from '../../../utils/AppError.js';
import { checkProductLimit } from '../../../utils/planLimits.js';
import { serializeProduct } from '../../../serialisers/product.js';
import * as repo from './repository.js';

const notFound = () => new AppError('Bidhaa haipatikani.', 404, 'NOT_FOUND');

const ensureCategory = async (categoryId, tenantId) => {
  const cat = await repo.findCategory(categoryId, tenantId);
  if (!cat) throw new AppError('Kundi halipatikani.', 422, 'CATEGORY_NOT_FOUND');
};

export const list = async (tenantId, role) => {
  const products = await repo.listProducts(tenantId);
  return products.map((p) => serializeProduct(p, role));
};

export const detail = async (id, tenantId, role) => {
  const product = await repo.findProductById(id, tenantId);
  if (!product) throw notFound();
  product.pricing_rules = await repo.listPricingRules(id, tenantId);
  return serializeProduct(product, role);
};

export const create = async (tenantId, input, role) => {
  await checkProductLimit(tenantId);
  await ensureCategory(input.category_id, tenantId);
  try {
    const product = await repo.createProduct(tenantId, input);
    return serializeProduct(product, role);
  } catch (err) {
    if (err.code === '23505') throw new AppError('SKU hii tayari inatumika.', 409, 'SKU_TAKEN');
    throw err;
  }
};

export const update = async (id, tenantId, input, role) => {
  if (input.category_id !== undefined) await ensureCategory(input.category_id, tenantId);
  let product;
  try {
    product = await repo.updateProduct(id, tenantId, input);
  } catch (err) {
    if (err.code === '23505') throw new AppError('SKU hii tayari inatumika.', 409, 'SKU_TAKEN');
    throw err;
  }
  if (!product) throw notFound();
  return serializeProduct(product, role);
};

export const softDelete = async (id, tenantId) => {
  const deleted = await repo.softDeleteProduct(id, tenantId);
  if (!deleted) throw notFound();
};

export const addPricingRule = async (id, tenantId, input) => {
  const product = await repo.findProductById(id, tenantId);
  if (!product) throw notFound();
  try {
    return await repo.addPricingRule(tenantId, id, input);
  } catch (err) {
    if (err.code === '23505') {
      throw new AppError('Kuna kanuni ya bei kwa kiwango hiki tayari.', 409, 'PRICING_RULE_EXISTS');
    }
    throw err;
  }
};

export const removePricingRule = async (id, ruleId, tenantId) => {
  const removed = await repo.removePricingRule(ruleId, id, tenantId);
  if (!removed) throw new AppError('Kanuni ya bei haipatikani.', 404, 'NOT_FOUND');
};
