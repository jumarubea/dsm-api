/**
 * 003 — subscriptions. One active subscription per tenant (UNIQUE tenant_id).
 * current_period_end drives renewal/suspension logic.
 */
export const up = (pgm) => {
  pgm.createType('subscription_status', [
    'trialing',
    'active',
    'past_due',
    'suspended',
    'cancelled',
  ]);

  pgm.createTable('subscriptions', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    tenant_id: {
      type: 'uuid',
      notNull: true,
      unique: true,
      references: 'tenants',
      onDelete: 'CASCADE',
    },
    plan_id: {
      type: 'uuid',
      notNull: true,
      references: 'subscription_plans',
      onDelete: 'RESTRICT',
    },
    status: { type: 'subscription_status', notNull: true },
    trial_ends_at: { type: 'timestamptz' },
    current_period_start: { type: 'timestamptz', notNull: true },
    current_period_end: { type: 'timestamptz', notNull: true },
    cancelled_at: { type: 'timestamptz' },
  });

  // tenant_id already unique-indexed via the column constraint.
  pgm.createIndex('subscriptions', ['status', 'current_period_end']);
};

export const down = (pgm) => {
  pgm.dropTable('subscriptions');
  pgm.dropType('subscription_status');
};
