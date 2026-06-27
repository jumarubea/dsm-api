import crypto from 'node:crypto';

// Unambiguous alphabet (no 0/O/1/l/I) for readable temporary passwords.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';

/** Cryptographically-random temporary password for onboarding. */
export const generateTempPassword = (length = 12) => {
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
};
