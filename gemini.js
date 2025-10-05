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
6. BẮT BUỘC TUYỆT ĐỐI: Bạn PHẢI TRẢ LỜI bằng NGÔN NGỮ mà người dùng dùng để hỏi. Nếu người dùng hỏi bằng tiếng Việt, bạn phải trả lời bằng tiếng Việt. Nếu người dùng hỏi bằng tiếng Anh, bạn phải trả lời bằng tiếng Anh. Nếu người dùng hỏi bằng ngôn ngữ khác (Trung, Hàn, Nhật, Pháp, v.v.), bạn PHẢI trả lời bằng chính ngôn ngữ đó. KHÔNG ĐƯỢC tự ý đổi ngôn ngữ. NGÔN NGỮ TRẢ LỜI PHẢI GIỐNG NGÔN NGỮ NGƯỜI DÙNG DÙNG.
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
**QUAN TRỌNG** - **BẮT BUỘC** - **TUYỆT ĐỐI**: Mỗi câu hỏi gợi ý PHẢI DƯỚI 20 KÝ TỰ để hiển thị trên Facebook Messenger.
**QUAN TRỌNG** - **BẮT BUỘC** - **TUYỆT ĐỐI**: Định dạng như sau:
GỢI Ý:
• Scan giấy tờ?
• Mẫu CT01 ở đâu?
• Không có chỗ ở?
HOẶC
VÍ DỤ:
• Tích hợp thẻ BHYT nhưng không thành công?
• Tích hợp bằng lái xe nhưng bị lỗi?
• Tích hợp thông tin cá nhân nhưng không hiển thị?
Lưu ý: Nếu không có tiêu đề rõ ràng (GỢI Ý:, SUGGESTIONS:, VÍ DỤ:), vui lòng không tạo quick replies.
## 9. MỘT SỐ VẤN ĐỀ CẦN PHẢI LƯU Ý KHI THỰC HIỆN.
LƯU Ý. CẤM TUYỆT ĐỐI KHÔNG ĐƯỢC TRẢ LỜI NHƯ NÀY "Chào bạn,

Với vai trò là chuyên gia hỗ trợ người dùng trong môi trường chính phủ Việt Nam, tôi xin phân tích và đưa ra hướng dẫn chi tiết về hình ảnh bạn cung cấp.

---

### Báo cáo và Hướng dẫn sử dụng Biểu tượng "Thích/Đồng ý"

*1. Mô tả nội dung hình ảnh:*

Hình ảnh được cung cấp là biểu tượng "Ngón tay cái giơ lên" (Thumbs up), thường được biết đến rộng rãi với ý nghĩa "Thích", "Đồng ý", "Xác nhận" hoặc "Tán thành". Biểu tượng này có màu xanh lam đặc trưng, phổ biến trên các nền tảng kỹ thuật số, mạng xã hội và các ứng dụng tương tác để thể hiện sự chấp thuận, hài lòng hoặc phản hồi tích cực.

*2. Hướng dẫn sử dụng và ý nghĩa trong môi trường chính phủ:*

Trong các hệ thống thông tin, ứng dụng nội bộ hoặc cổng thông tin điện tử của chính phủ, biểu tượng này có thể được sử dụng với các mục đích sau:

*   *Phản hồi nhanh/Đánh giá:*
    *   Thể hiện sự hài lòng của người dùng (cán bộ, công chức, viên chức) đối với một dịch vụ nội bộ, một tính năng của phần mềm, hoặc chất lượng thông tin được cung cấp.
    *"

