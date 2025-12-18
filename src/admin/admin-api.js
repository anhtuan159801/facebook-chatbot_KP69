/**
 * Admin API for Dashboard and Management Interface
 * 
 * Provides backend endpoints for admin dashboard including:
 * - System statistics and analytics
 * - Model management
 * - API key management
 * - Conversation history
 * - Performance metrics
 */

require('dotenv').config();
const express = require('express');
const dbManager = require('../utils/database-manager');
const healthMonitor = require('../utils/system-health-monitor');
const { createLogger } = require('../utils/enhanced-logger');

class AdminAPI {
  constructor() {
    this.router = express.Router();
    this.logger = createLogger('AdminAPI');
    this.setupRoutes();
  }

  setupRoutes() {
    // Authentication middleware (simplified - in production use proper auth)
    this.router.use(this.verifyAdminAccess.bind(this));

    // System statistics and analytics
    this.router.get('/stats/system', this.getSystemStats.bind(this));
    this.router.get('/stats/conversations', this.getConversationStats.bind(this));
    this.router.get('/stats/performance', this.getPerformanceStats.bind(this));
    this.router.get('/stats/health', this.getHealthStatus.bind(this));

    // Model management
    this.router.get('/models', this.getModels.bind(this));
    this.router.post('/models/:modelId/activate', this.activateModel.bind(this));
    this.router.post('/models/:modelId/deactivate', this.deactivateModel.bind(this));

    // API key management
    this.router.get('/api-keys', this.getAPIKeys.bind(this));
    this.router.post('/api-keys', this.createAPIKey.bind(this));
    this.router.put('/api-keys/:keyId', this.updateAPIKey.bind(this));
    this.router.delete('/api-keys/:keyId', this.deleteAPIKey.bind(this));

    // Conversation history
    this.router.get('/conversations', this.getConversations.bind(this));
    this.router.get('/conversations/:id', this.getConversationById.bind(this));
    this.router.delete('/conversations/:id', this.deleteConversation.bind(this));

    // User management
    this.router.get('/users', this.getUsers.bind(this));
    this.router.put('/users/:userId', this.updateUser.bind(this));

    // Feedback and ratings
    this.router.get('/feedback', this.getFeedback.bind(this));
    this.router.put('/feedback/:feedbackId', this.updateFeedback.bind(this));

    // Knowledge base management
    this.router.get('/knowledge', this.getKnowledgeBaseStats.bind(this));
    this.router.post('/knowledge/reindex', this.reindexKnowledgeBase.bind(this));
  }

  // Middleware to verify admin access
  verifyAdminAccess(req, res, next) {
    const adminToken = req.headers['x-admin-token'] || req.query.adminToken;
    const expectedToken = process.env.ADMIN_TOKEN;

    if (!expectedToken || !adminToken || adminToken !== expectedToken) {
      return res.status(401).json({ error: 'Unauthorized access' });
    }

    next();
  }

  // Get system statistics
  async getSystemStats(req, res) {
    try {
      // Get system health status
      const healthStatus = healthMonitor.getHealthStatus();
      
      // Get basic stats from the database
      const stats = await dbManager.executeSupabaseQuery(
        'user_chat_history', 
        'count(*) as total_conversations'
      );
      
      // Get recent conversation stats
      const recentConversations = await dbManager.executeSupabaseQuery(
        'user_chat_history',
        '*',
        { created_at: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }, // Last 24 hours
        true
      );

      const totalConversations = stats.length > 0 ? parseInt(stats[0].count) : 0;

      res.json({
        systemHealth: healthStatus,
        totalConversations,
        conversationsLast24h: recentConversations.length,
        activeUsers: [...new Set(recentConversations.map(conv => conv.facebook_user_id))].length,
        timestamp: new Date()
      });
    } catch (error) {
      this.logger.error('Error getting system stats:', error);
      res.status(500).json({ error: 'Failed to get system stats' });
    }
  }

