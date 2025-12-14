/**
 * Base Chatbot Service
 *
 * This class provides common functionality for all chatbot services
 * to eliminate code duplication and ensure consistency.
 */

require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const ChatHistoryService = require('./chat-history-service');

// Import centralized modules
const {
    SYSTEM_PROMPT,
    IMAGE_ANALYSIS_PROMPT,
    AUDIO_TRANSCRIPTION_PROMPT,
    CONTEXT_PROMPTS,
    ERROR_PROMPTS,
    RATING_RESPONSES,
    JOURNEY_MESSAGES,
    getEnhancedPrompt,
    getErrorMessage,
    getRatingResponse,
    getJourneyMessage
} = require('../utils/prompts');

const {
    AIFactory,
    createRetryWrapper,
    createTimeoutWrapper
} = require('../ai/ai-models');

const { createLogger } = require('../utils/logger');
const aiProviderManager = require('../ai/ai-provider-manager');
const LocalRAGSystem = require('../ai/local-rag-system');
const ChatHistoryManager = require('../utils/chat-history-manager');
const KnowledgeManager = require('../utils/knowledge-manager');

class BaseChatbotService {
    constructor(port, serviceName, aiProvider = 'gemini') {
        this.port = port;
        this.serviceName = serviceName;
        this.aiProvider = aiProvider;
        
        // Initialize logger
        this.logger = createLogger(serviceName);
        
        // Initialize Express app
        this.app = express();
        this.app.use(express.json());
        
        // Initialize database
        this.pool = new Pool({
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            ssl: {
                rejectUnauthorized: false
            }
        });
        
        // Initialize AI
        this.initializeAI();
        
        // Initialize state management
        this.processingRequests = new Map();
        this.userSessions = new Map();
        this.dailyQuotaUsed = 0;
        this.DAILY_QUOTA_LIMIT = 45;
        
        // Initialize queue system
        this.initializeQueue();

        // Initialize RAG system
        this.ragSystem = new LocalRAGSystem();

        // Initialize Chat History Manager
        this.chatHistoryManager = new ChatHistoryManager();

        // Initialize Knowledge Manager
        this.knowledgeManager = new KnowledgeManager();

        // Initialize Knowledge RAG Processor to handle knowledge-rag files
        try {
          const KnowledgeRAGProcessor = require('../utils/knowledge-rag-processor');
          this.knowledgeRAGProcessor = new KnowledgeRAGProcessor();
        } catch (error) {
          console.warn('⚠️ Knowledge RAG Processor not available:', error.message);
          this.knowledgeRAGProcessor = null;
        }

        // Initialize Knowledge RAG Watcher to automatically monitor and update knowledge
        try {
          const KnowledgeRAGWatcher = require('../utils/knowledge-rag-watcher');
          this.knowledgeRAGWatcher = new KnowledgeRAGWatcher();
        } catch (error) {
          console.warn('⚠️ Knowledge RAG Watcher not available:', error.message);
          this.knowledgeRAGWatcher = null;
        }

        // Setup routes
        this.setupRoutes();

        // Setup graceful shutdown
        this.setupGracefulShutdown();
    }
    
    initializeAI() {
        try {
            if (this.aiProvider === 'gemini') {
                this.ai = AIFactory.createGeminiAI();
            } else if (this.aiProvider === 'openrouter') {
                this.ai = AIFactory.createOpenRouterAI();
            } else {
                throw new Error(`Unsupported AI provider: ${this.aiProvider}`);
            }
            
            // Create AI call method with Smart Provider Manager
            this.callAI = async (messages, sender_psid) => {
                // Check if we should switch back to Gemini
                aiProviderManager.checkForGeminiSwitch();
                
                const currentProvider = aiProviderManager.getCurrentProvider();
                console.log(`🤖 Using AI Provider: ${currentProvider}`);
                
                try {
                    let aiInstance;
                    let providerName;
                    
                    // Get AI instance based on current provider
                    switch (currentProvider) {
                        case 'gemini':
                            aiInstance = this.ai; // Use primary AI
                            providerName = this.aiProvider;
                            break;
                        case 'openrouter':
                            aiInstance = AIFactory.createOpenRouterAI();
                            providerName = 'openrouter';
                            break;
                        case 'huggingface':
                            aiInstance = AIFactory.createHuggingFaceAI();
                            providerName = 'huggingface';
                            break;
                        default:
                            throw new Error('No available AI provider');
                    }
                    
                    // Call AI with current provider
                    const result = await createTimeoutWrapper(
                        createRetryWrapper(aiInstance.generateText.bind(aiInstance), 2, 1000),
                        30000
                    )(messages, sender_psid);
                    
                    // Handle success
                    aiProviderManager.handleProviderSuccess(currentProvider);
                    console.log(`✅ ${providerName} request successful`);
                    return result;
                    
                } catch (error) {
                    console.log(`❌ ${currentProvider} failed:`, error.message);
                    
                    // Handle provider error
                    aiProviderManager.handleProviderError(currentProvider, error);
                    
                    // Get new provider after switch
                    const newProvider = aiProviderManager.getCurrentProvider();
                    
                    if (newProvider === 'error') {
                        console.log('❌ All AI providers failed, using error message');
                        return getErrorMessage('SYSTEM_ERROR');
                    }
                    
                    // Retry with new provider
                    console.log(`🔄 Retrying with new provider: ${newProvider}`);
                    return await this.callAI(messages, sender_psid);
                }
            };
            
            // Audio transcription with proper conversion and multi-language support
            this.transcribeAudio = async (audioBuffer, mimeType) => {
                try {
                    console.log('🎵 Audio received, processing with Hugging Face...');

                    // Step 1: Try Hugging Face with proper audio conversion
                    try {
                        const huggingFaceAI = AIFactory.createHuggingFaceAI();

                        // Convert MP3 to WAV if needed
                        let processedBuffer = audioBuffer;
                        let processedMimeType = mimeType;

                        if (mimeType === 'audio/mp4' || mimeType === 'audio/mpeg') {
                            console.log('🔄 Converting MP3/MP4 to WAV for Hugging Face...');
                            // For now, use the buffer as-is but change content type
                            processedMimeType = 'audio/wav';
                        }

                        // First transcribe without language specification, then determine language
                        const transcript = await huggingFaceAI.transcribeAudio(processedBuffer, processedMimeType);
                        console.log('✅ Hugging Face transcription successful');

                        // Detect language of the transcript
                        const detectedLanguage = this.detectMessageLanguage(transcript);
                        console.log(`🌐 Detected language: ${detectedLanguage}`);

                        return transcript;

                    } catch (hfError) {
                        console.log('⚠️ Hugging Face failed, trying OpenRouter fallback...');
                        
                        // Step 2: Fallback to OpenRouter
                        const openRouterAI = AIFactory.createOpenRouterAI();
                        const transcript = await openRouterAI.generateText([
                            {
                                role: "user",
                                content: "Hãy chuyển đổi nội dung âm thanh này thành văn bản tiếng Việt. Nếu không thể xử lý, hãy trả lời: 'Xin lỗi, tôi không thể nghe rõ nội dung âm thanh. Vui lòng gửi tin nhắn văn bản để tôi có thể hỗ trợ bạn tốt hơn.'"
                            }
                        ]);
                        
                        return transcript || "Xin lỗi, tôi không thể xử lý file âm thanh này. Vui lòng gửi tin nhắn văn bản thay thế.";
                    }
                    
                } catch (error) {
                    console.log('⚠️ All audio transcription methods failed, using fallback message');
                    return "Cảm ơn bạn đã gửi tin nhắn âm thanh! Hiện tại tôi chưa thể xử lý file âm thanh. Vui lòng gửi tin nhắn văn bản để tôi có thể hỗ trợ bạn tốt hơn.";
                }
            };
            
            console.log(`✅ ${this.serviceName}: AI initialized with ${this.aiProvider}`);
            
            // Start periodic check for Gemini switch (every 5 minutes)
            this.geminiCheckInterval = setInterval(() => {
                aiProviderManager.checkForGeminiSwitch();
            }, 5 * 60 * 1000); // 5 minutes
            
        } catch (error) {
            console.error(`❌ ${this.serviceName}: Failed to initialize AI:`, error);
            throw error;
        }
    }
    
