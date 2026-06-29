import crypto from 'node:crypto';

/**
 * Turn a free-text shop name into a URL/subdomain-safe slug:
 * lowercase, alphanumerics and single hyphens, trimmed. Falls back to "shop"
 * if nothing usable remains.
 */
export const slugify = (text) => {
  const base = String(text || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return base || 'shop';
};

/** Append a short random suffix — used to dodge a slug collision on retry. */
export const withRandomSuffix = (slug) =>
  `${slug.slice(0, 34)}-${crypto.randomBytes(3).toString('hex')}`;
