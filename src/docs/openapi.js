import { z } from 'zod';
import { loginSchema } from '../modules/api/auth/validation.js';
import {
  createTenantSchema,
  updateTenantSchema,
  billingEventSchema,
} from '../modules/admin/tenants/validation.js';
import { createPlanSchema, updatePlanSchema } from '../modules/admin/plans/validation.js';
import {
  createUserSchema,
  updateUserSchema,
  languageSchema,
} from '../modules/api/users/validation.js';
import {
  createCategorySchema,
  updateCategorySchema,
} from '../modules/api/categories/validation.js';
import {
  createProductSchema,
  updateProductSchema,
  pricingRuleSchema,
} from '../modules/api/products/validation.js';
import { stockInSchema, adjustmentSchema } from '../modules/api/inventory/validation.js';
import {
  createSaleSchema,
  confirmPaymentSchema,
  voidSchema,
  orderStatusSchema,
  mpesaInitiateSchema,
} from '../modules/api/sales/validation.js';
import { createCustomerSchema, updateCustomerSchema } from '../modules/api/customers/validation.js';

const json = (schema) => {
  try {
    return z.toJSONSchema(schema, { io: 'input' });
  } catch {
    return { type: 'object' };
  }
};

// method, path, { tag, summary, body, security, idem, roles }
const ep = (method, path, opts) => ({ method, path, ...opts });

