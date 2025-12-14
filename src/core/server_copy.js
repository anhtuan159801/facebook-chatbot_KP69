require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const axios = require('axios'); // Added for keep-alive pings
const app = express();
const port = process.env.PORT || 3000;

// === HEALTH CHECK AND KEEP-ALIVE SETUP ===
// Simple health check endpoint to prevent 15-minute sleep
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'Router Hug Bot',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        message: 'Government Services Chatbot is running and ready to serve!'
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        status: 'alive',
        service: 'Router Hug Bot',
        functionality: 'Government Services Chatbot',
        timestamp: new Date().toISOString(),
        endpoints: {
            health: '/health',
            webhook: '/webhook',
            verify: 'GET /webhook (with verify_token)'
        }
    });
});

// Keep-alive ping function to prevent sleep on cloud platforms
function setupKeepAlive() {
    const baseURL = process.env.BASE_URL || `${process.env.HOST || 'http://localhost'}:${port}`;
    const healthURL = `${baseURL}/health`;

    // Ping the health endpoint to keep the service awake
    const keepAlivePing = () => {
        if (process.env.NODE_ENV === 'production' || process.env.KEEP_ALIVE_ENABLED === 'true') {
            axios.get(healthURL, {
                timeout: 5000,
                headers: {
                    'User-Agent': 'Router-Hug-Bot-Keep-Alive/1.0'
                }
            })
            .then(response => {
                console.log(`🔄 Keep-alive ping successful at ${new Date().toISOString()}`);
                console.log(`📊 Response status: ${response.status}`);
            })
            .catch(error => {
                // Only log significant errors, not timeout errors (which are common)
                if (error.code !== 'ECONNREFUSED') {
                    console.log(`⚠️  Keep-alive ping failed: ${error.message}`);
                }
            });
        }
    };

    // Ping every 14 minutes (just before 15-minute timeout)
    const keepAliveInterval = 14 * 60 * 1000; // 14 minutes in milliseconds

    if (process.env.NODE_ENV === 'production' || process.env.KEEP_ALIVE_ENABLED === 'true') {
        console.log(`⏰ Setting up keep-alive ping every ${keepAliveInterval / 1000 / 60} minutes...`);
        setInterval(keepAlivePing, keepAliveInterval);

        // Initial ping
        setTimeout(keepAlivePing, 5000); // Wait 5 seconds then initial ping
    } else {
        console.log('ℹ️  Keep-alive disabled in development mode');
    }
}

// Initialize keep-alive when server starts
setupKeepAlive();

// === IMPORT PROMPTS FROM CENTRALIZED FILE ===
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

// === IMPORT AI MODELS FROM CENTRALIZED FILE ===
const { 
    AIFactory, 
    createRetryWrapper, 
    createTimeoutWrapper 
} = require('./ai-models');

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: {
        rejectUnauthorized: false
    }
});

app.use(express.json());

const processingRequests = new Map();
const userSessions = new Map();

