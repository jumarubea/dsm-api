/**
 * 006 — audit_log. Immutable, INSERT-only action log spanning platform and shop
 * events. tenant_id is NULL for Super Admin platform actions.
 *
 * NOTE ON NUMBERING: migrations are numbered in BUILD order, not the table-order
 * suggested in docs/02_Database.md. audit_log is needed by Module P1 (tenant
 * creation + impersonation logging), so it lands here; the shop-table migrations
 * continue from 007 as their modules are built. The resulting schema is identical
 * to the spec.
 *
 * The INSERT-only guarantee is enforced by a restricted application DB role
 * (a DevOps grant step, deferred); the application only ever inserts here.
 */
export const up = (pgm) => {
  pgm.createTable('audit_log', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    tenant_id: { type: 'uuid', references: 'tenants', onDelete: 'SET NULL' },
    user_id: { type: 'uuid', references: 'users', onDelete: 'SET NULL' },
    action: { type: 'varchar(80)', notNull: true },
    entity_type: { type: 'varchar(80)', notNull: true },
    entity_id: { type: 'uuid' },
    old_value: { type: 'jsonb' },
    new_value: { type: 'jsonb' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createIndex('audit_log', ['tenant_id', 'entity_id']);
};

export const down = (pgm) => {
  pgm.dropTable('audit_log');
};
