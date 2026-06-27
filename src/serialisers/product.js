// Only these roles may see cost_price. For everyone else the field is ABSENT
// from the response (not null, not undefined) — stripped here at the boundary.
const PRIVILEGED_ROLES = ['super_admin', 'shop_admin', 'manager'];

export const serializeProduct = (product, userRole) => {
  const base = {
    id: product.id,
    name: product.name,
    sku: product.sku,
    category_id: product.category_id,
    unit_of_measure: product.unit_of_measure,
    retail_price: product.retail_price,
    wholesale_price: product.wholesale_price,
    stock_qty: product.stock_qty,
    min_stock_level: product.min_stock_level,
    dead_stock_days: product.dead_stock_days,
    is_active: product.is_active,
    pricing_rules: product.pricing_rules || [],
    created_at: product.created_at,
  };

  if (PRIVILEGED_ROLES.includes(userRole)) {
    base.cost_price = product.cost_price;
  }
  return base;
};
