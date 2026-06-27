/**
 * 013 — customers. Minimal table needed by sales.customer_id. The full customer
 * API (search, history) is built in Module G; this establishes the schema + FK.
 */
export const up = (pgm) => {
  pgm.createTable('customers', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    tenant_id: { type: 'uuid', notNull: true, references: 'tenants', onDelete: 'CASCADE' },
    name: { type: 'varchar(150)', notNull: true },
    phone: { type: 'varchar(30)' },
    email: { type: 'varchar(255)' },
    address: { type: 'text' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createIndex('customers', 'tenant_id');
  pgm.createIndex('customers', ['tenant_id', 'phone']);
};

export const down = (pgm) => {
  pgm.dropTable('customers');
};
