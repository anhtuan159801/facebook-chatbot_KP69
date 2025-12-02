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
      const embedding = await this.embeddings.generateEmbedding(content);
      
      const { data, error } = await this.supabase
        .from('knowledge_documents')
        .insert({
          title: title,
          content: content,
          source_url: sourceUrl,
          form_link: formLink,
          category: category,
          embedding: embedding,
          metadata: {
            source_type: 'generated',
            created_at: new Date().toISOString(),
            word_count: content.split(' ').length
          },
          last_crawled: new Date().toISOString()
        });

      if (error) {
        console.error('Error storing generated knowledge:', error);
        return { success: false, error };
      }

      console.log(`Stored generated knowledge: ${title}`);
      return { success: true, data };
    } catch (error) {
      console.error('Error generating knowledge:', error);
      return { success: false, error: error.message };
    }
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
    const itemsToInsert = [];
    
    for (const item of knowledgeItems) {
      const embedding = await this.embeddings.generateEmbedding(item.content);
      
      itemsToInsert.push({
        title: item.title,
        content: item.content,
        source_url: item.source_url || 'internal',
        form_link: item.form_link || null,
        category: item.category || 'general',
        embedding: embedding,
        metadata: {
          source_type: item.source_type || 'generated',
          created_at: new Date().toISOString(),
          tags: item.tags || [],
          word_count: item.content.split(' ').length
        },
        last_crawled: new Date().toISOString()
      });
    }
    
    // Insert all at once for better performance
    const { data, error } = await this.supabase
      .from('knowledge_documents')
      .insert(itemsToInsert);
    
    if (error) {
      console.error('Error bulk inserting knowledge:', error);
      return { success: false, error };
    }
    
    console.log(`Bulk inserted ${itemsToInsert.length} knowledge items`);
    return { success: true, data };
  }
}

module.exports = KnowledgeManager;