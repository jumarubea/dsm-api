/**
 * 011 — notifications. Per-tenant alerts (low stock, etc.), filtered by role via
 * visible_to_roles. The partial unique index dedupes LOW_STOCK alerts so the
 * stock trigger raises at most one open low-stock notification per product.
 */
export const up = (pgm) => {
  pgm.createTable('notifications', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    tenant_id: { type: 'uuid', notNull: true, references: 'tenants', onDelete: 'CASCADE' },
    type: { type: 'varchar(40)', notNull: true },
    product_id: { type: 'uuid', references: 'products', onDelete: 'CASCADE' },
    message: { type: 'text', notNull: true },
    visible_to_roles: { type: 'text[]', notNull: true },
    is_read: { type: 'boolean', notNull: true, default: false },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createIndex('notifications', ['tenant_id', 'created_at']);
  pgm.createIndex('notifications', 'visible_to_roles', { method: 'gin' });
  pgm.sql(
    `CREATE UNIQUE INDEX notifications_lowstock_unique
     ON notifications (tenant_id, product_id) WHERE type = 'LOW_STOCK'`
  );
};

export const down = (pgm) => {
  pgm.dropTable('notifications');
};
