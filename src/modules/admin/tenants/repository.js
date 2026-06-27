import { query, withTransaction } from '../../../config/db.js';

export const findActivePlan = async (planId) => {
  const { rows } = await query(
    `SELECT id, name, price_tzs, trial_days, max_users, max_products, is_active
     FROM subscription_plans WHERE id = $1`,
    [planId]
  );
  return rows[0] || null;
};

export const listTenants = async () => {
  const { rows } = await query(
    `SELECT t.id, t.name, t.slug, t.status, t.owner_email, t.created_at, t.suspended_at,
            s.status AS subscription_status, s.trial_ends_at, s.current_period_end,
            p.name AS plan_name, p.price_tzs
     FROM tenants t
     LEFT JOIN subscriptions s ON s.tenant_id = t.id
     LEFT JOIN subscription_plans p ON p.id = s.plan_id
     ORDER BY t.created_at DESC`
  );
  return rows;
};

export const findTenantById = async (id) => {
  const { rows } = await query(
    `SELECT t.id, t.name, t.slug, t.status, t.owner_email, t.created_at, t.suspended_at,
            s.id AS subscription_id, s.status AS subscription_status, s.plan_id,
            s.trial_ends_at, s.current_period_start, s.current_period_end,
            p.name AS plan_name, p.price_tzs, p.max_users, p.max_products
     FROM tenants t
     LEFT JOIN subscriptions s ON s.tenant_id = t.id
     LEFT JOIN subscription_plans p ON p.id = s.plan_id
     WHERE t.id = $1`,
    [id]
  );
  return rows[0] || null;
};

export const listBillingEvents = async (tenantId, limit = 50) => {
  const { rows } = await query(
    `SELECT id, type, amount_tzs, method, reference, note, created_at
     FROM billing_events WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT $2`,
    [tenantId, limit]
  );
  return rows;
};

/** Atomically create the tenant, its trial subscription, and the owner shop_admin user. */
export const createTenantWithOwner = ({ name, slug, ownerEmail, plan, trialDays, passwordHash }) =>
  withTransaction(async (client) => {
    const t = await client.query(
      `INSERT INTO tenants (name, slug, status, owner_email)
       VALUES ($1, $2, 'trialing', $3) RETURNING *`,
      [name, slug, ownerEmail]
    );
    const tenant = t.rows[0];

    const sub = await client.query(
      `INSERT INTO subscriptions
         (tenant_id, plan_id, status, trial_ends_at, current_period_start, current_period_end)
       VALUES ($1, $2, 'trialing', now() + ($3 * interval '1 day'), now(),
               now() + ($3 * interval '1 day'))
       RETURNING *`,
      [tenant.id, plan.id, trialDays]
    );

    const owner = await client.query(
      `INSERT INTO users (tenant_id, name, email, password_hash, role)
       VALUES ($1, 'Shop Owner', $2, $3, 'shop_admin')
       RETURNING id, email, role`,
      [tenant.id, ownerEmail, passwordHash]
    );

    return { tenant, subscription: sub.rows[0], owner: owner.rows[0] };
  });

export const updateTenant = (id, { name, status, plan_id }) =>
  withTransaction(async (client) => {
    const existing = await client.query('SELECT id FROM tenants WHERE id = $1', [id]);
    if (!existing.rows[0]) return null;

    const sets = [];
    const vals = [];
    let i = 1;
    if (name !== undefined) {
      sets.push(`name = $${i++}`);
      vals.push(name);
    }
    if (status !== undefined) {
      sets.push(`status = $${i++}`);
      vals.push(status);
      sets.push(`suspended_at = $${i++}`);
      vals.push(status === 'suspended' ? new Date() : null);
    }

    let tenant;
    if (sets.length) {
      vals.push(id);
      const r = await client.query(
        `UPDATE tenants SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
        vals
      );
      tenant = r.rows[0];
    } else {
      tenant = (await client.query('SELECT * FROM tenants WHERE id = $1', [id])).rows[0];
    }

    // Keep subscription status/plan in lockstep with the tenant (the guard reads
    // tenants.status, but the two must not drift).
    if (status !== undefined) {
      await client.query('UPDATE subscriptions SET status = $2 WHERE tenant_id = $1', [id, status]);
    }
    if (plan_id !== undefined) {
      await client.query('UPDATE subscriptions SET plan_id = $2 WHERE tenant_id = $1', [
        id,
        plan_id,
      ]);
    }
    return tenant;
  });

/** Set tenant status (used by suspend/activate/soft-delete), syncing the subscription. */
export const setTenantStatus = (id, status) =>
  withTransaction(async (client) => {
    const suspendedAt = status === 'active' || status === 'trialing' ? null : new Date();
    const r = await client.query(
      `UPDATE tenants SET status = $2, suspended_at = $3 WHERE id = $1 RETURNING *`,
      [id, status, suspendedAt]
    );
    if (!r.rows[0]) return null;
    await client.query('UPDATE subscriptions SET status = $2 WHERE tenant_id = $1', [id, status]);
    return r.rows[0];
  });
