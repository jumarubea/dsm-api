import bcrypt from 'bcrypt';
import { AppError } from '../../../utils/AppError.js';
import { checkUserLimit } from '../../../utils/planLimits.js';
import { serializeUser } from '../../../serialisers/user.js';
import * as repo from './repository.js';

const notFound = () => new AppError('Mtumiaji haipatikani.', 404, 'NOT_FOUND');

export const list = async (tenantId) => {
  const users = await repo.listUsers(tenantId);
  return users.map(serializeUser);
};

export const create = async (tenantId, input) => {
  await checkUserLimit(tenantId);
  const passwordHash = await bcrypt.hash(input.password, 12);
  try {
    const user = await repo.createUser(tenantId, {
      name: input.name,
      email: input.email,
      passwordHash,
      role: input.role,
      language: input.language_preference,
    });
    return serializeUser(user);
  } catch (err) {
    if (err.code === '23505') {
      throw new AppError('Barua pepe hii tayari inatumika.', 409, 'EMAIL_TAKEN');
    }
    throw err;
  }
};

export const update = async (id, tenantId, input, actor) => {
  // A user cannot change their own role.
  if (id === actor.id && input.role !== undefined && input.role !== actor.role) {
    throw new AppError('Huwezi kubadilisha wadhifa wako mwenyewe.', 422, 'CANNOT_CHANGE_OWN_ROLE');
  }
  const user = await repo.updateUser(id, tenantId, input);
  if (!user) throw notFound();
  return serializeUser(user);
};

export const deactivate = async (id, tenantId, actor) => {
  if (id === actor.id) {
    throw new AppError('Huwezi kujifuta mwenyewe.', 422, 'CANNOT_DEACTIVATE_SELF');
  }
  const user = await repo.deactivateUser(id, tenantId);
  if (!user) throw notFound();
  return serializeUser(user);
};

export const updateOwnLanguage = async (userId, language) => {
  const user = await repo.setLanguage(userId, language);
  if (!user) throw notFound();
  return serializeUser(user);
};
