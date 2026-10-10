import { neon } from '@neondatabase/serverless';

export function hasDbConfig(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function getDb() {
  const url = process.env.DATABASE_URL;

  if (!url) {
    throw new Error('DATABASE_URL is not configured.');
  }

  return neon(url);
}

export function getOptionalDb() {
  if (!hasDbConfig()) return null;
  return getDb();
}