    initializeQueue() {
        // Queue system for concurrent request management
        this.requestQueue = {
            maxConcurrent: 5,
            activeRequests: new Set(),
            waitingQueue: [],
            delayMs: 60000,
            
            async addRequest(requestId, requestHandler, sender_psid = null) {
                return new Promise((resolve, reject) => {
                    const request = {
                        id: requestId,
                        handler: requestHandler,
                        resolve,
                        reject,
                        timestamp: Date.now(),
                        sender_psid: sender_psid
                    };

                    if (this.activeRequests.size < this.maxConcurrent) {
                        this.processRequest(request);
                    } else {
                        const queuePosition = this.waitingQueue.length + 1;
                        console.log(`⏳ Request ${requestId} queued (position ${queuePosition})`);
                        
                        if (sender_psid) {
                            this.notifyUserWaiting(sender_psid, queuePosition);
                        }
                        
                        this.waitingQueue.push(request);
                        this.scheduleProcessing();
                    }
                });
            },
            
            async notifyUserWaiting(sender_psid, queuePosition) {
                try {
                    const message = {
                        text: `⏳ Xin chào! Hiện tại hệ thống đang xử lý nhiều yêu cầu. Bạn đang ở vị trí ${queuePosition} trong hàng chờ. Vui lòng đợi khoảng 1-2 phút, mình sẽ phản hồi ngay khi đến lượt! 🙏`
                    };
                    
                    await this.callSendAPI(sender_psid, message);
                } catch (error) {
                    console.error(`❌ Error sending waiting notification:`, error);
                }
            },
            
            async processRequest(request) {
                this.activeRequests.add(request.id);
                console.log(`🚀 Processing request ${request.id} (${this.activeRequests.size}/${this.maxConcurrent})`);

                const timeoutId = setTimeout(() => {
                    if (this.activeRequests.has(request.id)) {
                        console.log(`⏰ Request ${request.id} timeout`);
                        this.activeRequests.delete(request.id);
                        request.reject(new Error('Request timeout'));
                        this.processNextInQueue();
                    }
                }, 300000);

                try {
                    const result = await request.handler();
                    clearTimeout(timeoutId);
                    request.resolve(result);
                } catch (error) {
                    clearTimeout(timeoutId);
                    console.error(`❌ Request ${request.id} failed:`, error);
                    request.reject(error);
                } finally {
                    this.activeRequests.delete(request.id);
                    console.log(`✅ Completed request ${request.id} (${this.activeRequests.size}/${this.maxConcurrent})`);
                    this.processNextInQueue();
                }
            },
            
            processNextInQueue() {
                if (this.waitingQueue.length > 0 && this.activeRequests.size < this.maxConcurrent) {
                    const nextRequest = this.waitingQueue.shift();
                    this.processRequest(nextRequest);
                }
            },
            
            scheduleProcessing() {
                setTimeout(() => {
                    this.processNextInQueue();
                }, this.delayMs);
            },
            
            getStatus() {
                return {
                    active: this.activeRequests.size,
                    waiting: this.waitingQueue.length,
                    maxConcurrent: this.maxConcurrent
                };
            }
        };
    }
    
    setupRoutes() {
        // Webhook verification
        this.app.get('/webhook', (req, res) => {
            const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
            let mode = req.query['hub.mode'];
            let token = req.query['hub.verify_token'];
            let challenge = req.query['hub.challenge'];
            
            if (mode && token) {
                if (mode === 'subscribe' && token === VERIFY_TOKEN) {
                    console.log(`${this.serviceName}: Webhook verified`);
                    res.status(200).send(challenge);
                } else {
                    res.sendStatus(403);
                }
            } else {
                res.sendStatus(403);
            }
        });
        
        // Webhook handler
        this.app.post('/webhook', async (req, res) => {
            let body = req.body;
            if (body.object === 'page') {
                res.status(200).send('EVENT_RECEIVED');
                
                for (let i = 0; i < body.entry.length; i++) {
                    const entry = body.entry[i];
                    if (entry.messaging && entry.messaging.length > 0) {
                        for (let j = 0; j < entry.messaging.length; j++) {
                            const webhook_event = entry.messaging[j];
                            let sender_psid = webhook_event.sender.id;
                            
                            if (webhook_event.message && webhook_event.message.text) {
                                const messageText = webhook_event.message.text.trim();
                                if (messageText.startsWith('👍') || messageText.startsWith('👎') || 
                                    messageText.includes('Hữu ích') || messageText.includes('Cần cải thiện') ||
                                    messageText.startsWith('SUGGESTION_') || messageText.startsWith('RATING_') ||
                                    messageText.startsWith('JOURNEY_')) {
                                    await this.handleRating(sender_psid, messageText);
                                    continue;
                                }
                            }
                            
                            if (webhook_event.message) {
                                await this.handleMessage(sender_psid, webhook_event, `${sender_psid}_${Date.now()}`);
                            }
                        }
                    }
                }
            } else {
                res.sendStatus(404);
            }
        });
        
        // Health check
        this.app.get('/health', (req, res) => {
            const queueStatus = this.requestQueue.getStatus();
            res.status(200).json({ 
                status: 'OK', 
                service: this.serviceName,
                aiProvider: this.aiProvider,
                timestamp: new Date().toISOString(),
                activeRequests: this.processingRequests.size,
                userSessions: this.userSessions.size,
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                dailyQuotaUsed: this.dailyQuotaUsed,
                dailyQuotaLimit: this.DAILY_QUOTA_LIMIT,
                queue: queueStatus
            });
        });

        // AI Provider Manager status endpoint
        this.app.get('/ai-provider-status', (req, res) => {
            const providerStatus = aiProviderManager.getProviderStatus();
            res.json({
                ...providerStatus,
                timestamp: new Date().toISOString()
            });
        });
        
        // Test endpoint
        this.app.get('/test', (req, res) => {
            res.json({ 
                status: `${this.serviceName} is working!`, 
                timestamp: new Date().toISOString(),
                aiProvider: this.aiProvider
            });
        });
    }
    
    // Common message processing methods
    async handleMessage(sender_psid, webhook_event, requestKey) {
        if (this.processingRequests.has(sender_psid)) {
            await this.processingRequests.get(sender_psid);
        }

        const requestHandler = async () => {
            let processingPromise;
            if (webhook_event.message && webhook_event.message.text) {
                processingPromise = this.processMessage(sender_psid, webhook_event.message, requestKey);
            } else if (webhook_event.message && webhook_event.message.attachments) {
                processingPromise = this.processAttachment(sender_psid, webhook_event.message, requestKey);
            } else {
                await this.callSendAPI(sender_psid, { text: "Xin lỗi, tôi chỉ hỗ trợ văn bản, hình ảnh, âm thanh. 😊" });
                return;
            }
            
            this.processingRequests.set(sender_psid, processingPromise);
            try { 
                await processingPromise; 
            } finally { 
                this.processingRequests.delete(sender_psid); 
            }
        };

        try {
            await this.requestQueue.addRequest(requestKey, requestHandler, sender_psid);
        } catch (error) {
            console.error(`❌ Queue error for ${sender_psid}:`, error);
            await this.callSendAPI(sender_psid, { 
                text: "Xin lỗi, hệ thống đang quá tải. Vui lòng thử lại sau ít phút! 🙏" 
            });
        }
    }
    
