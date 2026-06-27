/**
 * 012 — stock_qty trigger. AFTER INSERT on stock_movements, adjust the product's
 * stock_qty (tenant-scoped) and, when it drops below min_stock_level, raise a
 * single open LOW_STOCK notification (deduped by the partial unique index).
 */
export const up = (pgm) => {
  pgm.sql(`
    CREATE OR REPLACE FUNCTION update_stock_qty()
    RETURNS TRIGGER AS $$
    DECLARE
      prod RECORD;
    BEGIN
      UPDATE products
      SET stock_qty = stock_qty + NEW.quantity, updated_at = NOW()
      WHERE id = NEW.product_id AND tenant_id = NEW.tenant_id
      RETURNING stock_qty, min_stock_level, name INTO prod;

      IF prod.stock_qty < prod.min_stock_level THEN
        INSERT INTO notifications (tenant_id, type, product_id, message, visible_to_roles)
        VALUES (
          NEW.tenant_id, 'LOW_STOCK', NEW.product_id,
          'Bidhaa "' || prod.name || '" imepungua chini ya kiwango cha chini.',
          ARRAY['shop_admin', 'manager', 'store_keeper']
        )
        ON CONFLICT (tenant_id, product_id) WHERE type = 'LOW_STOCK' DO NOTHING;
      END IF;

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  pgm.sql(`
    CREATE TRIGGER trg_update_stock_qty
    AFTER INSERT ON stock_movements
    FOR EACH ROW EXECUTE FUNCTION update_stock_qty();
  `);
};

export const down = (pgm) => {
  pgm.sql('DROP TRIGGER IF EXISTS trg_update_stock_qty ON stock_movements;');
  pgm.sql('DROP FUNCTION IF EXISTS update_stock_qty();');
};
