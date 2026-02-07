const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
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
  } else if (method === 'GET' && pathname === '/api/database/export-full-data') {
    // Apply authentication middleware for export full data route
    const { authenticateToken } = require('../middleware/auth');

    authenticateToken(req, res, async () => {
      handleExportFullData(req, res);
    });
  } else if (method === 'POST' && pathname === '/api/database/import-full-data') {
    // Apply authentication middleware for import full data route
    const { authenticateToken } = require('../middleware/auth');

    authenticateToken(req, res, async () => {
      handleImportFullData(req, res);
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
          // Verify the database file exists and has content
          if (fs.existsSync(tempDbPath)) {
            const stats = fs.statSync(tempDbPath);
            console.log(`Temporary database file size: ${stats.size} bytes`);
            if (stats.size === 0) {
              console.error('Warning: Temporary database file is empty!');
            } else {
              // Further verify that the database contains tables
              const sqlite3 = require('sqlite3').verbose();
              const verificationDb = new sqlite3.Database(tempDbPath, (openErr) => {
                if (openErr) {
                  console.error('Error opening created database for verification:', openErr);
                } else {
                  verificationDb.all("SELECT name FROM sqlite_master WHERE type='table';", (selectErr, rows) => {
                    if (selectErr) {
                      console.error('Error querying tables from created database:', selectErr);
                    } else {
                      console.log(`Database verification: Found ${rows.length} tables in created database`);
                      if (rows.length > 0) {
                        console.log('Tables found:', rows.map(r => r.name));
                      } else {
                        console.error('ERROR: Created database has no tables!');
                      }
                    }
                    verificationDb.close();
                  });
                }
              });
            }
          } else {
            console.error('Error: Temporary database file was not created!');
          }
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

// Handle import of full user data including database, profile picture, and attachments from a ZIP file
async function handleImportFullData(req, res) {
  try {
    const Busboy = require('busboy');
    const unzipper = require('unzipper');
    const { storeFile } = require('../utils/secureFileStorage');
    const { createAttachment, getAttachmentByFilePath } = require('../models/Attachment');
    const { getUserById, updateUser } = require('../models/User');
    const { db } = require('../config/database');
    const path = require('path');
    const fs = require('fs');

    console.log('Starting full data import for user:', req.user.id);

    // Create a temporary directory for this user's import
    const tempDir = path.join(__dirname, '../temp/', `user_${req.user.id}_import_${Date.now()}`);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const busboy = Busboy({ headers: req.headers });
    let zipFile;

    busboy.on('file', (fieldname, file, info) => {
      if (fieldname === 'data') {
        const filename = info.filename;
        console.log('Uploading full data file:', filename);

        // Create a temporary file to store the uploaded ZIP
        zipFile = {
          path: path.join(tempDir, filename),
          filename: filename,
          file: file
        };

        const writeStream = fs.createWriteStream(zipFile.path);
        file.pipe(writeStream);
      }
    });

    busboy.on('finish', async () => {
      if (!zipFile) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'No data file uploaded' }));
      }

      try {
        // Extract the ZIP file
        const extractedDir = path.join(tempDir, 'extracted');
        if (!fs.existsSync(extractedDir)) {
          fs.mkdirSync(extractedDir, { recursive: true });
        }

        // Extract the ZIP file
        await new Promise((resolve, reject) => {
          fs.createReadStream(zipFile.path)
            .pipe(unzipper.Extract({ path: extractedDir }))
            .on('close', resolve)
            .on('error', reject);
        });

        // Look for the database file in the extracted directory
        const dbFiles = fs.readdirSync(extractedDir).filter(file => file.endsWith('.db'));
        if (dbFiles.length === 0) {
          throw new Error('No database file found in the ZIP archive');
        }

        const dbPath = path.join(extractedDir, dbFiles[0]);
        if (!fs.existsSync(dbPath)) {
          throw new Error('Database file does not exist');
        }

        // Process the database file
        await processImportedDatabase(dbPath, req.user.id);

        // Look for profile image in the extracted directory
        const profileDir = path.join(extractedDir, 'profile-image');
        if (fs.existsSync(profileDir)) {
          const profileFiles = fs.readdirSync(profileDir);
          if (profileFiles.length > 0) {
            const profileImagePath = path.join(profileDir, profileFiles[0]);

            // Read the profile image file
            const profileImageBuffer = fs.readFileSync(profileImagePath);

            // Create the user's profile directory if it doesn't exist
            const userProfilesDir = path.join(__dirname, '../uploads/profiles', req.user.id.toString());
            if (!fs.existsSync(userProfilesDir)) {
              fs.mkdirSync(userProfilesDir, { recursive: true });
            }

            // Generate a unique filename for the profile image
            const { generateUniqueFilename } = require('../utils/secureFileStorage');
            const uniqueFilename = generateUniqueFilename(profileFiles[0]);
            
            // Store the profile image directly in the profiles directory
            const profileDestPath = path.join(userProfilesDir, uniqueFilename);
            fs.writeFileSync(profileDestPath, profileImageBuffer);

            // Update the user's profile image URL
            const profileImageUrl = `/uploads/profiles/${req.user.id}/${uniqueFilename}`;

            await updateUser(req.user.id, { profile_image_url: profileImageUrl });
          }
        }

        // Look for attachments in the extracted directory
        const attachmentsDir = path.join(extractedDir, 'attachments');
        if (fs.existsSync(attachmentsDir)) {
          const attachmentFiles = fs.readdirSync(attachmentsDir);
          
          for (const attachmentFile of attachmentFiles) {
            const attachmentPath = path.join(attachmentsDir, attachmentFile);
            
            // Read the attachment file
            const attachmentBuffer = fs.readFileSync(attachmentPath);
            
            // Store the attachment using the existing utility
            const { filepath, filename: storedFilename, fileHash, fileSize } = await storeFile(
              attachmentBuffer,
              attachmentFile,
              req.user.id
            );

            // Check if an attachment with the same filename already exists for the user
            const { attachmentExistsForUser } = require('../models/Attachment');
            const exists = await attachmentExistsForUser(storedFilename, req.user.id);
            
            if (exists) {
              console.log(`Attachment with filename ${storedFilename} already exists for user, skipping...`);
              continue; // Skip if an attachment with the same filename already exists for this user
            }

            // Create an attachment record in the database
            const attachment = {
              filename: storedFilename,
              filepath,
              file_type: path.extname(attachmentFile).substring(1), // Remove the dot
              file_size: fileSize,
              file_hash: fileHash,
              task_id: null, // Will need to be linked to actual tasks if needed
              event_id: null, // Will need to be linked to actual events if needed
              user_id: req.user.id
            };

            await createAttachment(attachment);
          }
        }

        // Clean up temporary files
        if (fs.existsSync(tempDir)) {
          fs.rmSync(tempDir, { recursive: true, force: true });
          console.log('Temporary import directory deleted:', tempDir);
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Full data imported successfully' }));

      } catch (error) {
        console.error('Error processing imported data:', error);
        
        // Clean up temporary files
        if (fs.existsSync(tempDir)) {
          fs.rmSync(tempDir, { recursive: true, force: true });
          console.log('Temporary import directory deleted after error:', tempDir);
        }

        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Import failed: ' + error.message }));
      }
    });

    busboy.on('error', (error) => {
      console.error('Busboy error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'File upload failed: ' + error.message }));
    });

    req.pipe(busboy);

  } catch (error) {
    console.error('Full data import error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Full data import failed: ' + error.message }));
  }
}

