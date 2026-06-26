/**
 * 005 — users. tenant_id is NULL only for super_admin; NOT NULL for all shop
 * roles (enforced in the application layer). email is globally unique across all
 * tenants. language_preference persists the EN/SW UI choice.
 */
export const up = (pgm) => {
  pgm.createType('user_role', [
    'super_admin',
    'shop_admin',
    'manager',
    'sales_attendant',
    'store_keeper',
  ]);
  pgm.createType('language_preference', ['en', 'sw']);

  pgm.createTable('users', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    tenant_id: { type: 'uuid', references: 'tenants', onDelete: 'CASCADE' },
    name: { type: 'varchar(120)', notNull: true },
    email: { type: 'varchar(255)', notNull: true, unique: true },
    password_hash: { type: 'varchar(255)', notNull: true },
    role: { type: 'user_role', notNull: true },
    language_preference: { type: 'language_preference', notNull: true, default: 'en' },
    is_active: { type: 'boolean', notNull: true, default: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createIndex('users', ['tenant_id', 'role']);
};

export const down = (pgm) => {
  pgm.dropTable('users');
  pgm.dropType('language_preference');
  pgm.dropType('user_role');
};
