// Script to clean up unnecessary records and attachments in the Tasker database
const { db } = require('../config/database');
const { runQuery, getRow, getAll } = require('../utils/database');
const { deleteFile } = require('../utils/secureFileStorage');
const path = require('path');

/**
 * Clean up orphaned attachments that are not linked to any existing task or event
 */
async function cleanupOrphanedAttachments() {
  console.log('Starting cleanup of orphaned attachments...');
  
  try {
    // Find attachments that are not linked to any existing task or event
    // These are attachments where task_id or event_id references a non-existent record
    const orphanedAttachmentsQuery = `
      SELECT a.id, a.filepath, a.filename, a.task_id, a.event_id, a.user_id
      FROM attachments a
      LEFT JOIN tasks t ON a.task_id = t.id
      LEFT JOIN events e ON a.event_id = e.id
      WHERE (a.task_id IS NOT NULL AND t.id IS NULL)
         OR (a.event_id IS NOT NULL AND e.id IS NULL)
         OR (a.task_id IS NULL AND a.event_id IS NULL)
    `;
    
    const orphanedAttachments = await getAll(orphanedAttachmentsQuery, []);
    
    console.log(`Found ${orphanedAttachments.length} orphaned attachments to clean up.`);
    
    if (orphanedAttachments.length === 0) {
      console.log('No orphaned attachments found.');
      return 0;
    }
    
    let deletedCount = 0;
    
    for (const attachment of orphanedAttachments) {
      console.log(`Processing attachment ID: ${attachment.id}, File: ${attachment.filename}`);
      
      try {
        // First, try to delete the physical file
        if (attachment.filepath) {
          try {
            await deleteFile(attachment.filepath, attachment.user_id);
            console.log(`  - Deleted physical file: ${attachment.filepath}`);
          } catch (fileError) {
            console.warn(`  - Warning: Could not delete physical file ${attachment.filepath}:`, fileError.message);
          }
        }
        
        // Then delete the attachment record from the database
        const deleteAttachmentQuery = 'DELETE FROM attachments WHERE id = ?';
        const result = await runQuery(deleteAttachmentQuery, [attachment.id]);
        
        if (result.changes > 0) {
          console.log(`  - Deleted attachment record ID: ${attachment.id}`);
          deletedCount++;
        } else {
          console.warn(`  - Failed to delete attachment record ID: ${attachment.id}`);
        }
      } catch (error) {
        console.error(`  - Error processing attachment ID ${attachment.id}:`, error.message);
      }
    }
    
    console.log(`Cleanup completed. Removed ${deletedCount} orphaned attachments.`);
    return deletedCount;
  } catch (error) {
    console.error('Error during orphaned attachment cleanup:', error.message);
    throw error;
  }
}

/**
 * Clean up attachments for deleted/archived tasks and events based on age or status
 */
async function cleanupOldAttachments(options = {}) {
  console.log('Starting cleanup of old attachments...');
  
  try {
    const { maxAgeDays = 365, cleanArchivedOnly = false } = options;
    
    // Calculate the date threshold
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - maxAgeDays);
    const dateThresholdStr = dateThreshold.toISOString().split('T')[0];
    
    let attachmentsToDelete = [];
    
    if (cleanArchivedOnly) {
      // Find attachments for archived tasks
      const archivedTaskAttachmentsQuery = `
        SELECT a.id, a.filepath, a.filename, a.user_id
        FROM attachments a
        JOIN tasks t ON a.task_id = t.id
        WHERE t.status = 'Archived'
      `;
      
      const archivedTaskAttachments = await getAll(archivedTaskAttachmentsQuery, []);
      attachmentsToDelete = [...attachmentsToDelete, ...archivedTaskAttachments];
      
      // Find attachments for completed/cancelled events
      const completedEventAttachmentsQuery = `
        SELECT a.id, a.filepath, a.filename, a.user_id
        FROM attachments a
        JOIN events e ON a.event_id = e.id
        WHERE e.status IN ('Completed', 'Cancelled')
      `;
      
      const completedEventAttachments = await getAll(completedEventAttachmentsQuery, []);
      attachmentsToDelete = [...attachmentsToDelete, ...completedEventAttachments];
    } else {
      // Find old attachments for completed tasks
      const oldTaskAttachmentsQuery = `
        SELECT a.id, a.filepath, a.filename, a.user_id
        FROM attachments a
        JOIN tasks t ON a.task_id = t.id
        WHERE t.status IN ('Completed', 'Archived')
          AND t.edited_date < ?
      `;
      
      const oldTaskAttachments = await getAll(oldTaskAttachmentsQuery, [dateThresholdStr]);
      attachmentsToDelete = [...attachmentsToDelete, ...oldTaskAttachments];
      
      // Find old attachments for completed/cancelled events
      const oldEventAttachmentsQuery = `
        SELECT a.id, a.filepath, a.filename, a.user_id
        FROM attachments a
        JOIN events e ON a.event_id = e.id
        WHERE e.status IN ('Completed', 'Cancelled')
          AND e.updated_at < ?
      `;
      
      const oldEventAttachments = await getAll(oldEventAttachmentsQuery, [dateThresholdStr]);
      attachmentsToDelete = [...attachmentsToDelete, ...oldEventAttachments];
    }
    
    console.log(`Found ${attachmentsToDelete.length} old attachments to clean up.`);
    
    if (attachmentsToDelete.length === 0) {
      console.log('No old attachments found to clean up.');
      return 0;
    }
    
    let deletedCount = 0;
    
    for (const attachment of attachmentsToDelete) {
      console.log(`Processing old attachment ID: ${attachment.id}, File: ${attachment.filename}`);
      
      try {
        // First, try to delete the physical file
        if (attachment.filepath) {
          try {
            await deleteFile(attachment.filepath, attachment.user_id);
            console.log(`  - Deleted physical file: ${attachment.filepath}`);
          } catch (fileError) {
            console.warn(`  - Warning: Could not delete physical file ${attachment.filepath}:`, fileError.message);
          }
        }
        
        // Then delete the attachment record from the database
        const deleteAttachmentQuery = 'DELETE FROM attachments WHERE id = ?';
        const result = await runQuery(deleteAttachmentQuery, [attachment.id]);
        
        if (result.changes > 0) {
          console.log(`  - Deleted attachment record ID: ${attachment.id}`);
          deletedCount++;
        } else {
          console.warn(`  - Failed to delete attachment record ID: ${attachment.id}`);
        }
      } catch (error) {
        console.error(`  - Error processing old attachment ID ${attachment.id}:`, error.message);
      }
    }
    
    console.log(`Old attachment cleanup completed. Removed ${deletedCount} attachments.`);
    return deletedCount;
  } catch (error) {
    console.error('Error during old attachment cleanup:', error.message);
    throw error;
  }
}

