/**
 * Base Chatbot Service
 *
 * This class provides common functionality for all chatbot services
 * to eliminate code duplication and ensure consistency.
 */

require('dotenv').config();
const express = require('express');
const path = require('path');

// Use the new optimized database manager
const dbManager = require('../utils/database-manager');

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

const { createClient } = require('@supabase/supabase-js');

// Use enhanced logger
const { createLogger, ErrorHandler } = require('../utils/enhanced-logger');
const aiProviderManager = require('../ai/ai-provider-manager');
const EnhancedRAGSystem = require('../ai/enhanced-rag-system');
const ChatHistoryManager = require('../utils/chat-history-manager');
const KnowledgeManager = require('../utils/knowledge-manager');

// Import new optimization modules
const conversationCache = require('../utils/cache-manager');
const aiResponseCache = require('../utils/ai-response-cache');
const improvedCache = require('../utils/improved-cache');
const SmartQueue = require('../utils/smart-queue');
const healthMonitor = require('../utils/system-health-monitor');
const AdminAPI = require('../admin/admin-api');

class BaseChatbotService {
    constructor(port, serviceName, aiProvider = 'gemini') {
        this.port = port;
        this.serviceName = serviceName;
        this.aiProvider = aiProvider;

        // Initialize enhanced logger
        this.logger = createLogger(serviceName);
        this.errorHandler = new ErrorHandler(this.logger);

        // Initialize Express app
        this.app = express();
        this.app.use(express.json());
        // Serve static files from the public directory
        this.app.use(express.static(path.join(__dirname, '..', '..', 'public')));

        // Use the new database manager (no need to initialize pool separately)
        this.dbManager = dbManager;

        // Initialize Supabase client via database manager
        this.supabase = null;

        // Initialize AI with new router
        this.initializeAI();

        // Initialize state management with caching
        this.processingRequests = new Map();
        this.userSessions = new Map();
        this.dailyQuotaUsed = 0;
        this.DAILY_QUOTA_LIMIT = 45;

        // Initialize new smart queue
        this.requestQueue = new SmartQueue({
            maxConcurrent: 5,
            defaultDelay: 30000 // 30 seconds
        });

        // Initialize health monitoring
        this.initializeHealthMonitoring();

        // Initialize admin API
        this.initializeAdminAPI();

        // Initialize enhanced RAG system
        this.ragSystem = new EnhancedRAGSystem();

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

    initializeHealthMonitoring() {
        // Register service-specific health checks
        healthMonitor.registerHealthCheck(
            `${this.serviceName}-status`,
            async () => {
                try {
                    // Check if the service is responding
                    const status = {
                        status: 'healthy',
                        details: {
                            serviceName: this.serviceName,
                            port: this.port,
                            activeRequests: this.processingRequests.size,
                            userSessions: this.userSessions.size,
                            uptime: process.uptime(),
                            memory: process.memoryUsage(),
                            dailyQuotaUsed: this.dailyQuotaUsed,
                            dailyQuotaLimit: this.DAILY_QUOTA_LIMIT
                        }
                    };
                    return status;
                } catch (error) {
                    return {
                        status: 'unhealthy',
                        details: { error: error.message }
                    };
                }
            },
            45000 // Check every 45 seconds
        );

        // Start monitoring if not already started
        if (!global.healthMonitorStarted) {
            healthMonitor.startMonitoring();
            global.healthMonitorStarted = true;
            console.log('🏥 Service health monitoring initialized');
        }
    }

    initializeAdminAPI() {
        // Initialize admin API if admin features are enabled
        if (process.env.ENABLE_ADMIN_INTERFACE === 'true') {
            try {
                const adminAPI = new AdminAPI();
                this.app.use('/admin', adminAPI.getRouter());
                console.log('🚀 Admin API initialized at /admin');

                // Add a simple health check for the admin interface
                this.app.get('/admin/health', (req, res) => {
                    res.json({
                        status: 'healthy',
                        service: this.serviceName,
                        timestamp: new Date().toISOString(),
                        endpoints: [
                            '/admin/stats/system',
                            '/admin/stats/conversations',
                            '/admin/models',
                            '/admin/api-keys',
                            '/admin/conversations'
                        ]
                    });
                });


                // Also serve admin.html at /admin/dashboard
                this.app.get('/admin/dashboard', (req, res) => {
                    const adminToken = req.headers['x-admin-token'] || req.query.adminToken;
                    const expectedToken = process.env.ADMIN_TOKEN || 'admin123';

                    if (adminToken === expectedToken) {
                        res.setHeader('X-Admin-Token-Valid', 'true');
                        res.sendFile(path.join(__dirname, '..', '..', 'public', 'admin.html'));
                    } else {
                        res.status(401).json({ error: 'Unauthorized' });
                    }
                });

            } catch (error) {
                console.error('❌ Failed to initialize admin API:', error);
                // Continue without admin interface if initialization fails
            }
        } else {
            console.log('ℹ️ Admin interface is disabled (set ENABLE_ADMIN_INTERFACE=true to enable)');
        }

        // Always set up a root route regardless of admin interface setting
        // Check admin token to decide what to serve
        this.app.get('/', (req, res) => {
            if (process.env.ENABLE_ADMIN_INTERFACE === 'true') {
                // When admin interface is enabled, serve admin dashboard if properly authenticated
                const adminToken = req.headers['x-admin-token'] || req.query.adminToken;
                const expectedToken = process.env.ADMIN_TOKEN || 'admin123'; // Default for demo

                if (adminToken === expectedToken) {
                    // Set the admin token in response header for the frontend to use
                    res.setHeader('X-Admin-Token-Valid', 'true');
                    // Serve the admin dashboard from public directory
                    const adminHtmlPath = path.join(__dirname, '..', '..', 'public', 'admin.html');
                    res.sendFile(adminHtmlPath);
                } else {
                    // If not authenticated, provide instructions for authentication
                    res.status(401).json({
                        error: 'Unauthorized. Please provide valid admin token.',
                        instructions: 'Provide token via X-Admin-Token header or adminToken query parameter'
                    });
                }
            } else {
                // If admin interface is disabled, serve a simple welcome page
                res.send(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <title>Facebook Chatbot System</title>
                        <style>
                            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                            .container { max-width: 600px; margin: 0 auto; }
                            h1 { color: #333; }
                            .note { background: #f0f0f0; padding: 20px; border-radius: 5px; margin: 20px 0; }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <h1>🤖 Facebook Chatbot System</h1>
                            <p>Hệ thống chatbot hỗ trợ người dân trong các thủ tục hành chính Việt Nam</p>
                            <div class="note">
                                <h3>ℹ️ Lưu ý</h3>
                                <p>Admin dashboard đang bị tắt. Để bật, vui lòng đặt <code>ENABLE_ADMIN_INTERFACE=true</code> trong biến môi trường.</p>
                            </div>
                        </div>
                    </body>
                    </html>
                `);
            }
        });
    }

    initializeAI() {
        try {
            // Use the new AI Router for all AI operations
            this.aiRouter = require('../ai/ai-router');

            // Temporarily use the direct routing without complex caching to avoid hanging
            this.callAI = async (messages, sender_psid) => {
                return await this.aiRouter.routeAIRequest(messages, sender_psid);
            };

            // Update audio transcription to use the new router
            this.transcribeAudio = async (audioBuffer, mimeType) => {
                return await this.aiRouter.transcribeAudio(audioBuffer, mimeType);
            };

            console.log(`✅ ${this.serviceName}: AI initialized with new router`);

            // The periodic check is now handled within the router itself
            // We can remove the separate interval as it's already set up there

        } catch (error) {
            console.error(`❌ ${this.serviceName}: Failed to initialize AI:`, error);
            throw error;
        }
    }
    
    // The queue is now initialized in constructor using SmartQueue
    
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
            const queueStatus = this.requestQueue.getStats();
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

        // Health monitoring endpoint
        this.app.get('/health-monitoring', (req, res) => {
            res.json(healthMonitor.getHealthStatus());
        });

        // Performance metrics endpoint
        this.app.get('/metrics', (req, res) => {
            res.json(healthMonitor.getPerformanceMetrics());
        });
    }
    
    // Common message processing methods
    async handleMessage(sender_psid, webhook_event, requestKey) {
        if (this.processingRequests.has(sender_psid)) {
            await this.processingRequests.get(sender_psid);
        }

        const requestContext = {
            sender_psid,
            message_type: webhook_event.message ?
                (webhook_event.message.text ? 'text' : 'attachment') : 'unknown',
            is_first_time_user: !this.userSessions.has(sender_psid)
        };

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
            // For now, execute the request handler directly to avoid queue issues
            // This bypasses the complex queue system and executes immediately
            await requestHandler();

        } catch (error) {
            console.error(`❌ Error processing request for ${sender_psid}:`, error);
            await this.callSendAPI(sender_psid, {
                text: "Xin lỗi, hệ thống đang gặp sự cố. Vui lòng thử lại sau ít phút! 🙏"
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
        try {
            // Try to get from cache first
            const cacheKey = `response_${sender_psid}_${encodeURIComponent(userMessage.substring(0, 50))}`;
            let cachedResult = aiResponseCache.getCachedResponse(
                { userMessage, sender_psid },
                { context: this.detectContext(userMessage) },
                this.aiProvider
            );

            if (cachedResult) {
                this.logger.info(`Cache hit for user ${sender_psid}`, { cacheKey });
                // Send cached response
                await this.sendResponse(sender_psid, userMessage, cachedResult, this.detectContext(userMessage));
                return;
            }

            // Generate or use existing session ID
            const sessionId = this.getSessionId(sender_psid);

            // Get relevant knowledge from RAG system (with caching)
            const detectedContext = this.detectContext(userMessage);
            let relevantKnowledge = conversationCache.getCachedKnowledge(userMessage);

            if (!relevantKnowledge) {
                relevantKnowledge = await this.ragSystem.getRelevantKnowledge(userMessage, detectedContext);
                conversationCache.cacheKnowledge(userMessage, relevantKnowledge);

                // Log RAG quality metrics
                const qualityValidation = this.ragSystem.validateKnowledgeQuality(relevantKnowledge, userMessage);
                this.logger.info(`RAG Quality for query "${userMessage.substring(0, 50)}...":`, {
                    qualityScore: qualityValidation.score,
                    validDocs: qualityValidation.metrics.validContentCount,
                    totalDocs: qualityValidation.metrics.totalDocs,
                    avgSimilarity: qualityValidation.metrics.avgSimilarity
                });
            }

            const knowledgeContext = this.ragSystem.formatKnowledgeForPrompt(relevantKnowledge, userMessage);

            // Get conversation history from both old and new systems (with caching)
            let oldHistory = conversationCache.getCachedConversation(sender_psid);
            if (!oldHistory) {
                oldHistory = await this.getConversationHistory(sender_psid);
                if (oldHistory.length > 0 && oldHistory[0].role === 'model') {
                    oldHistory.shift();
                }
                conversationCache.cacheConversation(sender_psid, oldHistory);
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

            // Track start time for response time measurement
            const startTime = Date.now();

            let text = await this.callAI(messages, sender_psid);
            if (!text || text.trim() === '') {
                text = getErrorMessage('SYSTEM_ERROR');
            }

            // Validate response against knowledge base for accuracy using the RAG validation
            const ragSystem = this.ragSystem; // Use the existing RAG system instance
            if (ragSystem && relevantKnowledge && relevantKnowledge.length > 0) {
                // Check for potential hallucinations - more aggressive validation
                const hallucinationCheck = ragSystem.isResponseHallucinated(text, userMessage, relevantKnowledge);
                if (hallucinationCheck && hallucinationCheck.isHallucinated) {
                    console.log(`⚠️ Potential hallucination detected: ${hallucinationCheck.flaggedContent ? hallucinationCheck.flaggedContent.join(', ') : 'Unknown'}`);
                    // If highly likely to be hallucinated, try to get a better response using validated content
                    const validation = ragSystem.validateResponseAgainstDocuments(text, relevantKnowledge);
                    if (validation && validation.validatedResponse !== text) {
                        text = validation.validatedResponse;
                    }
                }

                // Validate response faithfulness - more stringent validation
                const validation = ragSystem.validateResponseAgainstDocuments(text, relevantKnowledge);
                if (validation && (!validation.isValid || validation.confidence < 0.6)) { // Raised threshold from 0.5 to 0.6
                    console.log(`⚠️ Low confidence response (${validation.confidence ? validation.confidence.toFixed(2) : 'N/A'}): ${validation.message || 'Unknown error'}`);
                    // Use validated response if available and it's more reliable
                    if (validation.validatedResponse && validation.confidence > 0.3) {
                        text = validation.validatedResponse;
                    } else if (validation.confidence < 0.3) {
                        // If confidence is very low, provide a more conservative response
                        text = `Xin lỗi, tôi chưa tìm thấy thông tin chính xác trong cơ sở dữ liệu để trả lời câu hỏi "${userMessage}". Vui lòng tra cứu trên Cổng Dịch vụ công Quốc gia hoặc liên hệ cơ quan có thẩm quyền để được hỗ trợ chính xác nhất.`;
                    }
                }
            }

            // Post-process the response to remove irrelevant content
            text = this.postProcessResponse(text, userMessage);

            // Cache the response for future use (simple cache without complex logic)
            try {
                aiResponseCache.setCachedResponse(
                    { userMessage, sender_psid },
                    text,
                    { context: detectedContext },
                    this.aiProvider
                );
            } catch (cacheError) {
                console.warn('⚠️ Cache error (non-critical):', cacheError.message);
                // Continue processing even if cache fails
            }

            const responseTime = Date.now() - startTime;

            // Update health monitoring metrics
            healthMonitor.updateMetrics('ai_request', responseTime, true);

            // MACHINE LEARNING: Continuous learning - track user interactions
            await this.continuousLearningTracking(sender_psid, userMessage, text, detectedContext);

            // ANOMALY DETECTION: Detect unusual or inappropriate queries
            const isAnomaly = await this.detectAnomalies(userMessage);
            if (isAnomaly) {
                this.logger.warn(`Anomaly detected from user ${sender_psid}: ${userMessage}`);
                // Continue normal processing but log for review
            }

            // Send the response
            await this.sendResponse(sender_psid, userMessage, text, detectedContext, responseTime);

            this.dailyQuotaUsed++;
            console.log(`✅ Successfully processed message for ${sender_psid}`);

        } catch (error) {
            this.logger.error(`ERROR in processNormalMessage for ${sender_psid}:`, {
                error: error.message,
                stack: error.stack,
                userMessage
            });

            // Update health monitoring metrics for failed request
            healthMonitor.updateMetrics('ai_request', null, false);

            // Use the new error handler
            const errorResponse = {
                "text": ErrorHandler.handle(error, { sender_psid, userMessage }, this.logger)
            };

            await this.callSendAPI(sender_psid, errorResponse);

            // Save error to history
            const sessionId = this.getSessionId(sender_psid);
            await this.chatHistoryManager.saveUserMessage(sender_psid, sessionId, userMessage, this.detectContext(userMessage));
            await this.chatHistoryManager.saveAssistantResponse(sender_psid, sessionId, errorResponse.text, null, {
                intent: this.detectContext(userMessage),
                error: true
            });
        }
    }

    // New helper method to send responses
    async sendResponse(sender_psid, userMessage, text, detectedContext, responseTime = null) {
        const sessionId = this.getSessionId(sender_psid);

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

            // First, try to get from improved cache to avoid calling AI if possible
            const imageUserMessage = "Analyze this image: " + (IMAGE_ANALYSIS_PROMPT || "Image analysis request");
            const imageCacheKey = improvedCache.generateAIResponseCacheKey(imageUserMessage, sender_psid, this.aiProvider, 'image');
            let imageCachedResult = await improvedCache.get(imageCacheKey);

            if (!imageCachedResult) {
                // For image processing, we might not have specific knowledge to validate against
                // But we can still cache the result for future similar requests
                await improvedCache.cacheAIResponse(imageUserMessage, sender_psid, text, this.aiProvider, 'image');
            } else {
                text = imageCachedResult.response;
                console.log(`✅ Used cached image analysis response for: ${imageCacheKey}`);
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

            // First, try to get from improved cache to avoid calling AI if possible
            const audioUserMessage = transcript; // Use the transcribed audio as the message for caching
            const audioCacheKey = improvedCache.generateAIResponseCacheKey(audioUserMessage, sender_psid, this.aiProvider, 'audio');
            let audioCachedResult = await improvedCache.get(audioCacheKey);

            if (!audioCachedResult) {
                // For audio processing, we might not have specific knowledge to validate against
                // But we can still cache the result for future similar requests
                await improvedCache.cacheAIResponse(audioUserMessage, sender_psid, text, this.aiProvider, 'audio');
            } else {
                text = audioCachedResult.response;
                console.log(`✅ Used cached audio response for: ${audioCacheKey}`);
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
            if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
                // Initialize Supabase client for history operations
                const supabase = this.dbManager.getSupabaseClient();

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
                    // Fallback to user_chat_history table if primary query has issues
                    const { data: convHistory, error: convError } = await supabase
                        .from('user_chat_history')
                        .select('user_request as message_content, chatbot_response, created_at')
                        .eq('facebook_user_id', userId)
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
                    // Fallback to user_chat_history table in Supabase
                    try {
                        // Try Supabase user_chat_history table via direct query
                        const supabase = this.getSupabaseClient();
                        const { data: chatHistory, error: historyError } = await supabase
                            .from('user_chat_history')
                            .select('user_request, chatbot_response, created_at')
                            .eq('facebook_user_id', userId)
                            .order('created_at', { ascending: false })
                            .limit(20);

                        if (historyError) {
                            console.error('Error fetching user_chat_history from Supabase:', historyError);
                            return [];
                        }

                        // Format to match expected structure
                        const formattedHistory = [];
                        chatHistory.reverse().forEach(item => {
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
                    } catch (supabaseError) {
                        console.error('Error fetching history from Supabase:', supabaseError);
                        return [];
                    }
                }

                // Format for AI consumption
                return conversations.reverse().map(conv => ({
                    role: conv.message_type === 'user' ? 'user' : 'assistant',
                    parts: [{ text: conv.message_content }]
                }));
            } else {
                // Fallback to correct table if Supabase not configured - use database manager
                const query = `
                    SELECT user_request as message, 'user' as role, created_at FROM user_chat_history WHERE facebook_user_id = $1 AND user_request IS NOT NULL
                    UNION ALL
                    SELECT chatbot_response as message, 'assistant' as role, created_at FROM user_chat_history WHERE facebook_user_id = $1 AND chatbot_response IS NOT NULL
                    ORDER BY created_at DESC
                    LIMIT 20
                `;

                try {
                    const result = await this.dbManager.executeQuery(query, [userId], true); // Use caching
                    return result.rows.reverse().map(row => ({ role: row.role, parts: [{ text: row.message }] }));
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
            if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
                // Use the ChatHistoryService to store in user_chat_history table
                const chatHistoryService = new ChatHistoryService();

                // Create a session ID if needed
                const sessionId = this.getSessionId(userId);

                // Save conversation to user_chat_history table
                await chatHistoryService.saveConversation(userId, userMessage, botResponse, sessionId);
            } else {
                // Fallback to correct table if Supabase not configured - use database manager
                const query = 'INSERT INTO user_chat_history (facebook_user_id, user_request, chatbot_response) VALUES ($1, $2, $3)';
                await this.dbManager.executeQuery(query, [userId, userMessage, botResponse]);
            }
        } catch (error) {
            this.logger.error('Error saving conversation:', {
                error: error.message,
                userId,
                userMessage: userMessage.substring(0, 50) + '...'
            });

            // Fallback to correct table if Supabase fails
            try {
                const query = 'INSERT INTO user_chat_history (facebook_user_id, user_request, chatbot_response) VALUES ($1, $2, $3)';
                await this.dbManager.executeQuery(query, [userId, userMessage, botResponse]);
            } catch (dbError) {
                this.logger.error('Error saving to fallback db:', {
                    error: dbError.message,
                    userId
                });
            }
        }
    }

    getSupabaseClient() {
        if (!this.supabase) {
            this.supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY
            );
        }
        return this.supabase;
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
            if (this.dbManager) {
                await this.dbManager.closeAllConnections();
            }
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
                console.log('📚 Knowledge from knowledge-rag folder not available - using Supabase database as primary knowledge source');
                // Don't log as error since this is expected when using Supabase as primary source
                console.log('💡 This is expected behavior when using Supabase database as the primary knowledge source');
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
