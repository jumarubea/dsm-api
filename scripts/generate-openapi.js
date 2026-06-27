/**
 * Write the OpenAPI spec to docs/openapi.json for offline import (e.g. Postman).
 *   npm run docs:gen
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { buildOpenApiSpec } from '../src/docs/openapi.js';

mkdirSync('docs', { recursive: true });
writeFileSync('docs/openapi.json', JSON.stringify(buildOpenApiSpec(), null, 2));
// eslint-disable-next-line no-console
console.log('Wrote docs/openapi.json');
