#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const KnowledgeRAGWatcher = require('../src/utils/knowledge-rag-watcher');

async function testWatcher() {
  console.log('🧪 Testing Knowledge RAG Watcher...');
  
  // Create a watcher instance
  const watcher = new KnowledgeRAGWatcher();
  
  // Process all knowledge first
  await watcher.processAllKnowledge();
  
  console.log('Starting to watch for changes...');
  
  // Start watching
  watcher.startWatching();
  
  // Create a sample file to test the watcher after a delay
  setTimeout(() => {
    const testDir = path.join(__dirname, '..', 'Knowlegd-rag', 'downloads_ministries', 'Bộ_Giáo_dục_và_Đào_tạo', 'huong_dan');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    
    const testFile = path.join(testDir, 'test_procedure_automation.docx');
    const testContent = `Test procedure for automation
This is a test document to verify the watcher functionality.`;
    
    // Write a test file
    fs.writeFileSync(testFile, testContent);
    console.log(`📄 Created test file: ${testFile}`);
    
    // Wait a bit and then remove the file
    setTimeout(() => {
      if (fs.existsSync(testFile)) {
        fs.unlinkSync(testFile);
        console.log(`🗑️ Removed test file: ${testFile}`);
      }
    }, 10000); // Remove after 10 seconds
  }, 5000); // Create test file after 5 seconds
  
  // Keep the process running for a while to test
  console.log('Watcher is running... (will continue for 30 seconds)');
  
  setTimeout(() => {
    console.log('Stopping watcher...');
    watcher.stopWatching().then(() => {
      console.log('✅ Test completed');
      process.exit(0);
    });
  }, 30000); // Run for 30 seconds
}

// Run the test
if (require.main === module) {
  testWatcher().catch(console.error);
}

module.exports = testWatcher;