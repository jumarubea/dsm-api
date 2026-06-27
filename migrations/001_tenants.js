/**
 * 001 — tenants. The central registry: one row per shop.
 * slug drives subdomain routing; status is the authoritative subscription gate
 * read by subscriptionGuard.
 */
export const up = (pgm) => {
  pgm.createType('tenant_status', ['active', 'trialing', 'past_due', 'suspended', 'cancelled']);

  pgm.createTable('tenants', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    name: { type: 'varchar(150)', notNull: true },
    slug: { type: 'varchar(80)', notNull: true, unique: true },
    status: { type: 'tenant_status', notNull: true },
    owner_email: { type: 'varchar(255)', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    suspended_at: { type: 'timestamptz' },
  });

  pgm.createIndex('tenants', 'status');
};

export const down = (pgm) => {
  pgm.dropTable('tenants');
  pgm.dropType('tenant_status');
};