// ==== HELPER FUNCTION: Trích xuất suggestions linh hoạt ====
function extractSuggestions(text) {
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

// ==== AI API INTEGRATION (CENTRALIZED) ====
// Initialize AI models
const openRouterAI = AIFactory.createOpenRouterAI();
const huggingFaceAI = AIFactory.createHuggingFaceAI();

// Create retry and timeout wrappers
const callGrokAPI = createTimeoutWrapper(
    createRetryWrapper(openRouterAI.generateText.bind(openRouterAI), 3, 1000),
    30000
);

const transcribeAudioWithWhisper = createTimeoutWrapper(
    createRetryWrapper(huggingFaceAI.transcribeAudio.bind(huggingFaceAI), 2, 2000),
    60000
);

// ==== XỬ LÝ TIN NHẮN VĂN BẢN ====
async function processNormalMessage(sender_psid, userMessage) {
    const history = await getConversationHistory(sender_psid);
    if (history.length > 0 && history[0].role === 'model') {
        history.shift();
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
        let text = await callGrokAPI(messages, sender_psid);
        if (!text || text.trim() === '') {
            text = getErrorMessage('SYSTEM_ERROR');
        }

        if (text.includes('STEP')) {
            const userSession = userSessions.get(sender_psid) || {};
            userSession.currentJourney = { title: userMessage, fullGuide: text };
            userSessions.set(sender_psid, userSession);

            await callSendAPI(sender_psid, { text: `Xin chào! 👋\n${text}\nBạn có muốn mình hướng dẫn từng bước một không?` });
            await callSendAPI(sender_psid, {
                text: "Vui lòng trả lời 'Có' nếu bạn muốn được hướng dẫn từng bước, hoặc 'Không' nếu bạn chỉ muốn xem hướng dẫn tổng quát."
            });
        } else {
            if (text.length > 2000) {
                const chunks = splitMessage(text, 2000);
                for (let i = 0; i < chunks.length; i++) {
                    const isLast = i === chunks.length - 1;
                    const res = { text: chunks[i] };
                    if (isLast) {
                        const ext = extractSuggestions(text);
                        await callSendAPIWithRating(sender_psid, { text: ext.cleanedText }, ext.suggestions);
                    } else {
                        await callSendAPI(sender_psid, res);
                    }
                    if (!isLast) await new Promise(r => setTimeout(r, 500));
                }
            } else {
                const ext = extractSuggestions(text);
                await callSendAPIWithRating(sender_psid, { text: ext.cleanedText }, ext.suggestions);
            }
        }

        await saveConversation(sender_psid, userMessage, text);
        console.log(`✅ Successfully processed message for ${sender_psid}`);
    } catch (error) {
        console.error(`❌ ERROR in processNormalMessage for ${sender_psid}:`, error);
        const errorResponse = {
            "text": getErrorMessage('SYSTEM_ERROR')
        };
        await callSendAPI(sender_psid, errorResponse);
    }
}

// ==== XỬ LÝ HÌNH ẢNH ====
async function processImageAttachment(sender_psid, attachment) {
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

        let text = await callGrokAPI(messages, sender_psid);
        if (!text || text.trim() === '') {
            text = getErrorMessage('IMAGE_ERROR');
        }

        const extractionResult = extractSuggestions(text);
        const quickReplies = extractionResult.suggestions;
        const cleanedText = extractionResult.cleanedText;
        const response = { "text": cleanedText };
        await callSendAPIWithRating(sender_psid, response, quickReplies);
        await saveConversation(sender_psid, "[Ảnh đính kèm]", cleanedText);
        console.log(`✅ Processed image for ${sender_psid}`);
    } catch (error) {
        console.error(`❌ Error processing image for ${sender_psid}:`, error);
        const response = {
            "text": getErrorMessage('IMAGE_ERROR')
        };
        await callSendAPI(sender_psid, response);
    }
}

// ==== XỬ LÝ ÂM THANH ====
async function processAudioAttachment(sender_psid, attachment) {
    try {
        const audioUrl = attachment.payload.url.trim();
        const fetch = await import('node-fetch');
        const audioResponse = await fetch.default(audioUrl);
        const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
        const mimeType = attachment.payload.mime_type || 'audio/mp4';

        const transcript = await transcribeAudioWithWhisper(audioBuffer, mimeType);
        console.log(`🎤 Transcribed: "${transcript}"`);

        const history = await getConversationHistory(sender_psid);
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

        let text = await callGrokAPI(messages, sender_psid);
        if (!text || text.trim() === '') {
            text = getErrorMessage('SYSTEM_ERROR');
        }

        const extractionResult = extractSuggestions(text);
        const quickReplies = extractionResult.suggestions;
        text = extractionResult.cleanedText;
        
        // Chia nhỏ tin nhắn dài trước khi gửi
        if (text.length > 2000) {
            const chunks = splitMessage(text, 2000);
            for (let i = 0; i < chunks.length; i++) {
                const isLast = i === chunks.length - 1;
                const res = { text: chunks[i] };
                if (isLast) {
                    await callSendAPIWithRating(sender_psid, res, quickReplies);
                } else {
                    await callSendAPI(sender_psid, res);
                }
                if (!isLast) await new Promise(r => setTimeout(r, 500));
            }
        } else {
            const response = { "text": text };
            await callSendAPIWithRating(sender_psid, response, quickReplies);
        }
        
        await saveConversation(sender_psid, `[Voice: ${transcript}]`, text);
        console.log(`✅ Processed audio question for ${sender_psid}: "${transcript}"`);
    } catch (error) {
        console.error(`❌ Error processing audio for ${sender_psid}:`, error);
        const response = {
            "text": getErrorMessage('AUDIO_ERROR')
        };
        await callSendAPI(sender_psid, response);
    }
}