/**
 * Clean up empty or invalid attachment records
 */
async function cleanupInvalidAttachments() {
  console.log('Starting cleanup of invalid attachments...');
  
  try {
    // Find attachments with missing file paths or other invalid data
    const invalidAttachmentsQuery = `
      SELECT a.id, a.filepath, a.filename, a.user_id
      FROM attachments a
      WHERE a.filepath IS NULL 
         OR a.filepath = ''
         OR a.filename IS NULL
         OR a.filename = ''
    `;
    
    const invalidAttachments = await getAll(invalidAttachmentsQuery, []);
    
    console.log(`Found ${invalidAttachments.length} invalid attachments to clean up.`);
    
    if (invalidAttachments.length === 0) {
      console.log('No invalid attachments found.');
      return 0;
    }
    
    let deletedCount = 0;
    
    for (const attachment of invalidAttachments) {
      console.log(`Processing invalid attachment ID: ${attachment.id}, File: ${attachment.filename || 'NULL'}`);
      
      try {
        // Delete the attachment record from the database
        const deleteAttachmentQuery = 'DELETE FROM attachments WHERE id = ?';
        const result = await runQuery(deleteAttachmentQuery, [attachment.id]);
        
        if (result.changes > 0) {
          console.log(`  - Deleted invalid attachment record ID: ${attachment.id}`);
          deletedCount++;
        } else {
          console.warn(`  - Failed to delete invalid attachment record ID: ${attachment.id}`);
        }
      } catch (error) {
        console.error(`  - Error processing invalid attachment ID ${attachment.id}:`, error.message);
      }
    }
    
    console.log(`Invalid attachment cleanup completed. Removed ${deletedCount} attachments.`);
    return deletedCount;
  } catch (error) {
    console.error('Error during invalid attachment cleanup:', error.message);
    throw error;
  }
}

/**
 * Main cleanup function that runs all cleanup operations
 */
async function runFullCleanup(options = {}) {
  console.log('Starting full database and attachment cleanup...');
  
  const startTime = Date.now();
  
  try {
    let totalCleaned = 0;
    
    // Run each cleanup operation
    totalCleaned += await cleanupOrphanedAttachments();
    totalCleaned += await cleanupOldAttachments(options.oldAttachmentsOptions || {});
    totalCleaned += await cleanupInvalidAttachments();
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log(`\nFull cleanup completed in ${duration} seconds.`);
    console.log(`Total records cleaned: ${totalCleaned}`);
    
    return totalCleaned;
  } catch (error) {
    console.error('Error during full cleanup:', error.message);
    throw error;
  }
}

// If this script is run directly, execute the cleanup
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {};
  
  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--max-age-days' && args[i + 1]) {
      options.oldAttachmentsOptions = options.oldAttachmentsOptions || {};
      options.oldAttachmentsOptions.maxAgeDays = parseInt(args[i + 1]);
      i++; // Skip next argument since it's a value
    } else if (args[i] === '--clean-archived-only') {
      options.oldAttachmentsOptions = options.oldAttachmentsOptions || {};
      options.oldAttachmentsOptions.cleanArchivedOnly = true;
    } else if (args[i] === '--dry-run') {
      options.dryRun = true;
    }
  }
  
  console.log('Running attachment cleanup script...');
  console.log('Options:', options);
  
  runFullCleanup(options)
    .then((count) => {
      console.log(`\nCleanup completed successfully. Processed ${count} records.`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('\nCleanup failed:', error);
      process.exit(1);
    });
}

module.exports = {
  cleanupOrphanedAttachments,
  cleanupOldAttachments,
  cleanupInvalidAttachments,
  runFullCleanup
};