/**
 * 017 — plan seat floors. User seats are a deliberate monetization lever (more
 * staff ⇒ bigger shop ⇒ higher plan), but the smallest plan must still fit one
 * of every tenant role: shop_admin (owner) + manager + sales_attendant +
 * store_keeper = 4. We give Basic 5 (room for a second attendant) and lift
 * Medium to 15. Only ever RAISES a floor, so a super-admin's manual increase is
 * never clobbered; unlimited (-1) is left untouched.
 */
export const up = (pgm) => {
  pgm.sql(`
    UPDATE subscription_plans
       SET max_users = 5
     WHERE name = 'Basic' AND max_users <> -1 AND max_users < 5;
  `);
  pgm.sql(`
    UPDATE subscription_plans
       SET max_users = 15
     WHERE name = 'Medium' AND max_users <> -1 AND max_users < 15;
  `);
};

// Raising a seat floor is not meaningfully reversible (we cannot know the prior
// value, and shops may already rely on the seats), so down is a no-op.
export const down = () => {};
