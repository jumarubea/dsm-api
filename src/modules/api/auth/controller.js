import { cookieSecure } from '../../../config/env.js';
import { serializeUser } from '../../../serialisers/user.js';
import * as service from './service.js';

const REFRESH_COOKIE = 'refresh_token';

const cookieOptions = {
  httpOnly: true,
  secure: cookieSecure,
  sameSite: 'strict',
  path: '/api/v1/auth',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

export const login = async (req, res) => {
  const { accessToken, refreshToken, user } = await service.login(req.body);
  res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions);
  res.json({ data: { accessToken, user: serializeUser(user) } });
};

export const refresh = async (req, res) => {
  const { accessToken, refreshToken, user } = await service.refresh(req.cookies?.[REFRESH_COOKIE]);
  res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions);
  res.json({ data: { accessToken, user: serializeUser(user) } });
};

export const logout = async (req, res) => {
  res.clearCookie(REFRESH_COOKIE, { path: '/api/v1/auth' });
  res.status(204).send();
};
