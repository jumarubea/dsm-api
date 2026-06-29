import bcrypt from 'bcrypt';
import { AppError } from '../../../utils/AppError.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../../utils/jwt.js';
import { slugify, withRandomSuffix } from '../../../utils/slug.js';
import { sendWelcomeEmail } from '../../../services/mailer.js';
import { logAudit } from '../../../utils/audit.js';
import * as tenantRepo from '../../admin/tenants/repository.js';
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

/** Public list of active plans for the registration form. */
export const listPlans = () => tenantRepo.listActivePlans();

/**
 * Self-service shop registration: create the tenant, its trial subscription,
 * and the owner shop_admin (with a password the owner chose), then sign them in.
 * No super admin involved — the broker just oversees afterwards.
 */
export const register = async ({ shop_name, owner_name, email, password, plan_id }) => {
  const plan = await tenantRepo.findActivePlan(plan_id);
  if (!plan || !plan.is_active) throw new AppError('Mpango haupatikani.', 422, 'PLAN_NOT_FOUND');

  const passwordHash = await bcrypt.hash(password, 12);
  const base = slugify(shop_name);

  let created;
  // Derive the subdomain slug from the shop name; on a slug clash, retry once
  // with a random suffix. An email clash is surfaced to the user.
  for (const slug of [base, withRandomSuffix(base)]) {
    try {
      created = await tenantRepo.createTenantWithOwner({
        name: shop_name,
        slug,
        ownerEmail: email,
        ownerName: owner_name,
        plan,
        trialDays: plan.trial_days,
        passwordHash,
      });
      break;
    } catch (err) {
      if (err.code === '23505') {
        const constraint = String(err.constraint || '');
        if (constraint.includes('email'))
          throw new AppError('Barua pepe hii tayari inatumika.', 409, 'EMAIL_TAKEN');
        if (constraint.includes('slug')) continue; // retry with a suffixed slug
      }
      throw err;
    }
  }
  if (!created) throw new AppError('Imeshindwa kusajili duka. Jaribu jina jingine.', 409, 'SLUG_TAKEN');

  await logAudit({
    userId: created.owner.id,
    tenantId: created.tenant.id,
    action: 'TENANT_CREATED',
    entityType: 'tenant',
    entityId: created.tenant.id,
    newValue: { name: shop_name, slug: created.tenant.slug, plan_id, self_registered: true },
  });

  // Welcome email is best-effort — the owner is already signed in.
  sendWelcomeEmail({
    shopName: shop_name,
    ownerEmail: email,
  }).catch(() => {});

  const user = { ...created.owner, tenant_slug: created.tenant.slug };
  return { ...issueTokens(user), user, tenant: created.tenant, subscription: created.subscription };
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
