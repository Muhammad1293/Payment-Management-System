// lib/cf-env.ts
// next-on-pages exposes CF bindings via getRequestContext()
// Use this in every API route to get D1

import { getRequestContext } from '@cloudflare/next-on-pages';
import type { D1Database } from '@cloudflare/workers-types';

export interface CFEnv {
  DB: D1Database;
  JWT_SECRET: string;
  RESEND_API_KEY: string;
  APP_URL: string;
  RECEIPT_EMAIL_FROM: string;
}

export function getCFEnv(): CFEnv {
  try {
    const ctx = getRequestContext();
    return ctx.env as unknown as CFEnv;
  } catch {
    // Local dev fallback (when not running through CF runtime)
    return {
      DB: (globalThis as any).DB,
      JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-32-chars-minimum-here!!',
      RESEND_API_KEY: process.env.RESEND_API_KEY || '',
      APP_URL: process.env.APP_URL || 'http://localhost:3000',
      RECEIPT_EMAIL_FROM: process.env.RECEIPT_EMAIL_FROM || 'noreply@afgarden.com',
    };
  }
}
