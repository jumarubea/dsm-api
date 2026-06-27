const escape = (v) => {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/**
 * Convert an array of flat objects to CSV. Only scalar fields (string/number/
 * boolean) from the first row are included; nested arrays/objects are skipped.
 */
export const toCsv = (rows) => {
  if (!rows || rows.length === 0) return '';
  const keys = Object.keys(rows[0]).filter((k) => {
    const v = rows[0][k];
    return v === null || ['string', 'number', 'boolean'].includes(typeof v);
  });
  const header = keys.join(',');
  const lines = rows.map((r) => keys.map((k) => escape(r[k])).join(','));
  return [header, ...lines].join('\n');
};
