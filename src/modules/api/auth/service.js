import bcrypt from 'bcrypt';
import { AppError } from '../../../utils/AppError.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../../utils/jwt.js';
import * as repo from './repository.js';

// Generic message — never reveal whether the email or the password was wrong.
const invalidCredentials = () =>
  new AppError('Barua pepe au nenosiri si sahihi.', 401, 'INVALID_CREDENTIALS');

const sessionExpired = () =>
  new AppError('Kipindi kimeisha. Tafadhali ingia tena.', 401, 'AUTH_INVALID');

const issueTokens = (user) => ({
  accessToken: signAccessToken({
    sub: user.id,
    role: user.role,
    tenant_id: user.tenant_id,
    tenant_slug: user.tenant_slug,
  }),
  refreshToken: signRefreshToken({ sub: user.id }),
});

export const login = async ({ email, password }) => {
  const user = await repo.findByEmail(email);
  if (!user || !user.is_active) throw invalidCredentials();
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) throw invalidCredentials();
  return { ...issueTokens(user), user };
};

export const refresh = async (refreshToken) => {
  if (!refreshToken) throw new AppError('Tafadhali ingia tena.', 401, 'AUTH_REQUIRED');
  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch {
    throw sessionExpired();
  }
  const user = await repo.findById(decoded.sub);
  if (!user || !user.is_active) throw sessionExpired();
  return { ...issueTokens(user), user };
};
