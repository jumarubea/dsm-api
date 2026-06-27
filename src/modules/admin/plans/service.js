import { AppError } from '../../../utils/AppError.js';
import * as repo from './repository.js';

const notFound = () => new AppError('Mpango haupatikani.', 404, 'NOT_FOUND');

export const list = () => repo.listPlans();

export const create = async (input) => {
  try {
    return await repo.createPlan(input);
  } catch (err) {
    if (err.code === '23505')
      throw new AppError('Jina la mpango tayari linatumika.', 409, 'PLAN_NAME_TAKEN');
    throw err;
  }
};

export const update = async (id, input) => {
  let plan;
  try {
    plan = await repo.updatePlan(id, input);
  } catch (err) {
    if (err.code === '23505')
      throw new AppError('Jina la mpango tayari linatumika.', 409, 'PLAN_NAME_TAKEN');
    throw err;
  }
  if (!plan) throw notFound();
  return plan;
};

export const deactivate = async (id) => {
  const plan = await repo.deactivatePlan(id);
  if (!plan) throw notFound();
};
