import './only-server';
import argon2 from 'argon2';

export const validPassword = (password: unknown): password is string => typeof password === 'string' && password.length >= 12 && password.length <= 128;
export function hashPassword(password: string) {
  return argon2.hash(password, { type: argon2.argon2id, memoryCost: 19456, timeCost: 3, parallelism: 1 });
}
export async function verifyPassword(hash: string, password: string) {
  try { return await argon2.verify(hash, password); } catch { return false; }
}
