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
      // Generate procedure code and extract ministry name
      const procedure_code = this.generateProcedureCode(document.title);
      const ministry_name = this.extractMinistryName(document.title);

      // Check if procedure already exists
      const { data: existingKnowledge, error: selectError } = await this.supabase
        .from('government_procedures_knowledge')
        .select('id')
        .eq('procedure_code', procedure_code)
        .single();

      if (existingKnowledge) {
        // Knowledge already exists, update it
        const { error: updateError } = await this.supabase
          .from('government_procedures_knowledge')
          .update({
            full_procedure_content: document.content,
            procedure_title: document.title,
            ministry_name: ministry_name,
            source_url: document.source_url,
            doc_hash: this.generateDocHash(document.content),
            file_size: document.content.length,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingKnowledge.id);

        if (updateError) {
          console.error('Error updating procedure knowledge:', updateError);
          throw updateError;
        }

        console.log(`Updated procedure knowledge: ${document.title}`);
        return { id: existingKnowledge.id };
      } else {
        // Store content in government_procedures_knowledge table (full content)
        const { data, error } = await this.supabase
          .from('government_procedures_knowledge')
          .insert({
            procedure_code: procedure_code,
            full_procedure_content: document.content,  // Store the full content as requested
            procedure_title: document.title,
            ministry_name: ministry_name,
            source_url: document.source_url,
            doc_hash: this.generateDocHash(document.content),
            file_size: document.content.length,
            metadata: {
              source_type: 'document_upload',
              file_name: document.source_url.split('/').pop(),
              word_count: document.content.split(' ').length
            }
          });

        if (error) {
          console.error('Error storing procedure knowledge:', error);
          throw error;
        }

        console.log(`Stored procedure knowledge: ${document.title}`);
        return data;
      }
    } catch (error) {
      console.error('Error storing document:', error);
      throw error;
    }
  }

  // Helper method to generate procedure code from title
  generateProcedureCode(title) {
    // Generate a unique procedure code from title
    const cleanTitle = title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
    return `PROC_${Date.now()}_${cleanTitle}`;
  }

  // Helper method to extract ministry name from title
  extractMinistryName(title) {
    // Extract ministry name from title if available
    const ministryMatch = title.match(/Bộ_\w+|Sở_\w+|Phòng_\w+/);
    return ministryMatch ? ministryMatch[0].replace(/_/g, ' ') : 'Unknown Ministry';
  }

  // Helper method to generate document hash
  generateDocHash(content) {
    // Simple hash function using content
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
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