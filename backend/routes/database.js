const fs = require('fs');
const path = require('path');
const { db } = require('../config/database');

// Database backup and restore routes

// Export the entire database as a file
function databaseRoutes(req, res, parsedUrl) {
  const pathname = parsedUrl.pathname;
  const method = req.method;

  console.log(`Database route handler called - Method: ${method}, Path: ${pathname}`);

  if (method === 'GET' && pathname === '/api/database/backup') {
    // Apply authentication middleware for backup route
    const { authenticateToken } = require('../middleware/auth');

    authenticateToken(req, res, async () => {
      handleDatabaseBackup(req, res);
    });
  } else if (method === 'POST' && pathname === '/api/database/restore') {
    // This route should only be accessible to authenticated users
    // Apply authentication middleware
    const { authenticateToken } = require('../middleware/auth');

    authenticateToken(req, res, async () => {
      // Import the middleware to handle multipart form data
      const Busboy = require('busboy');
      const busboy = Busboy({ headers: req.headers });

      let databaseFile;

      busboy.on('file', (fieldname, file, info) => {
        if (fieldname === 'database') {
          const filename = info.filename;
          console.log('Uploading database file:', filename);

          // Create a temporary file to store the uploaded database
          databaseFile = {
            path: path.join(__dirname, '../temp/', filename),
            filename: filename,
            file: file
          };

          // Ensure temp directory exists
          const tempDir = path.join(__dirname, '../temp');
          if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
          }

          const writeStream = fs.createWriteStream(databaseFile.path);
          file.pipe(writeStream);
        }
      });

      busboy.on('finish', async () => {
        if (!databaseFile) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'No database file uploaded' }));
        }

        try {
          // Now we have access to req.user from the authentication middleware
          await handleDatabaseRestore(databaseFile.path, req.user.id);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ message: 'Database restored successfully' }));
        } catch (error) {
          console.error('Database restore error:', error);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Database restore failed: ' + error.message }));
        } finally {
          // Clean up the temporary file
          if (fs.existsSync(databaseFile.path)) {
            fs.unlinkSync(databaseFile.path);
          }
        }
      });

      busboy.on('error', (error) => {
        console.error('Busboy error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'File upload failed: ' + error.message }));
      });

      req.pipe(busboy);
    });
  } else {
    // Route not found
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Database route not found' }));
  }
}

