require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const app = express();
const port = process.env.PORT || 3000;
const { GoogleGenerativeAI } = require('@google/generative-ai');

const SYSTEM_PROMPT = `OPERATING PRINCIPLES

## 1. Persona & Role
You are the 'Public Service Assistant,' developed by the Management Board of Quarter 69, Tan Thoi Nhat Ward, Ho Chi Minh City. With your trained knowledge, you are a friendly and deeply knowledgeable consultant on the public service applications of the Vietnamese government. Your philosophy is to empower citizens, helping everyone use digital utilities easily, confidently, and accurately. If you encounter any issues during usage, you can contact Zalo 0778649573 - Mr. Tuan for support.

---

## 2. Knowledge Base
Your knowledge focuses deeply on the most popular applications and portals, including:
- VNeID: Electronic identification, document integration, travel declarations, etc.
- VssID: Digital Social Insurance.
- National Public Service Portal: Submitting applications, online payments, etc.
- Party Member's Handbook:
- ETAX: Online tax declaration, electronic invoice, personal & corporate income tax finalization – the official e-tax software of the General Department of Taxation, Vietnam.
- Other related applications when mentioned by the user.

IMPORTANT: Every instruction you give MUST be verifiable on the official website or the latest user guide of the above services. You are strictly prohibited from inventing steps, buttons, or menu names that do not exist.

---

## 3. Restrictions
- You must NEVER answer or discuss topics related to RELIGION, GENDER, or other SENSITIVE ISSUES. 
- If the user asks about these, politely respond: "Sorry 👋, I can only support questions about digital public services. Please ask me about VNeID, VssID, National Public Service Portal, ETAX, or related applications." 

---

## 4. Communication Rules & Tone (MOST IMPORTANT)

### 4.1. Text Formatting
IMPORTANT: Facebook Messenger does NOT support markdown. Absolutely DO NOT use:
- ** or * for bold/italics
- # for headings
- \`\`\` for code
- Any other markdown symbols

Instead:
- Use ALL CAPS to emphasize important keywords
- Use a colon (:) after headings
- Use a hyphen (-) or bullet (•) for lists
- Write in plain text, with no formatting

### 4.2. Tone of Voice
- Friendly and Patient: Always use a friendly, positive, and patient tone. Treat the user like a friend who needs help with technology.
- Simplify: Absolutely avoid complex technical terms or dry administrative jargon. Explain everything in everyday language that is as easy to understand as possible.

### 4.3. Use of Emojis
- Enhance Visuals: Flexibly use appropriate emojis to make instructions more lively and easier to follow.
- Suggested Use:
  - 📱 for actions on a phone/app
  - 🔍 to indicate a search action
  - ⚙️ for the "Settings" section
  - ➡️ to indicate sequential steps
  - ✅ to confirm completion
  - 👋 for greetings
  - 📷 for responding to images
  - 🔧 to indicate error fixing

### 4.4. Image Handling (NOT AVAILABLE YET)
If the user sends an image, reply:
"Hi! 👋 I see you sent an image. Currently I do not support image processing yet. Please describe the error or the step you are stuck on in words, and I will help you right away!"

---

## 5. Context Usage Instructions
When provided with relevant context from documentation:
1. ALWAYS prioritize information from the provided context.
2. If the context contains specific steps or procedures, follow them exactly.
3. If the context does not fully answer the question, supplement it with your general knowledge.
4. Always maintain a friendly, emoji-rich communication style even when using context information.
5. Adapt the context information to the user's specific question.
6. Always use the language the user used to ask the question. (For example: if the user asks in Vietnamese, respond in Vietnamese; if they ask in English, respond in English.)

---

## 6. Sample Example (For Text-Based Questions)
User's Question: "How do I integrate my driver's license into VNeID?"

SAMPLE RESPONSE (100% Correct):

Hello 👋, to integrate your Driver's License (GPLX) into VNeID, just follow these simple steps:

📱 STEP 1: Open the VNeID App and Log In
- Open the VNeID application on your phone
- Log in to your Level 2 electronic identification account

📁 STEP 2: Access the Document Wallet
- On the main screen, select the "Document Wallet" section

➕ STEP 3: Begin Information Integration
- Select "Integrate Information"
- Tap on "Create New Request"

🚗 STEP 4: Select and Enter Driver's License Information
- In the "Information Type" field, select "Driver's License"
- Enter your correct "License Number" and "License Class"
- Check the box "I confirm the above information is correct" and then tap "Submit Request"

✨ ALL DONE! The system will take some time for review. Once successfully approved, your driver's license will appear in the "Document Wallet". Wishing you success! ✅

---

## 7. Important Notes
- All content returned must be FACTUAL and VERIFIABLE; do NOT invent information.
- You MUST reply in the SAME LANGUAGE the user used.
- Always analyze the image carefully before providing instructions.
- Ensure you correctly understand the error from the image before advising.
- Provide specific guidance based on the actual interface shown in the image.
- The response content should be around 250-300 words when an image is involved.

---

## 8. GỢI Ý CÂU HỎI TIẾP THEO
Sau khi trả lời xong, nếu có thể, hãy đưa ra 2–3 câu hỏi liên quan mà người dùng có thể muốn hỏi tiếp theo.
QUAN TRỌNG: Mỗi câu hỏi gợi ý PHẢI DƯỚI 20 KÝ TỰ để hiển thị trên Facebook Messenger.
Định dạng như sau:
GỢI Ý:
• Scan giấy tờ?
• Mẫu CT01 ở đâu?
• Không có chỗ ở?

---

## 9. Context Awareness
VERY IMPORTANT: Always check the conversation history to understand what service the user is currently discussing.
If the user asks general questions like "Quên mật khẩu?", "Lỗi đăng nhập?", or "Không truy cập được", you MUST:
1. Look at the previous messages to determine which service they're using
2. If they were just discussing VNeID, assume they mean VNeID
3. If they were discussing ETAX, assume they mean ETAX
4. Only ask for clarification if the context is unclear

Example:
User: "Hướng dẫn tôi đăng ký VNeID mức độ 2"
Assistant: [Hướng dẫn VNeID]
User: "Quên mật khẩu?"
Assistant: "Bạn quên mật khẩu VNeID à? Để tôi hướng dẫn bạn cách khôi phục..." (Không hỏi lại)
`;

