/**
 * 014 — sales. Sale and delivery-order headers. idempotency_key is globally
 * UNIQUE (offline-sync dedup → 409 on duplicate). Stock is deducted via SALE
 * rows in stock_movements (the trigger maintains products.stock_qty).
 */
export const up = (pgm) => {
  pgm.createType('sale_type', ['SALE', 'ORDER']);
  pgm.createType('sale_status', ['PENDING', 'COMPLETED', 'VOIDED', 'PREPARED', 'DELIVERED']);
  pgm.createType('payment_method', ['cash', 'mpesa', 'airtel']);
  pgm.createType('payment_status', ['PENDING', 'COMPLETED', 'FAILED', 'TIMEOUT']);

  pgm.createTable('sales', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    tenant_id: { type: 'uuid', notNull: true, references: 'tenants', onDelete: 'CASCADE' },
    idempotency_key: { type: 'uuid', notNull: true, unique: true },
    type: { type: 'sale_type', notNull: true, default: 'SALE' },
    status: { type: 'sale_status', notNull: true, default: 'PENDING' },
    customer_id: { type: 'uuid', references: 'customers', onDelete: 'SET NULL' },
    served_by: { type: 'uuid', notNull: true, references: 'users', onDelete: 'RESTRICT' },
    delivery_address: { type: 'text' },
    expected_delivery_at: { type: 'date' },
    subtotal: { type: 'numeric(12,2)', notNull: true },
    total: { type: 'numeric(12,2)', notNull: true },
    payment_method: { type: 'payment_method', notNull: true },
    payment_status: { type: 'payment_status', notNull: true, default: 'PENDING' },
    void_reason: { type: 'text' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createIndex('sales', ['tenant_id', 'created_at']);
  pgm.createIndex('sales', ['tenant_id', 'customer_id']);
};

export const down = (pgm) => {
  pgm.dropTable('sales');
  pgm.dropType('payment_status');
  pgm.dropType('payment_method');
  pgm.dropType('sale_status');
  pgm.dropType('sale_type');
};
