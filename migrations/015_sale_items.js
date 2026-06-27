/**
 * 015 — sale_items. Line items. unit_price is an immutable price snapshot taken
 * at sale time; line_total is a GENERATED column (quantity * unit_price).
 */
export const up = (pgm) => {
  pgm.createTable('sale_items', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    tenant_id: { type: 'uuid', notNull: true, references: 'tenants', onDelete: 'CASCADE' },
    sale_id: { type: 'uuid', notNull: true, references: 'sales', onDelete: 'CASCADE' },
    product_id: { type: 'uuid', notNull: true, references: 'products', onDelete: 'RESTRICT' },
    quantity: { type: 'integer', notNull: true },
    unit_price: { type: 'numeric(12,2)', notNull: true },
  });

  pgm.sql(
    `ALTER TABLE sale_items
     ADD COLUMN line_total numeric(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED`
  );

  pgm.createIndex('sale_items', ['tenant_id', 'sale_id']);
};

export const down = (pgm) => {
  pgm.dropTable('sale_items');
};
