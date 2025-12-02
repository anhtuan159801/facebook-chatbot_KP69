const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

class DocumentProcessor {
  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
    );
  }

  async processPDF(buffer, fileName) {
    try {
      const pdfData = await pdf(buffer);
      return {
        title: fileName || 'PDF Document',
        content: pdfData.text,
        source_url: `file://${fileName}`,
        category: 'document'
      };
    } catch (error) {
      console.error('Error processing PDF:', error);
      throw error;
    }
  }

  async processDOCX(buffer, fileName) {
    try {
      const result = await mammoth.extractRawText({ buffer: buffer });
      return {
        title: fileName || 'DOCX Document',
        content: result.value,
        source_url: `file://${fileName}`,
        category: 'document'
      };
    } catch (error) {
      console.error('Error processing DOCX:', error);
      throw error;
    }
  }

  async processDocument(buffer, fileName, fileType) {
    let document;
    
    if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
      document = await this.processPDF(buffer, fileName);
    } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || fileName.endsWith('.docx')) {
      document = await this.processDOCX(buffer, fileName);
    } else {
      throw new Error(`Unsupported file type: ${fileType}`);
    }

    return document;
  }

  async storeDocument(document, embeddings) {
    try {
      // Generate embedding for the document content
      const embedding = await embeddings.generateEmbedding(document.content);

      // Store in Supabase
      const { data, error } = await this.supabase
        .from('knowledge_documents')
        .insert({
          title: document.title,
          content: document.content,
          source_url: document.source_url,
          form_link: null,
          category: document.category,
          embedding: embedding,
          metadata: {
            source_type: 'document_upload',
            file_name: document.source_url.split('/').pop(),
            word_count: document.content.split(' ').length
          },
          last_crawled: new Date().toISOString()
        });

      if (error) {
        console.error('Error storing document:', error);
        throw error;
      }

      console.log(`Stored document: ${document.title}`);
      return data;
    } catch (error) {
      console.error('Error storing document:', error);
      throw error;
    }
  }

  async processAndStoreDocument(buffer, fileName, fileType, embeddings) {
    try {
      // Process the document based on type
      const document = await this.processDocument(buffer, fileName, fileType);
      
      // Store in knowledge base
      await this.storeDocument(document, embeddings);
      
      return {
        success: true,
        title: document.title,
        message: `Successfully processed and stored document: ${fileName}`
      };
    } catch (error) {
      console.error('Error processing document:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = DocumentProcessor;