-- Add indexes to improve query performance
-- Run this script to add indexes to the database

-- Indexes for tasks table
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_category_id ON tasks(category_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_created_date ON tasks(created_date);
CREATE INDEX IF NOT EXISTS idx_tasks_edited_date ON tasks(edited_date);
CREATE INDEX IF NOT EXISTS idx_tasks_task_date ON tasks(task_date);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_tasks_user_status ON tasks(user_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_user_category ON tasks(user_id, category_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_due_date ON tasks(user_id, due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_user_created_date ON tasks(user_id, created_date);

-- Indexes for events table
CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_start_date ON events(start_date);
CREATE INDEX IF NOT EXISTS idx_events_category_id ON events(category_id);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);

-- Composite indexes for events
CREATE INDEX IF NOT EXISTS idx_events_user_start_date ON events(user_id, start_date);
CREATE INDEX IF NOT EXISTS idx_events_user_category ON events(user_id, category_id);

-- Indexes for other tables that might be used in joins
CREATE INDEX IF NOT EXISTS idx_task_categories_user_id ON task_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_task_types_user_id ON task_types(user_id);
CREATE INDEX IF NOT EXISTS idx_task_sub_types_user_id ON task_sub_types(user_id);
CREATE INDEX IF NOT EXISTS idx_event_categories_user_id ON event_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_event_types_user_id ON event_types(user_id);