// Access your API key as an environment variable
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Create a new pool instance to connect to the database
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

// Map để theo dõi các request đang xử lý
const processingRequests = new Map();

// ==== MESSAGE PROCESSING ====

async function processMessage(sender_psid, received_message, requestKey) {
    console.log('=== PROCESS MESSAGE START ===');
    console.log('Sender PSID:', sender_psid);
    console.log('Message text:', received_message.text);
    
    try {
        if (received_message.text && received_message.text.trim()) {
            const userMessage = received_message.text.trim();
            console.log(`🤖 Processing user message: "${userMessage}"`);
            
            // Get conversation history
            const history = await getConversationHistory(sender_psid);
            
            if (history.length > 0 && history[0].role === 'model') {
                history.shift();
            }

            console.log('🤖 Sending message to Gemini...');

            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
            
            // Tạo system instruction với ngữ cảnh
            let enhancedSystemPrompt = SYSTEM_PROMPT;
            
            // Nếu là câu hỏi chung, thêm ngữ cảnh
            if (userMessage.toLowerCase().includes('quên mật khẩu') || 
                userMessage.toLowerCase().includes('lỗi đăng nhập') ||
                userMessage.toLowerCase().includes('không truy cập') ||
                userMessage.toLowerCase().includes('bị khóa') ||
                userMessage.toLowerCase().includes('không nhớ')) {
                
                // Tìm service gần đây nhất trong lịch sử
                const recentMessages = history.slice(-5).map(msg => msg.parts[0].text).join(' ');
                if (recentMessages.includes('VNeID')) {
                    enhancedSystemPrompt += "\n\nCURRENT CONTEXT: User is currently working with VNeID service.";
                } else if (recentMessages.includes('ETAX') || recentMessages.includes('thuế')) {
                    enhancedSystemPrompt += "\n\nCURRENT CONTEXT: User is currently working with ETAX service.";
                } else if (recentMessages.includes('VssID') || recentMessages.includes('bảo hiểm')) {
                    enhancedSystemPrompt += "\n\nCURRENT CONTEXT: User is currently working with VssID service.";
                } else if (recentMessages.includes('Cổng Dịch vụ') || recentMessages.includes('dịch vụ công')) {
                    enhancedSystemPrompt += "\n\nCURRENT CONTEXT: User is currently working with National Public Service Portal.";
                }
            }
            
            const chat = model.startChat({
                history: history,
                generationConfig: {
                    maxOutputTokens: 5000,
                    temperature: 0.7,
                },
                systemInstruction: { parts: [{ text: enhancedSystemPrompt }] },
            });

            // Send message to Gemini
            const result = await Promise.race([
                chat.sendMessage(userMessage),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Gemini API timeout')), 30000)
                )
            ]);
            
            let text = result.response.text();
            
            // Tách phần gợi ý (nếu có)
            let quickReplies = [];
            const suggestionMatch = text.match(/GỢI Ý:(.*)/s);
            if (suggestionMatch) {
                const suggestions = suggestionMatch[1].split('\n')
                    .filter(line => line.trim())
                    .map(line => line.replace(/^[•\-]\s*/, '').trim())
                    .slice(0, 3);
                quickReplies = suggestions;
                text = text.replace(/GỢI Ý:(.*)/s, '').trim();
            }

            // Gửi phản hồi với quick replies và nút đánh giá
            if (text.length > 2000) {
                const chunks = splitMessage(text, 2000);
                for (let i = 0; i < chunks.length; i++) {
                    const isLastChunk = (i === chunks.length - 1);
                    const response = { "text": chunks[i] };
                    if (isLastChunk) {
                        await callSendAPIWithRating(sender_psid, response, quickReplies);
                    } else {
                        await callSendAPI(sender_psid, response);
                    }
                    if (i < chunks.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, 500));
                    }
                }
            } else {
                const response = { "text": text };
                await callSendAPIWithRating(sender_psid, response, quickReplies);
            }

            // Save conversation
            await saveConversation(sender_psid, userMessage, text);
            console.log(`✅ Successfully processed message for ${sender_psid}`);

        } else {
            console.log('❌ Invalid message - no text content');
            const response = {
                "text": "Xin lỗi, tôi chỉ có thể xử lý tin nhắn văn bản. Bạn có thể gửi câu hỏi bằng chữ để tôi hỗ trợ bạn nhé! 😊"
            };
            await callSendAPI(sender_psid, response);
        }

    } catch (error) {
        console.error(`❌ ERROR in processMessage for ${sender_psid}:`, error);
        
        const errorResponse = {
            "text": "Xin lỗi, hiện tại tôi đang gặp sự cố kỹ thuật. Bạn vui lòng thử lại sau ít phút nhé! 🙏"
        };
        
        try {
            await callSendAPI(sender_psid, errorResponse);
        } catch (sendError) {
            console.error(`Failed to send error message to ${sender_psid}:`, sendError);
        }
    }
    
    console.log('=== PROCESS MESSAGE END ===\n');
}

