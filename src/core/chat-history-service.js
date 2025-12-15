require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

class ChatHistoryService {
  constructor() {
    this.supabase = null;
  }

  getSupabaseClient() {
    if (!this.supabase) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Supabase configuration is required for chat history service');
      }

      this.supabase = createClient(supabaseUrl, supabaseAnonKey);
    }
    return this.supabase;
  }

  /**
   * Save a conversation to the user_chat_history table
   */
  async saveConversation(userId, userRequest, chatbotResponse, sessionId = null) {
    try {
      const supabase = this.getSupabaseClient();
      
      const { data, error } = await supabase
        .from('user_chat_history')
        .insert({
          facebook_user_id: userId,
          user_request: userRequest,
          chatbot_response: chatbotResponse,
          session_id: sessionId,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error saving conversation to user_chat_history:', error);
        // Check if it's an RLS error or table not found error
        if (error.code === '42501' || error.code === 'PGRST205') {
          console.warn(`Permissions error or table not found: ${error.message}`);
          // For RLS errors, we might need to use an authenticated client or handle differently
          // For now, just return success to prevent error messages since conversation can continue
          return { success: true, message: 'RLS prevented insert, but conversation can continue' };
        }

        // Try to use the stored procedure as fallback only if it's not an RLS error
        const { data: rpcData, error: rpcError } = await supabase.rpc('add_chat_interaction', {
          p_facebook_user_id: userId,
          p_user_request: userRequest,
          p_chatbot_response: chatbotResponse,
          p_session_id: sessionId
        });

        if (rpcError) {
          console.error('Error using stored procedure:', rpcError);
          // For RLS error on RPC as well, just continue
          if (rpcError.code === '42501') {
            console.warn(`RLS prevented stored procedure execution: ${rpcError.message}`);
            return { success: true, message: 'RLS prevented history storage, but conversation can continue' };
          }
          return { success: false, error: error.message || rpcError.message };
        }

        return { success: true, data: rpcData };
      }

      console.log(`✅ Saved conversation for user ${userId} to user_chat_history table`);
      return { success: true, data };
    } catch (error) {
      console.error('Error in saveConversation:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get recent chat history for a user
   */
  async getConversationHistory(userId, limit = 20) {
    try {
      const supabase = this.getSupabaseClient();
      
      const { data, error } = await supabase
        .from('user_chat_history')
        .select('user_request, chatbot_response, created_at')
        .eq('facebook_user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching conversation history:', error);
        // Check if it's an RLS error or table not found error
        if (error.code === '42501' || error.code === 'PGRST205') {
          console.warn(`Permissions error or table not found when fetching history: ${error.message}`);
          return []; // Return empty history but don't fail completely
        }
        return [];
      }

      // Format for AI consumption (similar to the old format)
      const formattedHistory = [];
      
      // Process in reverse order to maintain chronological order
      data.reverse().forEach(item => {
        if (item.user_request) {
          formattedHistory.push({
            role: 'user',
            parts: [{ text: item.user_request }]
          });
        }
        if (item.chatbot_response) {
          formattedHistory.push({
            role: 'assistant', 
            parts: [{ text: item.chatbot_response }]
          });
        }
      });

      return formattedHistory;
    } catch (error) {
      console.error('Error in getConversationHistory:', error);
      return [];
    }
  }

  /**
   * Get recent chat history using the stored procedure
   */
  async getConversationHistoryWithFunction(userId, limit = 50) {
    try {
      const supabase = this.getSupabaseClient();
      
      // Using the get_user_chat_history function defined in the schema
      const { data, error } = await supabase.rpc('get_user_chat_history', {
        p_facebook_user_id: userId,
        p_limit: limit
      });

      if (error) {
        console.error('Error calling get_user_chat_history function:', error);
        return [];
      }

      // Format the results
      const formattedHistory = [];
      
      data.forEach(item => {
        if (item.user_request) {
          formattedHistory.push({
            role: 'user',
            parts: [{ text: item.user_request }]
          });
        }
        if (item.chatbot_response) {
          formattedHistory.push({
            role: 'assistant',
            parts: [{ text: item.chatbot_response }]
          });
        }
      });

      return formattedHistory;
    } catch (error) {
      console.error('Error in getConversationHistoryWithFunction:', error);
      return this.getConversationHistory(userId, limit); // Fallback
    }
  }

  /**
   * Get conversation statistics for a user
   */
  async getUserStatistics(userId) {
    try {
      const supabase = this.getSupabaseClient();
      
      // Get total conversations, recent activity, etc.
      const { count, error } = await supabase
        .from('user_chat_history')
        .select('*', { count: 'exact', head: true })
        .eq('facebook_user_id', userId);

      if (error) {
        console.error('Error getting user statistics:', error);
        return null;
      }

      // Get last conversation date
      const { data: lastConv, error: dateError } = await supabase
        .from('user_chat_history')
        .select('created_at')
        .eq('facebook_user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1);

      return {
        total_conversations: count,
        last_active: lastConv && lastConv.length > 0 ? lastConv[0].created_at : null
      };
    } catch (error) {
      console.error('Error in getUserStatistics:', error);
      return null;
    }
  }

  /**
   * Get all conversations for a specific session
   */
  async getSessionConversations(sessionId, limit = 20) {
    try {
      const supabase = this.getSupabaseClient();
      
      const { data, error } = await supabase
        .from('user_chat_history')
        .select('user_request, chatbot_response, created_at, facebook_user_id')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })
        .limit(limit);

      if (error) {
        console.error('Error fetching session conversations:', error);
        return [];
      }

      return data;
    } catch (error) {
      console.error('Error in getSessionConversations:', error);
      return [];
    }
  }
}

module.exports = ChatHistoryService;