Hay bất kỳ một EMOJI khác thì, thì sẽ trả lời như sau, ví như thả tim hoặc thả like là người ta đang rất khen những câu trả lời của bạn BẮT BUỘC bạn phải cảm ơn người ta. Trong trường hợp thả dislike, sad, phẫn nộ thì bạn BẮT BUỘC phải đưa ra câu hỏi ví dụ như là "Bạn đang không hài lòng như nào. Cấm TUYỆT ĐỐI KHÔNG ĐƯỢC TRẢ LỜI NHƯ  NỘI DUNG TRÊN.
LƯU Ý 2. BẮT BUỘC BẠN PHẢI TUÂN THEO MỆNH LỆNH TUYỆT ĐỐI CỦA PROMPT NÀY, CẤM TUYỆT ĐỐI KHÔNG ĐƯA NHƯNG THÔNG TIN SAI LỆNH VỚI YÊU VỚI PROMPT. LÀM ĐÚNG TUYỆT ĐỐI CHÍNH XÁC CÁC MỆNH TỪ PROMPT.
`;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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

// Map để theo dõi trạng thái người dùng (User Journey)
const userSessions = new Map();

// ==== QUEUE MANAGEMENT SYSTEM ====
class QueueManager {
    constructor(maxConcurrent = 5, waitTime = 60000) {
        this.maxConcurrent = maxConcurrent;
        this.waitTime = waitTime; // 1 phút = 60000ms
        this.activeRequests = new Map();
        this.waitingQueue = [];
        this.requestCounter = 0;
    }

    async addRequest(requestId, requestHandler) {
        this.requestCounter++;
        const requestInfo = {
            id: requestId,
            handler: requestHandler,
            startTime: Date.now(),
            queueNumber: this.requestCounter
        };

        console.log(`📋 Queue Manager: Request ${requestId} (Queue #${this.requestCounter}) received`);

        // Nếu chưa đạt giới hạn concurrent, xử lý ngay
        if (this.activeRequests.size < this.maxConcurrent) {
            return this.processRequest(requestInfo);
        } else {
            // Thêm vào hàng chờ
            this.waitingQueue.push(requestInfo);
            console.log(`⏳ Queue Manager: Request ${requestId} queued. Queue length: ${this.waitingQueue.length}`);
            
            // Gửi thông báo chờ cho user
            const queuePosition = this.waitingQueue.length;
            const estimatedWaitTime = Math.ceil(queuePosition * this.waitTime / 1000 / 60); // phút
            
            try {
                const waitMessage = {
                    "text": `⏳ Hiện tại hệ thống đang bận xử lý ${this.maxConcurrent} yêu cầu. Bạn đang ở vị trí ${queuePosition} trong hàng chờ. Thời gian chờ ước tính: ${estimatedWaitTime} phút. Vui lòng chờ trong giây lát... 🙏`
                };
                await callSendAPI(requestId, waitMessage);
            } catch (error) {
                console.error(`❌ Failed to send wait message to ${requestId}:`, error);
            }

            return new Promise((resolve, reject) => {
                requestInfo.resolve = resolve;
                requestInfo.reject = reject;
            });
        }
    }

    async processRequest(requestInfo) {
        const { id, handler, startTime, queueNumber } = requestInfo;
        
        console.log(`🚀 Queue Manager: Processing request ${id} (Queue #${queueNumber})`);
        this.activeRequests.set(id, requestInfo);

        try {
            const result = await handler();
            const processingTime = Date.now() - startTime;
            console.log(`✅ Queue Manager: Request ${id} completed in ${processingTime}ms`);
            return result;
        } catch (error) {
            console.error(`❌ Queue Manager: Request ${id} failed:`, error);
            throw error;
        } finally {
            this.activeRequests.delete(id);
            console.log(`📊 Queue Manager: Active requests: ${this.activeRequests.size}/${this.maxConcurrent}`);
            
            // Xử lý request tiếp theo trong hàng chờ
            this.processNextInQueue();
        }
    }

    processNextInQueue() {
        if (this.waitingQueue.length > 0) {
            const nextRequest = this.waitingQueue.shift();
            console.log(`⏭️ Queue Manager: Processing next queued request ${nextRequest.id}`);
            
            // Chờ 1 phút trước khi xử lý request tiếp theo
            setTimeout(() => {
                this.processRequest(nextRequest).then(nextRequest.resolve).catch(nextRequest.reject);
            }, this.waitTime);
        }
    }

    getQueueStatus() {
        return {
            activeRequests: this.activeRequests.size,
            maxConcurrent: this.maxConcurrent,
            waitingQueue: this.waitingQueue.length,
            totalProcessed: this.requestCounter,
            activeRequestIds: Array.from(this.activeRequests.keys()),
            waitingRequestIds: this.waitingQueue.map(req => req.id)
        };
    }

    // Thống kê thời gian chờ trung bình
    getAverageWaitTime() {
        if (this.waitingQueue.length === 0) return 0;
        return this.waitingQueue.length * this.waitTime;
    }
}

// Khởi tạo Queue Manager
const queueManager = new QueueManager(5, 60000); // 5 concurrent, 1 phút chờ

// Biến để theo dõi quota (sử dụng trong ngày)
let dailyQuotaUsed = 0;
const DAILY_QUOTA_LIMIT = 45; // Để lại 5 request dư cho an toàn
let quotaResetTimeout = null;

