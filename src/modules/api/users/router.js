import { Router } from 'express';
import { roleGuard } from '../../../middleware/roleGuard.js';
import { validate } from '../../../middleware/validate.js';
import { createUserSchema, updateUserSchema, languageSchema } from './validation.js';
import * as ctrl from './controller.js';

/**
 * Tenant-scoped user management under /api/v1/users. The parent chain already
 * applies authenticate → resolveTenant → subscriptionGuard → checkIdempotency.
 * Management routes are shop_admin only; language self-update is open to any user.
 */
const router = Router();

router.get('/', roleGuard(['shop_admin']), ctrl.list);
router.post('/', roleGuard(['shop_admin']), validate(createUserSchema), ctrl.create);

// '/me/language' must be declared before '/:id' so 'me' is not parsed as an id.
router.patch('/me/language', validate(languageSchema), ctrl.updateOwnLanguage);

router.patch('/:id', roleGuard(['shop_admin']), validate(updateUserSchema), ctrl.update);
router.delete('/:id', roleGuard(['shop_admin']), ctrl.remove);

export default router;
