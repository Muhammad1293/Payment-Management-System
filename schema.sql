-- ============================================================
-- AF Garden Society – Payment Management System
-- Database Schema (Cloudflare D1 / SQLite)
-- ============================================================



-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id          TEXT    PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name        TEXT    NOT NULL,
  email       TEXT    NOT NULL UNIQUE,
  password    TEXT    NOT NULL,           -- bcrypt hash
  role        TEXT    NOT NULL CHECK (role IN ('admin','accountant','supervisor')),
  is_active   INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- HOUSES
-- ============================================================
CREATE TABLE IF NOT EXISTS houses (
  id           TEXT    PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  house_number TEXT    NOT NULL UNIQUE,
  owner_name   TEXT,
  -- one-time house-level charges
  dev_charge_status   TEXT NOT NULL DEFAULT 'unpaid' CHECK (dev_charge_status   IN ('paid','unpaid')),
  elec_charge_status  TEXT NOT NULL DEFAULT 'unpaid' CHECK (elec_charge_status  IN ('paid','unpaid')),
  gas_charge_status   TEXT NOT NULL DEFAULT 'unpaid' CHECK (gas_charge_status   IN ('paid','unpaid')),
  dev_charge_paid_at  TEXT,
  elec_charge_paid_at TEXT,
  gas_charge_paid_at  TEXT,
  dev_charge_amount   REAL DEFAULT 0,
  elec_charge_amount  REAL DEFAULT 0,
  gas_charge_amount   REAL DEFAULT 0,
  notes        TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- RESIDENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS residents (
  id                   TEXT    PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  house_id             TEXT    NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  name                 TEXT    NOT NULL,
  email                TEXT,
  phone                TEXT,
  resident_type        TEXT    NOT NULL CHECK (resident_type IN ('owner','tenant')),
  floor_number         INTEGER,
  monthly_charge       REAL    NOT NULL DEFAULT 0,
  status               TEXT    NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at           TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- MONTHLY MAINTENANCE DUES
-- Auto-generated each month per active resident
-- ============================================================
CREATE TABLE IF NOT EXISTS maintenance_dues (
  id           TEXT    PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  resident_id  TEXT    NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  house_id     TEXT    NOT NULL REFERENCES houses(id)    ON DELETE CASCADE,
  month        INTEGER NOT NULL,   -- 1-12
  year         INTEGER NOT NULL,
  amount       REAL    NOT NULL,
  status       TEXT    NOT NULL DEFAULT 'unpaid' CHECK (status IN ('paid','unpaid')),
  paid_at      TEXT,
  created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE (resident_id, month, year)   -- prevent duplicates
);

-- ============================================================
-- MAINTENANCE PAYMENTS
-- One payment can cover multiple dues (multi-month)
-- ============================================================
CREATE TABLE IF NOT EXISTS maintenance_payments (
  id             TEXT  PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  resident_id    TEXT  NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  house_id       TEXT  NOT NULL REFERENCES houses(id)    ON DELETE CASCADE,
  collected_by   TEXT  NOT NULL REFERENCES users(id),
  total_amount   REAL  NOT NULL,
  payment_date   TEXT  NOT NULL DEFAULT (datetime('now')),
  receipt_number TEXT  NOT NULL UNIQUE,
  notes          TEXT,
  created_at     TEXT  NOT NULL DEFAULT (datetime('now'))
);

-- junction: which dues are covered by a payment
CREATE TABLE IF NOT EXISTS payment_dues (
  payment_id TEXT NOT NULL REFERENCES maintenance_payments(id) ON DELETE CASCADE,
  due_id     TEXT NOT NULL REFERENCES maintenance_dues(id)     ON DELETE CASCADE,
  PRIMARY KEY (payment_id, due_id)
);

-- ============================================================
-- SOCIETY DEVELOPMENT EVENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS development_events (
  id                  TEXT  PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  title               TEXT  NOT NULL,
  description         TEXT,
  contribution_amount REAL  NOT NULL,
  event_date          TEXT  NOT NULL,
  created_by          TEXT  NOT NULL REFERENCES users(id),
  created_at          TEXT  NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT  NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- SOCIETY DEVELOPMENT CONTRIBUTIONS
-- Per resident per event
-- ============================================================
CREATE TABLE IF NOT EXISTS development_contributions (
  id             TEXT  PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  event_id       TEXT  NOT NULL REFERENCES development_events(id) ON DELETE CASCADE,
  resident_id    TEXT  NOT NULL REFERENCES residents(id)          ON DELETE CASCADE,
  house_id       TEXT  NOT NULL REFERENCES houses(id)             ON DELETE CASCADE,
  amount         REAL  NOT NULL,
  status         TEXT  NOT NULL DEFAULT 'unpaid' CHECK (status IN ('paid','unpaid')),
  paid_at        TEXT,
  collected_by   TEXT  REFERENCES users(id),
  receipt_number TEXT  UNIQUE,
  notes          TEXT,
  created_at     TEXT  NOT NULL DEFAULT (datetime('now')),
  UNIQUE (event_id, resident_id)   -- one contribution per resident per event
);

-- ============================================================
-- EXPENSE CATEGORIES
-- ============================================================
CREATE TABLE IF NOT EXISTS expense_categories (
  id         TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name       TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- EXPENSES
-- ============================================================
CREATE TABLE IF NOT EXISTS expenses (
  id          TEXT  PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  category_id TEXT  REFERENCES expense_categories(id) ON DELETE SET NULL,
  title       TEXT  NOT NULL,
  amount      REAL  NOT NULL,
  expense_date TEXT NOT NULL,
  recorded_by TEXT  NOT NULL REFERENCES users(id),
  notes       TEXT,
  created_at  TEXT  NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT  NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- RECEIPTS  (audit log of all generated PDFs)
-- ============================================================
CREATE TABLE IF NOT EXISTS receipts (
  id             TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  receipt_number TEXT NOT NULL UNIQUE,
  receipt_type   TEXT NOT NULL CHECK (receipt_type IN ('maintenance','development','house_charge')),
  reference_id   TEXT NOT NULL,   -- maintenance_payments.id or development_contributions.id
  resident_id    TEXT REFERENCES residents(id),
  house_id       TEXT REFERENCES houses(id),
  amount         REAL NOT NULL,
  issued_at      TEXT NOT NULL DEFAULT (datetime('now')),
  emailed        INTEGER NOT NULL DEFAULT 0,
  emailed_at     TEXT
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_residents_house       ON residents(house_id);
CREATE INDEX IF NOT EXISTS idx_dues_resident         ON maintenance_dues(resident_id);
CREATE INDEX IF NOT EXISTS idx_dues_status           ON maintenance_dues(status);
CREATE INDEX IF NOT EXISTS idx_dues_month_year       ON maintenance_dues(year, month);
CREATE INDEX IF NOT EXISTS idx_payments_resident     ON maintenance_payments(resident_id);
CREATE INDEX IF NOT EXISTS idx_contributions_event   ON development_contributions(event_id);
CREATE INDEX IF NOT EXISTS idx_contributions_resident ON development_contributions(resident_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date         ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_receipts_type         ON receipts(receipt_type);
