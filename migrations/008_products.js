/**
 * 008 — products. Tenant-scoped catalogue with dual pricing + restricted
 * cost_price. stock_qty is maintained ONLY by the stock_movements trigger
 * (added in the Inventory module) — never written directly by app code.
 * sku is unique within a tenant (partial unique index, NULLs allowed).
 */
export const up = (pgm) => {
  pgm.createTable('products', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    tenant_id: { type: 'uuid', notNull: true, references: 'tenants', onDelete: 'CASCADE' },
    name: { type: 'varchar(200)', notNull: true },
    sku: { type: 'varchar(80)' },
    category_id: { type: 'uuid', notNull: true, references: 'categories', onDelete: 'RESTRICT' },
    unit_of_measure: { type: 'varchar(40)', notNull: true },
    retail_price: { type: 'numeric(12,2)', notNull: true },
    wholesale_price: { type: 'numeric(12,2)', notNull: true },
    cost_price: { type: 'numeric(12,2)', notNull: true },
    stock_qty: { type: 'integer', notNull: true, default: 0 },
    min_stock_level: { type: 'integer', notNull: true, default: 5 },
    dead_stock_days: { type: 'integer' },
    is_active: { type: 'boolean', notNull: true, default: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createIndex('products', ['tenant_id', 'is_active']);
  pgm.createIndex('products', ['tenant_id', 'category_id']);
  pgm.createIndex('products', 'tenant_id');
  pgm.createIndex('products', ['tenant_id', 'sku'], {
    unique: true,
    where: 'sku IS NOT NULL',
    name: 'products_tenant_sku_unique',
  });
};

export const down = (pgm) => {
  pgm.dropTable('products');
};