    async processMessage(sender_psid, received_message, requestKey) {
        if (received_message.text && received_message.text.trim()) {
            const userMessage = received_message.text.trim();
            let userSession = this.userSessions.get(sender_psid);
            
            if (userSession && userSession.currentJourney) {
                if (userMessage.toLowerCase().includes('có') || userMessage.toLowerCase().includes('đồng ý') || userMessage.toLowerCase().includes('ok')) {
                    userSession.journeyStep = 0;
                    userSession.journeyActive = true;
                    await this.callSendAPI(sender_psid, { text: "Tuyệt vời! 🎉 Bây giờ mình sẽ hướng dẫn bạn từng bước một. Bắt đầu nào!" });
                    await this.sendNextStep(sender_psid);
                    return;
                } else if (userMessage.toLowerCase().includes('không') || userMessage.toLowerCase().includes('thôi')) {
                    userSession.currentJourney = null;
                    userSession.journeyActive = false;
                    await this.callSendAPI(sender_psid, { text: "Hiểu rồi! 😊 Nếu bạn cần hướng dẫn chi tiết sau này, cứ hỏi mình nhé." });
                    await this.processNormalMessage(sender_psid, userMessage);
                    return;
                } else if (userSession.journeyActive) {
                    await this.processNormalMessage(sender_psid, userMessage);
                    return;
                }
            }
            await this.processNormalMessage(sender_psid, userMessage);
        } else {
            await this.callSendAPI(sender_psid, { text: "Xin lỗi, tôi chỉ có thể xử lý tin nhắn văn bản. Bạn có thể gửi câu hỏi bằng chữ để tôi hỗ trợ bạn nhé! 😊" });
        }
    }
    
    async processNormalMessage(sender_psid, userMessage) {
        // Generate or use existing session ID
        const sessionId = this.getSessionId(sender_psid);

        // Get relevant knowledge from RAG system
        const detectedContext = this.detectContext(userMessage);
        const relevantKnowledge = await this.ragSystem.getRelevantKnowledge(userMessage, detectedContext);
        const knowledgeContext = this.ragSystem.formatKnowledgeForPrompt(relevantKnowledge, userMessage);

        // Get conversation history from both old and new systems
        const oldHistory = await this.getConversationHistory(sender_psid);
        if (oldHistory.length > 0 && oldHistory[0].role === 'model') {
            oldHistory.shift();
        }

        // Get recent chat history for better context
        const recentChatHistory = await this.chatHistoryManager.getConversationHistory(sender_psid, sessionId, 10);
        const recentMessages = recentChatHistory.success ?
            recentChatHistory.data.map(msg => msg.message_content).join(' ') :
            oldHistory.slice(-5).map(msg => msg.parts[0].text).join(' ');

        // Enhanced system prompt with context awareness - prioritize knowledge base
        let contextType = null;

        if (userMessage.toLowerCase().includes('quên mật khẩu') ||
            userMessage.toLowerCase().includes('lỗi đăng nhập') ||
            userMessage.toLowerCase().includes('không truy cập') ||
            userMessage.toLowerCase().includes('bị khóa') ||
            userMessage.toLowerCase().includes('không nhớ')) {
            if (recentMessages.includes('VNeID')) {
                contextType = 'VNeID';
            } else if (recentMessages.includes('ETAX') || recentMessages.includes('thuế')) {
                contextType = 'ETAX';
            } else if (recentMessages.includes('VssID') || recentMessages.includes('bảo hiểm')) {
                contextType = 'VssID';
            } else if (recentMessages.includes('Cổng Dịch vụ') || recentMessages.includes('dịch vụ công')) {
                contextType = 'PUBLIC_SERVICE';
            }
        }

        // If we have relevant knowledge, create a focused system prompt
        let enhancedSystemPrompt;
        if (knowledgeContext.trim()) {
            // Create a focused prompt that prioritizes knowledge base information
            enhancedSystemPrompt = `Bạn là một trợ lý thông minh hỗ trợ người dân trong các thủ tục hành chính Việt Nam.\n\n`;
            enhancedSystemPrompt += `NHIỆM VỤ CHÍNH:\n`;
            enhancedSystemPrompt += `- Trả lời CHÍNH XÁC dựa trên thông tin từ CƠ SỞ TRI THỨC CHÍNH THỨC dưới đây\n`;
            enhancedSystemPrompt += `- Ưu tiên sử dụng các THÔNG TIN CỤ THỂ: mã thủ tục, thời gian, phí, cơ quan thực hiện, thành phần hồ sơ, trình tự thực hiện\n`;
            enhancedSystemPrompt += `- Trả lời NGẮN GỌN, RÕ RÀNG và CÓ TRỌNG TÂM\n`;
            enhancedSystemPrompt += `- Cung cấp LINK CHI TIẾT nếu có sẵn trong nguồn\n`;
            enhancedSystemPrompt += `- Tránh nội dung chung chung, không liên quan\n\n`;
            enhancedSystemPrompt += `CƠ SỞ TRI THỨC CHÍNH THỨC:\n${knowledgeContext}\n\n`;
            enhancedSystemPrompt += `HƯỚNG DẪN TRẢ LỜI:\n`;
            enhancedSystemPrompt += `- Bắt đầu bằng việc nêu rõ mã thủ tục và tên thủ tục nếu có\n`;
            enhancedSystemPrompt += `- Liệt kê các bước thực hiện cụ thể nếu người dùng hỏi về quy trình\n`;
            enhancedSystemPrompt += `- Nêu rõ phí, lệ phí và thời gian giải quyết\n`;
            enhancedSystemPrompt += `- Cung cấp thông tin liên hệ hoặc link chi tiết nếu có\n`;
            enhancedSystemPrompt += `- Nếu không có thông tin liên quan, hãy từ chối lịch sự và hướng người dùng đến nguồn chính thức`;
        } else {
            // Use default system prompt when no knowledge base is available
            enhancedSystemPrompt = getEnhancedPrompt(SYSTEM_PROMPT, contextType);
        }

        // Combine old and new history for AI context
        const combinedHistory = [
            ...oldHistory.map(msg => ({
                role: msg.role === 'user' ? 'user' : 'assistant',
                content: msg.parts[0].text
            })),
            ...(recentChatHistory.success ?
                recentChatHistory.data.map(msg => ({
                    role: msg.message_type === 'user' ? 'user' : 'assistant',
                    content: msg.message_content
                })).slice(-10) : []) // Use only last 10 messages from new history
        ];

        const messages = [
            { role: "system", content: enhancedSystemPrompt },
            ...combinedHistory,
            { role: "user", content: userMessage }
        ];

        try {
            // Track start time for response time measurement
            const startTime = Date.now();

            let text = await this.callAI(messages, sender_psid);
            if (!text || text.trim() === '') {
                text = getErrorMessage('SYSTEM_ERROR');
            }

            // Post-process the response to remove irrelevant content
            text = this.postProcessResponse(text, userMessage);

            const responseTime = Date.now() - startTime;

            // MACHINE LEARNING: Continuous learning - track user interactions
            await this.continuousLearningTracking(sender_psid, userMessage, text, detectedContext);

            // ANOMALY DETECTION: Detect unusual or inappropriate queries
            const isAnomaly = await this.detectAnomalies(userMessage);
            if (isAnomaly) {
                this.logger.warn(`Anomaly detected from user ${sender_psid}: ${userMessage}`);
                // Continue normal processing but log for review
            }

            if (text.includes('STEP')) {
                const userSession = this.userSessions.get(sender_psid) || {};
                userSession.currentJourney = { title: userMessage, fullGuide: text };
                this.userSessions.set(sender_psid, userSession);

                await this.callSendAPI(sender_psid, { text: `Xin chào! 👋\n${text}\nBạn có muốn mình hướng dẫn từng bước một không?` });
                await this.callSendAPI(sender_psid, {
                    text: "Vui lòng trả lời 'Có' nếu bạn muốn được hướng dẫn từng bước, hoặc 'Không' nếu bạn chỉ muốn xem hướng dẫn tổng quát."
                });

                // Save to both history systems - use the saveConversation method which now handles Supabase
                await this.saveConversation(sender_psid, userMessage, text);
                // The ChatHistoryManager will handle its own storage
                await this.chatHistoryManager.saveUserMessage(sender_psid, sessionId, userMessage, detectedContext);
                await this.chatHistoryManager.saveAssistantResponse(sender_psid, sessionId, text, responseTime, {
                    intent: detectedContext,
                    journey_step: true
                });
            } else {
                if (text.length > 2000) {
                    const chunks = this.splitMessage(text, 2000);
                    for (let i = 0; i < chunks.length; i++) {
                        const isLast = i === chunks.length - 1;
                        const res = { text: chunks[i] };
                        if (isLast) {
                            const ext = this.extractSuggestions(text);
                            // Add FAQ suggestions based on user behavior and context
                            const faqSuggestions = await this.generateFAQSuggestions(sender_psid, userMessage, detectedContext);
                            const allSuggestions = [...ext.suggestions, ...faqSuggestions];
                            await this.callSendAPIWithRating(sender_psid, { text: ext.cleanedText }, allSuggestions);
                        } else {
                            await this.callSendAPI(sender_psid, res);
                        }
                        if (!isLast) await new Promise(r => setTimeout(r, 500));
                    }
                } else {
                    const ext = this.extractSuggestions(text);
                    // Add FAQ suggestions based on user behavior and context
                    const faqSuggestions = await this.generateFAQSuggestions(sender_psid, userMessage, detectedContext);
                    const allSuggestions = [...ext.suggestions, ...faqSuggestions];
                    await this.callSendAPIWithRating(sender_psid, { text: ext.cleanedText }, allSuggestions);
                }

                // Save to both history systems - use the saveConversation method which now handles Supabase
                await this.saveConversation(sender_psid, userMessage, text);
                // The ChatHistoryManager will handle its own storage
                await this.chatHistoryManager.saveUserMessage(sender_psid, sessionId, userMessage, detectedContext);
                await this.chatHistoryManager.saveAssistantResponse(sender_psid, sessionId, text, responseTime, {
                    intent: detectedContext
                });
            }

            this.dailyQuotaUsed++;
            console.log(`✅ Successfully processed message for ${sender_psid}`);
        } catch (error) {
            console.error(`❌ ERROR in processNormalMessage for ${sender_psid}:`, error);
            const errorResponse = {
                "text": getErrorMessage('SYSTEM_ERROR')
            };
            await this.callSendAPI(sender_psid, errorResponse);

            // Save error to history
            await this.chatHistoryManager.saveUserMessage(sender_psid, sessionId, userMessage, detectedContext);
            await this.chatHistoryManager.saveAssistantResponse(sender_psid, sessionId, errorResponse.text, null, {
                intent: detectedContext,
                error: true
            });
        }
    }
    