// ==== GỬI BƯỚC TIẾP THEO TRONG HÀNH TRÌNH ====
async function sendNextStep(sender_psid) {
    const userSession = userSessions.get(sender_psid);
    if (!userSession || !userSession.currentJourney) return;
    const guide = userSession.currentJourney.fullGuide;
    const steps = guide.split('STEP ').filter(step => step.trim());
    if (userSession.journeyStep < steps.length) {
        const currentStep = steps[userSession.journeyStep];
        const stepText = `STEP ${userSession.journeyStep + 1}: ${currentStep}`;
        await callSendAPI(sender_psid, { text: stepText });
        userSession.journeyStep++;
        userSessions.set(sender_psid, userSession);
        if (userSession.journeyStep < steps.length) {
            await callSendAPI(sender_psid, { text: "Bạn đã hoàn thành bước này chưa? Nếu xong rồi, mình sẽ chuyển sang bước tiếp theo." });
        } else {
            await callSendAPI(sender_psid, { text: "🎉 Chúc mừng! Bạn đã hoàn thành toàn bộ hướng dẫn. Nếu cần hỗ trợ thêm, cứ hỏi mình nhé! 😊" });
            userSession.currentJourney = null;
            userSession.journeyActive = false;
        }
    }
}

// ==== WEBHOOK VERIFICATION ====
app.get('/webhook', (req, res) => {
    const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
    let mode = req.query['hub.mode'];
    let token = req.query['hub.verify_token'];
    let challenge = req.query['hub.challenge'];
    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('WEBHOOK_VERIFIED');
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    } else {
        res.sendStatus(403);
    }
});

// ==== GỬI TIN NHẮN QUA FACEBOOK API ====
async function callSendAPI(sender_psid, response, maxRetries = 3) {
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

// ==== GỬI TIN NHẮN CÓ QUICK REPLIES & RATING ====
async function callSendAPIWithRating(sender_psid, response, quickReplies = null) {
    const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
    let quickRepliesArray = [];
    const userSession = userSessions.get(sender_psid);
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

// ==== XỬ LÝ WEBHOOK ====
app.post('/webhook', async (req, res) => {
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
                            await handleRating(sender_psid, messageText);
                            continue;
                        }
                    }
                    if (webhook_event.message) {
                        await handleMessage(sender_psid, webhook_event, `${sender_psid}_${Date.now()}`);
                    }
                }
            }
        }
    } else {
        res.sendStatus(404);
    }
});

