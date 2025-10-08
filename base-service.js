/**
 * Base Chatbot Service
 * 
 * This class provides common functionality for all chatbot services
 * to eliminate code duplication and ensure consistency.
 */

require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');

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
} = require('./prompts');

const { 
    AIFactory, 
    createRetryWrapper, 
    createTimeoutWrapper 
} = require('./ai-models');

const { createLogger } = require('./logger');
const aiProviderManager = require('./ai-provider-manager');

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
            
            // Audio transcription with proper conversion
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
                        
                        const transcript = await huggingFaceAI.transcribeAudio(processedBuffer, processedMimeType);
                        console.log('✅ Hugging Face transcription successful');
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
        const history = await this.getConversationHistory(sender_psid);
        if (history.length > 0 && history[0].role === 'model') {
            history.shift();
        }

        // Check quota
        if (this.dailyQuotaUsed >= this.DAILY_QUOTA_LIMIT) {
            const response = {
                "text": "Xin lỗi, hôm nay mình đã đạt giới hạn sử dụng API. Vui lòng quay lại vào ngày mai nhé! 🙏"
            };
            await this.callSendAPI(sender_psid, response);
            return;
        }

        // Enhanced system prompt with context awareness
        let contextType = null;
        const recentMessages = history.slice(-5).map(msg => msg.parts[0].text).join(' ');
        
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
        
        const enhancedSystemPrompt = getEnhancedPrompt(SYSTEM_PROMPT, contextType);

        const messages = [
            { role: "system", content: enhancedSystemPrompt },
            ...history.map(msg => ({
                role: msg.role === 'user' ? 'user' : 'assistant',
                content: msg.parts[0].text
            })),
            { role: "user", content: userMessage }
        ];

        try {
            let text = await this.callAI(messages, sender_psid);
            if (!text || text.trim() === '') {
                text = getErrorMessage('SYSTEM_ERROR');
            }

            if (text.includes('STEP')) {
                const userSession = this.userSessions.get(sender_psid) || {};
                userSession.currentJourney = { title: userMessage, fullGuide: text };
                this.userSessions.set(sender_psid, userSession);

                await this.callSendAPI(sender_psid, { text: `Xin chào! 👋\n${text}\nBạn có muốn mình hướng dẫn từng bước một không?` });
                await this.callSendAPI(sender_psid, {
                    text: "Vui lòng trả lời 'Có' nếu bạn muốn được hướng dẫn từng bước, hoặc 'Không' nếu bạn chỉ muốn xem hướng dẫn tổng quát."
                });
            } else {
                if (text.length > 2000) {
                    const chunks = this.splitMessage(text, 2000);
                    for (let i = 0; i < chunks.length; i++) {
                        const isLast = i === chunks.length - 1;
                        const res = { text: chunks[i] };
                        if (isLast) {
                            const ext = this.extractSuggestions(text);
                            await this.callSendAPIWithRating(sender_psid, { text: ext.cleanedText }, ext.suggestions);
                        } else {
                            await this.callSendAPI(sender_psid, res);
                        }
                        if (!isLast) await new Promise(r => setTimeout(r, 500));
                    }
                } else {
                    const ext = this.extractSuggestions(text);
                    await this.callSendAPIWithRating(sender_psid, { text: ext.cleanedText }, ext.suggestions);
                }
            }

            await this.saveConversation(sender_psid, userMessage, text);
            this.dailyQuotaUsed++;
            console.log(`✅ Successfully processed message for ${sender_psid}`);
        } catch (error) {
            console.error(`❌ ERROR in processNormalMessage for ${sender_psid}:`, error);
            const errorResponse = {
                "text": getErrorMessage('SYSTEM_ERROR')
            };
            await this.callSendAPI(sender_psid, errorResponse);
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
            const imageUrl = attachment.payload.url.trim();
            const fetch = await import('node-fetch');
            const imageResponse = await fetch.default(imageUrl);
            const arrayBuffer = await imageResponse.arrayBuffer();
            const base64Image = Buffer.from(arrayBuffer).toString('base64');
            const mimeType = attachment.payload.mime_type || 'image/jpeg';
            const dataUrl = `${mimeType};base64,${base64Image}`;

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

            const extractionResult = this.extractSuggestions(text);
            const quickReplies = extractionResult.suggestions;
            const cleanedText = extractionResult.cleanedText;
            const response = { "text": cleanedText };
            await this.callSendAPIWithRating(sender_psid, response, quickReplies);
            await this.saveConversation(sender_psid, "[Ảnh đính kèm]", cleanedText);
            console.log(`✅ Processed image for ${sender_psid}`);
        } catch (error) {
            console.error(`❌ Error processing image for ${sender_psid}:`, error);
            const response = {
                "text": getErrorMessage('IMAGE_ERROR')
            };
            await this.callSendAPI(sender_psid, response);
        }
    }
    
    async processAudioAttachment(sender_psid, attachment) {
        try {
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

            const extractionResult = this.extractSuggestions(text);
            const quickReplies = extractionResult.suggestions;
            text = extractionResult.cleanedText;
            
            if (text.length > 2000) {
                const chunks = this.splitMessage(text, 2000);
                for (let i = 0; i < chunks.length; i++) {
                    const isLast = i === chunks.length - 1;
                    const res = { text: chunks[i] };
                    if (isLast) {
                        await this.callSendAPIWithRating(sender_psid, res, quickReplies);
                    } else {
                        await this.callSendAPI(sender_psid, res);
                    }
                    if (!isLast) await new Promise(r => setTimeout(r, 500));
                }
            } else {
                const response = { "text": text };
                await this.callSendAPIWithRating(sender_psid, response, quickReplies);
            }
            
            await this.saveConversation(sender_psid, `[Voice: ${transcript}]`, text);
            console.log(`✅ Processed audio question for ${sender_psid}: "${transcript}"`);
        } catch (error) {
            console.error(`❌ Error processing audio for ${sender_psid}:`, error);
            const response = {
                "text": getErrorMessage('AUDIO_ERROR')
            };
            await this.callSendAPI(sender_psid, response);
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
    
    async saveConversation(userId, userMessage, botResponse) {
        try {
            await this.pool.query('INSERT INTO conversations (user_id, message, bot_response) VALUES ($1, $2, $3)', [userId, userMessage, botResponse]);
        } catch (error) {
            console.error('Error saving conversation:', error);
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
        });
    }

    // Cleanup method
    cleanup() {
        if (this.geminiCheckInterval) {
            clearInterval(this.geminiCheckInterval);
            console.log('🧹 Cleaned up Gemini check interval');
        }
    }
}

module.exports = BaseChatbotService;