  // Get conversation statistics
  async getConversationStats(req, res) {
    try {
      // Get conversation metrics grouped by date
      const query = `
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as total,
          AVG(LENGTH(chatbot_response)) as avg_response_length,
          SUM(CASE WHEN chatbot_response IS NOT NULL THEN 1 ELSE 0 END) as responses
        FROM user_chat_history 
        WHERE created_at >= $1
        GROUP BY DATE(created_at)
        ORDER BY DATE(created_at) DESC
        LIMIT 30
      `;

      const result = await dbManager.executeQuery(
        query, 
        [new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)], // Last 30 days
        true
      );

      res.json({
        dailyMetrics: result.rows,
        totalConversations: result.rows.reduce((sum, row) => sum + parseInt(row.total), 0)
      });
    } catch (error) {
      this.logger.error('Error getting conversation stats:', error);
      res.status(500).json({ error: 'Failed to get conversation stats' });
    }
  }

  // Get performance statistics
  async getPerformanceStats(req, res) {
    try {
      // Get performance metrics from health monitor
      const performanceMetrics = healthMonitor.getPerformanceMetrics();

      // Get response time data from database
      const responseTimeQuery = `
        SELECT 
          DATE(created_at) as date,
          AVG(extract(epoch from (completed_at - created_at))) as avg_response_time
        FROM user_chat_history 
        WHERE completed_at IS NOT NULL AND created_at >= $1
        GROUP BY DATE(created_at)
        ORDER BY DATE(created_at) DESC
        LIMIT 7
      `;

      const responseTimeResult = await dbManager.executeQuery(
        responseTimeQuery,
        [new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)], // Last 7 days
        true
      );

      res.json({
        ...performanceMetrics,
        responseTimeHistory: responseTimeResult.rows
      });
    } catch (error) {
      this.logger.error('Error getting performance stats:', error);
      res.status(500).json({ error: 'Failed to get performance stats' });
    }
  }

  // Get health status
  async getHealthStatus(req, res) {
    try {
      const healthStatus = healthMonitor.getHealthStatus();
      res.json(healthStatus);
    } catch (error) {
      this.logger.error('Error getting health status:', error);
      res.status(500).json({ error: 'Failed to get health status' });
    }
  }

  // Get available models
  async getModels(req, res) {
    try {
      // In a real implementation, this would connect to a model management system
      const models = [
        {
          id: 'gemini',
          name: 'Google Gemini',
          provider: 'Google',
          status: process.env.GEMINI_API_KEY ? 'active' : 'inactive',
          lastUsed: null,
          usageCount: 0,
          config: {
            model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
            temperature: 0.7
          }
        },
        {
          id: 'openrouter',
          name: 'OpenRouter GPT',
          provider: 'OpenRouter',
          status: process.env.OPENROUTER_API_KEY ? 'active' : 'inactive',
          lastUsed: null,
          usageCount: 0,
          config: {
            model: process.env.OPENROUTER_MODEL || 'openai/gpt-oss-20b:free',
            temperature: 0.7
          }
        },
        {
          id: 'huggingface',
          name: 'HuggingFace Whisper',
          provider: 'HuggingFace',
          status: process.env.HUGGINGFACE_API_KEY ? 'active' : 'inactive',
          lastUsed: null,
          usageCount: 0,
          config: {
            model: process.env.HUGGINGFACE_MODEL || 'openai/whisper-large-v3-turbo',
            task: 'transcription'
          }
        }
      ];

      res.json(models);
    } catch (error) {
      this.logger.error('Error getting models:', error);
      res.status(500).json({ error: 'Failed to get models' });
    }
  }

  // Activate a model
  async activateModel(req, res) {
    try {
      const { modelId } = req.params;
      // In a real implementation, this would update model activation status
      res.json({ success: true, message: `Model ${modelId} activated` });
    } catch (error) {
      this.logger.error('Error activating model:', error);
      res.status(500).json({ error: 'Failed to activate model' });
    }
  }

  // Deactivate a model
  async deactivateModel(req, res) {
    try {
      const { modelId } = req.params;
      // In a real implementation, this would update model deactivation status
      res.json({ success: true, message: `Model ${modelId} deactivated` });
    } catch (error) {
      this.logger.error('Error deactivating model:', error);
      res.status(500).json({ error: 'Failed to deactivate model' });
    }
  }

  // Get API keys
  async getAPIKeys(req, res) {
    try {
      // Return masked API keys information (only show first 4 chars)
      const apiKeys = [
        {
          id: 'gemini-key',
          name: 'Gemini API Key',
          value: process.env.GEMINI_API_KEY ? 
            process.env.GEMINI_API_KEY.substring(0, 4) + '...' : 'Not set',
          provider: 'Google',
          usageCount: 0,
          lastUsed: null,
          status: process.env.GEMINI_API_KEY ? 'active' : 'inactive'
        },
        {
          id: 'openrouter-key',
          name: 'OpenRouter API Key',
          value: process.env.OPENROUTER_API_KEY ? 
            process.env.OPENROUTER_API_KEY.substring(0, 4) + '...' : 'Not set',
          provider: 'OpenRouter',
          usageCount: 0,
          lastUsed: null,
          status: process.env.OPENROUTER_API_KEY ? 'active' : 'inactive'
        },
        {
          id: 'huggingface-key',
          name: 'HuggingFace API Key',
          value: process.env.HUGGINGFACE_API_KEY ? 
            process.env.HUGGINGFACE_API_KEY.substring(0, 4) + '...' : 'Not set',
          provider: 'HuggingFace',
          usageCount: 0,
          lastUsed: null,
          status: process.env.HUGGINGFACE_API_KEY ? 'active' : 'inactive'
        }
      ];

      res.json(apiKeys);
    } catch (error) {
      this.logger.error('Error getting API keys:', error);
      res.status(500).json({ error: 'Failed to get API keys' });
    }
  }

  // Create new API key
  async createAPIKey(req, res) {
    try {
      const { name, provider, value } = req.body;
      // In a real implementation, this would securely store the API key
      res.json({ 
        success: true, 
        message: `API key for ${provider} created successfully`,
        id: `key-${Date.now()}`
      });
    } catch (error) {
      this.logger.error('Error creating API key:', error);
      res.status(500).json({ error: 'Failed to create API key' });
    }
  }

  // Update API key
  async updateAPIKey(req, res) {
    try {
      const { keyId } = req.params;
      const { name, value, status } = req.body;
      // In a real implementation, this would update the API key
      res.json({ 
        success: true, 
        message: `API key ${keyId} updated successfully`
      });
    } catch (error) {
      this.logger.error('Error updating API key:', error);
      res.status(500).json({ error: 'Failed to update API key' });
    }
  }

  // Delete API key
  async deleteAPIKey(req, res) {
    try {
      const { keyId } = req.params;
      // In a real implementation, this would delete the API key
      res.json({ 
        success: true, 
        message: `API key ${keyId} deleted successfully`
      });
    } catch (error) {
      this.logger.error('Error deleting API key:', error);
      res.status(500).json({ error: 'Failed to delete API key' });
    }
  }

  // Get conversations
  async getConversations(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;
      const offset = (page - 1) * limit;

      // Get conversations with pagination
      const query = `
        SELECT 
          id,
          facebook_user_id,
          user_request,
          chatbot_response,
          created_at,
          updated_at,
          message_type
        FROM user_chat_history
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
      `;

      const result = await dbManager.executeQuery(query, [limit, offset], true);

      // Get total count for pagination
      const countQuery = 'SELECT COUNT(*) as total FROM user_chat_history';
      const countResult = await dbManager.executeQuery(countQuery, [], true);

      res.json({
        conversations: result.rows,
        pagination: {
          page,
          limit,
          total: parseInt(countResult.rows[0].total),
          totalPages: Math.ceil(parseInt(countResult.rows[0].total) / limit)
        }
      });
    } catch (error) {
      this.logger.error('Error getting conversations:', error);
      res.status(500).json({ error: 'Failed to get conversations' });
    }
  }

  // Get conversation by ID
  async getConversationById(req, res) {
    try {
      const { id } = req.params;
      
      const query = `
        SELECT 
          id,
          facebook_user_id,
          user_request,
          chatbot_response,
          created_at,
          updated_at,
          message_type
        FROM user_chat_history
        WHERE id = $1
      `;

      const result = await dbManager.executeQuery(query, [id], true);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Conversation not found' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      this.logger.error('Error getting conversation:', error);
      res.status(500).json({ error: 'Failed to get conversation' });
    }
  }

  // Delete conversation
  async deleteConversation(req, res) {
    try {
      const { id } = req.params;
      // In a real implementation, this would delete the conversation
      res.json({ 
        success: true, 
        message: `Conversation ${id} deleted successfully` 
      });
    } catch (error) {
      this.logger.error('Error deleting conversation:', error);
      res.status(500).json({ error: 'Failed to delete conversation' });
    }
  }

  // Get users
  async getUsers(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;
      const offset = (page - 1) * limit;

      // Get users with conversation counts
      const query = `
        SELECT 
          u.id,
          u.user_id as facebook_user_id,
          COUNT(h.id) as conversation_count,
          MAX(h.created_at) as last_conversation,
          u.created_at,
          u.updated_at
        FROM users u
        LEFT JOIN user_chat_history h ON u.user_id = h.facebook_user_id
        GROUP BY u.id, u.user_id, u.created_at, u.updated_at
        ORDER BY MAX(h.created_at) DESC NULLS LAST
        LIMIT $1 OFFSET $2
      `;

      const result = await dbManager.executeQuery(query, [limit, offset], true);

      // Get total count for pagination
      const countQuery = 'SELECT COUNT(*) as total FROM users';
      const countResult = await dbManager.executeQuery(countQuery, [], true);

      res.json({
        users: result.rows,
        pagination: {
          page,
          limit,
          total: parseInt(countResult.rows[0].total),
          totalPages: Math.ceil(parseInt(countResult.rows[0].total) / limit)
        }
      });
    } catch (error) {
      this.logger.error('Error getting users:', error);
      res.status(500).json({ error: 'Failed to get users' });
    }
  }

  // Update user
  async updateUser(req, res) {
    try {
      const { userId } = req.params;
      const { status, notes } = req.body;
      // In a real implementation, this would update user information
      res.json({ 
        success: true, 
        message: `User ${userId} updated successfully`
      });
    } catch (error) {
      this.logger.error('Error updating user:', error);
      res.status(500).json({ error: 'Failed to update user' });
    }
  }

  // Get feedback
  async getFeedback(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;
      const offset = (page - 1) * limit;

      // Get feedback with pagination
      const query = `
        SELECT 
          id,
          user_id,
          rating,
          feedback_text,
          created_at
        FROM feedback
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
      `;

      const result = await dbManager.executeQuery(query, [limit, offset], true);

      // Get total count for pagination
      const countQuery = 'SELECT COUNT(*) as total FROM feedback';
      const countResult = await dbManager.executeQuery(countQuery, [], true);

      res.json({
        feedback: result.rows,
        pagination: {
          page,
          limit,
          total: parseInt(countResult.rows[0].total),
          totalPages: Math.ceil(parseInt(countResult.rows[0].total) / limit)
        }
      });
    } catch (error) {
      this.logger.error('Error getting feedback:', error);
      res.status(500).json({ error: 'Failed to get feedback' });
    }
  }

  // Update feedback
  async updateFeedback(req, res) {
    try {
      const { feedbackId } = req.params;
      const { status, response } = req.body;
      // In a real implementation, this would update feedback information
      res.json({ 
        success: true, 
        message: `Feedback ${feedbackId} updated successfully`
      });
    } catch (error) {
      this.logger.error('Error updating feedback:', error);
      res.status(500).json({ error: 'Failed to update feedback' });
    }
  }

  // Get knowledge base statistics
  async getKnowledgeBaseStats(req, res) {
    try {
      // Get statistics about the knowledge base
      const query = `
        SELECT 
          COUNT(*) as total_documents,
          COUNT(DISTINCT ministry_name) as unique_sources,
          AVG(LENGTH(full_content)) as avg_content_length,
          MIN(created_at) as earliest_document,
          MAX(created_at) as latest_document
        FROM government_procedures_knowledge
      `;

      const result = await dbManager.executeQuery(query, [], true);

      res.json({
        knowledgeBaseStats: result.rows[0],
        indexingStatus: 'completed' // In a real system, this would track indexing progress
      });
    } catch (error) {
      this.logger.error('Error getting knowledge base stats:', error);
      res.status(500).json({ error: 'Failed to get knowledge base stats' });
    }
  }

  // Reindex knowledge base
  async reindexKnowledgeBase(req, res) {
    try {
      // In a real implementation, this would trigger a knowledge base reindexing process
      res.json({ 
        success: true, 
        message: 'Knowledge base reindexing started',
        jobId: `reindex-${Date.now()}`
      });
    } catch (error) {
      this.logger.error('Error reindexing knowledge base:', error);
      res.status(500).json({ error: 'Failed to reindex knowledge base' });
    }
  }

  getRouter() {
    return this.router;
  }
}

module.exports = AdminAPI;