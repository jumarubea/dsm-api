/**
 * 007 — categories. Product categories, one set per tenant. A category name is
 * unique within a tenant.
 */
export const up = (pgm) => {
  pgm.createTable('categories', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    tenant_id: { type: 'uuid', notNull: true, references: 'tenants', onDelete: 'CASCADE' },
    name: { type: 'varchar(120)', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createIndex('categories', 'tenant_id');
  pgm.addConstraint('categories', 'categories_tenant_name_unique', {
    unique: ['tenant_id', 'name'],
  });
};

export const down = (pgm) => {
  pgm.dropTable('categories');
};