// ==== XỬ LÝ ĐÁNH GIÁ & QUICK REPLIES ====
async function handleRating(sender_psid, ratingText) {
    try {
        if (ratingText.startsWith('SUGGESTION_')) {
            const parts = ratingText.split('_');
            if (parts.length >= 3) {
                const originalText = decodeURIComponent(parts.slice(2).join('_'));
                await callSendAPI(sender_psid, { text: originalText });
                return;
            }
        }
        if (ratingText.startsWith('JOURNEY_')) {
            const userSession = userSessions.get(sender_psid);
            if (!userSession || !userSession.currentJourney || !userSession.journeyActive) {
                await callSendAPI(sender_psid, { text: "Bạn hiện không đang trong hành trình hướng dẫn nào." });
                return;
            }
            if (ratingText.includes('ERROR_')) {
                await callSendAPI(sender_psid, { text: "Bạn gặp lỗi ở bước này? Mình sẽ hỗ trợ bạn ngay. Vui lòng mô tả lỗi bạn gặp phải." });
            } else if (ratingText.includes('BACK')) {
                userSession.journeyStep = Math.max(0, userSession.journeyStep - 1);
                await callSendAPI(sender_psid, { text: "Bạn đã quay lại bước trước. Mình sẽ tiếp tục hướng dẫn từ bước đó." });
                await sendNextStep(sender_psid);
            }
            return;
        }

        let rating = 'unknown';
        if (ratingText.includes('👍') || ratingText.includes('Hữu ích')) rating = 'helpful';
        else if (ratingText.includes('👎') || ratingText.includes('Cần cải thiện')) rating = 'not_helpful';

        await pool.query('INSERT INTO feedback (user_id, rating, created_at) VALUES ($1, $2, NOW())', [sender_psid, rating]);
        const msg = getRatingResponse(rating);
        await callSendAPI(sender_psid, { text: msg });
    } catch (error) {
        console.error(`❌ Rating error for ${sender_psid}:`, error);
    }
}

// ==== LẤY LỊCH SỬ HỘI THOẠI ====
async function getConversationHistory(userId) {
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
        const { rows } = await pool.query(query);
        return rows.reverse().map(row => ({ role: row.role, parts: [{ text: row.message }] }));
    } catch (error) {
        console.error('Error fetching history:', error);
        return [];
    }
}

// ==== LƯU HỘI THOẠI ====
async function saveConversation(userId, userMessage, botResponse) {
    try {
        await pool.query('INSERT INTO conversations (user_id, message, bot_response) VALUES ($1, $2, $3)', [userId, userMessage, botResponse]);
    } catch (error) {
        console.error('Error saving conversation:', error);
    }
}

// ==== XỬ LÝ TIN NHẮN CHÍNH ====
async function handleMessage(sender_psid, webhook_event, requestKey) {
    if (processingRequests.has(sender_psid)) {
        await processingRequests.get(sender_psid);
    }
    let processingPromise;
    if (webhook_event.message && webhook_event.message.text) {
        processingPromise = processMessage(sender_psid, webhook_event.message, requestKey);
    } else if (webhook_event.message && webhook_event.message.attachments) {
        processingPromise = processAttachment(sender_psid, webhook_event.message, requestKey);
    } else {
        await callSendAPI(sender_psid, { text: "Xin lỗi, tôi chỉ hỗ trợ văn bản, hình ảnh, âm thanh. 😊" });
        return;
    }
    processingRequests.set(sender_psid, processingPromise);
    try { await processingPromise; } finally { processingRequests.delete(sender_psid); }
}

// ==== XỬ LÝ TIN NHẮN VĂN BẢN ====
async function processMessage(sender_psid, received_message, requestKey) {
    if (received_message.text && received_message.text.trim()) {
        const userMessage = received_message.text.trim();
        let userSession = userSessions.get(sender_psid);
        if (userSession && userSession.currentJourney) {
            if (userMessage.toLowerCase().includes('có') || userMessage.toLowerCase().includes('đồng ý') || userMessage.toLowerCase().includes('ok')) {
                userSession.journeyStep = 0;
                userSession.journeyActive = true;
                await callSendAPI(sender_psid, { text: "Tuyệt vời! 🎉 Bây giờ mình sẽ hướng dẫn bạn từng bước một. Bắt đầu nào!" });
                await sendNextStep(sender_psid);
                return;
            } else if (userMessage.toLowerCase().includes('không') || userMessage.toLowerCase().includes('thôi')) {
                userSession.currentJourney = null;
                userSession.journeyActive = false;
                await callSendAPI(sender_psid, { text: "Hiểu rồi! 😊 Nếu bạn cần hướng dẫn chi tiết sau này, cứ hỏi mình nhé." });
                await processNormalMessage(sender_psid, userMessage);
                return;
            } else if (userSession.journeyActive) {
                await processNormalMessage(sender_psid, userMessage);
                return;
            }
        }
        await processNormalMessage(sender_psid, userMessage);
    } else {
        await callSendAPI(sender_psid, { text: "Xin lỗi, tôi chỉ có thể xử lý tin nhắn văn bản. Bạn có thể gửi câu hỏi bằng chữ để tôi hỗ trợ bạn nhé! 😊" });
    }
}