// Handle database backup
async function handleDatabaseBackup(req, res) {
  try {
    const sqlite3 = require('sqlite3').verbose();
    const path = require('path');

    console.log('Starting database backup for user:', req.user.id);

    // Create a temporary database file for this user's data
    const tempDbPath = path.join(__dirname, '../temp/', `user_${req.user.id}_backup_${Date.now()}.db`);

    // Ensure temp directory exists
    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Create a new temporary database
    const tempDb = new sqlite3.Database(tempDbPath);

    console.log('Initializing temporary database schema...');
    // Initialize the temporary database with the same schema
    await initializeTempDatabaseSchema(tempDb);

    console.log('Copying user data to temporary database...');
    // Copy user-specific data to the temporary database
    await copyUserDataToTempDb(tempDb, req.user.id);

    console.log('Closing temporary database connection...');
    // Close the temporary database connection
    await new Promise((resolve, reject) => {
      tempDb.close((err) => {
        if (err) {
          console.error('Error closing temp database:', err);
          reject(err);
        } else {
          console.log('Successfully created temporary database at:', tempDbPath);
          resolve();
        }
      });
    });

    // Verify the file exists before trying to serve it
    if (!fs.existsSync(tempDbPath)) {
      throw new Error('Temporary database file was not created successfully');
    }

    const stats = fs.statSync(tempDbPath);
    console.log(`Temporary database file size: ${stats.size} bytes`);

    // Set headers for file download
    res.writeHead(200, {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="tasker_user_${req.user.id}_backup_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.db"`,
      'Content-Length': stats.size
    });

    // Create a read stream and pipe it to the response
    const readStream = fs.createReadStream(tempDbPath);
    readStream.pipe(res);

    // Clean up the temporary file after the response is sent
    readStream.on('close', () => {
      // Small delay to ensure the file is no longer in use
      setTimeout(() => {
        if (fs.existsSync(tempDbPath)) {
          fs.unlink(tempDbPath, (err) => {
            if (err) {
              console.error('Error deleting temporary backup file:', err);
            } else {
              console.log('Temporary backup file deleted:', tempDbPath);
            }
          });
        }
      }, 1000); // 1 second delay to ensure file is no longer in use
    });

    // Also clean up if there's an error during streaming
    readStream.on('error', (err) => {
      console.error('Error streaming database file:', err);
      if (fs.existsSync(tempDbPath)) {
        fs.unlink(tempDbPath, (unlinkErr) => {
          if (unlinkErr) {
            console.error('Error deleting temporary backup file after stream error:', unlinkErr);
          } else {
            console.log('Temporary backup file deleted after stream error:', tempDbPath);
          }
        });
      }
    });

  } catch (error) {
    console.error('Database backup error:', error);
    // Clean up any partially created file
    try {
      const path = require('path');
      const tempDbPath = path.join(__dirname, '../temp/', `user_${req.user.id}_backup_${Date.now()}.db`);
      if (fs.existsSync(tempDbPath)) {
        fs.unlinkSync(tempDbPath);
        console.log('Cleaned up partially created temporary database file:', tempDbPath);
      }
    } catch (cleanupError) {
      console.error('Error during cleanup:', cleanupError);
    }

    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Database backup failed: ' + error.message }));
  }
}

// Initialize the temporary database with the same schema as the main database
function initializeTempDatabaseSchema(tempDb) {
  return new Promise((resolve, reject) => {
    // SQL statements to create all the necessary tables and indices
    const createSchemaSQL = `
      PRAGMA foreign_keys = OFF;

      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        full_name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        profile_image_url TEXT,
        reset_token TEXT,
        reset_token_expiry DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL UNIQUE,
        user_id INTEGER NOT NULL,
        token TEXT NOT NULL UNIQUE,
        expires_at DATETIME NOT NULL,
        ip_address TEXT,
        user_agent TEXT,
        last_activity_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      );

      CREATE TABLE token_blacklist (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        token TEXT UNIQUE NOT NULL,
        user_id INTEGER NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      );

      CREATE TABLE task_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        color TEXT,
        user_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      );

      CREATE TABLE task_types (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category_id INTEGER,
        user_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES task_categories (id),
        FOREIGN KEY (user_id) REFERENCES users (id)
      );

      CREATE TABLE task_sub_types (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type_id INTEGER,
        user_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (type_id) REFERENCES task_types (id),
        FOREIGN KEY (user_id) REFERENCES users (id)
      );

      CREATE TABLE tasks (
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
        FOREIGN KEY (category_id) REFERENCES task_categories (id),
        FOREIGN KEY (type_id) REFERENCES task_types (id),
        FOREIGN KEY (sub_type_id) REFERENCES task_sub_types (id),
        FOREIGN KEY (user_id) REFERENCES users (id)
      );

      CREATE TABLE event_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        color TEXT,
        user_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      );

      CREATE TABLE event_types (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category_id INTEGER,
        user_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES event_categories (id),
        FOREIGN KEY (user_id) REFERENCES users (id)
      );

      CREATE TABLE events (
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
        FOREIGN KEY (category_id) REFERENCES event_categories (id),
        FOREIGN KEY (event_type_id) REFERENCES event_types (id),
        FOREIGN KEY (user_id) REFERENCES users (id)
      );

      CREATE TABLE attachments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT NOT NULL,
        filepath TEXT NOT NULL,
        file_type TEXT,
        file_size INTEGER,
        task_id INTEGER,
        event_id INTEGER,
        user_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (task_id) REFERENCES tasks (id),
        FOREIGN KEY (event_id) REFERENCES events (id),
        FOREIGN KEY (user_id) REFERENCES users (id)
      );

      CREATE TABLE notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        message TEXT,
        type TEXT CHECK(type IN ('task', 'event', 'general', 'info', 'warning', 'success', 'system')),
        is_read INTEGER DEFAULT 0,
        user_id INTEGER NOT NULL,
        related_task_id INTEGER,
        related_event_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id),
        FOREIGN KEY (related_task_id) REFERENCES tasks (id),
        FOREIGN KEY (related_event_id) REFERENCES events (id)
      );

      -- Create indices for better performance
      CREATE INDEX idx_events_user_id ON events(user_id);
      CREATE INDEX idx_tasks_user_id ON tasks(user_id);
      CREATE INDEX idx_task_categories_user_id ON task_categories(user_id);
      CREATE INDEX idx_task_types_user_id ON task_types(user_id);
      CREATE INDEX idx_task_sub_types_user_id ON task_sub_types(user_id);
      CREATE INDEX idx_event_categories_user_id ON event_categories(user_id);
      CREATE INDEX idx_event_types_user_id ON event_types(user_id);
      CREATE INDEX idx_attachments_user_id ON attachments(user_id);
      CREATE INDEX idx_notifications_user_id ON notifications(user_id);
      CREATE INDEX idx_tasks_category_id ON tasks(category_id);
      CREATE INDEX idx_tasks_type_id ON tasks(type_id);
      CREATE INDEX idx_tasks_sub_type_id ON tasks(sub_type_id);
      CREATE INDEX idx_events_category_id ON events(category_id);
      CREATE INDEX idx_events_event_type_id ON events(event_type_id);
      CREATE INDEX idx_attachments_task_id ON attachments(task_id);
      CREATE INDEX idx_attachments_event_id ON attachments(event_id);
      CREATE INDEX idx_notifications_related_task_id ON notifications(related_task_id);
      CREATE INDEX idx_notifications_related_event_id ON notifications(related_event_id);
    `;

    tempDb.exec(createSchemaSQL, (err) => {
      if (err) {
        console.error('Error creating tables and indices in temp database:', err);
        reject(err);
      } else {
        // Foreign keys remain OFF during data insertion to avoid constraint issues
        console.log('Tables and indices created in temp database with foreign keys disabled');
        resolve();
      }
    });
  });
}

// Copy user-specific data to the temporary database
function copyUserDataToTempDb(tempDb, userId) {
  return new Promise((resolve, reject) => {
    const { db } = require('../config/database'); // Main database instance

    console.log(`Starting to copy data for user ID: ${userId}`);

    // Define the order of tables to copy based on dependencies
    // Categories must come before types which depend on them
    // Types must come before subtypes which depend on them
    // Tasks/Events must come before attachments/notifications which reference them
    const orderedTables = [
      // Independent tables first
      { name: 'task_categories', cols: ['name', 'color', 'user_id', 'created_at'] },
      { name: 'event_categories', cols: ['name', 'color', 'user_id', 'created_at'] },

      // Then dependent tables in order
      { name: 'task_types', cols: ['name', 'category_id', 'user_id', 'created_at'] },
      { name: 'event_types', cols: ['name', 'category_id', 'user_id', 'created_at'] },

      // Then subtypes which depend on types
      { name: 'task_sub_types', cols: ['name', 'type_id', 'user_id', 'created_at'] },

      // Then tasks and events which may have dependencies
      { name: 'tasks', cols: ['title', 'description', 'category_id', 'type_id', 'sub_type_id', 'quantity', 'priority', 'due_date', 'created_date', 'task_date', 'status', 'user_id', 'edited_date'] },
      { name: 'events', cols: ['title', 'description', 'start_date', 'end_date', 'is_whole_day', 'category_id', 'event_type_id', 'location', 'user_id', 'created_at', 'updated_at', 'color_class', 'status'] },

      // Finally, tables that reference tasks/events
      { name: 'attachments', cols: ['filename', 'filepath', 'file_type', 'file_size', 'task_id', 'event_id', 'user_id', 'created_at'] },
      { name: 'notifications', cols: ['title', 'message', 'type', 'is_read', 'user_id', 'related_task_id', 'related_event_id', 'created_at'] }
    ];

    let currentIndex = 0;

    function copyNextTable() {
      if (currentIndex >= orderedTables.length) {
        // All tables copied successfully
        console.log('All tables copied successfully');
        return resolve();
      }

      const table = orderedTables[currentIndex];
      const selectQuery = `SELECT ${table.cols.join(', ')} FROM ${table.name} WHERE user_id = ?`;

      console.log(`Fetching data from table: ${table.name}`);

      db.all(selectQuery, [userId], (err, rows) => {
        if (err) {
          console.error(`Error selecting from ${table.name}:`, err);
          return reject(err);
        }

        console.log(`Found ${rows.length} rows in ${table.name} for user ${userId}`);

        if (rows.length === 0) {
          // No data for this user in this table, continue to the next table
          console.log(`No data found for user ${userId} in table ${table.name}, skipping...`);
          currentIndex++;
          return copyNextTable();
        }

        // Prepare insert statement
        const placeholders = table.cols.map(() => '?').join(', ');
        const insertQuery = `INSERT INTO ${table.name} (${table.cols.join(', ')}) VALUES (${placeholders})`;

        // Insert all rows for this table
        let rowIndex = 0;

        function insertNextRow() {
          if (rowIndex >= rows.length) {
            // All rows for this table inserted, move to next table
            console.log(`Completed inserting ${rows.length} rows into ${table.name}`);
            currentIndex++;
            return copyNextTable();
          }

          const row = rows[rowIndex];
          const values = table.cols.map(col => row[col]);

          // Debug: Log the values being inserted
          if (rowIndex < 3) { // Only log first few rows to avoid too much output
            console.log(`Inserting row ${rowIndex + 1}/${rows.length} into ${table.name}:`, values);
          }

          tempDb.run(insertQuery, values, function(err) {
            if (err) {
              console.error(`Error inserting into ${table.name}:`, err);
              console.error(`Values that caused error:`, values);
              return reject(err);
            }

            rowIndex++;
            insertNextRow();
          });
        }

        insertNextRow();
      });
    }

    copyNextTable();
  });
}

// Handle database restore by reading and inserting data from uploaded database for a specific user
async function handleDatabaseRestore(uploadedDbPath, userId) {
  return new Promise((resolve, reject) => {
    const sqlite3 = require('sqlite3').verbose();
    const { db } = require('../config/database'); // Get the main database instance
    let sourceDb;

    console.log(`Starting database restore for user: ${userId}, file: ${uploadedDbPath}`);

    // Open the uploaded database file
    sourceDb = new sqlite3.Database(uploadedDbPath, sqlite3.OPEN_READONLY, (err) => {
      if (err) {
        console.error('Error opening uploaded database:', err);
        return reject(new Error('Failed to open uploaded database: ' + err.message));
      }

      // Don't clear existing user data - just append the imported data
      console.log('Appending imported data to existing data for user:', userId);

      // Copy the data from the source database
      copyUserDataFromSource(sourceDb, db, userId, (err) => {
        sourceDb.close();
        if (err) {
          console.error('Error during data copy:', err);
          reject(err);
        } else {
          console.log('Database restore (append) completed successfully for user:', userId);
          resolve();
        }
      });
    });
  });
}

// Helper function to copy user data from source database
function copyUserDataFromSource(sourceDb, targetDb, userId, callback) {
  // Track ID mappings for foreign key relationships
  const idMappings = {
    task_categories: new Map(),
    event_categories: new Map(),
    task_types: new Map(),
    event_types: new Map(),
    task_sub_types: new Map(),
    tasks: new Map(),
    events: new Map()
  };

  // Process tables in dependency order with proper callbacks
  importTable('task_categories', ['name', 'color', 'user_id', 'created_at'],
    'INSERT OR IGNORE INTO task_categories (name, color, user_id, created_at) VALUES (?, ?, ?, ?)',
    [], true, () => {
      importTable('event_categories', ['name', 'color', 'user_id', 'created_at'],
        'INSERT OR IGNORE INTO event_categories (name, color, user_id, created_at) VALUES (?, ?, ?, ?)',
        [], true, () => {
          importTable('task_types', ['name', 'category_id', 'user_id', 'created_at'],
            'INSERT OR IGNORE INTO task_types (name, category_id, user_id, created_at) VALUES (?, ?, ?, ?)',
            [{ col: 'category_id', refTable: 'task_categories' }], true, () => {
              importTable('event_types', ['name', 'category_id', 'user_id', 'created_at'],
                'INSERT OR IGNORE INTO event_types (name, category_id, user_id, created_at) VALUES (?, ?, ?, ?)',
                [{ col: 'category_id', refTable: 'event_categories' }], true, () => {
                  importTable('task_sub_types', ['name', 'type_id', 'user_id', 'created_at'],
                    'INSERT OR IGNORE INTO task_sub_types (name, type_id, user_id, created_at) VALUES (?, ?, ?, ?)',
                    [{ col: 'type_id', refTable: 'task_types' }], true, () => {
                      importTable('tasks', ['title', 'description', 'category_id', 'type_id', 'sub_type_id', 'quantity', 'priority', 'due_date', 'created_date', 'task_date', 'status', 'user_id', 'edited_date'],
                        'INSERT OR IGNORE INTO tasks (title, description, category_id, type_id, sub_type_id, quantity, priority, due_date, created_date, task_date, status, user_id, edited_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                        [
                          { col: 'category_id', refTable: 'task_categories' },
                          { col: 'type_id', refTable: 'task_types' },
                          { col: 'sub_type_id', refTable: 'task_sub_types' }
                        ], true, () => {
                          importTable('events', ['title', 'description', 'start_date', 'end_date', 'is_whole_day', 'category_id', 'event_type_id', 'location', 'user_id', 'created_at', 'updated_at', 'color_class', 'status'],
                            'INSERT OR IGNORE INTO events (title, description, start_date, end_date, is_whole_day, category_id, event_type_id, location, user_id, created_at, updated_at, color_class, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                            [
                              { col: 'category_id', refTable: 'event_categories' },
                              { col: 'event_type_id', refTable: 'event_types' }
                            ], true, () => {
                              importTable('attachments', ['filename', 'filepath', 'file_type', 'file_size', 'task_id', 'event_id', 'user_id', 'created_at'],
                                'INSERT OR IGNORE INTO attachments (filename, filepath, file_type, file_size, task_id, event_id, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                                [
                                  { col: 'task_id', refTable: 'tasks' },
                                  { col: 'event_id', refTable: 'events' }
                                ], false, () => {
                                  importTable('notifications', ['title', 'message', 'type', 'is_read', 'user_id', 'related_task_id', 'related_event_id', 'created_at'],
                                    'INSERT OR IGNORE INTO notifications (title, message, type, is_read, user_id, related_task_id, related_event_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                                    [
                                      { col: 'related_task_id', refTable: 'tasks' },
                                      { col: 'related_event_id', refTable: 'events' }
                                    ], false, () => {
                                      console.log('All tables processed during import');
                                      callback(null);
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });

  function importTable(tableName, columns, insertQuery, foreignKeys, shouldMapId, onComplete) {
    const selectQuery = `SELECT id, ${columns.join(', ')} FROM ${tableName} WHERE user_id = ?`;

    sourceDb.all(selectQuery, [userId], (err, rows) => {
      if (err) {
        console.error(`Error reading from ${tableName}:`, err);
        return callback(err);
      }

      console.log(`Processing ${rows.length} rows from ${tableName}`);

      if (rows.length === 0) {
        console.log(`No rows found in ${tableName}, continuing...`);
        return onComplete();
      }

      let processedCount = 0;
      let insertedCount = 0;

      if (rows.length === 0) {
        return onComplete();
      }

      // Function to check if a record already exists based on meaningful fields
      function checkForDuplicate(currentRow, callback) {
        // For different tables, use different comparison criteria
        if (tableName === 'tasks') {
          // For tasks, check for duplicates based on multiple fields to ensure accuracy
          const checkQuery = `SELECT id FROM tasks WHERE user_id = ? AND title = ? AND description = ? AND category_id = ? AND type_id = ? AND sub_type_id = ? AND due_date = ? AND task_date = ? AND status = ?`;
          const checkValues = [userId, currentRow.title, currentRow.description, currentRow.category_id, currentRow.type_id, currentRow.sub_type_id, currentRow.due_date, currentRow.task_date, currentRow.status];
          targetDb.get(checkQuery, checkValues, (err, existingRecord) => {
            if (err) {
              console.error(`Error checking for duplicate in ${tableName}:`, err);
              return callback(null, false); // Assume not duplicate if error
            }
            callback(null, !!existingRecord);
          });
        } else if (tableName === 'events') {
          // For events, check based on title, start_date, and end_date
          const checkQuery = `SELECT id FROM events WHERE user_id = ? AND title = ? AND start_date = ? AND end_date = ?`;
          const checkValues = [userId, currentRow.title, currentRow.start_date, currentRow.end_date];
          targetDb.get(checkQuery, checkValues, (err, existingRecord) => {
            if (err) {
              console.error(`Error checking for duplicate in ${tableName}:`, err);
              return callback(null, false);
            }
            callback(null, !!existingRecord);
          });
        } else if (tableName === 'task_categories') {
          // For categories, check based on name and user_id
          const checkQuery = `SELECT id FROM task_categories WHERE user_id = ? AND name = ?`;
          const checkValues = [userId, currentRow.name];
          targetDb.get(checkQuery, checkValues, (err, existingRecord) => {
            if (err) {
              console.error(`Error checking for duplicate in ${tableName}:`, err);
              return callback(null, false);
            }
            callback(null, !!existingRecord);
          });
        } else if (tableName === 'task_types') {
          // For types, check based on name, user_id, and category_id
          const checkQuery = `SELECT id FROM task_types WHERE user_id = ? AND name = ? AND category_id = ?`;
          const checkValues = [userId, currentRow.name, currentRow.category_id];
          targetDb.get(checkQuery, checkValues, (err, existingRecord) => {
            if (err) {
              console.error(`Error checking for duplicate in ${tableName}:`, err);
              return callback(null, false);
            }
            callback(null, !!existingRecord);
          });
        } else if (tableName === 'task_sub_types') {
          // For subtypes, check based on name, user_id, and type_id
          const checkQuery = `SELECT id FROM task_sub_types WHERE user_id = ? AND name = ? AND type_id = ?`;
          const checkValues = [userId, currentRow.name, currentRow.type_id];
          targetDb.get(checkQuery, checkValues, (err, existingRecord) => {
            if (err) {
              console.error(`Error checking for duplicate in ${tableName}:`, err);
              return callback(null, false);
            }
            callback(null, !!existingRecord);
          });
        } else if (tableName === 'event_categories') {
          // For event categories, check based on name and user_id
          const checkQuery = `SELECT id FROM event_categories WHERE user_id = ? AND name = ?`;
          const checkValues = [userId, currentRow.name];
          targetDb.get(checkQuery, checkValues, (err, existingRecord) => {
            if (err) {
              console.error(`Error checking for duplicate in ${tableName}:`, err);
              return callback(null, false);
            }
            callback(null, !!existingRecord);
          });
        } else if (tableName === 'event_types') {
          // For event types, check based on name, user_id, and category_id
          const checkQuery = `SELECT id FROM event_types WHERE user_id = ? AND name = ? AND category_id = ?`;
          const checkValues = [userId, currentRow.name, currentRow.category_id];
          targetDb.get(checkQuery, checkValues, (err, existingRecord) => {
            if (err) {
              console.error(`Error checking for duplicate in ${tableName}:`, err);
              return callback(null, false);
            }
            callback(null, !!existingRecord);
          });
        } else if (tableName === 'attachments') {
          // For attachments, check based on filename, filepath, and user_id
          const checkQuery = `SELECT id FROM attachments WHERE user_id = ? AND filename = ? AND filepath = ?`;
          const checkValues = [userId, currentRow.filename, currentRow.filepath];
          targetDb.get(checkQuery, checkValues, (err, existingRecord) => {
            if (err) {
              console.error(`Error checking for duplicate in ${tableName}:`, err);
              return callback(null, false);
            }
            callback(null, !!existingRecord);
          });
        } else if (tableName === 'notifications') {
          // For notifications, check based on title, message, user_id, and created_at
          const checkQuery = `SELECT id FROM notifications WHERE user_id = ? AND title = ? AND message = ? AND created_at = ?`;
          const checkValues = [userId, currentRow.title, currentRow.message, currentRow.created_at];
          targetDb.get(checkQuery, checkValues, (err, existingRecord) => {
            if (err) {
              console.error(`Error checking for duplicate in ${tableName}:`, err);
              return callback(null, false);
            }
            callback(null, !!existingRecord);
          });
        } else {
          // For other tables or if no specific logic, assume not duplicate
          callback(null, false);
        }
      }

      function processNextRow(index) {
        if (index >= rows.length) {
          console.log(`Completed importing into ${tableName}, ${insertedCount} new records added, ${rows.length - insertedCount} duplicates skipped`);
          return onComplete();
        }

        const row = rows[index];

        // Process foreign key mappings
        const values = columns.map(col => {
          if (col === 'user_id') {
            return userId; // Always use the authenticated user ID
          } else if (foreignKeys && foreignKeys.some(fk => fk.col === col)) {
            // This is a foreign key column, need to map to new ID
            const fkInfo = foreignKeys.find(fk => fk.col === col);
            if (fkInfo && row[col] != null && idMappings[fkInfo.refTable] && idMappings[fkInfo.refTable].has(row[col])) {
              const newId = idMappings[fkInfo.refTable].get(row[col]);
              console.log(`Mapping ${tableName}.${col} from ${row[col]} to ${newId} (refTable: ${fkInfo.refTable})`);
              return newId;
            }
            return row[col]; // Use original value if no mapping exists
          }
          return row[col];
        });

        // Check if this record already exists
        checkForDuplicate(row, (err, isDuplicate) => {
          if (isDuplicate) {
            console.log(`Skipping duplicate record in ${tableName}: ${JSON.stringify(values)}`);
            processNextRow(index + 1);
          } else {
            // Insert the record
            targetDb.run(insertQuery, values, function(err) {
              if (err) {
                console.error(`Error inserting into ${tableName}:`, err);
                console.error(`Values that caused error:`, values);
                // Continue processing even if there's an error
              } else {
                insertedCount++;
              }

              // If this table should map IDs, store the mapping
              if (shouldMapId) {
                const newId = this.lastID;
                if (newId) {
                  idMappings[tableName].set(row.id, newId);
                  console.log(`Mapped ${tableName} ID ${row.id} -> ${newId}`);
                }
              }

              processNextRow(index + 1);
            });
          }
        });
      }

      processNextRow(0);
    });
  }
}

module.exports = databaseRoutes;