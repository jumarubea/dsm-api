# dsm-api

Backend API for **Digital Shop Manager** — a multi-tenant SaaS POS and inventory
platform for retail and wholesale shops in Tanzania.

## Stack

- Node.js (>= 18 LTS) + Express.js
- PostgreSQL 15+ (row-level multi-tenant isolation — `tenant_id` on every shop table)
- JWT auth (HttpOnly refresh cookie) + bcrypt
- Vodacom Tanzania M-Pesa Open API (C2B + polling)

## Architecture

Two router prefixes, never mixed:

| Prefix | Scope | Required role |
|---|---|---|
| `/admin/v1/` | Super Admin platform (no tenant context) | `super_admin` |
| `/api/v1/` | Shop routes (tenant-scoped via `resolveTenant`) | shop roles |

## Getting started

```bash
npm install
cp .env.example .env   # fill in values
npm run dev
```

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Start with auto-reload |
| `npm start` | Start (production) |
| `npm test` | Run test suite |
| `npm run lint` | Lint source |
| `npm run migrate:up` | Apply database migrations |
| `npm run migrate:down` | Roll back the last migration |

## Documentation

Full SRS, database schema, API spec, and RBAC matrix live in the project
workspace under `docs/`.
