-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  color TEXT DEFAULT '#3B82F6',
  sort_order INTEGER DEFAULT 0
);

-- Task definitions (templates)
CREATE TABLE IF NOT EXISTS task_definitions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  recurrence_type TEXT NOT NULL,
  recurrence_config TEXT NOT NULL,  -- JSON for pattern-specific config
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Task instances (scheduled occurrences)
CREATE TABLE IF NOT EXISTS task_instances (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_definition_id INTEGER NOT NULL REFERENCES task_definitions(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'skipped')),
  completed_at DATETIME,
  completed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(task_definition_id, scheduled_date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_instances_date ON task_instances(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_instances_status ON task_instances(status);
CREATE INDEX IF NOT EXISTS idx_instances_definition ON task_instances(task_definition_id);
CREATE INDEX IF NOT EXISTS idx_definitions_category ON task_definitions(category_id);

-- Insert default admin user (password: admin123)
-- Note: In production, change this immediately after deployment
INSERT OR IGNORE INTO users (username, password_hash, role)
VALUES ('admin', '$argon2id$v=19$m=19456,t=2,p=1$YWRtaW4xMjNzYWx0$fHvZqJZ8kQ2Xv8Wd5L8mJQ', 'admin');

-- Insert default categories
INSERT OR IGNORE INTO categories (name, color, sort_order) VALUES
  ('Water Sampling', '#3B82F6', 1),
  ('Billing', '#10B981', 2),
  ('Maintenance and Repairs', '#F59E0B', 3),
  ('General Administration', '#8B5CF6', 4),
  ('Reporting', '#EC4899', 5),
  ('Renewals', '#EF4444', 6),
  ('Planning', '#06B6D4', 7),
  ('Conferences & Meetings', '#84CC16', 8);
