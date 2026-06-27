/**
 * 010 — stock_movements. Every inventory change. quantity is SIGNED:
 * positive = IN, negative = OUT/decrease. idempotency_key is globally UNIQUE
 * (offline-sync dedup) — a duplicate insert raises a unique violation the
 * service maps to HTTP 409. products.stock_qty is updated by the trigger (012),
 * never by app code.
 */
export const up = (pgm) => {
  pgm.createType('stock_movement_type', ['STOCK_IN', 'ADJUSTMENT', 'SALE']);

  pgm.createTable('stock_movements', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    tenant_id: { type: 'uuid', notNull: true, references: 'tenants', onDelete: 'CASCADE' },
    product_id: { type: 'uuid', notNull: true, references: 'products', onDelete: 'CASCADE' },
    idempotency_key: { type: 'uuid', notNull: true, unique: true },
    type: { type: 'stock_movement_type', notNull: true },
    quantity: { type: 'integer', notNull: true },
    reason: { type: 'varchar(200)' },
    unit_cost: { type: 'numeric(12,2)' },
    created_by: { type: 'uuid', references: 'users', onDelete: 'SET NULL' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createIndex('stock_movements', ['tenant_id', 'product_id', 'created_at']);
};

export const down = (pgm) => {
  pgm.dropTable('stock_movements');
  pgm.dropType('stock_movement_type');
};
