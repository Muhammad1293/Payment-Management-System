// lib/cf-env.ts
import type { D1Database } from '@cloudflare/workers-types';

export interface CFEnv {
  DB: D1Database;
  JWT_SECRET: string;
  RESEND_API_KEY: string;
  APP_URL: string;
  RECEIPT_EMAIL_FROM: string;
}

export function getCFEnv(): CFEnv {
  // OpenNext injects CF bindings into process.env and globalThis
  const env = (globalThis as any).__env__ ||
               (globalThis as any).env    ||
               process.env;

  return {
    DB:                 env.DB                 as D1Database,
    JWT_SECRET:         env.JWT_SECRET         || 'dev-secret-key-minimum-32-characters!!',
    RESEND_API_KEY:     env.RESEND_API_KEY     || '',
    APP_URL:            env.APP_URL             || '',
    RECEIPT_EMAIL_FROM: env.RECEIPT_EMAIL_FROM || 'noreply@afgarden.com',
  };
}