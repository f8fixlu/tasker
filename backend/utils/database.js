const { db } = require('../config/database');

// Database utility functions

// Run a query with parameters
function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) {
        reject(err);
      } else {
        resolve({ lastID: this.lastID, changes: this.changes });
      }
    });
  });
}

// Get a single row
function getRow(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

// Get multiple rows
function getAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

// Execute a transaction
async function executeTransaction(queries) {
  const result = [];
  
  return new Promise(async (resolve, reject) => {
    db.serialize(async () => {
      db.run('BEGIN TRANSACTION');
      
      try {
        for (const query of queries) {
          const { sql, params } = query;
          const res = await runQuery(sql, params);
          result.push(res);
        }
        
        db.run('COMMIT', (err) => {
          if (err) {
            db.run('ROLLBACK');
            reject(err);
          } else {
            resolve(result);
          }
        });
      } catch (error) {
        db.run('ROLLBACK');
        reject(error);
      }
    });
  });
}

module.exports = {
  runQuery,
  getRow,
  getAll,
  executeTransaction
};