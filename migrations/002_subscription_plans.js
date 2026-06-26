/**
 * 002 — subscription_plans. Plans the broker offers. Platform-level, no tenant_id.
 * max_users / max_products: -1 means unlimited.
 */
export const up = (pgm) => {
  pgm.createType('billing_cycle', ['monthly', 'annual']);

  pgm.createTable('subscription_plans', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    name: { type: 'varchar(80)', notNull: true, unique: true },
    price_tzs: { type: 'numeric(12,2)', notNull: true },
    billing_cycle: { type: 'billing_cycle', notNull: true },
    trial_days: { type: 'integer', notNull: true, default: 14 },
    max_users: { type: 'integer', notNull: true },
    max_products: { type: 'integer', notNull: true },
    features: { type: 'jsonb', notNull: true, default: '{}' },
    is_active: { type: 'boolean', notNull: true, default: true },
  });
};

export const down = (pgm) => {
  pgm.dropTable('subscription_plans');
  pgm.dropType('billing_cycle');
};
