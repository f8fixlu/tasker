const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Initialize database
const dbPath = path.resolve(__dirname, '../database/tasker.db');
const db = new sqlite3.Database(dbPath);

// Database initialization function
function setupDatabase(callback) {
  // Initialize the status tracker
  const StatusTracker = require('../utils/statusTracker');
  StatusTracker.initialize().catch(console.error);
  // Create users table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    profile_image_url TEXT,
    reset_token TEXT,
    reset_token_expiry DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`, function(err) {
    if (err) {
      console.error('Error creating users table:', err);
      if (callback) callback(err);
      return;
    }

    // Continue with other table creations and alterations
    createOtherTablesAndColumns(callback);
  });
}

function createOtherTablesAndColumns(callback) {
  // Create task_categories table
  db.run(`CREATE TABLE IF NOT EXISTS task_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    color TEXT,
    user_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);

  // Create task_types table
  db.run(`CREATE TABLE IF NOT EXISTS task_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category_id INTEGER,
    user_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES task_categories(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);

  // Create task_sub_types table
  db.run(`CREATE TABLE IF NOT EXISTS task_sub_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type_id INTEGER,
    user_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    description TEXT DEFAULT NULL,
    FOREIGN KEY (type_id) REFERENCES task_types(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);

  // Create tasks table
  db.run(`CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    category_id INTEGER,
    type_id INTEGER,
    sub_type_id INTEGER,
    quantity INTEGER DEFAULT 1,
    priority TEXT DEFAULT 'Medium' CHECK(priority IN ('Low', 'Medium', 'High')),
    due_date DATETIME,
    created_date DATETIME,
    task_date DATETIME,
    status TEXT DEFAULT 'Pending' CHECK(status IN ('Pending', 'In Progress', 'Completed', 'Overdue', 'Archived')),
    user_id INTEGER NOT NULL,
    edited_date DATETIME,
    FOREIGN KEY (category_id) REFERENCES task_categories(id) ON DELETE SET NULL,
    FOREIGN KEY (type_id) REFERENCES task_types(id) ON DELETE SET NULL,
    FOREIGN KEY (sub_type_id) REFERENCES task_sub_types(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);

  // Create event_categories table
  db.run(`CREATE TABLE IF NOT EXISTS event_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    color TEXT,
    user_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);

  // Create event_types table
  db.run(`CREATE TABLE IF NOT EXISTS event_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category_id INTEGER,
    user_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES event_categories(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);

  // Create events table
  db.run(`CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    start_date DATETIME NOT NULL,
    end_date DATETIME NOT NULL,
    is_whole_day INTEGER DEFAULT 0,
    category_id INTEGER,
    event_type_id INTEGER,
    location TEXT,
    user_id INTEGER NOT NULL,
    created_at DATETIME,
    updated_at DATETIME,
    color_class TEXT,
    status TEXT DEFAULT 'Scheduled' CHECK(status IN ('Scheduled', 'In Progress', 'Completed', 'Cancelled')),
    notified_upcoming INTEGER DEFAULT 0,
    FOREIGN KEY (category_id) REFERENCES event_categories(id) ON DELETE SET NULL,
    FOREIGN KEY (event_type_id) REFERENCES event_types(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);

  // Create indexes for better performance
  db.run(`CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_tasks_category_id ON tasks(category_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_tasks_created_date ON tasks(created_date)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_tasks_edited_date ON tasks(edited_date)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_tasks_task_date ON tasks(task_date)`);

  // Composite indexes for common query patterns
  db.run(`CREATE INDEX IF NOT EXISTS idx_tasks_user_status ON tasks(user_id, status)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_tasks_user_category ON tasks(user_id, category_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_tasks_user_due_date ON tasks(user_id, due_date)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_tasks_user_created_date ON tasks(user_id, created_date)`);

  // Additional indexes for events
  db.run(`CREATE INDEX IF NOT EXISTS idx_events_start_date ON events(start_date)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_events_category_id ON events(category_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_events_status ON events(status)`);

  // Composite indexes for events
  db.run(`CREATE INDEX IF NOT EXISTS idx_events_user_start_date ON events(user_id, start_date)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_events_user_category ON events(user_id, category_id)`);

  // Indexes for other tables that might be used in joins
  db.run(`CREATE INDEX IF NOT EXISTS idx_task_categories_user_id ON task_categories(user_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_task_types_user_id ON task_types(user_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_task_sub_types_user_id ON task_sub_types(user_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_event_categories_user_id ON event_categories(user_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_event_types_user_id ON event_types(user_id)`);

  // Add location column if it doesn't exist (for existing databases)
  db.run(`ALTER TABLE events ADD COLUMN location TEXT`, (err) => {
    if (err) {
      // Column might already exist, which is fine
      console.log('Note: Location column may already exist or table is not ready yet');
    } else {
      console.log('Location column added to events table successfully');
    }
  });

  // Add status column if it doesn't exist (for existing databases)
  db.run(`ALTER TABLE events ADD COLUMN status TEXT DEFAULT 'Scheduled' CHECK(status IN ('Scheduled', 'In Progress', 'Completed', 'Cancelled'))`, (err) => {
    if (err) {
      // Column might already exist, which is fine
      console.log('Note: Status column may already exist or table is not ready yet');
    } else {
      console.log('Status column added to events table successfully');
    }
  });

  // Add notified_upcoming column if it doesn't exist (for existing databases)
  db.run(`ALTER TABLE events ADD COLUMN notified_upcoming INTEGER DEFAULT 0`, (err) => {
    if (err) {
      // Column might already exist, which is fine
      console.log('Note: notified_upcoming column may already exist or table is not ready yet');
    } else {
      console.log('Notified_upcoming column added to events table successfully');
    }
  });

  // Add event_type_id column if it doesn't exist (for existing databases)
  db.run(`ALTER TABLE events ADD COLUMN event_type_id INTEGER`, (err) => {
    if (err) {
      // Column might already exist, which is fine
      console.log('Note: event_type_id column may already exist or table is not ready yet');
    } else {
      console.log('event_type_id column added to events table successfully');
    }
  });

  // Create attachments table
  db.run(`CREATE TABLE IF NOT EXISTS attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    filepath TEXT NOT NULL,
    file_type TEXT,
    file_size INTEGER,
    task_id INTEGER,
    event_id INTEGER,
    user_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);

  // Create notifications table
  db.run(`CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    message TEXT,
    type TEXT CHECK(type IN ('task', 'event', 'general', 'info', 'warning', 'success', 'system')),
    is_read INTEGER DEFAULT 0,
    user_id INTEGER NOT NULL,
    related_task_id INTEGER,
    related_event_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (related_task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (related_event_id) REFERENCES events(id) ON DELETE CASCADE
  )`);

  // Create sessions table
  db.run(`CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL UNIQUE,
    user_id INTEGER NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    last_activity_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);

  // Create token_blacklist table
  db.run(`CREATE TABLE IF NOT EXISTS token_blacklist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token TEXT NOT NULL UNIQUE,
    user_id INTEGER NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);

  // Add reset_token column if it doesn't exist (for existing databases)
  db.run(`ALTER TABLE users ADD COLUMN reset_token TEXT`, (err) => {
    if (err) {
      // Column might already exist, which is fine
      console.log('Note: reset_token column may already exist or table is not ready yet');
    } else {
      console.log('reset_token column added to users table successfully');
    }
  });

  // Add reset_token_expiry column if it doesn't exist (for existing databases)
  db.run(`ALTER TABLE users ADD COLUMN reset_token_expiry DATETIME`, (err) => {
    if (err) {
      // Column might already exist, which is fine
      console.log('Note: reset_token_expiry column may already exist or table is not ready yet');
    } else {
      console.log('reset_token_expiry column added to users table successfully');
    }
  });

  // Add welcome_shown column if it doesn't exist (for existing databases)
  db.run(`ALTER TABLE users ADD COLUMN welcome_shown INTEGER DEFAULT 0`, (err) => {
    if (err) {
      // Column might already exist, which is fine
      console.log('Note: welcome_shown column may already exist or table is not ready yet');
    } else {
      console.log('welcome_shown column added to users table successfully');
    }
  });

  // Add role column if it doesn't exist (for existing databases)
  db.run(`ALTER TABLE users ADD COLUMN role TEXT DEFAULT NULL`, (err) => {
    if (err) {
      // Column might already exist, which is fine
      console.log('Note: role column may already exist or table is not ready yet');
    } else {
      console.log('role column added to users table successfully');
    }
  });

  // Add task_date column if it doesn't exist (for existing databases)
  db.run(`ALTER TABLE tasks ADD COLUMN task_date DATETIME`, (err) => {
    if (err) {
      // Column might already exist, which is fine
      console.log('Note: task_date column may already exist or table is not ready yet');
    } else {
      console.log('task_date column added to tasks table successfully');
    }
  });

  // Add status column to users table for tracking online/offline status
  db.run(`ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'offline' CHECK(status IN ('online', 'offline', 'pending_offline'))`, (err) => {
    if (err) {
      // Column might already exist, which is fine
      console.log('Note: status column may already exist or table is not ready yet');
    } else {
      console.log('status column added to users table successfully');
    }
  });

  // Add status_updated_at column to users table for tracking when status was last updated
  db.run(`ALTER TABLE users ADD COLUMN status_updated_at DATETIME`, (err) => {
    if (err) {
      // Column might already exist, which is fine
      console.log('Note: status_updated_at column may already exist or table is not ready yet');
    } else {
      console.log('status_updated_at column added to users table successfully');
      // Update existing records to have current timestamp
      db.run(`UPDATE users SET status_updated_at = datetime('now')`, (updateErr) => {
        if (updateErr) {
          console.log('Note: Could not update existing records with timestamp');
        } else {
          console.log('Existing records updated with current timestamp');
        }
      });
    }
  });

  // Create status_history table to track all status changes
  db.run(`CREATE TABLE IF NOT EXISTS status_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    previous_status TEXT,
    new_status TEXT NOT NULL,
    changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    reason TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`, (err) => {
    if (err) {
      console.error('Error creating status_history table:', err);
    } else {
      console.log('status_history table created or already exists');
    }
  });

  // Create an index for faster queries by user_id and changed_at
  db.run(`CREATE INDEX IF NOT EXISTS idx_status_history_user_time
    ON status_history(user_id, changed_at)`, (err) => {
    if (err) {
      console.log('Note: status_history index may already exist');
    } else {
      console.log('status_history index created successfully');
    }
  });

  // Add signatories column if it doesn't exist (for existing databases)
  db.run(`ALTER TABLE users ADD COLUMN signatories TEXT`, (err) => {
    if (err) {
      // Column might already exist, which is fine
      console.log('Note: signatories column may already exist or table is not ready yet');
    } else {
      console.log('signatories column added to users table successfully');
    }
  });

  // Add header_image column if it doesn't exist (for existing databases)
  db.run(`ALTER TABLE users ADD COLUMN header_image TEXT`, (err) => {
    if (err) {
      console.log('Note: header_image column may already exist or table is not ready yet');
    } else {
      console.log('header_image column added to users table successfully');
    }
  });

  // Add footer_image column if it doesn't exist (for existing databases)
  db.run(`ALTER TABLE users ADD COLUMN footer_image TEXT`, (err) => {
    if (err) {
      console.log('Note: footer_image column may already exist or table is not ready yet');
    } else {
      console.log('footer_image column added to users table successfully');
    }
  });

  // Add show_default_header column if it doesn't exist (for existing databases)
  db.run(`ALTER TABLE users ADD COLUMN show_default_header INTEGER DEFAULT 1`, (err) => {
    if (err) {
      console.log('Note: show_default_header column may already exist or table is not ready yet');
    } else {
      console.log('show_default_header column added to users table successfully');
    }
  });

  // Add report_title column if it doesn't exist (for existing databases)
  db.run(`ALTER TABLE users ADD COLUMN report_title TEXT DEFAULT 'ACCOMPLISHMENT REPORT'`, (err) => {
    if (err) {
      console.log('Note: report_title column may already exist or table is not ready yet');
    } else {
      console.log('report_title column added to users table successfully');
    }
  });

  // Add header_on_all_pages column if it doesn't exist (for existing databases)
  db.run(`ALTER TABLE users ADD COLUMN header_on_all_pages INTEGER DEFAULT 1`, (err) => {
    if (err) {
      console.log('Note: header_on_all_pages column may already exist or table is not ready yet');
    } else {
      console.log('header_on_all_pages column added to users table successfully');
    }
  });

  console.log('Database initialized successfully');

  if (callback) callback(null);
}

module.exports = { db, setupDatabase };