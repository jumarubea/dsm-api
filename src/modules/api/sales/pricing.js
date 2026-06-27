/**
 * Dual-pricing auto-apply. The applicable rule is the one with the highest
 * min_qty that does not exceed the line quantity; its price_type selects retail
 * vs wholesale. With no matching rule, retail price is used.
 * Returns a Number (DB numeric columns arrive as strings).
 */
export const resolveUnitPrice = (product, quantity, rules = []) => {
  const applicable = rules
    .filter((r) => quantity >= r.min_qty)
    .sort((a, b) => b.min_qty - a.min_qty)[0];
  const priceType = applicable ? applicable.price_type : 'retail';
  const raw = priceType === 'wholesale' ? product.wholesale_price : product.retail_price;
  return Number(raw);
};