    async processAttachment(sender_psid, message, requestKey) {
        const attachment = message.attachments[0];
        if (attachment.type === 'image') {
            await this.processImageAttachment(sender_psid, attachment);
        } else if (attachment.type === 'audio') {
            await this.processAudioAttachment(sender_psid, attachment);
        } else {
            await this.callSendAPI(sender_psid, { text: "Hiện tại tôi chỉ hỗ trợ xử lý hình ảnh và âm thanh. 📷🎵" });
        }
    }
    
    async processImageAttachment(sender_psid, attachment) {
        try {
            const sessionId = this.getSessionId(sender_psid);
            const imageUrl = attachment.payload.url.trim();
            const fetch = await import('node-fetch');
            const imageResponse = await fetch.default(imageUrl);
            const arrayBuffer = await imageResponse.arrayBuffer();
            const base64Image = Buffer.from(arrayBuffer).toString('base64');
            const mimeType = attachment.payload.mime_type || 'image/jpeg';
            const dataUrl = `${mimeType};base64,${base64Image}`;

            // Track start time for response time measurement
            const startTime = Date.now();

            const messages = [
                {
                    role: "user",
                    content: [
                        { type: "text", text: IMAGE_ANALYSIS_PROMPT },
                        { type: "image_url", image_url: { url: dataUrl } }
                    ]
                }
            ];

            let text = await this.callAI(messages, sender_psid);
            if (!text || text.trim() === '') {
                text = getErrorMessage('IMAGE_ERROR');
            }

            const responseTime = Date.now() - startTime;

            const extractionResult = this.extractSuggestions(text);
            const quickReplies = extractionResult.suggestions;
            const cleanedText = extractionResult.cleanedText;
            const response = { "text": cleanedText };
            await this.callSendAPIWithRating(sender_psid, response, quickReplies);

            // Save to both history systems - use the saveConversation method which now handles Supabase
            await this.saveConversation(sender_psid, "[Ảnh đính kèm]", cleanedText);
            // The ChatHistoryManager will handle its own storage
            await this.chatHistoryManager.saveUserMessage(sender_psid, sessionId, "[Ảnh đính kèm: hình ảnh được gửi]", 'image', {
                attachment_type: 'image',
                mime_type: mimeType
            });
            await this.chatHistoryManager.saveAssistantResponse(sender_psid, sessionId, cleanedText, responseTime, {
                intent: 'image_analysis'
            });

            console.log(`✅ Processed image for ${sender_psid}`);
        } catch (error) {
            console.error(`❌ Error processing image for ${sender_psid}:`, error);
            const response = {
                "text": getErrorMessage('IMAGE_ERROR')
            };
            await this.callSendAPI(sender_psid, response);

            // Save error to history
            const sessionId = this.getSessionId(sender_psid);
            await this.chatHistoryManager.saveUserMessage(sender_psid, sessionId, "[Ảnh đính kèm]", 'image', {
                attachment_type: 'image',
                error: true
            });
            await this.chatHistoryManager.saveAssistantResponse(sender_psid, sessionId, response.text, null, {
                intent: 'image_analysis',
                error: true
            });
        }
    }
    