// Reset quota vào 00:00 UTC mỗi ngày
function resetDailyQuota() {
    const now = new Date();
    const nextMidnight = new Date(now);
    nextMidnight.setUTCHours(24, 0, 0, 0); // 00:00 UTC
    const timeUntilMidnight = nextMidnight - now;

    quotaResetTimeout = setTimeout(() => {
        dailyQuotaUsed = 0;
        console.log("✅ Daily quota reset to 0.");
        resetDailyQuota(); // Lặp lại vào ngày mai
    }, timeUntilMidnight);
}

resetDailyQuota();

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
                .map(line => {
                    return line.replace(/^[•\-]\s*/, '').trim();
                })
                .filter(line => line.length > 0)
                .slice(0, 3);
            const cleanedText = text.replace(pattern, '').trim();
            return {
                suggestions: suggestions,
                cleanedText: cleanedText
            };
        }
    }
    return {
        suggestions: [],
        cleanedText: text
    };
}

// ==== MESSAGE PROCESSING ====
async function processMessage(sender_psid, received_message, requestKey) {
    console.log('=== PROCESS MESSAGE START ===');
    console.log('Sender PSID:', sender_psid);
    console.log('Message text:', received_message.text);

    try {
        if (received_message.text && received_message.text.trim()) {
            const userMessage = received_message.text.trim();
            console.log(`🤖 Processing user message: "${userMessage}"`);

            // Kiểm tra xem người dùng có đang trong hành trình hướng dẫn nào không
            let userSession = userSessions.get(sender_psid);
            if (userSession && userSession.currentJourney) {
                // Nếu đang trong hành trình và người dùng phản hồi YES/NO
                if (userMessage.toLowerCase().includes('có') || userMessage.toLowerCase().includes('đồng ý') || userMessage.toLowerCase().includes('ok')) {
                    // Người dùng đồng ý được hướng dẫn từng bước
                    userSession.journeyStep = 0;
                    userSession.journeyActive = true;
                    const response = {
                        "text": `Tuyệt vời! 🎉 Bây giờ mình sẽ hướng dẫn bạn từng bước một. Bắt đầu nào!`
                    };
                    await callSendAPI(sender_psid, response);
                    // Gửi bước đầu tiên
                    await sendNextStep(sender_psid);
                    return;
                } else if (userMessage.toLowerCase().includes('không') || userMessage.toLowerCase().includes('thôi')) {
                    // Người dùng không muốn hướng dẫn từng bước
                    userSession.currentJourney = null;
                    userSession.journeyStep = null;
                    userSession.journeyActive = false;
                    const response = {
                        "text": `Hiểu rồi! 😊 Nếu bạn cần hướng dẫn chi tiết sau này, cứ hỏi mình nhé.`
                    };
                    await callSendAPI(sender_psid, response);
                    // Trả lời như bình thường
                    await processNormalMessage(sender_psid, userMessage);
                    return;
                } else if (userSession.journeyActive) {
                    // Người dùng đang trong hành trình, hỏi tiếp
                    await processNormalMessage(sender_psid, userMessage);
                    return;
                }
            }

            // Nếu không trong hành trình, xử lý như bình thường
            await processNormalMessage(sender_psid, userMessage);

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

// Hàm xử lý tin nhắn bình thường (cải tiến để hỗ trợ User Journey)
async function processNormalMessage(sender_psid, userMessage) {
    const history = await getConversationHistory(sender_psid);
    if (history.length > 0 && history[0].role === 'model') {
        history.shift();
    }
    console.log('🤖 Sending message to Gemini...');
    
    // Kiểm tra quota
    if (dailyQuotaUsed >= DAILY_QUOTA_LIMIT) {
        const response = {
            "text": "Xin lỗi, hôm nay mình đã đạt giới hạn sử dụng API. Vui lòng quay lại vào ngày mai nhé! 🙏"
        };
        await callSendAPI(sender_psid, response);
        return;
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    
    let enhancedSystemPrompt = SYSTEM_PROMPT;
    const recentMessages = history.slice(-5).map(msg => msg.parts[0].text).join(' ');
    if (userMessage.toLowerCase().includes('quên mật khẩu') || 
        userMessage.toLowerCase().includes('lỗi đăng nhập') ||
        userMessage.toLowerCase().includes('không truy cập') ||
        userMessage.toLowerCase().includes('bị khóa') ||
        userMessage.toLowerCase().includes('không nhớ')) {
        if (recentMessages.includes('VNeID')) {
            enhancedSystemPrompt += "\nCURRENT CONTEXT: User is currently working with VNeID service.";
        } else if (recentMessages.includes('ETAX') || recentMessages.includes('thuế')) {
            enhancedSystemPrompt += "\nCURRENT CONTEXT: User is currently working with ETAX service.";
        } else if (recentMessages.includes('VssID') || recentMessages.includes('bảo hiểm')) {
            enhancedSystemPrompt += "\nCURRENT CONTEXT: User is currently working with VssID service.";
        } else if (recentMessages.includes('Cổng Dịch vụ') || recentMessages.includes('dịch vụ công')) {
            enhancedSystemPrompt += "\nCURRENT CONTEXT: User is currently working with National Public Service Portal.";
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

    const result = await Promise.race([
        chat.sendMessage(userMessage),
        new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Gemini API timeout')), 30000)
        )
    ]);

    let text = result.response.text();
    if (!text || text.trim() === '') {
        text = "Xin lỗi, hiện mình chưa thể xử lý câu hỏi này. Bạn vui lòng thử lại sau nhé! 🙏";
    }

    // Phân tích xem tin nhắn có phải là hướng dẫn không
    if (text.includes('STEP')) {
        // Đây là hướng dẫn có các bước
        const userSession = userSessions.get(sender_psid) || {};
        userSession.currentJourney = {
            title: userMessage,
            fullGuide: text
        };
        userSessions.set(sender_psid, userSession);

        // Gửi hướng dẫn + hỏi người dùng có muốn từng bước không
        const introText = `Xin chào! 👋\n\n${text}\n\nBạn có muốn mình hướng dẫn từng bước một không?`;
        const response = { "text": introText };
        await callSendAPI(sender_psid, response);
        const yesNoResponse = {
            "text": "Vui lòng trả lời 'Có' nếu bạn muốn được hướng dẫn từng bước, hoặc 'Không' nếu bạn chỉ muốn xem hướng dẫn tổng quát."
        };
        await callSendAPI(sender_psid, yesNoResponse);
    } else {
        // Không phải hướng dẫn, gửi như cũ
        if (text.length > 2000) {
            const chunks = splitMessage(text, 2000);
            for (let i = 0; i < chunks.length; i++) {
                const isLastChunk = (i === chunks.length - 1);
                const response = { "text": chunks[i] };
                if (isLastChunk) {
                    // Gửi chunk cuối cùng với quick replies
                    const extractionResult = extractSuggestions(text); // Gửi toàn bộ text để trích xuất
                    const quickReplies = extractionResult.suggestions;
                    await callSendAPIWithRating(sender_psid, response, quickReplies);
                } else {
                    await callSendAPI(sender_psid, response);
                }
                if (i < chunks.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }
        } else {
            const extractionResult = extractSuggestions(text);
            const quickReplies = extractionResult.suggestions;
            const response = { "text": extractionResult.cleanedText };
            await callSendAPIWithRating(sender_psid, response, quickReplies);
        }
    }

    await saveConversation(sender_psid, userMessage, text);
    dailyQuotaUsed++;
    console.log(`✅ Successfully processed message for ${sender_psid}. Daily quota used: ${dailyQuotaUsed}/${DAILY_QUOTA_LIMIT}`);
}

// Gửi bước tiếp theo trong hành trình
async function sendNextStep(sender_psid) {
    const userSession = userSessions.get(sender_psid);
    if (!userSession || !userSession.currentJourney) return;

    // Tách các bước trong hướng dẫn
    const guide = userSession.currentJourney.fullGuide;
    const steps = guide.split('STEP ').filter(step => step.trim());

    if (userSession.journeyStep < steps.length) {
        const currentStep = steps[userSession.journeyStep];
        const stepText = `STEP ${userSession.journeyStep + 1}: ${currentStep}`;
        const response = { "text": stepText };
        await callSendAPI(sender_psid, response);

        // Cập nhật bước
        userSession.journeyStep++;
        userSessions.set(sender_psid, userSession);

        // Gửi tin nhắn hỏi người dùng đã xong bước chưa
        if (userSession.journeyStep < steps.length) {
            const nextStepMsg = {
                "text": "Bạn đã hoàn thành bước này chưa? Nếu xong rồi, mình sẽ chuyển sang bước tiếp theo."
            };
            await callSendAPI(sender_psid, nextStepMsg);
        } else {
            const endMsg = {
                "text": "🎉 Chúc mừng! Bạn đã hoàn thành toàn bộ hướng dẫn. Nếu cần hỗ trợ thêm, cứ hỏi mình nhé! 😊"
            };
            await callSendAPI(sender_psid, endMsg);
            // Kết thúc hành trình
            userSession.currentJourney = null;
            userSession.journeyActive = false;
        }
    }
}

// Webhook verification for Facebook Messenger
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
            console.log('Verification failed: Token mismatch or mode not subscribe.');
            res.sendStatus(403);
        }
    } else {
        console.log('Verification failed: Missing mode or token in query.');
        res.sendStatus(403);
    }
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

// Gửi tin nhắn với nút đánh giá và quick replies (đã cải tiến theo hành trình)
async function callSendAPIWithRating(sender_psid, response, quickReplies = null) {
    const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
    let quickRepliesArray = [];

    // Kiểm tra nếu người dùng đang trong hành trình
    const userSession = userSessions.get(sender_psid);
    if (userSession && userSession.currentJourney && userSession.journeyActive) {
        // Nếu đang trong hành trình, tạo quick replies theo hành trình
        const journeySteps = userSession.currentJourney.fullGuide.split('STEP ').filter(step => step.trim()).length;
        quickRepliesArray = [
            {
                "content_type": "text",
                "title": `Bước ${userSession.journeyStep}`,
                "payload": `JOURNEY_STEP_${userSession.journeyStep}`
            },
            {
                "content_type": "text",
                "title": "Tôi bị lỗi ở bước này",
                "payload": `JOURNEY_ERROR_${userSession.journeyStep}`
            },
            {
                "content_type": "text",
                "title": "Tôi cần quay lại",
                "payload": "JOURNEY_BACK"
            }
        ];
    } else {
        // Nếu không trong hành trình, dùng gợi ý từ Gemini như cũ
        if (quickReplies && quickReplies.length > 0) {
            quickRepliesArray = quickReplies.map((text, index) => {
                let displayText = text;
                if (displayText.length > 20) {
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
                    "payload": `SUGGESTION_${index}_${encodeURIComponent(text)}`
                };
            });
        }
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

    if (body.object === 'page') {
        res.status(200).send('EVENT_RECEIVED');

        for (let i = 0; i < body.entry.length; i++) {
            const entry = body.entry[i];

            if (entry.messaging && entry.messaging.length > 0) {
                for (let j = 0; j < entry.messaging.length; j++) {
                    const webhook_event = entry.messaging[j];
                    let sender_psid = webhook_event.sender.id;
                    const requestKey = `${sender_psid}_${Date.now()}`;

                    if (webhook_event.message && webhook_event.message.text) {
                        const messageText = webhook_event.message.text.trim();
                        if (messageText.startsWith('👍') || messageText.startsWith('👎') || 
                            messageText.includes('Hữu ích') || messageText.includes('Cần cải thiện') ||
                            messageText.startsWith('SUGGESTION_') || messageText.startsWith('RATING_') ||
                            messageText.startsWith('JOURNEY_')) { // Thêm hỗ trợ cho hành trình
                            await handleRating(sender_psid, messageText);
                            continue;
                        }
                    }

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

// Xử lý đánh giá từ người dùng (đã cập nhật hỗ trợ hành trình)
async function handleRating(sender_psid, ratingText) {
    try {
        // Kiểm tra nếu là suggestion
        if (ratingText.startsWith('SUGGESTION_')) {
            const parts = ratingText.split('_');
            if (parts.length >= 3) {
                const encodedText = parts.slice(2).join('_');
                const originalText = decodeURIComponent(encodedText);
                console.log(`🎯 User selected suggestion: "${originalText}"`);
                const response = { "text": originalText };
                await callSendAPI(sender_psid, response);
                return;
            }
        }

        // Kiểm tra nếu là hành trình
        if (ratingText.startsWith('JOURNEY_')) {
            const userSession = userSessions.get(sender_psid);
            if (!userSession || !userSession.currentJourney || !userSession.journeyActive) {
                const response = { "text": "Bạn hiện không đang trong hành trình hướng dẫn nào." };
                await callSendAPI(sender_psid, response);
                return;
            }

            if (ratingText.includes('STEP_')) {
                const step = ratingText.split('_')[1];
                const response = { "text": `Bạn đang ở bước ${step} trong hành trình. Nếu cần hỗ trợ, cứ hỏi mình nhé!` };
                await callSendAPI(sender_psid, response);
            } else if (ratingText.includes('ERROR_')) {
                const step = ratingText.split('_')[1];
                const response = { "text": `Bạn gặp lỗi ở bước ${step}? Mình sẽ hỗ trợ bạn ngay. Vui lòng mô tả lỗi bạn gặp phải.` };
                await callSendAPI(sender_psid, response);
            } else if (ratingText.includes('BACK')) {
                userSession.journeyStep = Math.max(0, userSession.journeyStep - 1);
                const response = { "text": "Bạn đã quay lại bước trước. Mình sẽ tiếp tục hướng dẫn từ bước đó." };
                await callSendAPI(sender_psid, response);
                await sendNextStep(sender_psid);
            }
            return;
        }

        // Xử lý rating thông thường
        let rating = 'unknown';
        if (ratingText.includes('👍') || ratingText.includes('Hữu ích')) {
            rating = 'helpful';
        } else if (ratingText.includes('👎') || ratingText.includes('Cần cải thiện')) {
            rating = 'not_helpful';
        }

        const query = {
            text: 'INSERT INTO feedback (user_id, rating, created_at) VALUES ($1, $2, NOW())',
            values: [sender_psid, rating],
        };
        await pool.query(query);
        console.log(`✅ Rating saved for user ${sender_psid}: ${rating}`);

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

// Fetches the last 20 messages for a user
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
    // Kiểm tra nếu user đang có request đang xử lý
    if (processingRequests.has(sender_psid)) {
        console.log(`User ${sender_psid} is already being processed, queuing request...`);
        await processingRequests.get(sender_psid);
    }

    // Tạo handler function cho queue manager
    const messageHandler = async () => {
        let processingPromise;
        if (webhook_event.message && webhook_event.message.text) {
            processingPromise = processMessage(sender_psid, webhook_event.message, requestKey);
        } else if (webhook_event.message && webhook_event.message.attachments) {
            processingPromise = processAttachment(sender_psid, webhook_event.message, requestKey);
        } else {
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
    };

    // Sử dụng Queue Manager để xử lý request
    try {
        await queueManager.addRequest(sender_psid, messageHandler);
    } catch (error) {
        console.error(`❌ Queue Manager error for ${sender_psid}:`, error);
        const errorResponse = {
            "text": "Xin lỗi, hiện tại hệ thống đang gặp sự cố. Vui lòng thử lại sau ít phút nhé! 🙏"
        };
        await callSendAPI(sender_psid, errorResponse);
    }
}

// Xử lý tệp đính kèm (hình ảnh/âm thanh)
async function processAttachment(sender_psid, message, requestKey) {
    console.log('=== PROCESS ATTACHMENT START ===');
    try {
        const attachment = message.attachments[0];
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

// Xử lý hình ảnh
async function processImageAttachment(sender_psid, attachment) {
    try {
        // Kiểm tra quota
        if (dailyQuotaUsed >= DAILY_QUOTA_LIMIT) {
            const response = {
                "text": "Xin lỗi, hôm nay mình đã đạt giới hạn sử dụng API. Vui lòng quay lại vào ngày mai nhé! 🙏"
            };
            await callSendAPI(sender_psid, response);
            return;
        }

        const imageUrl = attachment.payload.url.trim();
        console.log(`📥 Downloading image from: ${imageUrl}`);
        const fetch = await import('node-fetch');
        const imageResponse = await fetch.default(imageUrl);
        const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
        console.log(`🖼️ Image downloaded, size: ${imageBuffer.length} bytes`);

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-05-20" });
        const result = await model.generateContent([
            {
                inlineData: {
                    data: imageBuffer.toString('base64'),
                    mimeType: attachment.payload.mime_type || 'image/jpeg'
                }
            },
            "Bạn là chuyên gia hỗ trợ người dùng chính phủ Việt Nam. Hãy mô tả nội dung hình ảnh và đưa ra hướng dẫn phù hợp. Nếu có lỗi, hãy chỉ rõ lỗi và cách khắc phục."
        ]);

        let text = result.response.text();
        if (!text || text.trim() === '') {
            text = "Xin lỗi, tôi không thể xử lý hình ảnh này. Bạn có thể mô tả lỗi bằng văn bản để tôi hỗ trợ nhé! 📝";
        }

        const extractionResult = extractSuggestions(text);
        const quickReplies = extractionResult.suggestions;
        const cleanedText = extractionResult.cleanedText;

        const response = { "text": cleanedText };
        await callSendAPIWithRating(sender_psid, response, quickReplies);
        await saveConversation(sender_psid, "[Ảnh đính kèm]", cleanedText);
        dailyQuotaUsed++;
        console.log(`✅ Processed image for ${sender_psid}. Daily quota used: ${dailyQuotaUsed}/${DAILY_QUOTA_LIMIT}`);
    } catch (error) {
        console.error(`❌ Error processing image for ${sender_psid}:`, error);
        const response = {
            "text": "Xin lỗi, tôi không thể xử lý hình ảnh này. Bạn có thể mô tả lỗi bằng văn bản để tôi hỗ trợ nhé! 📝"
        };
        await callSendAPI(sender_psid, response);
    }
}

// Xử lý âm thanh
async function processAudioAttachment(sender_psid, attachment) {
    try {
        // Kiểm tra quota
        if (dailyQuotaUsed >= DAILY_QUOTA_LIMIT) {
            const response = {
                "text": "Xin lỗi, hôm nay mình đã đạt giới hạn sử dụng API. Vui lòng quay lại vào ngày mai nhé! 🙏"
            };
            await callSendAPI(sender_psid, response);
            return;
        }

        const audioUrl = attachment.payload.url.trim();
        console.log(`📥 Downloading audio from: ${audioUrl}`);
        const fetch = await import('node-fetch');
        const audioResponse = await fetch.default(audioUrl);
        const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
        console.log(`🎵 Audio downloaded, size: ${audioBuffer.length} bytes`);

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-05-20" });
        const transcriptionResult = await model.generateContent([
            {
                inlineData: {
                    data: audioBuffer.toString('base64'),
                    mimeType: attachment.payload.mime_type || 'audio/mp4'
                }
            },
            "Hãy chuyển đổi đoạn âm thanh sau thành văn bản. Chỉ trả về nội dung văn bản, không thêm bất kỳ định dạng nào khác."
        ]);
        const transcript = transcriptionResult.response.text().trim();
        console.log(`🎤 Transcribed text: "${transcript}"`);

        if (transcript) {
            const history = await getConversationHistory(sender_psid);
            if (history.length > 0 && history[0].role === 'model') {
                history.shift();
            }

            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-05-20" });
            let enhancedSystemPrompt = SYSTEM_PROMPT;

            const recentMessages = history.slice(-3).map(msg => msg.parts[0].text).join(' ');
            if (recentMessages.includes('VNeID')) {
                enhancedSystemPrompt += "\nCURRENT CONTEXT: User is currently working with VNeID service.";
            } else if (recentMessages.includes('ETAX') || recentMessages.includes('thuế')) {
                enhancedSystemPrompt += "\nCURRENT CONTEXT: User is currently working with ETAX service.";
            } else if (recentMessages.includes('VssID') || recentMessages.includes('bảo hiểm')) {
                enhancedSystemPrompt += "\nCURRENT CONTEXT: User is currently working with VssID service.";
            }

            const chat = model.startChat({
                history: history,
                generationConfig: {
                    maxOutputTokens: 5000,
                    temperature: 0.7,
                },
                systemInstruction: { parts: [{ text: enhancedSystemPrompt }] },
            });

            // ✅ ĐÃ SỬA: Gửi `transcript` thay vì `userMessage`
            const result = await Promise.race([
                chat.sendMessage(transcript),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Gemini API timeout')), 30000)
                )
            ]);
            let text = result.response.text();
            if (!text || text.trim() === '') {
                text = "Xin lỗi, hiện mình chưa thể xử lý câu hỏi này. Bạn vui lòng thử lại sau nhé! 🙏";
            }

            const extractionResult = extractSuggestions(text);
            const quickReplies = extractionResult.suggestions;
            text = extractionResult.cleanedText;

            const response = { "text": text };
            await callSendAPIWithRating(sender_psid, response, quickReplies);
            await saveConversation(sender_psid, transcript, text);
            dailyQuotaUsed++;
            console.log(`✅ Processed audio question for ${sender_psid}: "${transcript}". Daily quota used: ${dailyQuotaUsed}/${DAILY_QUOTA_LIMIT}`);
        } else {
            throw new Error('Không thể chuyển đổi âm thanh thành văn bản');
        }
    } catch (error) {
        console.error(`❌ Error processing audio for ${sender_psid}:`, error);

        // Kiểm tra lỗi 429
        if (error.status === 429) {
            const response = {
                "text": "Xin lỗi, hiện tại hệ thống đang được bảo trì. Vui lòng quay lại vào ngày mai nhé! 🙏"
            };
            await callSendAPI(sender_psid, response);
            return;
        }

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
app.get('/test', (req, res) => {
    res.json({ 
        status: 'Server is working!', 
        timestamp: new Date().toISOString(),
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

app.post('/test-webhook', (req, res) => {
    res.json({ received: true, body: req.body, timestamp: new Date().toISOString() });
});

app.post('/test-message', async (req, res) => {
    const { psid, message } = req.body;
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

app.get('/health', (req, res) => {
    const queueStatus = queueManager.getQueueStatus();
    res.status(200).json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        activeRequests: processingRequests.size,
        userSessions: userSessions.size,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        dailyQuotaUsed,
        dailyQuotaLimit: DAILY_QUOTA_LIMIT,
        queueManager: {
            ...queueStatus,
            averageWaitTime: queueManager.getAverageWaitTime(),
            queueHealth: queueStatus.waitingQueue < 10 ? 'HEALTHY' : 'BUSY'
        }
    });
});

// Endpoint để xem trạng thái queue chi tiết
app.get('/queue-status', (req, res) => {
    const queueStatus = queueManager.getQueueStatus();
    res.status(200).json({
        timestamp: new Date().toISOString(),
        queue: queueStatus,
        statistics: {
            averageWaitTime: queueManager.getAverageWaitTime(),
            queueUtilization: (queueStatus.activeRequests / queueStatus.maxConcurrent * 100).toFixed(2) + '%',
            totalProcessed: queueStatus.totalProcessed,
            currentLoad: queueStatus.activeRequests + queueStatus.waitingQueue
        }
    });
});

// Endpoint để reset queue (chỉ dùng trong trường hợp khẩn cấp)
app.post('/queue-reset', (req, res) => {
    const { adminKey } = req.body;
    if (adminKey !== process.env.ADMIN_KEY) {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    
    // Clear waiting queue (không thể clear active requests vì đang xử lý)
    queueManager.waitingQueue = [];
    console.log('🚨 Queue manually reset by admin');
    
    res.status(200).json({
        message: 'Queue reset successfully',
        timestamp: new Date().toISOString(),
        remainingActiveRequests: queueManager.activeRequests.size
    });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully...');
    
    // Thông báo cho users trong queue
    if (queueManager.waitingQueue.length > 0) {
        console.log(`Notifying ${queueManager.waitingQueue.length} users in queue about shutdown...`);
        for (const request of queueManager.waitingQueue) {
            try {
                const shutdownMessage = {
                    "text": "🚨 Hệ thống đang được bảo trì. Vui lòng thử lại sau ít phút. Xin lỗi vì sự bất tiện này! 🙏"
                };
                await callSendAPI(request.id, shutdownMessage);
            } catch (error) {
                console.error(`Failed to notify user ${request.id} about shutdown:`, error);
            }
        }
    }
    
    // Chờ các request đang xử lý hoàn thành
    if (processingRequests.size > 0) {
        console.log(`Waiting for ${processingRequests.size} active requests to complete...`);
        await Promise.allSettled([...processingRequests.values()]);
    }
    
    // Chờ các request trong queue manager hoàn thành
    if (queueManager.activeRequests.size > 0) {
        console.log(`Waiting for ${queueManager.activeRequests.size} queue manager requests to complete...`);
        const activePromises = Array.from(queueManager.activeRequests.values()).map(req => 
            req.handler().catch(error => console.error('Queue request error during shutdown:', error))
        );
        await Promise.allSettled(activePromises);
    }
    
    if (quotaResetTimeout) clearTimeout(quotaResetTimeout);
    await pool.end();
    console.log('Database pool closed');
    console.log('✅ Graceful shutdown completed');
    process.exit(0);
});

// Start server
async function startServer() {
    try {
        app.listen(port, () => {
            console.log(`🚀 Chatbot server is running on port ${port}`);
            console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log('🔧 Available endpoints:');
            console.log('   ✅ GET  /webhook - Facebook verification');
            console.log('   🤖 POST /webhook - Pure Gemini AI processing');
            console.log('   🧪 GET  /test - Server status');
            console.log('   💬 POST /test-message - Test message processing');
            console.log('   📤 POST /send-test-message - Test Facebook send');
            console.log('   ❤️  GET  /health - Health check');
            console.log('   📊 GET  /queue-status - Queue status details');
            console.log('   🚨 POST /queue-reset - Emergency queue reset');
            console.log('🎯 User Journey Enhanced Chatbot Ready!');
            console.log(`📊 Daily quota limit: ${DAILY_QUOTA_LIMIT} requests`);
            console.log(`⏳ Queue system: Max ${queueManager.maxConcurrent} concurrent, ${queueManager.waitTime/1000}s wait time`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

startServer();
