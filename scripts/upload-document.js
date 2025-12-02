#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const DocumentProcessor = require('./document-processor');
const LocalEmbeddings = require('../ai/local-embeddings');

async function uploadDocument(filePath) {
  try {
    console.log(`Uploading document: ${filePath}`);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File does not exist: ${filePath}`);
    }

    // Get file info
    const stats = fs.statSync(filePath);
    const fileName = path.basename(filePath);
    
    // Validate file size (limit to 10MB)
    if (stats.size > 10 * 1024 * 1024) {
      throw new Error('File size exceeds 10MB limit');
    }

    // Determine file type
    let fileType;
    if (fileName.toLowerCase().endsWith('.pdf')) {
      fileType = 'application/pdf';
    } else if (fileName.toLowerCase().endsWith('.docx')) {
      fileType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    } else {
      throw new Error('Unsupported file type. Only PDF and DOCX are supported.');
    }

    // Read file buffer
    const buffer = fs.readFileSync(filePath);

    // Initialize components
    const embeddings = new LocalEmbeddings();
    const processor = new DocumentProcessor();

    // Process and store document
    const result = await processor.processAndStoreDocument(buffer, fileName, fileType, embeddings);

    if (result.success) {
      console.log('✅ Success:', result.message);
    } else {
      console.error('❌ Error:', result.error);
    }

  } catch (error) {
    console.error('❌ Error uploading document:', error.message);
  }
}

// Command line interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
Usage: node scripts/upload-document.js <file_path>

Examples:
  node scripts/upload-document.js ./docs/huong-dan-vneid.pdf
  node scripts/upload-document.js ./docs/thu-tuc-cap-nuoc-moi.docx
    `);
    process.exit(1);
  }

  const filePath = args[0];
  await uploadDocument(filePath);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { uploadDocument };