// Process the imported database and merge with existing data
async function processImportedDatabase(importedDbPath, userId) {
  return new Promise((resolve, reject) => {
    const sqlite3 = require('sqlite3').verbose();
    const { db } = require('../config/database'); // Main database instance
    
    let importedDb;
    
    try {
      // Open the imported database file
      importedDb = new sqlite3.Database(importedDbPath, sqlite3.OPEN_READONLY, (err) => {
        if (err) {
          console.error('Error opening imported database:', err);
          return reject(new Error('Failed to open imported database: ' + err.message));
        }

        // Copy the data from the imported database to the main database
        copyUserDataFromImportedWithMapping(importedDb, db, userId, (err) => {
          importedDb.close();
          if (err) {
            console.error('Error during data copy from imported DB:', err);
            reject(err);
          } else {
            console.log('Database import completed successfully for user:', userId);
            resolve();
          }
        });
      });
    } catch (error) {
      console.error('Error opening imported database:', error);
      if (importedDb) {
        importedDb.close();
      }
      reject(error);
    }
  });
}

// Helper function to copy user data from imported database with proper ID mapping
function copyUserDataFromImportedWithMapping(importedDb, targetDb, userId, callback) {
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
  importTableFromImportedWithMapping(importedDb, targetDb, userId, idMappings, 'task_categories', ['id', 'name', 'color', 'user_id', 'created_at'],
    'INSERT OR IGNORE INTO task_categories (name, color, user_id, created_at) VALUES (?, ?, ?, ?)',
    [], true, () => {
      importTableFromImportedWithMapping(importedDb, targetDb, userId, idMappings, 'event_categories', ['id', 'name', 'color', 'user_id', 'created_at'],
        'INSERT OR IGNORE INTO event_categories (name, color, user_id, created_at) VALUES (?, ?, ?, ?)',
        [], true, () => {
          importTableFromImportedWithMapping(importedDb, targetDb, userId, idMappings, 'task_types', ['id', 'name', 'category_id', 'user_id', 'created_at'],
            'INSERT OR IGNORE INTO task_types (name, category_id, user_id, created_at) VALUES (?, ?, ?, ?)',
            [{ col: 'category_id', refTable: 'task_categories' }], true, () => {
            importTableFromImportedWithMapping(importedDb, targetDb, userId, idMappings, 'event_types', ['id', 'name', 'category_id', 'user_id', 'created_at'],
              'INSERT OR IGNORE INTO event_types (name, category_id, user_id, created_at) VALUES (?, ?, ?, ?)',
              [{ col: 'category_id', refTable: 'event_categories' }], true, () => {
                importTableFromImportedWithMapping(importedDb, targetDb, userId, idMappings, 'task_sub_types', ['id', 'name', 'type_id', 'user_id', 'created_at'],
                  'INSERT OR IGNORE INTO task_sub_types (name, type_id, user_id, created_at) VALUES (?, ?, ?, ?)',
                  [{ col: 'type_id', refTable: 'task_types' }], true, () => {
                    importTableFromImportedWithMapping(importedDb, targetDb, userId, idMappings, 'tasks', ['id', 'title', 'description', 'category_id', 'type_id', 'sub_type_id', 'quantity', 'priority', 'due_date', 'created_date', 'task_date', 'status', 'user_id', 'edited_date'],
                      'INSERT OR IGNORE INTO tasks (title, description, category_id, type_id, sub_type_id, quantity, priority, due_date, created_date, task_date, status, user_id, edited_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                      [
                        { col: 'category_id', refTable: 'task_categories' },
                        { col: 'type_id', refTable: 'task_types' },
                        { col: 'sub_type_id', refTable: 'task_sub_types' }
                      ], true, () => {
                        importTableFromImportedWithMapping(importedDb, targetDb, userId, idMappings, 'events', ['id', 'title', 'description', 'start_date', 'end_date', 'is_whole_day', 'category_id', 'event_type_id', 'location', 'user_id', 'created_at', 'updated_at', 'color_class', 'status'],
                          'INSERT OR IGNORE INTO events (title, description, start_date, end_date, is_whole_day, category_id, event_type_id, location, user_id, created_at, updated_at, color_class, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                          [
                            { col: 'category_id', refTable: 'event_categories' },
                            { col: 'event_type_id', refTable: 'event_types' }
                          ], true, () => {
                            importTableFromImportedWithMapping(importedDb, targetDb, userId, idMappings, 'attachments', ['id', 'filename', 'filepath', 'file_type', 'file_size', 'task_id', 'event_id', 'user_id', 'created_at'],
                              'INSERT OR IGNORE INTO attachments (filename, filepath, file_type, file_size, task_id, event_id, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                              [
                                { col: 'task_id', refTable: 'tasks' },
                                { col: 'event_id', refTable: 'events' }
                              ], false, () => {
                                importTableFromImportedWithMapping(importedDb, targetDb, userId, idMappings, 'notifications', ['id', 'title', 'message', 'type', 'is_read', 'user_id', 'related_task_id', 'related_event_id', 'created_at'],
                                  'INSERT OR IGNORE INTO notifications (title, message, type, is_read, user_id, related_task_id, related_event_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                                  [
                                    { col: 'related_task_id', refTable: 'tasks' },
                                    { col: 'related_event_id', refTable: 'events' }
                                  ], false, () => {
                                    console.log('All tables processed during import from ZIP');
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
}

function importTableFromImportedWithMapping(importedDb, targetDb, userId, idMappings, tableName, columns, insertQuery, foreignKeys, shouldMapId, onComplete) {
  // For this implementation, we'll just select all records and update the user_id
  // Note: columns[0] should be 'id' for proper mapping
  const selectAllQuery = `SELECT ${columns.join(', ')} FROM ${tableName} WHERE user_id = ?`;

  importedDb.all(selectAllQuery, [userId], (err, rows) => {
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
    const checkForDuplicate = (currentRow, callback) => {
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
    };

    const processNextRow = (index) => {
      if (index >= rows.length) {
        console.log(`Completed importing into ${tableName}, ${insertedCount} new records added, ${rows.length - insertedCount} duplicates skipped`);
        return onComplete();
      }

      const row = rows[index];
      const originalId = row.id; // Store the original ID for mapping

      // Process foreign key mappings and update user_id
      const values = columns.slice(1).map((col, idx) => { // Skip the 'id' column in values
        if (col === 'user_id') {
          return userId; // Always use the authenticated user ID
        } else if (foreignKeys && foreignKeys.some(fk => fk.col === col)) {
          // This is a foreign key column, need to map to new ID
          const fkInfo = foreignKeys.find(fk => fk.col === col);
          if (fkInfo && row[col] != null && idMappings[fkInfo.refTable] && idMappings[fkInfo.refTable].has(row[col])) {
            return idMappings[fkInfo.refTable].get(row[col]);
          }
          return row[col]; // Use original value if no mapping exists
        }
        return row[col];
      });

      // Check if this record already exists
      const currentRowForCheck = {};
      columns.forEach(col => {
        if (col !== 'id') {
          currentRowForCheck[col] = row[col];
        }
      });

      checkForDuplicate(currentRowForCheck, (err, isDuplicate) => {
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

              // If this table should map IDs, store the mapping
              if (shouldMapId && this.lastID) {
                idMappings[tableName].set(originalId, this.lastID);
                console.log(`Mapped ${tableName} ID ${originalId} -> ${this.lastID}`);
              }
            }

            processNextRow(index + 1);
          });
        }
      });
    };

    // Call processNextRow with the required parameters
    processNextRow(0);
  });
}

// Handle export of full user data including database, profile picture, and attachments
async function handleExportFullData(req, res) {
  try {
    const { db } = require('../config/database');
    const { retrieveFile } = require('../utils/secureFileStorage');
    const archiver = require('archiver');
    
    console.log('Starting full data export for user:', req.user.id);

    // Create a temporary directory for this user's export
    const tempDir = path.join(__dirname, '../temp/', `user_${req.user.id}_export_${Date.now()}`);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Create a temporary database file for this user's data
    const tempDbPath = path.join(tempDir, `user_${req.user.id}_database.db`);

    // Initialize the temporary database with the same schema
    const sqlite3 = require('sqlite3').verbose();
    const tempDb = new sqlite3.Database(tempDbPath);
    await initializeTempDatabaseSchema(tempDb);

    // Copy user-specific data to the temporary database
    await copyUserDataToTempDb(tempDb, req.user.id);

    // Close the temporary database connection
    await new Promise((resolve, reject) => {
      tempDb.close((err) => {
        if (err) {
          console.error('Error closing temp database:', err);
          reject(err);
        } else {
          console.log('Successfully created temporary database at:', tempDbPath);
          // Verify the database file exists and has content
          if (fs.existsSync(tempDbPath)) {
            const stats = fs.statSync(tempDbPath);
            console.log(`Temporary database file size: ${stats.size} bytes`);
            if (stats.size === 0) {
              console.error('Warning: Temporary database file is empty!');
            } else {
              // Further verify that the database contains tables
              const sqlite3 = require('sqlite3').verbose();
              const verificationDb = new sqlite3.Database(tempDbPath, (openErr) => {
                if (openErr) {
                  console.error('Error opening created database for verification:', openErr);
                } else {
                  verificationDb.all("SELECT name FROM sqlite_master WHERE type='table';", (selectErr, rows) => {
                    if (selectErr) {
                      console.error('Error querying tables from created database:', selectErr);
                    } else {
                      console.log(`Database verification: Found ${rows.length} tables in created database`);
                      if (rows.length > 0) {
                        console.log('Tables found:', rows.map(r => r.name));
                      } else {
                        console.error('ERROR: Created database has no tables!');
                      }
                    }
                    verificationDb.close();
                  });
                }
              });
            }
          } else {
            console.error('Error: Temporary database file was not created!');
          }
          resolve();
        }
      });
    });

    // Get user profile data
    const { getUserById } = require('../models/User');
    const user = await getUserById(req.user.id);

    // Create metadata file
    const metadata = {
      userId: req.user.id,
      exportDate: new Date().toISOString(),
      userName: user.full_name || user.email,
      userEmail: user.email,
      profileImageUrl: user.profile_image_url
    };
    
    const metadataPath = path.join(tempDir, 'metadata.json');
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

    // Copy user's profile picture if it exists
    if (user.profile_image_url) {
      console.log(`Attempting to export profile image: ${user.profile_image_url}`);
      
      // Extract the file path from the URL - profile images are stored in /uploads/profiles/{userId}/
      // Handle both absolute URLs (with protocol) and relative paths
      let profileImagePath = user.profile_image_url;
      
      // If it's a full URL, extract just the path portion
      if (profileImagePath.startsWith('http://') || profileImagePath.startsWith('https://')) {
        try {
          const urlObj = new URL(profileImagePath);
          profileImagePath = urlObj.pathname; // Get just the path part
        } catch (urlErr) {
          console.error('Error parsing profile image URL:', urlErr);
          // If URL parsing fails, try to extract path manually
          const lastSlashIndex = profileImagePath.lastIndexOf('/uploads/profiles/');
          if (lastSlashIndex !== -1) {
            profileImagePath = profileImagePath.substring(lastSlashIndex + 1); // +1 to include the slash
          }
        }
      }
      
      // Remove the '/uploads/profiles/' prefix to get the relative path
      profileImagePath = profileImagePath.replace('/uploads/profiles/', '');
      
      // First, try the profiles folder (normal location)
      let profileImageFullPath = path.join(__dirname, '../uploads/profiles/', profileImagePath);
      let profileImageFound = false;

      console.log(`Looking for profile image at: ${profileImageFullPath}`);
      if (fs.existsSync(profileImageFullPath)) {
        profileImageFound = true;
      } else {
        // If not found in profiles, try the secure folder (fallback for older imports)
        profileImageFullPath = path.join(__dirname, '../uploads/secure/', profileImagePath);
        console.log(`Profile image not found in profiles, trying secure folder: ${profileImageFullPath}`);
        if (fs.existsSync(profileImageFullPath)) {
          profileImageFound = true;
        }
      }

      if (profileImageFound) {
        const destProfileImagePath = path.join(tempDir, 'profile-image', path.basename(profileImageFullPath));

        // Ensure profile-image directory exists
        const profileDir = path.join(tempDir, 'profile-image');
        if (!fs.existsSync(profileDir)) {
          fs.mkdirSync(profileDir, { recursive: true });
          console.log(`Created profile-image directory: ${profileDir}`);
        }

        fs.copyFileSync(profileImageFullPath, destProfileImagePath);
        console.log(`Copied profile image from ${profileImageFullPath} to ${destProfileImagePath}`);
      } else {
        console.log(`Profile image file does not exist at expected paths: ${path.join(__dirname, '../uploads/profiles/', profileImagePath)} or ${path.join(__dirname, '../uploads/secure/', profileImagePath)}`);
      }
    } else {
      console.log('No profile image URL found for user');
    }

    // Get user's attachments
    const { getAttachmentsByUserId } = require('../models/Attachment');
    const attachments = await getAttachmentsByUserId(req.user.id, {});

    // Copy user's attachments if they exist
    if (attachments && attachments.length > 0) {
      const attachmentsDir = path.join(tempDir, 'attachments');
      if (!fs.existsSync(attachmentsDir)) {
        fs.mkdirSync(attachmentsDir, { recursive: true });
      }

      for (const attachment of attachments) {
        try {
          // Extract the file path from the attachment record
          const attachmentPath = attachment.filepath;

          // Retrieve the file from secure storage
          const fileBuffer = await retrieveFile(attachmentPath, req.user.id);

          // Write the file to the export directory
          const destAttachmentPath = path.join(attachmentsDir, attachment.filename);
          fs.writeFileSync(destAttachmentPath, fileBuffer);
        } catch (error) {
          console.error(`Error copying attachment ${attachment.id}:`, error);
          // Continue with other attachments even if one fails
          // Log the specific attachment that failed for debugging
          console.log(`Skipping attachment ID ${attachment.id} with filename: ${attachment.filename}, filepath: ${attachment.filepath}`);
          
          // If the error is specifically about file not found or access denied, continue silently
          if (error.message.includes('File not found') || error.message.includes('Access denied')) {
            console.log(`File issue for attachment ${attachment.id} (filename: ${attachment.filename}), continuing export...`);
          }
        }
      }
    }

    // Create a zip archive of all the data
    const zipPath = path.join(__dirname, '../temp/', `user_${req.user.id}_full_data_export_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.zip`);
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });

    // Listen for all archive data to be written
    output.on('close', function() {
      console.log(archive.pointer() + ' total bytes');
      console.log('Archive wrote %d bytes', archive.pointer());

      // Set headers for file download
      const stats = fs.statSync(zipPath);
      res.writeHead(200, {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="tasker_user_${req.user.id}_full_data_export_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.zip"`,
        'Content-Length': stats.size
      });

      // Create a read stream and pipe it to the response
      const readStream = fs.createReadStream(zipPath);
      readStream.pipe(res);

      // Clean up the temporary files after the response is sent
      readStream.on('close', () => {
        // Small delay to ensure the file is no longer in use
        setTimeout(() => {
          // Delete the zip file
          if (fs.existsSync(zipPath)) {
            fs.unlinkSync(zipPath);
            console.log('Zip file deleted:', zipPath);
          }
          
          // Delete the temporary directory
          if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
            console.log('Temporary export directory deleted:', tempDir);
          }
        }, 1000); // 1 second delay to ensure file is no longer in use
      });

      // Also clean up if there's an error during streaming
      readStream.on('error', (err) => {
        console.error('Error streaming zip file:', err);
        if (fs.existsSync(zipPath)) {
          fs.unlinkSync(zipPath);
          console.log('Zip file deleted after stream error:', zipPath);
        }
        
        if (fs.existsSync(tempDir)) {
          fs.rmSync(tempDir, { recursive: true, force: true });
          console.log('Temporary export directory deleted after stream error:', tempDir);
        }
      });
    });

    // Good practice to catch warnings (ie stat failures and other non-blocking errors)
    archive.on('warning', function(err) {
      if (err.code === 'ENOENT') {
        // log warning
        console.warn('Archive warning:', err);
      } else {
        // throw error
        throw err;
      }
    });

    // Catch this error explicitly
    archive.on('error', function(err) {
      console.error('Archive error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Archive creation failed: ' + err.message }));
    });

    // Pipe archive data to the file
    archive.pipe(output);

    // Append files from the temporary directory to the archive
    archive.directory(tempDir, false);

    // Finalize the archive (calls finish on the stream)
    await archive.finalize();

  } catch (error) {
    console.error('Full data export error:', error);
    
    // Clean up any partially created files
    try {
      const tempDir = path.join(__dirname, '../temp/', `user_${req.user.id}_export_${Date.now()}`);
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
        console.log('Cleaned up temporary export directory:', tempDir);
      }
    } catch (cleanupError) {
      console.error('Error during cleanup:', cleanupError);
    }

    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Full data export failed: ' + error.message }));
  }
}

module.exports = databaseRoutes;