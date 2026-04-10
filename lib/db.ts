// lib/db.ts
// Typed wrapper around Cloudflare D1
// Usage: const db = getDB(request) — passes in the D1 binding from the CF env

import { D1Database, D1Result } from '@cloudflare/workers-types';

declare global {
  // Augmented to carry CF bindings (set by next-on-pages / CF Pages runtime)
  // eslint-disable-next-line no-var
  var __D1_DB__: D1Database | undefined;
}

// In CF Pages runtime, bindings are available via process.env or globalThis
// next-on-pages exposes them through the request context
export function getDB(): D1Database {
  // CF Workers runtime
  if (typeof globalThis !== 'undefined' && (globalThis as any).DB) {
    return (globalThis as any).DB as D1Database;
  }
  throw new Error('D1 binding not found. Ensure DB is bound in wrangler.toml');
}

// ── Generic query helpers ──────────────────────────────────────

export async function dbAll<T = Record<string, unknown>>(
  db: D1Database,
  query: string,
  params: unknown[] = []
): Promise<T[]> {
  const stmt = db.prepare(query);
  const result = await stmt.bind(...params).all<T>();
  return result.results;
}

export async function dbFirst<T = Record<string, unknown>>(
  db: D1Database,
  query: string,
  params: unknown[] = []
): Promise<T | null> {
  const stmt = db.prepare(query);
  const result = await stmt.bind(...params).first<T>();
  return result ?? null;
}

export async function dbRun(
  db: D1Database,
  query: string,
  params: unknown[] = []
): Promise<D1Result> {
  const stmt = db.prepare(query);
  return stmt.bind(...params).run();
}

export async function dbBatch(
  db: D1Database,
  statements: { query: string; params?: unknown[] }[]
): Promise<D1Result[]> {
  const prepared = statements.map(({ query, params = [] }) =>
    db.prepare(query).bind(...params)
  );
  return db.batch(prepared);
}

// ── ID generator ──────────────────────────────────────────────

export function generateId(): string {
  // Use crypto.randomUUID if available (CF Workers has it)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID().replace(/-/g, '');
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// ── Receipt number ────────────────────────────────────────────

export function generateReceiptNumber(prefix: 'MNT' | 'DEV' | 'HSE'): string {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `${prefix}-${year}${month}-${rand}`;
}
