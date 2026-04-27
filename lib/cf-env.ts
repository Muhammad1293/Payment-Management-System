import type { D1Database } from '@cloudflare/workers-types';
import { getCloudflareContext } from '@opennextjs/cloudflare';

export interface CFEnv {
  DB: D1Database;
  JWT_SECRET: string;
  RESEND_API_KEY: string;
  APP_URL: string;
  RECEIPT_EMAIL_FROM: string;
}

export async function getCFEnv(): Promise<CFEnv> {
  const ctx = await getCloudflareContext({ async: true });
  const env = ctx.env as any;

  if (!env.DB) {
    throw new Error('D1 DB binding not found. Check wrangler.toml [[d1_databases]]');
  }

  return {
    DB:                 env.DB,
    JWT_SECRET:         env.JWT_SECRET         || 'dev-secret-key-minimum-32-characters!!',
    RESEND_API_KEY:     env.RESEND_API_KEY     || '',
    APP_URL:            env.APP_URL             || '',
    RECEIPT_EMAIL_FROM: env.RECEIPT_EMAIL_FROM || 'afgardenwelfare@gmail.com',
  };
}