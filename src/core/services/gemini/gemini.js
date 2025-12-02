/**
 * Gemini Chatbot Service
 * 
 * This service uses the base chatbot service with Gemini AI integration.
 * Refactored to eliminate code duplication and improve maintainability.
 */

const BaseChatbotService = require('../../base-service');

class GeminiService extends BaseChatbotService {
    constructor() {
        super(3001, 'Gemini Bot', 'gemini');
    }
}

// Create and start the service
const geminiService = new GeminiService();
geminiService.start();