// Test script for the cleanup_attachments functionality
const { db } = require('../config/database');
const { runQuery, getRow, getAll } = require('../utils/database');
const path = require('path');
const fs = require('fs').promises;

// Import the cleanup functions
const {
  cleanupOrphanedAttachments,
  cleanupOldAttachments,
  cleanupInvalidAttachments,
  runFullCleanup
} = require('./cleanup_attachments');

/**
 * Create test data for validation
 */
async function createTestData() {
  console.log('Creating test data for validation...');
  
  // Insert a test user
  const insertUserQuery = `
    INSERT INTO users (full_name, email, password_hash)
    VALUES (?, ?, ?)
  `;
  const userResult = await runQuery(insertUserQuery, ['Test User', 'test@example.com', 'hashed_password']);
  const userId = userResult.lastID;
  
  // Insert a test task
  const insertTaskQuery = `
    INSERT INTO tasks (title, description, user_id, status)
    VALUES (?, ?, ?, ?)
  `;
  const taskResult = await runQuery(insertTaskQuery, ['Test Task', 'Test Description', userId, 'Pending']);
  const taskId = taskResult.lastID;
  
  // Insert a test event
  const insertEventQuery = `
    INSERT INTO events (title, description, start_date, end_date, user_id)
    VALUES (?, ?, ?, ?, ?)
  `;
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const eventResult = await runQuery(insertEventQuery, ['Test Event', 'Test Description', now, now, userId]);
  const eventId = eventResult.lastID;
  
  // Insert valid attachments
  const insertValidAttachmentQuery = `
    INSERT INTO attachments (filename, filepath, file_type, file_size, task_id, user_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  await runQuery(insertValidAttachmentQuery, ['valid_task_attachment.txt', '/path/to/valid_task.txt', 'text/plain', 1024, taskId, userId]);
  
  const insertValidEventAttachmentQuery = `
    INSERT INTO attachments (filename, filepath, file_type, file_size, event_id, user_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  await runQuery(insertValidEventAttachmentQuery, ['valid_event_attachment.txt', '/path/to/valid_event.txt', 'text/plain', 2048, eventId, userId]);
  
  // Insert orphaned attachments (referencing non-existent task/event)
  const insertOrphanedAttachmentQuery = `
    INSERT INTO attachments (filename, filepath, file_type, file_size, task_id, user_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  await runQuery(insertOrphanedAttachmentQuery, ['orphaned_task_attachment.txt', '/path/to/orphaned_task.txt', 'text/plain', 512, 999999, userId]); // Non-existent task
  
  const insertOrphanedEventAttachmentQuery = `
    INSERT INTO attachments (filename, filepath, file_type, file_size, event_id, user_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  await runQuery(insertOrphanedEventAttachmentQuery, ['orphaned_event_attachment.txt', '/path/to/orphaned_event.txt', 'text/plain', 1024, 999999, userId]); // Non-existent event
  
  // Insert attachment with both task_id and event_id as NULL (truly orphaned)
  const insertNullAttachmentQuery = `
    INSERT INTO attachments (filename, filepath, file_type, file_size, task_id, event_id, user_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  await runQuery(insertNullAttachmentQuery, ['null_attachment.txt', '/path/to/null.txt', 'text/plain', 256, null, null, userId]);
  
  // Insert invalid attachment (missing filepath)
  const insertInvalidAttachmentQuery = `
    INSERT INTO attachments (filename, filepath, file_type, file_size, task_id, user_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  await runQuery(insertInvalidAttachmentQuery, ['invalid_attachment.txt', '', 'text/plain', 128, taskId, userId]);
  
  console.log(`Test data created: User ID ${userId}, Task ID ${taskId}, Event ID ${eventId}`);
  console.log('Test attachments created:');
  console.log('  - 1 valid task attachment');
  console.log('  - 1 valid event attachment');
  console.log('  - 1 orphaned task attachment');
  console.log('  - 1 orphaned event attachment');
  console.log('  - 1 null attachment');
  console.log('  - 1 invalid attachment');
  
  return { userId, taskId, eventId };
}

/**
 * Count attachments before and after cleanup
 */
async function countAttachments() {
  const countQuery = 'SELECT COUNT(*) as count FROM attachments';
  const result = await getRow(countQuery, []);
  return result.count;
}

/**
 * Run tests
 */
async function runTests() {
  console.log('Starting tests for cleanup script...\n');
  
  try {
    // Get initial count
    const initialCount = await countAttachments();
    console.log(`Initial attachment count: ${initialCount}\n`);
    
    // Create test data
    const testData = await createTestData();
    
    // Get count after creating test data
    const afterTestDataCount = await countAttachments();
    console.log(`Attachment count after creating test data: ${afterTestDataCount}\n`);
    
    // Run the cleanup
    console.log('Running cleanup...\n');
    const cleanedCount = await runFullCleanup({ dryRun: false });
    
    // Get final count
    const finalCount = await countAttachments();
    console.log(`\nFinal attachment count: ${finalCount}`);
    console.log(`Attachments cleaned: ${cleanedCount}`);
    console.log(`Expected remaining after cleanup: ${afterTestDataCount - cleanedCount} (should be 2 - the valid attachments)\n`);
    
    // Verify that valid attachments are still there
    const validAttachmentsQuery = `
      SELECT a.id, a.filename, a.task_id, a.event_id, t.id as task_exists, e.id as event_exists
      FROM attachments a
      LEFT JOIN tasks t ON a.task_id = t.id
      LEFT JOIN events e ON a.event_id = e.id
      WHERE (a.task_id IS NOT NULL AND t.id IS NOT NULL)
         OR (a.event_id IS NOT NULL AND e.id IS NOT NULL)
    `;
    const validAttachments = await getAll(validAttachmentsQuery, []);
    
    console.log(`Valid attachments remaining after cleanup: ${validAttachments.length}`);
    console.log('These should be the 2 valid attachments we created.\n');
    
    // Clean up test data
    await runQuery('DELETE FROM attachments WHERE user_id = ?', [testData.userId]);
    await runQuery('DELETE FROM tasks WHERE user_id = ?', [testData.userId]);
    await runQuery('DELETE FROM events WHERE user_id = ?', [testData.userId]);
    await runQuery('DELETE FROM users WHERE id = ?', [testData.userId]);
    
    console.log('Test data cleaned up.');
    console.log('\nTest completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
    throw error;
  }
}

// Run the tests if this script is executed directly
if (require.main === module) {
  runTests()
    .then(() => {
      console.log('\nAll tests passed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\nTests failed:', error);
      process.exit(1);
    });
}

module.exports = {
  createTestData,
  countAttachments,
  runTests
};