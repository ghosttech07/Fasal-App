import crypto from 'node:crypto';
import { env } from '../env';

const key = Buffer.from(env.PII_ENCRYPTION_KEY_B64, 'base64');

/** AES-256-GCM for C1/C2 PII fields. Output: base64(iv | tag | ciphertext). */
export function encrypt(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), data]).toString('base64');
}

export function decrypt(blob: string): string {
  const raw = Buffer.from(blob, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, raw.subarray(0, 12));
  decipher.setAuthTag(raw.subarray(12, 28));
  return Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString('utf8');
}

/** Keyed hash for dedup lookups (phone, ID number, VPA) without storing raw values. */
export const hmac = (value: string, secret = env.PII_HASH_PEPPER) =>
  crypto.createHmac('sha256', secret).update(value).digest('hex');

export const sha256 = (value: string | Buffer) =>
  crypto.createHash('sha256').update(value).digest('hex');

export const randomToken = () => crypto.randomBytes(32).toString('base64url');