// Webhook verification for Facebook Messenger
app.get('/webhook', (req, res) => {
    const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
    let mode = req.query['hub.mode'];
    let token = req.query['hub.verify_token'];
    let challenge = req.query['hub.challenge'];

    console.log('--- Webhook Verification Request ---');
    console.log('Received query:', req.query);
    console.log('Mode:', mode);
    console.log('Token:', token);
    console.log('Challenge:', challenge);
    console.log('Expected VERIFY_TOKEN:', VERIFY_TOKEN);

    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('WEBHOOK_VERIFIED');
            res.status(200).send(challenge);
        } else {
            console.log('Verification failed: Token mismatch or mode not subscribe.');
            res.sendStatus(403);
        }
    } else {
        console.log('Verification failed: Missing mode or token in query.');
        res.sendStatus(403);
    }
    console.log('--- End Webhook Verification Request ---');
});

// Sends response messages via the Send API với retry mechanism
async function callSendAPI(sender_psid, response, maxRetries = 3) {
    const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
    const request_body = {
        "recipient": {
            "id": sender_psid
        },
        "message": response
    };

    console.log('📤 Sending message to Facebook API...');
    console.log('Recipient PSID:', sender_psid);
    console.log('Request body:', JSON.stringify(request_body, null, 2));

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`Sending message to ${sender_psid} (attempt ${attempt}/${maxRetries})`);
            
            const fetch = await import('node-fetch');
            const apiResponse = await fetch.default(`https://graph.facebook.com/v2.6/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(request_body)
            });

            const responseData = await apiResponse.json();
            console.log('Facebook API response:', responseData);
            
            if (apiResponse.ok) {
                console.log(`✅ Message sent successfully to ${sender_psid}!`);
                return true;
            } else {
                console.error(`❌ Facebook API error for ${sender_psid}:`, responseData);
                if (attempt === maxRetries) {
                    throw new Error(`Failed to send message after ${maxRetries} attempts: ${JSON.stringify(responseData)}`);
                }
            }
        } catch (error) {
            console.error(`❌ Attempt ${attempt} failed for ${sender_psid}:`, error.message);
            if (attempt === maxRetries) {
                console.error(`Unable to send message to ${sender_psid} after ${maxRetries} attempts:`, error);
                return false;
            }
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
    }
    return false;
}

// Gửi tin nhắn với nút đánh giá và quick replies
async function callSendAPIWithRating(sender_psid, response, quickReplies = null) {
    const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
    
    let request_body;
    
    // Tạo quick replies nếu có - ĐÃ FIX
    let quickRepliesArray = [];
    if (quickReplies && quickReplies.length > 0) {
        quickRepliesArray = quickReplies.map(text => {
            // Rút gọn thông minh
            let displayText = text;
            if (displayText.length > 20) {
                // Tìm vị trí khoảng trắng gần vị trí 17
                const cutPos = displayText.lastIndexOf(' ', 17);
                if (cutPos > 0) {
                    displayText = displayText.substring(0, cutPos) + '...';
                } else {
                    displayText = displayText.substring(0, 17) + '...';
                }
            }
            
            return {
                "content_type": "text",
                "title": displayText,
                "payload": `SUGGESTION_${text.substring(0, 20)}`
            };
        });
    }
    
    // Thêm nút đánh giá
    const ratingButtons = [
        {
            "content_type": "text",
            "title": "👍 Hữu ích",
            "payload": `RATING_HELPFUL_${Date.now()}`
        },
        {
            "content_type": "text",
            "title": "👎 Cải thiện",
            "payload": `RATING_NOT_HELPFUL_${Date.now()}`
        }
    ];
    
    // Kết hợp quick replies và nút đánh giá
    const allQuickReplies = [...quickRepliesArray, ...ratingButtons];
    
    request_body = {
        "recipient": { "id": sender_psid },
        "message": {
            "text": response.text,
            "quick_replies": allQuickReplies.slice(0, 11) // Facebook giới hạn 11 quick replies
        }
    };

    console.log('📤 Sending message with rating to Facebook API...');
    
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

        const responseData = await apiResponse.json();
        if (apiResponse.ok) {
            console.log(`✅ Message with rating sent successfully to ${sender_psid}!`);
            return true;
        } else {
            console.error(`❌ Facebook API error:`, responseData);
            return false;
        }
    } catch (error) {
        console.error(`❌ Error sending message with rating:`, error);
        return false;
    }
}

// Handle incoming messages
app.post('/webhook', async (req, res) => {
    let body = req.body;

    console.log('====================================');
    console.log('🔔 FULL WEBHOOK REQUEST RECEIVED');
    console.log('Time:', new Date().toISOString());
    console.log('Body:', JSON.stringify(body, null, 2));
    console.log('====================================');

    if (body.object === 'page') {
        res.status(200).send('EVENT_RECEIVED');
        console.log('✅ Sent EVENT_RECEIVED response to Facebook');

        for (let i = 0; i < body.entry.length; i++) {
            const entry = body.entry[i];
            console.log(`\n📝 Processing entry ${i + 1}:`, JSON.stringify(entry, null, 2));

            if (entry.messaging && entry.messaging.length > 0) {
                console.log('✅ Found messaging events!');
                
                for (let j = 0; j < entry.messaging.length; j++) {
                    const webhook_event = entry.messaging[j];
                    console.log(`\n📬 Message event ${j + 1}:`, JSON.stringify(webhook_event, null, 2));

                    let sender_psid = webhook_event.sender.id;
                    console.log('🔄 Processing message for PSID:', sender_psid);

                    const requestKey = `${sender_psid}_${Date.now()}`;
                    
                    // Xử lý tin nhắn đánh giá
                    if (webhook_event.message && webhook_event.message.text) {
                        const messageText = webhook_event.message.text.trim();
                        if (messageText.startsWith('👍') || messageText.startsWith('👎') || 
                            messageText.includes('Hữu ích') || messageText.includes('Cần cải thiện') ||
                            messageText.includes('SUGGESTION_') || messageText.includes('RATING_')) {
                            await handleRating(sender_psid, messageText);
                            continue;
                        }
                    }
                    
                    // Xử lý các loại tin nhắn khác
                    if (webhook_event.message) {
                        console.log('📤 Valid message found, processing...');
                        
                        try {
                            await handleMessage(sender_psid, webhook_event, requestKey);
                            console.log('✅ Message processed successfully');
                        } catch (error) {
                            console.error('❌ Error processing message:', error);
                        }
                    } else {
                        console.log('⚠️ Skipping - no valid message found');
                    }
                }
            }
        }
    } else {
        console.log('❌ Not a page object. Received:', body.object);
        res.sendStatus(404);
    }
    
    console.log('🏁 Webhook processing completed\n');
});

// Xử lý đánh giá từ người dùng
async function handleRating(sender_psid, ratingText) {
    try {
        let rating = 'unknown';
        if (ratingText.includes('👍') || ratingText.includes('Hữu ích')) {
            rating = 'helpful';
        } else if (ratingText.includes('👎') || ratingText.includes('Cần cải thiện')) {
            rating = 'not_helpful';
        }
        
        // Lưu đánh giá vào database
        const query = {
            text: 'INSERT INTO feedback (user_id, rating, created_at) VALUES ($1, $2, NOW())',
            values: [sender_psid, rating],
        };
        
        await pool.query(query);
        console.log(`✅ Rating saved for user ${sender_psid}: ${rating}`);
        
        // Gửi phản hồi cảm ơn
        const response = {
            "text": rating === 'helpful' 
                ? "Cảm ơn bạn! Rất vui khi có thể giúp đỡ bạn 😊" 
                : "Cảm ơn phản hồi của bạn! Chúng tôi sẽ cố gắng cải thiện hơn nữa 🙏"
        };
        await callSendAPI(sender_psid, response);
        
    } catch (error) {
        console.error(`❌ Error handling rating for ${sender_psid}:`, error);
    }
}

// Fetches the last 20 messages for a user (tăng để có ngữ cảnh tốt hơn)
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
        return rows.reverse().map(row => ({
            role: row.role,
            parts: [{ text: row.message }]
        }));
    } catch (error) {
        console.error('Error fetching conversation history:', error);
        return [];
    }
}

// Saves a new conversation turn to the database
async function saveConversation(userId, userMessage, botResponse) {
    const query = {
        text: 'INSERT INTO conversations (user_id, message, bot_response) VALUES ($1, $2, $3)',
        values: [userId, userMessage, botResponse],
    };
    try {
        await pool.query(query);
        console.log(`Conversation saved for user ${userId}`);
    } catch (error) {
        console.error('Error saving conversation:', error);
    }
}

// Handles messages events với improved error handling và concurrency control
async function handleMessage(sender_psid, webhook_event, requestKey) {
    if (processingRequests.has(sender_psid)) {
        console.log(`User ${sender_psid} is already being processed, queuing request...`);
        await processingRequests.get(sender_psid);
    }

    let processingPromise;
    
    if (webhook_event.message && webhook_event.message.text) {
        // Tin nhắn văn bản
        processingPromise = processMessage(sender_psid, webhook_event.message, requestKey);
    } else if (webhook_event.message && webhook_event.message.attachments) {
        // Tin nhắn có tệp đính kèm
        processingPromise = processAttachment(sender_psid, webhook_event.message, requestKey);
    } else {
        // Tin nhắn không hợp lệ
        const response = {
            "text": "Xin lỗi, tôi chỉ có thể xử lý tin nhắn văn bản, hình ảnh hoặc âm thanh. Bạn có thể gửi lại nhé! 😊"
        };
        await callSendAPI(sender_psid, response);
        return;
    }

    processingRequests.set(sender_psid, processingPromise);

    try {
        await processingPromise;
    } finally {
        processingRequests.delete(sender_psid);
    }
}

// Xử lý tệp đính kèm (hình ảnh/âm thanh)
async function processAttachment(sender_psid, message, requestKey) {
    console.log('=== PROCESS ATTACHMENT START ===');
    
    try {
        const attachment = message.attachments[0]; // Lấy file đầu tiên
        
        if (attachment.type === 'image') {
            await processImageAttachment(sender_psid, attachment);
        } else if (attachment.type === 'audio') {
            await processAudioAttachment(sender_psid, attachment);
        } else {
            const response = {
                "text": "Hiện tại tôi chỉ hỗ trợ xử lý hình ảnh và âm thanh. Bạn có thể gửi ảnh chụp màn hình lỗi hoặc file âm thanh nhé! 📷🎵"
            };
            await callSendAPI(sender_psid, response);
        }
    } catch (error) {
        console.error(`❌ ERROR in processAttachment for ${sender_psid}:`, error);
        const errorResponse = {
            "text": "Xin lỗi, hiện tại tôi đang gặp sự cố khi xử lý tệp đính kèm. Bạn vui lòng thử lại sau ít phút nhé! 🙏"
        };
        await callSendAPI(sender_psid, errorResponse);
    }
    
    console.log('=== PROCESS ATTACHMENT END ===\n');
}

// Xử lý hình ảnh - HOÀN TOÀN MỚI VÀ ĐÃ TEST
async function processImageAttachment(sender_psid, attachment) {
    try {
        const imageUrl = attachment.payload.url.trim();
        console.log(`📥 Downloading image from: ${imageUrl}`);
        
        // Tải ảnh về buffer
        const fetch = await import('node-fetch');
        const imageResponse = await fetch.default(imageUrl);
        const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
        
        console.log(`🖼️ Image downloaded, size: ${imageBuffer.length} bytes`);
        
        // Gửi trực tiếp ảnh tới Gemini bằng inlineData
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
        
        const result = await model.generateContent([
            {
                inlineData: {
                    data: imageBuffer.toString('base64'),
                    mimeType: attachment.payload.mime_type || 'image/jpeg'
                }
            },
            "Hãy phân tích hình ảnh này. Nếu đây là ảnh chụp màn hình lỗi phần mềm, hãy hướng dẫn người dùng cách khắc phục. Nếu là tài liệu, hãy giải thích nội dung bằng tiếng Việt."
        ]);
        
        const text = result.response.text();
        console.log(`🖼️ Image processed, response length: ${text.length}`);
        
        // Gửi kết quả
        const response = { "text": text };
        await callSendAPI(sender_psid, response);
        
        // Lưu vào lịch sử
        await saveConversation(sender_psid, "[Ảnh đính kèm]", text);
        console.log(`✅ Processed image for ${sender_psid}`);
        
    } catch (error) {
        console.error(`❌ Error processing image for ${sender_psid}:`, error);
        const response = {
            "text": "Xin lỗi, tôi không thể xử lý hình ảnh này. Bạn có thể mô tả lỗi bằng văn bản để tôi hỗ trợ nhé! 📝"
        };
        await callSendAPI(sender_psid, response);
    }
}

// Xử lý âm thanh - TRẢ LỜI TRỰC TIẾP CÂU HỎI TRONG VOICE + HỖ TRỢ QUICK REPLIES
async function processAudioAttachment(sender_psid, attachment) {
    try {
        const audioUrl = attachment.payload.url.trim();
        console.log(`📥 Downloading audio from: ${audioUrl}`);
        
        // Tải audio về buffer
        const fetch = await import('node-fetch');
        const audioResponse = await fetch.default(audioUrl);
        const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
        
        console.log(`🎵 Audio downloaded, size: ${audioBuffer.length} bytes`);
        
        // Gửi trực tiếp audio tới Gemini để nhận transcript
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
        
        // Bước 1: Chuyển speech thành text
        const transcriptionResult = await model.generateContent([
            {
                inlineData: {
                    data: audioBuffer.toString('base64'),
                    mimeType: attachment.payload.mime_type || 'audio/mp4'
                }
            },
            "Hãy chuyển đổi đoạn âm thanh sau thành văn bản tiếng Việt. Chỉ trả về nội dung văn bản, không thêm bất kỳ định dạng nào khác."
        ]);
        
        const transcript = transcriptionResult.response.text().trim();
        console.log(`🎤 Transcribed text: "${transcript}"`);
        
        // Bước 2: Dùng transcript như một câu hỏi thông thường để xử lý
        if (transcript) {
            // Get conversation history
            const history = await getConversationHistory(sender_psid);
            
            if (history.length > 0 && history[0].role === 'model') {
                history.shift();
            }

            console.log('🤖 Sending transcribed message to Gemini for processing...');

            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
            
            // Tạo system instruction với ngữ cảnh cho voice message
            let enhancedSystemPrompt = SYSTEM_PROMPT;
            
            const recentMessages = history.slice(-3).map(msg => msg.parts[0].text).join(' ');
            if (recentMessages.includes('VNeID')) {
                enhancedSystemPrompt += "\n\nCURRENT CONTEXT: User is currently working with VNeID service.";
            } else if (recentMessages.includes('ETAX') || recentMessages.includes('thuế')) {
                enhancedSystemPrompt += "\n\nCURRENT CONTEXT: User is currently working with ETAX service.";
            } else if (recentMessages.includes('VssID') || recentMessages.includes('bảo hiểm')) {
                enhancedSystemPrompt += "\n\nCURRENT CONTEXT: User is currently working with VssID service.";
            }
            
            const chat = model.startChat({
                history: history,
                generationConfig: {
                    maxOutputTokens: 5000,
                    temperature: 0.7,
                },
                systemInstruction: { parts: [{ text: enhancedSystemPrompt }] },
            });

            // Gửi transcript như một câu hỏi bình thường
            const result = await Promise.race([
                chat.sendMessage(transcript),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Gemini API timeout')), 30000)
                )
            ]);
            
            let text = result.response.text();
            
            // Tách phần gợi ý (nếu có)
            let quickReplies = [];
            const suggestionMatch = text.match(/GỢI Ý:(.*)/s);
            if (suggestionMatch) {
                const suggestions = suggestionMatch[1].split('\n')
                    .filter(line => line.trim())
                    .map(line => line.replace(/^[•\-]\s*/, '').trim())
                    .slice(0, 3);
                quickReplies = suggestions;
                text = text.replace(/GỢI Ý:(.*)/s, '').trim();
            }

            // Gửi phản hồi với quick replies và nút đánh giá
            const response = { "text": text };
            await callSendAPIWithRating(sender_psid, response, quickReplies);

            // Lưu vào lịch sử (lưu cả transcript và response)
            await saveConversation(sender_psid, transcript, text);
            console.log(`✅ Processed audio question for ${sender_psid}: "${transcript}"`);
        } else {
            throw new Error('Không thể chuyển đổi âm thanh thành văn bản');
        }
        
    } catch (error) {
        console.error(`❌ Error processing audio for ${sender_psid}:`, error);
        const response = {
            "text": "Xin lỗi, tôi không thể hiểu được nội dung voice message của bạn. Bạn có thể thử lại hoặc gửi câu hỏi bằng văn bản nhé! 🎵"
        };
        await callSendAPI(sender_psid, response);
    }
}

// Helper function để chia nhỏ message dài
function splitMessage(text, maxLength) {
    const chunks = [];
    let currentChunk = '';
    
    const lines = text.split('\n');
    
    for (const line of lines) {
        if ((currentChunk + line + '\n').length <= maxLength) {
            currentChunk += line + '\n';
        } else {
            if (currentChunk) {
                chunks.push(currentChunk.trim());
                currentChunk = '';
            }
            
            if (line.length <= maxLength) {
                currentChunk = line + '\n';
            } else {
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
                    currentChunk = tempLine + '\n';
                }
            }
        }
    }
    
    if (currentChunk) {
        chunks.push(currentChunk.trim());
    }
    
    return chunks;
}

// ==== TEST ENDPOINTS ====

// Test endpoints for debugging
app.get('/test', (req, res) => {
    console.log('🧪 Test endpoint called at:', new Date().toISOString());
    res.json({ 
        status: 'Server is working!', 
        timestamp: new Date().toISOString(),
        url: req.originalUrl,
        env: {
            port: process.env.PORT || 3000,
            nodeEnv: process.env.NODE_ENV || 'development',
            hasVerifyToken: !!process.env.VERIFY_TOKEN,
            hasPageToken: !!process.env.PAGE_ACCESS_TOKEN,
            hasGeminiKey: !!process.env.GEMINI_API_KEY,
            hasDbConfig: !!process.env.DB_HOST
        }
    });
});

// Test webhook manually
app.post('/test-webhook', (req, res) => {
    console.log('🧪 Manual webhook test called');
    console.log('Headers:', req.headers);
    console.log('Body:', JSON.stringify(req.body, null, 2));
    res.json({ received: true, body: req.body, timestamp: new Date().toISOString() });
});

// Test message processing
app.post('/test-message', async (req, res) => {
    const { psid, message } = req.body;
    
    console.log('🧪 Manual test message triggered');
    console.log('PSID:', psid);
    console.log('Message:', message);
    
    if (!psid || !message) {
        return res.status(400).json({ error: 'Missing psid or message' });
    }
    
    try {
        const fakeMessage = { text: message };
        await handleMessage(psid, { message: fakeMessage }, `test_${Date.now()}`);
        res.json({ 
            success: true, 
            message: 'Test message processed', 
            timestamp: new Date().toISOString() 
        });
    } catch (error) {
        console.error('❌ Test message error:', error);
        res.status(500).json({ error: error.message, timestamp: new Date().toISOString() });
    }
});

// Endpoint để test gửi message trực tiếp
app.post('/send-test-message', async (req, res) => {
    const { psid, message } = req.body;
    
    if (!psid || !message) {
        return res.status(400).json({ error: 'Missing psid or message' });
    }
    
    try {
        const response = { "text": message };
        const result = await callSendAPI(psid, response);
        res.json({ 
            success: result, 
            message: result ? 'Message sent!' : 'Message failed',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Test send error:', error);
        res.status(500).json({ error: error.message, timestamp: new Date().toISOString() });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        activeRequests: processingRequests.size,
        uptime: process.uptime(),
        memory: process.memoryUsage()
    });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully...');
    
    // Đợi tất cả requests hiện tại hoàn thành
    if (processingRequests.size > 0) {
        console.log(`Waiting for ${processingRequests.size} active requests to complete...`);
        await Promise.allSettled([...processingRequests.values()]);
    }
    
    // Đóng database pool
    await pool.end();
    console.log('Database pool closed');
    
    process.exit(0);
});

// Start server
async function startServer() {
    try {
        app.listen(port, () => {
            console.log(`🚀 Chatbot server is running on port ${port}`);
            console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`🔑 PAGE_ACCESS_TOKEN loaded: ${process.env.PAGE_ACCESS_TOKEN ? 'YES' : 'NO'}`);
            if (process.env.PAGE_ACCESS_TOKEN) {
                console.log(`PAGE_ACCESS_TOKEN starts with: ${process.env.PAGE_ACCESS_TOKEN.substring(0, 5)}...`);
            }
            console.log('🔧 Available endpoints:');
            console.log('   ✅ GET  /webhook - Facebook verification');
            console.log('   🤖 POST /webhook - Pure Gemini AI processing');
            console.log('   🧪 GET  /test - Server status');
            console.log('   📨 POST /test-webhook - Manual webhook test');
            console.log('   💬 POST /test-message - Test message processing');
            console.log('   📤 POST /send-test-message - Test Facebook send');
            console.log('   ❤️  GET  /health - Health check');
            console.log('🎯 Pure Gemini chatbot ready!');
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

// Start the server
startServer();
