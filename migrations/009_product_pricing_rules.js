/**
 * 009 — product_pricing_rules. Per-product, quantity-based price switching:
 * at or above min_qty, apply price_type (retail or wholesale). The applicable
 * rule is the one with the highest min_qty <= the sale quantity.
 */
export const up = (pgm) => {
  pgm.createType('price_type', ['retail', 'wholesale']);

  pgm.createTable('product_pricing_rules', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    tenant_id: { type: 'uuid', notNull: true, references: 'tenants', onDelete: 'CASCADE' },
    product_id: { type: 'uuid', notNull: true, references: 'products', onDelete: 'CASCADE' },
    min_qty: { type: 'integer', notNull: true },
    price_type: { type: 'price_type', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createIndex('product_pricing_rules', ['tenant_id', 'product_id']);
  pgm.addConstraint('product_pricing_rules', 'pricing_rules_product_minqty_unique', {
    unique: ['tenant_id', 'product_id', 'min_qty'],
  });
};

export const down = (pgm) => {
  pgm.dropTable('product_pricing_rules');
  pgm.dropType('price_type');
};
