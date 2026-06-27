/**
 * User serialiser. password_hash must NEVER leave this layer.
 */
export const serializeUser = (u) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: u.role,
  tenant_id: u.tenant_id,
  is_active: u.is_active,
  language_preference: u.language_preference,
  ...(u.created_at !== undefined ? { created_at: u.created_at } : {}),
});
