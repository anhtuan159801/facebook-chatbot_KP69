require('dotenv').config();
const LocalEmbeddings = require('../ai/local-embeddings');
const { createClient } = require('@supabase/supabase-js');

class KnowledgeManager {
  constructor() {
    this.embeddings = new LocalEmbeddings();
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
    );
  }

  // Generate knowledge from structured information
  async generateKnowledgeFromInfo(title, content, sourceUrl, category, formLink = null) {
    try {
      // Generate procedure code and extract ministry name
      const procedure_code = this.generateProcedureCode(title);
      const ministry_name = this.extractMinistryName(title);

      // Check if procedure already exists
      let { data: existingProcedure, error: selectError } = await this.supabase
        .from('government_procedures_knowledge')
        .select('id')
        .eq('procedure_code', procedure_code)
        .single();

      if (!selectError && existingProcedure) {
        // Procedure already exists, return success
        return { success: true, id: existingProcedure.id };
      }

      // Create new knowledge entry with full content
      const { data, error } = await this.supabase
        .from('government_procedures_knowledge')
        .insert({
          procedure_code: procedure_code,
          full_procedure_content: content,  // Store the full content as requested
          procedure_title: title,
          ministry_name: ministry_name,
          source_url: sourceUrl,
          doc_hash: this.generateDocHash(content),
          file_size: content.length,
          metadata: {
            source_type: 'generated',
            source_url: sourceUrl,
            form_link: formLink,
            created_at: new Date().toISOString(),
            word_count: content.split(' ').length
          }
        });

      if (error) {
        console.error('Error storing procedure knowledge:', error);
        return { success: false, error };
      }

      console.log(`Stored procedure knowledge: ${title}`);
      return { success: true, id: data[0] ? data[0].id : null };
    } catch (error) {
      console.error('Error generating knowledge:', error);
      return { success: false, error: error.message };
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

  // Generate knowledge from FAQ format
  async generateKnowledgeFromFAQ(faqList, category) {
    for (const faq of faqList) {
      const content = `Câu hỏi: ${faq.question}\nTrả lời: ${faq.answer}`;
      await this.generateKnowledgeFromInfo(
        faq.question,
        content,
        faq.source || 'internal',
        category
      );
    }
  }

  // Generate knowledge from procedure steps
  async generateKnowledgeFromProcedures(procedures, category) {
    for (const procedure of procedures) {
      const steps = procedure.steps.map((step, index) => `Bước ${index + 1}: ${step}`).join('\n');
      const content = `${procedure.title}\n\nMô tả: ${procedure.description}\n\nCác bước thực hiện:\n${steps}\n\nLưu ý: ${procedure.notes || ''}`;

      await this.generateKnowledgeFromInfo(
        procedure.title,
        content,
        procedure.source || 'internal',
        category,
        procedure.form_link || null
      );
    }
  }

  // Generate knowledge from document chunks
  async generateKnowledgeFromTextChunks(textChunks, sourceUrl, category) {
    for (let i = 0; i < textChunks.length; i++) {
      const chunk = textChunks[i];
      const title = `${category} - Part ${i + 1}`;

      await this.generateKnowledgeFromInfo(
        title,
        chunk,
        sourceUrl,
        category
      );
    }
  }

  // Auto-generate knowledge from conversation patterns
  async generateKnowledgeFromConversations() {
    // This would analyze conversation history to identify common questions
    // and generate knowledge articles based on them
    console.log('Analyzing conversations to generate knowledge...');

    // Get common questions from conversation history
    const { data: conversations, error } = await this.supabase
      .from('conversations') // This assumes you have a conversations table
      .select('message')
      .order('created_at', { ascending: false })
      .limit(100); // Get last 100 messages

    if (error) {
      console.error('Error fetching conversations:', error);
      return;
    }

    // Analyze messages to find common patterns/questions
    const commonQuestions = this.analyzeCommonQuestions(conversations);

    for (const question of commonQuestions) {
      // Generate knowledge based on common questions
      const knowledgeContent = this.createKnowledgeFromQuestion(question);
      await this.generateKnowledgeFromInfo(
        question,
        knowledgeContent,
        'conversation-analysis',
        'system-generated'
      );
    }
  }

  analyzeCommonQuestions(conversations) {
    // Simple analysis to find common questions
    const questionPatterns = [
      /cách.*đăng ký/gi,
      /thủ tục.*gì/gi,
      /hướng dẫn.*thực hiện/gi,
      /bước.*tiếp theo/gi
    ];

    const commonQuestions = [];

    for (const conv of conversations) {
      if (!conv.message) continue;

      for (const pattern of questionPatterns) {
        if (pattern.test(conv.message)) {
          // Extract the question-like sentence
          const sentences = conv.message.split(/[.!?]/);
          for (const sentence of sentences) {
            if (pattern.test(sentence)) {
              const question = sentence.trim();
              if (question.length > 10 && !commonQuestions.includes(question)) {
                commonQuestions.push(question);
              }
            }
          }
        }
      }
    }

    return commonQuestions.slice(0, 10); // Return top 10 common questions
  }

  createKnowledgeFromQuestion(question) {
    // Create a simple knowledge article based on the question
    return `Câu hỏi: ${question}\n\nTrả lời: Đây là một câu hỏi thường gặp. Dưới đây là hướng dẫn chi tiết:\n\n1. Bước đầu tiên cần thực hiện\n2. Bước thứ hai cần chú ý\n3. Bước kết luận\n\nLưu ý: Vui lòng kiểm tra thông tin chính thức tại nguồn cung cấp chính thức.`;
  }

  // Bulk insert multiple knowledge items
  async bulkGenerateKnowledge(knowledgeItems) {
    let insertedCount = 0;
    let skippedCount = 0;

    for (const item of knowledgeItems) {
      // Create or find government procedure
      const procedure_code = this.generateProcedureCode(item.title);
      const ministry_name = this.extractMinistryName(item.title);

      // Check if procedure already exists
      let { data: existingProcedure, error: selectError } = await this.supabase
        .from('government_procedures_knowledge')
        .select('id')
        .eq('procedure_code', procedure_code)
        .single();

      if (!selectError && existingProcedure) {
        // Knowledge already exists, skip
        skippedCount++;
        continue;
      }

      // Insert new knowledge entry with full content
      const { data, error } = await this.supabase
        .from('government_procedures_knowledge')
        .insert({
          procedure_code: procedure_code,
          full_procedure_content: item.content,  // Store the full content as requested
          procedure_title: item.title,
          ministry_name: ministry_name,
          source_url: item.source_url || 'internal',
          doc_hash: this.generateDocHash(item.content),
          file_size: item.content.length,
          metadata: {
            source_type: item.source_type || 'generated',
            source_url: item.source_url || 'internal',
            form_link: item.form_link || null,
            created_at: new Date().toISOString(),
            tags: item.tags || [],
            word_count: item.content.split(' ').length
          }
        });

      if (error) {
        console.error('Error inserting knowledge:', error);
      } else {
        insertedCount++;
      }
    }

    console.log(`Bulk processed ${knowledgeItems.length} knowledge items: ${insertedCount} inserted, ${skippedCount} skipped`);
    return { success: true, inserted: insertedCount, skipped: skippedCount };
  }
}

module.exports = KnowledgeManager;