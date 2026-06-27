import { query } from '../config/db.js';
import { logger } from '../config/logger.js';

/**
 * Append an entry to the immutable audit_log. Best-effort: a logging failure
 * must never break the operation being audited. tenant_id is null for platform
 * (Super Admin) actions.
 */
export const logAudit = async ({
  userId = null,
  tenantId = null,
  action,
  entityType,
  entityId = null,
  oldValue = null,
  newValue = null,
}) => {
  try {
    await query(
      `INSERT INTO audit_log (user_id, tenant_id, action, entity_type, entity_id, old_value, new_value)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, tenantId, action, entityType, entityId, oldValue, newValue]
    );
  } catch (err) {
    logger.error({ err, action }, 'Failed to write audit log');
  }
};