const MANIFEST = [
  // Health
  ep('get', '/health', { tag: 'Health', summary: 'Service health', security: false }),

  // Shop auth (public)
  ep('post', '/api/v1/auth/login', {
    tag: 'Auth',
    summary: 'Login',
    body: loginSchema,
    security: false,
  }),
  ep('post', '/api/v1/auth/refresh', {
    tag: 'Auth',
    summary: 'Refresh access token (refresh cookie)',
    security: false,
  }),
  ep('post', '/api/v1/auth/logout', { tag: 'Auth', summary: 'Logout', security: false }),

  // Admin — tenants
  ep('get', '/admin/v1/tenants', {
    tag: 'Admin · Tenants',
    summary: 'List tenants',
    roles: 'super_admin',
  }),
  ep('post', '/admin/v1/tenants', {
    tag: 'Admin · Tenants',
    summary: 'Create tenant (+owner +trial sub +email)',
    body: createTenantSchema,
    roles: 'super_admin',
  }),
  ep('get', '/admin/v1/tenants/:id', {
    tag: 'Admin · Tenants',
    summary: 'Tenant detail',
    roles: 'super_admin',
  }),
  ep('patch', '/admin/v1/tenants/:id', {
    tag: 'Admin · Tenants',
    summary: 'Update tenant',
    body: updateTenantSchema,
    roles: 'super_admin',
  }),
  ep('post', '/admin/v1/tenants/:id/suspend', {
    tag: 'Admin · Tenants',
    summary: 'Suspend tenant',
    roles: 'super_admin',
  }),
  ep('post', '/admin/v1/tenants/:id/activate', {
    tag: 'Admin · Tenants',
    summary: 'Activate tenant',
    roles: 'super_admin',
  }),
  ep('delete', '/admin/v1/tenants/:id', {
    tag: 'Admin · Tenants',
    summary: 'Soft-delete tenant',
    roles: 'super_admin',
  }),
  ep('post', '/admin/v1/tenants/:id/impersonate', {
    tag: 'Admin · Tenants',
    summary: 'Impersonate tenant (2h token)',
    roles: 'super_admin',
  }),
  ep('get', '/admin/v1/tenants/:id/billing', {
    tag: 'Admin · Billing',
    summary: 'Billing history',
    roles: 'super_admin',
  }),
  ep('post', '/admin/v1/tenants/:id/billing', {
    tag: 'Admin · Billing',
    summary: 'Record billing event',
    body: billingEventSchema,
    roles: 'super_admin',
  }),

  // Admin — plans
  ep('get', '/admin/v1/plans', {
    tag: 'Admin · Plans',
    summary: 'List plans',
    roles: 'super_admin',
  }),
  ep('post', '/admin/v1/plans', {
    tag: 'Admin · Plans',
    summary: 'Create plan',
    body: createPlanSchema,
    roles: 'super_admin',
  }),
  ep('patch', '/admin/v1/plans/:id', {
    tag: 'Admin · Plans',
    summary: 'Update plan',
    body: updatePlanSchema,
    roles: 'super_admin',
  }),
  ep('delete', '/admin/v1/plans/:id', {
    tag: 'Admin · Plans',
    summary: 'Deactivate plan',
    roles: 'super_admin',
  }),

  // Admin — platform dashboard
  ep('get', '/admin/v1/dashboard', {
    tag: 'Admin · Dashboard',
    summary: 'Platform summary (MRR, trials, past-due)',
    roles: 'super_admin',
  }),
  ep('get', '/admin/v1/dashboard/tenants-health', {
    tag: 'Admin · Dashboard',
    summary: 'Per-tenant health',
    roles: 'super_admin',
  }),

  // Shop — subscription
  ep('get', '/api/v1/subscription', {
    tag: 'Subscription',
    summary: 'Own subscription, limits, usage',
    roles: 'shop_admin',
  }),

  // Shop — users
  ep('get', '/api/v1/users', { tag: 'Users', summary: 'List users', roles: 'shop_admin' }),
  ep('post', '/api/v1/users', {
    tag: 'Users',
    summary: 'Create user (plan limit)',
    body: createUserSchema,
    idem: true,
    roles: 'shop_admin',
  }),
  ep('patch', '/api/v1/users/me/language', {
    tag: 'Users',
    summary: 'Set own language',
    body: languageSchema,
    idem: true,
  }),
  ep('patch', '/api/v1/users/:id', {
    tag: 'Users',
    summary: 'Update user',
    body: updateUserSchema,
    idem: true,
    roles: 'shop_admin',
  }),
  ep('delete', '/api/v1/users/:id', {
    tag: 'Users',
    summary: 'Deactivate user',
    idem: true,
    roles: 'shop_admin',
  }),

  // Shop — categories
  ep('get', '/api/v1/categories', { tag: 'Categories', summary: 'List categories' }),
  ep('post', '/api/v1/categories', {
    tag: 'Categories',
    summary: 'Create category',
    body: createCategorySchema,
    idem: true,
    roles: 'shop_admin',
  }),
  ep('patch', '/api/v1/categories/:id', {
    tag: 'Categories',
    summary: 'Update category',
    body: updateCategorySchema,
    idem: true,
    roles: 'shop_admin',
  }),
  ep('delete', '/api/v1/categories/:id', {
    tag: 'Categories',
    summary: 'Delete category',
    idem: true,
    roles: 'shop_admin',
  }),

  // Shop — products
  ep('get', '/api/v1/products', {
    tag: 'Products',
    summary: 'List products (cost_price per role)',
  }),
  ep('post', '/api/v1/products', {
    tag: 'Products',
    summary: 'Create product',
    body: createProductSchema,
    idem: true,
    roles: 'shop_admin',
  }),
  ep('get', '/api/v1/products/:id', { tag: 'Products', summary: 'Product detail' }),
  ep('get', '/api/v1/products/:id/movements', {
    tag: 'Products',
    summary: 'Stock movement history',
  }),
  ep('patch', '/api/v1/products/:id', {
    tag: 'Products',
    summary: 'Update product',
    body: updateProductSchema,
    idem: true,
    roles: 'shop_admin, manager',
  }),
  ep('delete', '/api/v1/products/:id', {
    tag: 'Products',
    summary: 'Soft-delete product',
    idem: true,
    roles: 'shop_admin',
  }),
  ep('post', '/api/v1/products/:id/pricing-rules', {
    tag: 'Products',
    summary: 'Add pricing rule',
    body: pricingRuleSchema,
    idem: true,
    roles: 'shop_admin',
  }),
  ep('delete', '/api/v1/products/:id/pricing-rules/:rid', {
    tag: 'Products',
    summary: 'Remove pricing rule',
    idem: true,
    roles: 'shop_admin',
  }),

  // Shop — inventory
  ep('post', '/api/v1/inventory/stock-in', {
    tag: 'Inventory',
    summary: 'Record stock-in',
    body: stockInSchema,
    idem: true,
    roles: 'store_keeper+',
  }),
  ep('post', '/api/v1/inventory/adjustment', {
    tag: 'Inventory',
    summary: 'Record adjustment',
    body: adjustmentSchema,
    idem: true,
    roles: 'store_keeper+',
  }),
  ep('get', '/api/v1/inventory/movements', {
    tag: 'Inventory',
    summary: 'Movements (filters: product_id, type, date_from, date_to)',
  }),
  ep('get', '/api/v1/inventory/low-stock', {
    tag: 'Inventory',
    summary: 'Low-stock products',
    roles: 'manager, store_keeper, shop_admin',
  }),
  ep('get', '/api/v1/inventory/dead-stock', { tag: 'Inventory', summary: 'Dead-stock products' }),

  // Shop — sales
  ep('get', '/api/v1/sales', {
    tag: 'Sales',
    summary: 'List sales (filters: date_from, date_to, type, status, payment_method)',
  }),
  ep('post', '/api/v1/sales', {
    tag: 'Sales',
    summary: 'Create sale/order',
    body: createSaleSchema,
    idem: true,
    roles: 'attendant+',
  }),
  ep('get', '/api/v1/sales/:id', { tag: 'Sales', summary: 'Sale detail' }),
  ep('get', '/api/v1/sales/:id/receipt', { tag: 'Sales', summary: 'Receipt (JSON)' }),
  ep('post', '/api/v1/sales/:id/confirm-payment', {
    tag: 'Sales',
    summary: 'Confirm external payment',
    body: confirmPaymentSchema,
    idem: true,
    roles: 'attendant+',
  }),
  ep('patch', '/api/v1/sales/:id/status', {
    tag: 'Sales',
    summary: 'Advance order status',
    body: orderStatusSchema,
    idem: true,
    roles: 'manager+',
  }),
  ep('post', '/api/v1/sales/:id/void', {
    tag: 'Sales',
    summary: 'Void sale (restores stock)',
    body: voidSchema,
    idem: true,
    roles: 'manager+',
  }),

  // Shop — payments (M-Pesa)
  ep('post', '/api/v1/payments/mpesa/initiate', {
    tag: 'Payments',
    summary: 'Initiate M-Pesa (manual mode until live)',
    body: mpesaInitiateSchema,
    idem: true,
    roles: 'attendant+',
  }),
  ep('get', '/api/v1/payments/mpesa/status/:saleId', {
    tag: 'Payments',
    summary: 'Poll M-Pesa status',
    roles: 'attendant+',
  }),

  // Shop — customers
  ep('get', '/api/v1/customers', { tag: 'Customers', summary: 'List/search customers (?search=)' }),
  ep('post', '/api/v1/customers', {
    tag: 'Customers',
    summary: 'Create customer',
    body: createCustomerSchema,
    idem: true,
    roles: 'attendant+',
  }),
  ep('get', '/api/v1/customers/:id', { tag: 'Customers', summary: 'Customer detail' }),
  ep('get', '/api/v1/customers/:id/history', { tag: 'Customers', summary: 'Purchase history' }),
  ep('patch', '/api/v1/customers/:id', {
    tag: 'Customers',
    summary: 'Update customer',
    body: updateCustomerSchema,
    idem: true,
    roles: 'attendant+',
  }),

  // Shop — dashboard
  ep('get', '/api/v1/dashboard/summary', {
    tag: 'Dashboard',
    summary: 'Today sales, stock value, monthly profit (privileged)',
  }),
  ep('get', '/api/v1/dashboard/chart', {
    tag: 'Dashboard',
    summary: 'Daily + monthly chart series',
  }),
  ep('get', '/api/v1/dashboard/alerts', {
    tag: 'Dashboard',
    summary: 'Low-stock + dead-stock',
    roles: 'manager, store_keeper, shop_admin',
  }),
  ep('get', '/api/v1/dashboard/orders', { tag: 'Dashboard', summary: 'Open delivery orders' }),
  ep('get', '/api/v1/dashboard/prices', {
    tag: 'Dashboard',
    summary: 'Prices (cost_price per role)',
  }),

  // Shop — reports
  ep('get', '/api/v1/reports/daily', {
    tag: 'Reports',
    summary: 'Daily report (?date, ?format=csv)',
  }),
  ep('get', '/api/v1/reports/monthly', {
    tag: 'Reports',
    summary: 'Monthly report (?month, ?format=csv)',
  }),
  ep('get', '/api/v1/reports/fast-moving', {
    tag: 'Reports',
    summary: 'Fast-moving products (?format=csv)',
  }),
  ep('get', '/api/v1/reports/dead-stock', {
    tag: 'Reports',
    summary: 'Dead-stock report (?format=csv)',
  }),
  ep('get', '/api/v1/reports/profit', {
    tag: 'Reports',
    summary: 'Profit report (?from, ?to)',
    roles: 'shop_admin, manager',
  }),
];