// ==== XỬ LÝ FILE ĐÍNH KÈM ====
async function processAttachment(sender_psid, message, requestKey) {
    const attachment = message.attachments[0];
    if (attachment.type === 'image') {
        await processImageAttachment(sender_psid, attachment);
    } else if (attachment.type === 'audio') {
        await processAudioAttachment(sender_psid, attachment);
    } else {
        await callSendAPI(sender_psid, { text: "Hiện tại tôi chỉ hỗ trợ xử lý hình ảnh và âm thanh. 📷🎵" });
    }
}

// ==== CHIA NHỎ TIN NHẮN DÀI ====
function splitMessage(text, maxLength) {
    if (text.length <= maxLength) {
        return [text];
    }
    
    const chunks = [];
    let currentChunk = '';
    const lines = text.split('\n');
    
    for (const line of lines) {
        // Nếu dòng hiện tại quá dài, chia nhỏ nó
        if (line.length > maxLength) {
            // Lưu chunk hiện tại nếu có
            if (currentChunk) {
                chunks.push(currentChunk.trim());
                currentChunk = '';
            }
            
            // Chia dòng dài thành các phần nhỏ
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
            // Dòng bình thường
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
    
    // Kiểm tra lại và chia nhỏ các chunk vẫn còn quá dài
    const finalChunks = [];
    for (const chunk of chunks) {
        if (chunk.length <= maxLength) {
            finalChunks.push(chunk);
        } else {
            // Chia nhỏ chunk vẫn còn quá dài
            const words = chunk.split(' ');
            let tempChunk = '';
            for (const word of words) {
                if ((tempChunk + word + ' ').length <= maxLength) {
                    tempChunk += word + ' ';
                } else {
                    if (tempChunk) {
                        finalChunks.push(tempChunk.trim());
                    }
                    tempChunk = word + ' ';
                }
            }
            if (tempChunk) {
                finalChunks.push(tempChunk.trim());
            }
        }
    }
    
    // Kiểm tra lần cuối và chia nhỏ nếu cần
    const result = [];
    for (const chunk of finalChunks) {
        if (chunk.length <= maxLength) {
            result.push(chunk);
        } else {
            // Chia nhỏ theo ký tự nếu không có space
            for (let i = 0; i < chunk.length; i += maxLength) {
                result.push(chunk.substring(i, i + maxLength));
            }
        }
    }
    
    return result;
}

// ==== TEST ENDPOINTS ====
app.get('/test', (req, res) => {
    res.json({ status: 'Server is working!', timestamp: new Date().toISOString() });
});
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', uptime: process.uptime() });
});

// ==== GRACEFUL SHUTDOWN ====
process.on('SIGTERM', async () => {
    console.log('Shutting down...');
    await pool.end();
    process.exit(0);
});

// ==== KHỞI ĐỘNG SERVER ====
const server = app.listen(port, () => {
    console.log(`🚀 Server running on port ${port}`);
    console.log(`🛡️  Health check available at http://localhost:${port}/health`);
});

// Export for use in other modules (like render startup scripts)
module.exports = { app, server, port };
