import { AppError } from '../../../utils/AppError.js';
import * as repo from './repository.js';

const notFound = () => new AppError('Kundi halipatikani.', 404, 'NOT_FOUND');
const nameTaken = () =>
  new AppError('Jina la kundi tayari linatumika.', 409, 'CATEGORY_NAME_TAKEN');

export const list = async (tenantId) => repo.listCategories(tenantId);

export const create = async (tenantId, input) => {
  try {
    return await repo.createCategory(tenantId, input.name);
  } catch (err) {
    if (err.code === '23505') throw nameTaken();
    throw err;
  }
};

export const update = async (id, tenantId, input) => {
  try {
    const category = await repo.updateCategory(id, tenantId, input.name);
    if (!category) throw notFound();
    return category;
  } catch (err) {
    if (err.code === '23505') throw nameTaken();
    throw err;
  }
};

export const remove = async (id, tenantId) => {
  const category = await repo.findCategoryById(id, tenantId);
  if (!category) throw notFound();
  const count = await repo.countProductsInCategory(id, tenantId);
  if (count > 0) {
    throw new AppError('Kundi lina bidhaa; haliwezi kufutwa.', 409, 'CATEGORY_HAS_PRODUCTS');
  }
  await repo.deleteCategory(id, tenantId);
};