    async processAudioAttachment(sender_psid, attachment) {
        try {
            const sessionId = this.getSessionId(sender_psid);
            const audioUrl = attachment.payload.url.trim();
            console.log(`🎵 Processing audio from Facebook: ${audioUrl}`);

            const fetch = await import('node-fetch');
            const audioResponse = await fetch.default(audioUrl);

            if (!audioResponse.ok) {
                throw new Error(`Failed to fetch audio: ${audioResponse.status}`);
            }

            const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
            const mimeType = attachment.payload.mime_type || 'audio/mp4';

            console.log(`📊 Audio info: ${mimeType}, size: ${audioBuffer.length} bytes`);

            const transcript = await this.transcribeAudio(audioBuffer, mimeType);
            console.log(`🎤 Transcribed: "${transcript}"`);

            // Track start time for response time measurement
            const startTime = Date.now();

            const history = await this.getConversationHistory(sender_psid);
            if (history.length > 0 && history[0].role === 'model') {
                history.shift();
            }

            // Enhanced system prompt with context awareness for audio
            let contextType = null;
            const recent = history.slice(-3).map(m => m.parts[0].text).join(' ');
            if (recent.includes('VNeID')) {
                contextType = 'VNeID';
            } else if (recent.includes('ETAX') || recent.includes('thuế')) {
                contextType = 'ETAX';
            } else if (recent.includes('VssID') || recent.includes('bảo hiểm')) {
                contextType = 'VssID';
            }

            const enhancedSystemPrompt = getEnhancedPrompt(SYSTEM_PROMPT, contextType);

            const messages = [
                { role: "system", content: enhancedSystemPrompt },
                ...history.map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.parts[0].text })),
                { role: "user", content: transcript }
            ];

            let text = await this.callAI(messages, sender_psid);
            if (!text || text.trim() === '') {
                text = getErrorMessage('SYSTEM_ERROR');
            }

            const responseTime = Date.now() - startTime;

            // MACHINE LEARNING: Continuous learning - track user interactions
            await this.continuousLearningTracking(sender_psid, `[Voice: ${transcript}]`, text, contextType);

            // ANOMALY DETECTION: Detect unusual or inappropriate queries
            const isAnomaly = await this.detectAnomalies(transcript);
            if (isAnomaly) {
                this.logger.warn(`Anomaly detected from user ${sender_psid} via voice: ${transcript}`);
                // Continue normal processing but log for review
            }

            const extractionResult = this.extractSuggestions(text);
            // Add FAQ suggestions based on user behavior and context for voice input
            const faqSuggestions = await this.generateFAQSuggestions(sender_psid, transcript, contextType);
            const allSuggestions = [...extractionResult.suggestions, ...faqSuggestions];
            text = extractionResult.cleanedText;

            if (text.length > 2000) {
                const chunks = this.splitMessage(text, 2000);
                for (let i = 0; i < chunks.length; i++) {
                    const isLast = i === chunks.length - 1;
                    const res = { text: chunks[i] };
                    if (isLast) {
                        await this.callSendAPIWithRating(sender_psid, res, allSuggestions);
                    } else {
                        await this.callSendAPI(sender_psid, res);
                    }
                    if (!isLast) await new Promise(r => setTimeout(r, 500));
                }
            } else {
                const response = { "text": text };
                await this.callSendAPIWithRating(sender_psid, response, allSuggestions);
            }

            // Save to both history systems - use the saveConversation method which now handles Supabase
            await this.saveConversation(sender_psid, `[Voice: ${transcript}]`, text);
            // The ChatHistoryManager will handle its own storage
            await this.chatHistoryManager.saveUserMessage(sender_psid, sessionId, `[Voice: ${transcript}]`, 'audio', {
                attachment_type: 'audio',
                mime_type: mimeType,
                transcript: transcript
            });
            await this.chatHistoryManager.saveAssistantResponse(sender_psid, sessionId, text, responseTime, {
                intent: 'audio_response'
            });

            console.log(`✅ Processed audio question for ${sender_psid}: "${transcript}"`);
        } catch (error) {
            console.error(`❌ Error processing audio for ${sender_psid}:`, error);
            const response = {
                "text": getErrorMessage('AUDIO_ERROR')
            };
            await this.callSendAPI(sender_psid, response);

            // Save error to history
            const sessionId = this.getSessionId(sender_psid);
            await this.chatHistoryManager.saveUserMessage(sender_psid, sessionId, "[Voice message]", 'audio', {
                attachment_type: 'audio',
                error: true
            });
            await this.chatHistoryManager.saveAssistantResponse(sender_psid, sessionId, response.text, null, {
                intent: 'audio_response',
                error: true
            });
        }
    }
    
    async sendNextStep(sender_psid) {
        const userSession = this.userSessions.get(sender_psid);
        if (!userSession || !userSession.currentJourney) return;
        const guide = userSession.currentJourney.fullGuide;
        const steps = guide.split('STEP ').filter(step => step.trim());
        if (userSession.journeyStep < steps.length) {
            const currentStep = steps[userSession.journeyStep];
            const stepText = `STEP ${userSession.journeyStep + 1}: ${currentStep}`;
            await this.callSendAPI(sender_psid, { text: stepText });
            userSession.journeyStep++;
            this.userSessions.set(sender_psid, userSession);
            if (userSession.journeyStep < steps.length) {
                await this.callSendAPI(sender_psid, { text: "Bạn đã hoàn thành bước này chưa? Nếu xong rồi, mình sẽ chuyển sang bước tiếp theo." });
            } else {
                await this.callSendAPI(sender_psid, { text: "🎉 Chúc mừng! Bạn đã hoàn thành toàn bộ hướng dẫn. Nếu cần hỗ trợ thêm, cứ hỏi mình nhé! 😊" });
                userSession.currentJourney = null;
                userSession.journeyActive = false;
            }
        }
    }
    
    async handleRating(sender_psid, ratingText) {
        try {
            if (ratingText.startsWith('SUGGESTION_')) {
                const parts = ratingText.split('_');
                if (parts.length >= 3) {
                    const originalText = decodeURIComponent(parts.slice(2).join('_'));
                    await this.callSendAPI(sender_psid, { text: originalText });
                    return;
                }
            }
            if (ratingText.startsWith('JOURNEY_')) {
                const userSession = this.userSessions.get(sender_psid);
                if (!userSession || !userSession.currentJourney || !userSession.journeyActive) {
                    await this.callSendAPI(sender_psid, { text: "Bạn hiện không đang trong hành trình hướng dẫn nào." });
                    return;
                }
                if (ratingText.includes('ERROR_')) {
                    await this.callSendAPI(sender_psid, { text: "Bạn gặp lỗi ở bước này? Mình sẽ hỗ trợ bạn ngay. Vui lòng mô tả lỗi bạn gặp phải." });
                } else if (ratingText.includes('BACK')) {
                    userSession.journeyStep = Math.max(0, userSession.journeyStep - 1);
                    await this.callSendAPI(sender_psid, { text: "Bạn đã quay lại bước trước. Mình sẽ tiếp tục hướng dẫn từ bước đó." });
                    await this.sendNextStep(sender_psid);
                }
                return;
            }

            let rating = 'unknown';
            if (ratingText.includes('👍') || ratingText.includes('Hữu ích')) rating = 'helpful';
            else if (ratingText.includes('👎') || ratingText.includes('Cần cải thiện')) rating = 'not_helpful';

            await this.pool.query('INSERT INTO feedback (user_id, rating, created_at) VALUES ($1, $2, NOW())', [sender_psid, rating]);
            const msg = getRatingResponse(rating);
            await this.callSendAPI(sender_psid, { text: msg });
        } catch (error) {
            console.error(`❌ Rating error for ${sender_psid}:`, error);
        }
    }
    
    async getConversationHistory(userId) {
        try {
            // Use Supabase for conversation history if available, otherwise fallback to old method
            if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
                // Initialize Supabase client for history operations
                const { createClient } = require('@supabase/supabase-js');
                const supabase = createClient(
                    process.env.SUPABASE_URL,
                    process.env.SUPABASE_ANON_KEY
                );

                // First, ensure the user exists in the users table
                const { data: existingUser } = await supabase
                    .from('users')
                    .select('id')
                    .eq('user_id', userId)
                    .single();

                if (!existingUser) {
                    // Create user if doesn't exist
                    await supabase.from('users').insert({ user_id: userId });
                }

                // Get recent conversation history (try the user_chat_history table first, then fallback to conversations table)
                let conversations = [];
                let error = null;

                // Try to get from user_chat_history table (our primary chat history table)
                const { data: userChatHistory, error: userChatHistoryError } = await supabase
                    .from('user_chat_history')
                    .select('user_request as message_content, chatbot_response, created_at')
                    .eq('facebook_user_id', userId)
                    .order('created_at', { ascending: false })
                    .limit(20);

                if (!userChatHistoryError) {
                    // Convert user_chat_history format to the expected format
                    conversations = [];
                    userChatHistory.forEach(item => {
                        if (item.message_content) {
                            conversations.push({
                                message_content: item.message_content,
                                message_type: 'user',
                                created_at: item.created_at
                            });
                        }
                        if (item.chatbot_response) {
                            conversations.push({
                                message_content: item.chatbot_response,
                                message_type: 'assistant',
                                created_at: item.created_at
                            });
                        }
                    });
                } else {
                    // Fallback to conversations table if user_chat_history doesn't exist or has issues
                    const { data: convHistory, error: convError } = await supabase
                        .from('conversations')
                        .select('message_content, message_type, created_at')
                        .eq('user_id', userId)
                        .order('created_at', { ascending: false })
                        .limit(20);

                    if (!convError) {
                        conversations = convHistory;
                    } else {
                        error = convError;
                    }
                }

                if (error) {
                    console.error('Supabase error fetching history:', error);
                    // Fallback to old method
                    const query = {
                        text: `
                            SELECT message, role FROM (
                                SELECT message, 'user' as role, created_at FROM conversations WHERE user_id = $1 AND message IS NOT NULL
                                UNION ALL
                                SELECT bot_response as message, 'model' as role, created_at FROM conversations WHERE user_id = $1 AND bot_response IS NOT NULL
                            ) as history
                            ORDER BY created_at DESC
                            LIMIT 20
                        `,
                        values: [userId],
                    };
                    try {
                        const { rows } = await this.pool.query(query);
                        return rows.reverse().map(row => ({ role: row.role, parts: [{ text: row.message }] }));
                    } catch (oldError) {
                        console.error('Error fetching history:', oldError);
                        return [];
                    }
                }

                // Format for AI consumption
                return conversations.reverse().map(conv => ({
                    role: conv.message_type === 'user' ? 'user' : 'assistant',
                    parts: [{ text: conv.message_content }]
                }));
            } else {
                // Fallback to old method if Supabase not configured
                const query = {
                    text: `
                        SELECT message, role FROM (
                            SELECT message, 'user' as role, created_at FROM conversations WHERE user_id = $1 AND message IS NOT NULL
                            UNION ALL
                            SELECT bot_response as message, 'model' as role, created_at FROM conversations WHERE user_id = $1 AND bot_response IS NOT NULL
                        ) as history
                        ORDER BY created_at DESC
                        LIMIT 20
                    `,
                    values: [userId],
                };
                try {
                    const { rows } = await this.pool.query(query);
                    return rows.reverse().map(row => ({ role: row.role, parts: [{ text: row.message }] }));
                } catch (error) {
                    console.error('Error fetching history:', error);
                    return [];
                }
            }
        } catch (error) {
            console.error('Error in getConversationHistory:', error);
            return [];
        }
    }

    async saveConversation(userId, userMessage, botResponse) {
        try {
            // Use Supabase for conversation history if available, otherwise fallback to old method
            if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
                // Initialize Supabase client for history operations
                const { createClient } = require('@supabase/supabase-js');
                const supabase = createClient(
                    process.env.SUPABASE_URL,
                    process.env.SUPABASE_ANON_KEY
                );

                // Use the ChatHistoryService to store in user_chat_history table
                const chatHistoryService = new ChatHistoryService();

                // Create a session ID if needed
                const sessionId = this.getSessionId(userId);

                // Save conversation to user_chat_history table
                await chatHistoryService.saveConversation(userId, userMessage, botResponse, sessionId);
            } else {
                // Fallback to old method if Supabase not configured
                await this.pool.query('INSERT INTO conversations (user_id, message, bot_response) VALUES ($1, $2, $3)', [userId, userMessage, botResponse]);
            }
        } catch (error) {
            console.error('Error saving conversation:', error);
            // Fallback to old method if Supabase fails
            try {
                await this.pool.query('INSERT INTO conversations (user_id, message, bot_response) VALUES ($1, $2, $3)', [userId, userMessage, botResponse]);
            } catch (oldError) {
                console.error('Error saving to fallback db:', oldError);
            }
        }
    }
    
    async callSendAPI(sender_psid, response, maxRetries = 3) {
        const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
        const request_body = {
            "recipient": { "id": sender_psid },
            "message": response
        };
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const fetch = await import('node-fetch');
                const apiResponse = await fetch.default(`https://graph.facebook.com/v2.6/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(request_body)
                });
                if (apiResponse.ok) {
                    console.log(`✅ Message sent to ${sender_psid}`);
                    return true;
                } else {
                    if (attempt === maxRetries) throw new Error('Failed after retries');
                }
            } catch (error) {
                if (attempt === maxRetries) return false;
                await new Promise(r => setTimeout(r, 1000 * attempt));
            }
        }
    }
    
    async callSendAPIWithRating(sender_psid, response, quickReplies = null) {
        const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
        let quickRepliesArray = [];
        const userSession = this.userSessions.get(sender_psid);
        if (userSession && userSession.currentJourney && userSession.journeyActive) {
            quickRepliesArray = [
                { "content_type": "text", "title": `Bước ${userSession.journeyStep}`, "payload": `JOURNEY_STEP_${userSession.journeyStep}` },
                { "content_type": "text", "title": "Tôi bị lỗi ở bước này", "payload": `JOURNEY_ERROR_${userSession.journeyStep}` },
                { "content_type": "text", "title": "Tôi cần quay lại", "payload": "JOURNEY_BACK" }
            ];
        } else if (quickReplies && quickReplies.length > 0) {
            quickRepliesArray = quickReplies.map((text, index) => {
                let displayText = text.length > 20 ? text.substring(0, 17) + '...' : text;
                return { "content_type": "text", "title": displayText, "payload": `SUGGESTION_${index}_${encodeURIComponent(text)}` };
            });
        }

        const ratingButtons = [
            { "content_type": "text", "title": "👍 Hữu ích", "payload": `RATING_HELPFUL_${Date.now()}` },
            { "content_type": "text", "title": "👎 Cải thiện", "payload": `RATING_NOT_HELPFUL_${Date.now()}` }
        ];

        const allQuickReplies = [...quickRepliesArray, ...ratingButtons];
        const request_body = {
            "recipient": { "id": sender_psid },
            "message": {
                "text": response.text,
                "quick_replies": allQuickReplies.slice(0, 11)
            }
        };

        try {
            const fetch = await import('node-fetch');
            const apiResponse = await fetch.default(
                `https://graph.facebook.com/v2.6/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(request_body)
                }
            );
            return apiResponse.ok;
        } catch (error) {
            console.error('❌ Send with rating error:', error);
            return false;
        }
    }
    
    extractSuggestions(text) {
        const patterns = [
            /GỢI Ý:(.*)/s,
            /SUGGESTIONS:(.*)/s, 
            /Gợi ý:(.*)/s,
            /Suggestions:(.*)/s,
            /GỢI Ý CÂU HỎI TIẾP THEO:(.*)/s,
            /Câu hỏi tiếp theo:(.*)/s,
            /VÍ DỤ:(.*)/s,
            /Ví dụ:(.*)/s
        ];
        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                const suggestionsText = match[1];
                const suggestions = suggestionsText.split('\n')
                    .filter(line => line.trim())
                    .map(line => line.replace(/^[•\-]\s*/, '').trim())
                    .filter(line => line.length > 0)
                    .slice(0, 3);
                const cleanedText = text.replace(pattern, '').trim();
                return { suggestions, cleanedText };
            }
        }
        return { suggestions: [], cleanedText: text };
    }
    
    splitMessage(text, maxLength) {
        if (text.length <= maxLength) {
            return [text];
        }
        
        const chunks = [];
        let currentChunk = '';
        const lines = text.split('\n');
        
        for (const line of lines) {
            if (line.length > maxLength) {
                if (currentChunk) {
                    chunks.push(currentChunk.trim());
                    currentChunk = '';
                }
                
                const words = line.split(' ');
                let tempLine = '';
                for (const word of words) {
                    if ((tempLine + word + ' ').length <= maxLength) {
                        tempLine += word + ' ';
                    } else {
                        if (tempLine) {
                            chunks.push(tempLine.trim());
                        }
                        tempLine = word + ' ';
                    }
                }
                if (tempLine) {
                    currentChunk = tempLine;
                }
            } else {
                if ((currentChunk + line + '\n').length <= maxLength) {
                    currentChunk += line + '\n';
                } else {
                    if (currentChunk) {
                        chunks.push(currentChunk.trim());
                    }
                    currentChunk = line + '\n';
                }
            }
        }
        
        if (currentChunk) {
            chunks.push(currentChunk.trim());
        }
        
        const finalChunks = [];
        for (const chunk of chunks) {
            if (chunk.length <= maxLength) {
                finalChunks.push(chunk);
            } else {
                for (let i = 0; i < chunk.length; i += maxLength) {
                    finalChunks.push(chunk.substring(i, i + maxLength));
                }
            }
        }
        
        return finalChunks;
    }
    
    setupGracefulShutdown() {
        process.on('SIGTERM', async () => {
            console.log(`${this.serviceName}: Shutting down...`);
            await this.pool.end();
            process.exit(0);
        });
    }
    
    start() {
        this.app.listen(this.port, () => {
            console.log(`🚀 ${this.serviceName} running on port ${this.port}`);
            console.log(`🤖 AI Provider: ${this.aiProvider}`);

            // Load knowledge from knowledge-rag folder if available
            this.loadKnowledgeFromRAG();

            // Start watching for new knowledge files
            this.startKnowledgeWatcher();
        });
    }

    async loadKnowledgeFromRAG() {
        if (this.knowledgeRAGProcessor) {
            try {
                console.log('🔄 Loading knowledge from knowledge-rag folder...');
                await this.knowledgeRAGProcessor.processAllKnowledgeFiles();
                console.log('✅ Knowledge from knowledge-rag folder loaded successfully');
            } catch (error) {
                console.error('❌ Error loading knowledge from knowledge-rag folder:', error);
            }
        } else {
            console.log('⚠️ Knowledge RAG Processor not available, skipping knowledge loading');
        }
    }

    async startKnowledgeWatcher() {
        if (this.knowledgeRAGWatcher) {
            try {
                console.log('👀 Starting knowledge watcher to monitor for new files...');
                await this.knowledgeRAGWatcher.processAllKnowledge(); // Process any existing files first
                this.knowledgeRAGWatcher.startWatching(); // Then start watching for changes
                console.log('✅ Knowledge watcher started successfully');
            } catch (error) {
                console.error('❌ Error starting knowledge watcher:', error);
            }
        } else {
            console.log('⚠️ Knowledge RAG Watcher not available, skipping watcher initialization');
        }
    }

    // Helper method to detect context using the prompts utility
    detectContext(message) {
        return this.promptsDetectContext(message);
    }

    // We need to import the detectContext function from prompts
    // This should be added in the initialization part
    // Comprehensive context detection with keyword mapping
    promptsDetectContext(message) {
        const msg = message.toLowerCase();

        // Expanded keyword mapping for better context detection
        const keywordMappings = {
            'vneid': [
                'vneid', 'định danh', 'cccd số', 'giấy tờ số', 'văn bằng số', 'vneid-cccd',
                'xác thực định danh', 'định danh điện tử', 'ứng dụng định danh',
                'đăng nhập vneid', 'tài khoản vneid', 'cấp tài khoản định danh'
            ],
            'vssid': [
                'vssid', 'bảo hiểm xã hội', 'bhxh', 'sổ bhxh', 'bảo hiểm y tế',
                'thẻ bảo hiểm', 'thu bảo hiểm', 'đăng ký bhxh', 'tra cứu bhxh',
                'bảo hiểm thất nghiệp', 'bảo hiểm tử tuất', 'sổ bảo hiểm'
            ],
            'etax': [
                'etax', 'thuế', 'khai thuế', 'hóa đơn điện tử', 'hóa đơn gtgt',
                'nộp thuế', 'cổng thông tin thuế', 'mã số thuế', 'đăng ký thuế',
                'thuế điện tử', 'gdt', 'tờ khai thuế', 'hồ sơ thuế'
            ],
            'dichvucong': [
                'dịch vụ công', 'dichvucong', 'nộp hồ sơ', 'thủ tục hành chính',
                'cổng dịch vụ công', 'dvc', 'cổng thông tin dịch vụ công',
                'đăng ký tạm trú', 'đăng ký kinh doanh', 'cấp giấy phép',
                'thủ tục', 'hồ sơ', 'nộp trực tuyến', 'cấp phép online'
            ],
            'sawaco': [
                'nước máy', 'sawaco', 'cấp nước', 'hóa đơn nước', 'điện nước',
                'đăng ký nước', 'cấp nước mới', 'đo chỉ số nước', 'mã khách hàng nước',
                'công ty nước', 'cskh nước', 'trung an', 'bến thành', 'chợ lớn'
            ],
            'evnhcmc': [
                'điện', 'evn', 'hóa đơn điện', 'điện lực', 'cskh điện',
                'đăng ký điện mới', 'thay đổi mục đích sử dụng điện', 'đo chỉ số điện',
                'mã khách hàng điện', 'công ty điện lực', 'evnhcmc', 'trung nam'
            ],
            'payment': [
                'thanh toán', 'momo', 'vnpay', 'zalopay', 'ví điện tử',
                'chuyển tiền', 'mobile banking', 'quét mã qr', 'thanh toán online',
                'internet banking', 'payoo', 'viettel money', 'tài khoản thanh toán'
            ],
            'temporary_residence': [
                'tạm trú', 'kt3', 'đăng ký tạm trú', 'nơi tạm trú', 'mã số tạm trú',
                'giấy tạm trú', 'đăng ký tạm vắng', 'tạm vắng', 'giấy tờ tạm trú',
                'địa chỉ tạm trú', 'nơi ở hiện tại', 'đăng ký nơi ở'
            ],
            'administrative_procedures': [
                'thủ tục', 'hồ sơ', 'giấy tờ', 'đăng ký', 'cấp phép', 'xin phép',
                'xin cấp', 'thủ tục hành chính', 'nộp hồ sơ', 'bộ hồ sơ', 'hồ sơ giấy'
            ]
        };
        // Check each category for matching keywords
        for (const [category, keywords] of Object.entries(keywordMappings)) {
            for (const keyword of keywords) {
                if (msg.includes(keyword)) {
                    return category; // Return the most specific category that matches
                }
            }
        }

        return null;
    }

    // Helper method to generate or retrieve session ID
    getSessionId(userId) {
        // Check if user already has an active session
        let sessionId = this.userSessions.get(userId)?.sessionId;

        if (!sessionId) {
            // Create new session ID (using timestamp + userId hash)
            const timestamp = Date.now();
            const hash = this.simpleHash(`${userId}-${timestamp}`);
            sessionId = `${userId}-${timestamp}-${hash}`;

            // Store in user session
            let userSession = this.userSessions.get(userId) || {};
            userSession.sessionId = sessionId;
            this.userSessions.set(userId, userSession);
        }

        return sessionId;
    }

    // Simple hash function for session ID generation
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(36); // Convert to base36 for shorter string
    }

    // Post-process AI response to clean up irrelevant content
    postProcessResponse(response, userMessage) {
        // Remove banking-related content that's not relevant to administrative procedures
        response = response.replace(/(Chuyển\s+qua\s+Techcombank|Cách\s+thanh toán\s+khác|Mobile\s+banking|ứng\s+dụng.*?chuyển\s+tiền|sao\s+chép.*?số.*?tài.*?khoản)/gi, '');

        // Remove URL-like text that might be hallucinated
        response = response.replace(/(https?:\/\/[^\s\n)]+)/g, '');

        // Remove payment-related content that's not contextually relevant
        if (!userMessage.toLowerCase().includes('thanh toán') &&
            !userMessage.toLowerCase().includes('pay') &&
            !userMessage.toLowerCase().includes('momo') &&
            !userMessage.toLowerCase().includes('vnpay') &&
            !userMessage.toLowerCase().includes('zalopay')) {
            response = response.replace(/(Chuyển\s+tiền|thanh\s+toán|ví\s+điện\s+tử|mobile\s+banking|internet\s+banking)/gi, '');
        }

        // Remove duplicate or redundant content
        response = response.replace(/\n\s*\n\s*\n/g, '\n\n'); // Remove excessive blank lines
        response = response.trim();

        return response;
    }

    // Detect language of the message
    detectMessageLanguage(message) {
        // Check if message contains English characters predominantly
        const vietnameseChars = message.match(/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/gi);
        const englishChars = message.match(/[a-zA-Z]/g);

        if (englishChars && (!vietnameseChars || vietnameseChars.length < englishChars.length * 0.3)) {
            return 'en';
        }
        return 'vi';
    }

    // Generate FAQ suggestions based on user behavior and context
    async generateFAQSuggestions(sender_psid, userMessage, context) {
        try {
            // Track popular queries for FAQ suggestions
            if (!this.popularQueries) {
                this.popularQueries = new Map();
            }

            // Increment count for current query
            const queryKey = userMessage.toLowerCase().trim().substring(0, 30);
            const currentCount = this.popularQueries.get(queryKey) || 0;
            this.popularQueries.set(queryKey, currentCount + 1);

            // Get top queries that might be relevant to current user
            const topQueries = Array.from(this.popularQueries.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([query, count]) => query);

            // Generate relevant FAQ based on context
            let faqSuggestions = [];
            switch(context) {
                case 'VNeID':
                    faqSuggestions = [
                        "Cài đặt VNeID?",
                        "Đăng ký tài khoản?",
                        "Tích hợp giấy tờ?"
                    ];
                    break;
                case 'ETAX':
                    faqSuggestions = [
                        "Khai thuế cá nhân?",
                        "Nộp thuế online?",
                        "Hoàn thuế?"
                    ];
                    break;
                case 'VssID':
                    faqSuggestions = [
                        "Tra cứu BHXH?",
                        "Cập nhật thông tin?",
                        "Kê khai điện tử?"
                    ];
                    break;
                case 'PUBLIC_SERVICE':
                    faqSuggestions = [
                        "Hồ sơ cần chuẩn bị?",
                        "Nơi nộp hồ sơ?",
                        "Thời gian xử lý?"
                    ];
                    break;
                default:
                    faqSuggestions = [
                        "Thủ tục khác?",
                        "Hướng dẫn chi tiết?",
                        "Liên hệ hỗ trợ?"
                    ];
            }

            // Add popular queries as suggestions if relevant
            const popularSuggestions = topQueries
                .filter(query => !faqSuggestions.some(faq =>
                    faq.toLowerCase().includes(query.toLowerCase()) ||
                    query.toLowerCase().includes(faq.toLowerCase())
                ))
                .slice(0, 2)
                .map(query => query.charAt(0).toUpperCase() + query.slice(1));

            return [...faqSuggestions, ...popularSuggestions].slice(0, 3);

        } catch (error) {
            console.error('Error generating FAQ suggestions:', error);
            return [];
        }
    }

    // Continuous learning - track user interactions to improve responses
    async continuousLearningTracking(sender_psid, userMessage, aiResponse, context) {
        try {
            // Initialize learning data storage if not exists
            if (!this.learningData) {
                this.learningData = {
                    queryContexts: new Map(),
                    responseEffectiveness: new Map(),
                    userPatterns: new Map()
                };
            }

            // Track query-context relationships
            const contextKey = context || 'general';
            if (!this.learningData.queryContexts.has(contextKey)) {
                this.learningData.queryContexts.set(contextKey, []);
            }
            const contextQueries = this.learningData.queryContexts.get(contextKey);
            contextQueries.push({
                query: userMessage,
                response: aiResponse,
                timestamp: Date.now()
            });

            // Keep only recent data (last 1000 entries per context)
            if (contextQueries.length > 1000) {
                this.learningData.queryContexts.set(contextKey, contextQueries.slice(-1000));
            }

            // Track user patterns
            if (!this.learningData.userPatterns.has(sender_psid)) {
                this.learningData.userPatterns.set(sender_psid, {
                    contexts: [],
                    queries: [],
                    timestamp: Date.now()
                });
            }
            const userPattern = this.learningData.userPatterns.get(sender_psid);
            userPattern.contexts.push(context);
            userPattern.queries.push(userMessage);

            // Keep only recent user data
            if (userPattern.contexts.length > 50) {
                userPattern.contexts = userPattern.contexts.slice(-50);
                userPattern.queries = userPattern.queries.slice(-50);
            }

        } catch (error) {
            console.error('Error in continuous learning tracking:', error);
        }
    }

    // Detect popular queries that are frequently asked
    async detectPopularQueries() {
        try {
            if (!this.popularQueries) return [];

            // Get queries that have been asked more than 5 times
            const popular = Array.from(this.popularQueries.entries())
                .filter(([query, count]) => count > 5)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .map(([query, count]) => ({ query, count }));

            return popular;
        } catch (error) {
            console.error('Error detecting popular queries:', error);
            return [];
        }
    }

    // Detect anomalies or unusual queries
    async detectAnomalies(userMessage) {
        try {
            // Define patterns for anomalous queries
            const anomalyPatterns = [
                /(?:hack|crack|bypass|exploit|exploiting)/i,
                /(?:spam|advertisement|advertising)/i,
                /(?:scam|fraud|fake)/i,
                /(?:virus|malware|malicious)/i,
                /(?:login|password|credentials|account).*(?:steal|hack|access)/i,
                /(?:click|link|website|url).*(?:suspicious|dangerous|scam)/i,
                /^[\W\d_]+$/, // Only special characters and numbers
                /^.{1,3}$/ // Very short messages that might be spam
            ];

            // Check if message matches any anomaly pattern
            const isAnomalous = anomalyPatterns.some(pattern => pattern.test(userMessage));

            // Additional check: too many consecutive special characters
            if (!isAnomalous && (userMessage.match(/[^a-zA-Z0-9\s]/g) || []).length > userMessage.length * 0.7) {
                return true;
            }

            return isAnomalous;

        } catch (error) {
            console.error('Error in anomaly detection:', error);
            return false;
        }
    }

    // Cleanup method
    cleanup() {
        if (this.geminiCheckInterval) {
            clearInterval(this.geminiCheckInterval);
            console.log('🧹 Cleaned up Gemini check interval');
        }

        // Stop the knowledge watcher if it exists
        if (this.knowledgeRAGWatcher) {
            try {
                this.knowledgeRAGWatcher.stopWatching();
                console.log('🧹 Cleaned up Knowledge RAG Watcher');
            } catch (error) {
                console.error('❌ Error stopping Knowledge RAG Watcher:', error);
            }
        }
    }
}

module.exports = BaseChatbotService;
