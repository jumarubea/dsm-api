import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { env } from '../../../config/env.js';
import { AppError } from '../../../utils/AppError.js';
import { generateTempPassword } from '../../../utils/password.js';
import { logAudit } from '../../../utils/audit.js';
import { sendOnboardingEmail } from '../../../services/mailer.js';
import * as repo from './repository.js';

const notFound = () => new AppError('Tenant haipatikani.', 404, 'NOT_FOUND');

export const list = () => repo.listTenants();

export const detail = async (id) => {
  const tenant = await repo.findTenantById(id);
  if (!tenant) throw notFound();
  const billing = await repo.listBillingEvents(id);
  return { ...tenant, billing_events: billing };
};

export const create = async (input, actor) => {
  const plan = await repo.findActivePlan(input.plan_id);
  if (!plan || !plan.is_active) {
    throw new AppError('Mpango haupatikani.', 422, 'PLAN_NOT_FOUND');
  }

  const trialDays = input.trial_days ?? plan.trial_days;
  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  let created;
  try {
    created = await repo.createTenantWithOwner({
      name: input.name,
      slug: input.slug,
      ownerEmail: input.owner_email,
      plan,
      trialDays,
      passwordHash,
    });
  } catch (err) {
    if (err.code === '23505') {
      const constraint = String(err.constraint || '');
      if (constraint.includes('slug')) throw new AppError('Slug hii tayari inatumika.', 409, 'SLUG_TAKEN');
      if (constraint.includes('email')) throw new AppError('Barua pepe hii tayari inatumika.', 409, 'EMAIL_TAKEN');
      throw new AppError('Taarifa tayari zipo.', 409, 'CONFLICT');
    }
    throw err;
  }

  const email = await sendOnboardingEmail({
    shopName: input.name,
    slug: input.slug,
    ownerEmail: input.owner_email,
    tempPassword,
  });

  await logAudit({
    userId: actor.id,
    tenantId: created.tenant.id,
    action: 'TENANT_CREATED',
    entityType: 'tenant',
    entityId: created.tenant.id,
    newValue: { name: input.name, slug: input.slug, plan_id: plan.id },
  });

  return {
    tenant: created.tenant,
    owner: created.owner,
    subscription: created.subscription,
    email,
  };
};

export const update = async (id, input) => {
  const tenant = await repo.updateTenant(id, input);
  if (!tenant) throw notFound();
  return tenant;
};

export const suspend = async (id, actor) => {
  const tenant = await repo.setTenantStatus(id, 'suspended');
  if (!tenant) throw notFound();
  await logAudit({
    userId: actor.id,
    tenantId: id,
    action: 'TENANT_SUSPENDED',
    entityType: 'tenant',
    entityId: id,
  });
  return tenant;
};

export const activate = async (id, actor) => {
  const tenant = await repo.setTenantStatus(id, 'active');
  if (!tenant) throw notFound();
  await logAudit({
    userId: actor.id,
    tenantId: id,
    action: 'TENANT_ACTIVATED',
    entityType: 'tenant',
    entityId: id,
  });
  return tenant;
};

export const softDelete = async (id, actor) => {
  const tenant = await repo.setTenantStatus(id, 'cancelled');
  if (!tenant) throw notFound();
  await logAudit({
    userId: actor.id,
    tenantId: id,
    action: 'TENANT_DELETED',
    entityType: 'tenant',
    entityId: id,
  });
};

export const impersonate = async (id, actor) => {
  const tenant = await repo.findTenantById(id);
  if (!tenant) throw notFound();

  const token = jwt.sign(
    {
      sub: actor.id,
      role: 'shop_admin',
      tenant_id: tenant.id,
      tenant_slug: tenant.slug,
      impersonated_by: actor.id,
    },
    env.JWT_SECRET,
    { expiresIn: '2h' }
  );

  await logAudit({
    userId: actor.id,
    tenantId: null,
    action: 'IMPERSONATION_STARTED',
    entityType: 'tenant',
    entityId: tenant.id,
    newValue: { impersonator: actor.id },
  });

  return { token, expires_in: '2h', tenant: { id: tenant.id, slug: tenant.slug } };
};
