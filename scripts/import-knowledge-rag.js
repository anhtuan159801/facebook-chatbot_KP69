#!/usr/bin/env node

require('dotenv').config();
const KnowledgeRAGProcessor = require('../src/utils/knowledge-rag-processor');

async function importKnowledgeFromRAG() {
  console.log('🔄 Starting import of knowledge files from knowledge-rag folder...');
  
  try {
    const processor = new KnowledgeRAGProcessor();
    
    // Count existing documents before import
    const countBefore = await processor.countKnowledgeDocuments();
    console.log(`📋 Documents before import: ${countBefore}`);
    
    // Process all knowledge files
    await processor.processAllKnowledgeFiles();
    
    // Count documents after import
    const countAfter = await processor.countKnowledgeDocuments();
    console.log(`📊 Documents after import: ${countAfter}`);
    console.log(`📈 New documents added: ${countAfter - countBefore}`);
    
    console.log('✅ Knowledge import completed successfully!');
  } catch (error) {
    console.error('❌ Error importing knowledge:', error);
    process.exit(1);
  }
}

// Run the import process
if (require.main === module) {
  importKnowledgeFromRAG();
}

module.exports = importKnowledgeFromRAG;