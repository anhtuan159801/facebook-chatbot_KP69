require('dotenv').config(); // Load environment variables
const LocalEmbeddings = require('./local-embeddings');
const { createClient } = require('@supabase/supabase-js');

class LocalRAGSystem {
  constructor() {
    this.embeddings = new LocalEmbeddings();
    this._supabase = null; // Lazy initialization
  }

  get supabase() {
    if (!this._supabase) {
      // Try both formats: with and without NEXT_PUBLIC_ prefix
      const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY) environment variables are required.');
      }
      this._supabase = require('@supabase/supabase-js').createClient(
        supabaseUrl,
        supabaseAnonKey
      );
    }
    return this._supabase;
  }

  async getRelevantKnowledge(userQuery, category = null) {
    try {
      // Return empty results if Supabase is not configured
      const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        return []; // Return empty array when Supabase is not configured
      }

      const queryEmbedding = await this.embeddings.generateEmbedding(userQuery);

      const { data: relevantDocs, error } = await this.supabase
        .rpc('match_documents', {
          query_embedding: queryEmbedding,
          match_count: 5,
          filter_category: category
        });

      if (error) {
        console.error('Error searching knowledge:', error);
        return [];
      }

      // Filter results by similarity threshold (lower = more similar)
      return relevantDocs.filter(doc => doc.similarity < 0.6);
    } catch (error) {
      console.error('Error in RAG system:', error);
      return [];
    }
  }

  formatKnowledgeForPrompt(knowledgeDocs) {
    if (!knowledgeDocs || knowledgeDocs.length === 0) {
      return '';
    }

    return knowledgeDocs.map(doc => 
      `[NGUỒN CHÍNH THỨC: ${doc.source_url || 'N/A'}]\n` +
      `[BIỂU MẪU: ${doc.form_link || 'N/A'}]\n` +
      `[THÔNG TIN: ${doc.content.substring(0, 800)}...]\n\n`
    ).join('');
  }
}

module.exports = LocalRAGSystem;