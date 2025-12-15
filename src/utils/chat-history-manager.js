require('dotenv').config();
const LocalEmbeddings = require('../ai/local-embeddings');
const { createClient } = require('@supabase/supabase-js');

class ChatHistoryManager {
  constructor() {
    this.embeddings = new LocalEmbeddings();
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY
    );
  }

  // Save a user message to history
  async saveUserMessage(userId, sessionId, message, intent = null, metadata = {}) {
    try {
      const embedding = await this.embeddings.generateEmbedding(message);
      
      const { data, error } = await this.supabase
        .from('user_chat_history')
        .insert({
          facebook_user_id: userId,
          session_id: sessionId,
          user_request: message,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error saving user message:', error);
        return { success: false, error };
      }

      // Update or create conversation session
      await this.updateConversationSession(sessionId, userId, intent);

      return { success: true, data };
    } catch (error) {
      console.error('Error in saveUserMessage:', error);
      return { success: false, error: error.message };
    }
  }

  // Save assistant response to history
  async saveAssistantResponse(userId, sessionId, response, responseTimeMs = null, metadata = {}) {
    try {
      const embedding = await this.embeddings.generateEmbedding(response);
      
      const { data, error } = await this.supabase
        .from('user_chat_history')
        .insert({
          facebook_user_id: userId,
          session_id: sessionId,
          chatbot_response: response,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error saving assistant response:', error);
        return { success: false, error };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Error in saveAssistantResponse:', error);
      return { success: false, error: error.message };
    }
  }

  // Save system message to history
  async saveSystemMessage(userId, sessionId, message, metadata = {}) {
    try {
      const embedding = await this.embeddings.generateEmbedding(message);
      
      const { data, error } = await this.supabase
        .from('user_chat_history')
        .insert({
          facebook_user_id: userId,
          session_id: sessionId,
          user_request: message,  // For system messages, we can store in user_request
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error saving system message:', error);
        return { success: false, error };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Error in saveSystemMessage:', error);
      return { success: false, error: error.message };
    }
  }

  // Get conversation history for a user
  async getConversationHistory(userId, sessionId = null, limit = 50) {
    try {
      let query = this.supabase
        .from('user_chat_history')
        .select('*')
        .eq('facebook_user_id', userId)
        .order('created_at', { ascending: true });

      if (sessionId) {
        query = query.eq('session_id', sessionId);
      }

      query = query.limit(limit);

      const { data, error } = await query;

      if (error) {
        console.error('Error getting conversation history:', error);
        return { success: false, error };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Error in getConversationHistory:', error);
      return { success: false, error: error.message };
    }
  }

  // Search chat history semantically
  async searchChatHistory(query, userId = null, sessionId = null) {
    try {
      const queryEmbedding = await this.embeddings.generateEmbedding(query);
      
      // Call the PostgreSQL function
      const { data: results, error } = await this.supabase
        .rpc('search_user_chat_history', {
          query_embedding: queryEmbedding,
          user_id: userId,
          session_id: sessionId,
          days_back: 30, // Search last 30 days
          match_count: 10
        });

      if (error) {
        console.error('Error searching chat history:', error);
        return { success: false, error };
      }

      return { success: true, data: results };
    } catch (error) {
      console.error('Error in searchChatHistory:', error);
      return { success: false, error: error.message };
    }
  }

  // Update or create conversation session
  async updateConversationSession(sessionId, userId, intent = null) {
    try {
      // Check if session exists
      const { data: existingSession, error: selectError } = await this.supabase
        .from('conversation_sessions')
        .select('*')
        .eq('session_id', sessionId)
        .single();

      if (selectError && selectError.code !== 'PGRST116') { // PGRST116 = not found
        console.error('Error checking session:', selectError);
        return { success: false, error: selectError };
      }

      if (existingSession) {
        // Update existing session
        const { data, error } = await this.supabase
          .from('conversation_sessions')
          .update({
            last_activity: new Date().toISOString(),
            topic: intent || existingSession.topic
          })
          .eq('session_id', sessionId);

        if (error) {
          console.error('Error updating session:', error);
          return { success: false, error };
        }
      } else {
        // Create new session
        const { data, error } = await this.supabase
          .from('conversation_sessions')
          .insert({
            session_id: sessionId,
            user_id: userId,
            topic: intent,
            status: 'active',
            started_at: new Date().toISOString(),
            metadata: { created_from: 'chat' }
          });

        if (error) {
          console.error('Error creating session:', error);
          return { success: false, error };
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Error in updateConversationSession:', error);
      return { success: false, error: error.message };
    }
  }

  // Mark conversation as resolved
  async markConversationResolved(sessionId, resolutionStatus = 'resolved', satisfaction = null) {
    try {
      const { data: session, error } = await this.supabase
        .from('conversation_sessions')
        .update({
          status: 'ended',
          resolution_status: resolutionStatus,
          ended_at: new Date().toISOString()
        })
        .eq('session_id', sessionId)
        .select();

      if (error) {
        console.error('Error marking conversation as resolved:', error);
        return { success: false, error };
      }

      // If satisfaction rating provided, update analytics
      if (satisfaction !== null) {
        await this.updateSatisfactionRating(sessionId, satisfaction);
      }

      return { success: true, data: session };
    } catch (error) {
      console.error('Error in markConversationResolved:', error);
      return { success: false, error: error.message };
    }
  }

  // Update satisfaction rating
  async updateSatisfactionRating(sessionId, satisfaction) {
    try {
      // Check if analytics record exists
      const { data: existingAnalytics, error: selectError } = await this.supabase
        .from('conversation_analytics')
        .select('*')
        .eq('session_id', sessionId)
        .single();

      if (selectError && selectError.code !== 'PGRST116') {
        console.error('Error checking analytics:', selectError);
        return { success: false, error: selectError };
      }

      if (existingAnalytics) {
        // Update existing analytics
        const { data, error } = await this.supabase
          .from('conversation_analytics')
          .update({
            user_satisfaction: satisfaction,
            created_at: new Date().toISOString()
          })
          .eq('session_id', sessionId);

        if (error) {
          console.error('Error updating analytics:', error);
          return { success: false, error };
        }
      } else {
        // Calculate conversation stats and create new analytics record
        const stats = await this.calculateConversationStats(sessionId);
        
        const { data, error } = await this.supabase
          .from('conversation_analytics')
          .insert({
            session_id: sessionId,
            user_id: existingAnalytics?.user_id || 'unknown', // Will need to get from session
            user_satisfaction: satisfaction,
            message_count: stats?.message_count || 0,
            avg_response_time_ms: stats?.avg_response_time || 0
          });

        if (error) {
          console.error('Error creating analytics:', error);
          return { success: false, error };
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Error in updateSatisfactionRating:', error);
      return { success: false, error: error.message };
    }
  }

  // Calculate conversation statistics
  async calculateConversationStats(sessionId) {
    try {
      // This would call the PostgreSQL function we defined in the schema
      const { data, error } = await this.supabase.rpc('calculate_conversation_stats', {
        p_session_id: sessionId
      });

      if (error) {
        console.error('Error calculating stats:', error);
        return null;
      }

      return data[0] || null;
    } catch (error) {
      console.error('Error in calculateConversationStats:', error);
      return null;
    }
  }

  // Get recent conversations for a user
  async getRecentConversations(userId, limit = 10) {
    try {
      const { data, error } = await this.supabase
        .from('conversation_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('last_activity', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error getting recent conversations:', error);
        return { success: false, error };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Error in getRecentConversations:', error);
      return { success: false, error: error.message };
    }
  }

  // Clear conversation history for a user (with safety checks)
  async clearUserHistory(userId, sessionId = null) {
    try {
      let condition = { user_id: userId };
      if (sessionId) {
        condition.session_id = sessionId;
      }

      const { error } = await this.supabase
        .from('user_chat_history')
        .delete()
        .match(condition);

      if (error) {
        console.error('Error clearing history:', error);
        return { success: false, error };
      }

      if (!sessionId) {
        // Also clear session data if clearing all history
        await this.supabase
          .from('conversation_sessions')
          .delete()
          .eq('user_id', userId);
      }

      return { success: true };
    } catch (error) {
      console.error('Error in clearUserHistory:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = ChatHistoryManager;