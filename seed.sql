-- ============================================================
-- AF Garden Society – PMS Seed Data
-- Run AFTER schema.sql
-- ============================================================

-- Default expense categories
INSERT OR IGNORE INTO expense_categories (id, name) VALUES
  ('cat-cleaning',    'Cleaning & Sanitation'),
  ('cat-electricity', 'Electricity'),
  ('cat-water',       'Water Supply'),
  ('cat-security',    'Security'),
  ('cat-maintenance', 'General Maintenance'),
  ('cat-equipment',   'Equipment & Tools'),
  ('cat-salaries',    'Staff Salaries'),
  ('cat-misc',        'Miscellaneous');

-- Default Admin user
-- Email: admin@afgarden.com  |  Password: Admin@1234  (change immediately!)
-- Password hash below is bcrypt of "Admin@1234" with 10 rounds
INSERT OR IGNORE INTO users (id, name, email, password, role) VALUES (
  'user-admin-001',
  'System Admin',
  'admin@afgarden.com',
  '$2b$10$rOzJqBg0R1Fz4c2g1h0KP.W2TrHxKJMGYN/lrBNHv3kJ0P7kZe4Sy',
  'admin'
);
