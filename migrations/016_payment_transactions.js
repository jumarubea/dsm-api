/**
 * 016 — payment_transactions. One row per payment event against a sale. Records
 * both manual/external confirmations (now) and Vodacom M-Pesa C2B results
 * (when live). conversation_id / transaction_id hold Vodacom references.
 */
export const up = (pgm) => {
  pgm.createTable('payment_transactions', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    tenant_id: { type: 'uuid', notNull: true, references: 'tenants', onDelete: 'CASCADE' },
    sale_id: { type: 'uuid', notNull: true, references: 'sales', onDelete: 'CASCADE' },
    method: { type: 'payment_method', notNull: true },
    amount: { type: 'numeric(12,2)', notNull: true },
    status: { type: 'payment_status', notNull: true },
    reference: { type: 'varchar(100)' },
    conversation_id: { type: 'varchar(100)' },
    transaction_id: { type: 'varchar(100)' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createIndex('payment_transactions', ['tenant_id', 'sale_id']);
};

export const down = (pgm) => {
  pgm.dropTable('payment_transactions');
};