const GENERIC_RESPONSES = {
  200: { description: 'OK' },
  201: { description: 'Created' },
  204: { description: 'No content' },
  400: { description: 'Bad request' },
  401: { description: 'Unauthorized' },
  402: { description: 'Subscription inactive' },
  403: { description: 'Forbidden' },
  404: { description: 'Not found' },
  409: { description: 'Conflict / duplicate idempotency key' },
  422: { description: 'Validation error' },
};

export const buildOpenApiSpec = () => {
  const paths = {};
  for (const e of MANIFEST) {
    const oapiPath = e.path.replace(/:([A-Za-z]+)/g, '{$1}');
    const parameters = [...e.path.matchAll(/:([A-Za-z]+)/g)].map((m) => ({
      name: m[1],
      in: 'path',
      required: true,
      schema: { type: 'string' },
    }));
    if (e.idem) {
      parameters.push({
        name: 'Idempotency-Key',
        in: 'header',
        required: true,
        description: 'Client-generated UUID v4 (write idempotency).',
        schema: { type: 'string', format: 'uuid' },
      });
    }
    const op = {
      tags: [e.tag],
      summary: e.roles ? `${e.summary} — roles: ${e.roles}` : e.summary,
      responses: GENERIC_RESPONSES,
    };
    if (e.security !== false) op.security = [{ bearerAuth: [] }];
    if (parameters.length) op.parameters = parameters;
    if (e.body)
      op.requestBody = {
        required: true,
        content: { 'application/json': { schema: json(e.body) } },
      };

    paths[oapiPath] = paths[oapiPath] || {};
    paths[oapiPath][e.method] = op;
  }

  return {
    openapi: '3.1.0',
    info: {
      title: 'Digital Shop Manager API',
      version: '0.1.0',
      description:
        'Multi-tenant SaaS POS API.\n\n' +
        '**Auth:** call `POST /api/v1/auth/login`, then send `Authorization: Bearer <accessToken>`.\n\n' +
        '**Tenant:** in production the tenant comes from the subdomain (`shop.example.com`). ' +
        'On `localhost` the tenant is taken from the JWT, so the Bearer token alone is enough to test shop routes.\n\n' +
        '**Writes** under `/api/v1` require an `Idempotency-Key` header (UUID v4).',
    },
    servers: [{ url: 'http://localhost:3000', description: 'Local' }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
    paths,
  };
};
