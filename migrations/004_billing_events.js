/**
 * 004 — billing_events. Immutable, INSERT-only billing/payment log.
 * The application DB role is granted INSERT only on this table (handled in a
 * later ops migration / grant step); no UPDATE or DELETE.
 */
export const up = (pgm) => {
  pgm.createType('billing_event_type', [
    'payment_received',
    'payment_failed',
    'plan_changed',
    'trial_started',
    'trial_expired',
    'subscription_cancelled',
  ]);

  pgm.createTable('billing_events', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    tenant_id: {
      type: 'uuid',
      notNull: true,
      references: 'tenants',
      onDelete: 'CASCADE',
    },
    type: { type: 'billing_event_type', notNull: true },
    amount_tzs: { type: 'numeric(12,2)' },
    method: { type: 'varchar(50)' },
    reference: { type: 'varchar(100)' },
    note: { type: 'text' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createIndex('billing_events', ['tenant_id', 'created_at']);
};

export const down = (pgm) => {
  pgm.dropTable('billing_events');
  pgm.dropType('billing_event_type');
};
