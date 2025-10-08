/**
 * Router Hug Chatbot Service
 * 
 * This service uses the base chatbot service with OpenRouter AI integration.
 * Refactored to eliminate code duplication and improve maintainability.
 */

const BaseChatbotService = require('./base-service');

class RouterHugService extends BaseChatbotService {
    constructor() {
        super(3002, 'Router Hug Bot', 'openrouter');
    }
}

// Create and start the service
const routerHugService = new RouterHugService();
routerHugService.start();