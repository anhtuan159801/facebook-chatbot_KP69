require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const app = express();
const port = process.env.PORT || 3000;

// === KHÔNG DÙNG GEMINI NỮA ===
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

LƯU Ý 3. BẮT BUỘC TUYỆT ĐỐI BẠN PHẢI TRẢ LỜI NGẮN GỌN TRONG KHOẢNG 500 TỪ THUI.
`;

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

// ==== HỆ THỐNG QUEUE CHO 5 REQUEST ĐỒNG THỜI ====
class RequestQueue {
    constructor(maxConcurrent = 5, delayMs = 60000) {
        this.maxConcurrent = maxConcurrent;
        this.delayMs = delayMs; // 1 phút = 60000ms
        this.activeRequests = new Set();
        this.waitingQueue = [];
        this.isProcessing = false;
    }

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
                console.log(`⏳ Request ${requestId} đang chờ trong queue (vị trí ${queuePosition})`);
                
                // Gửi thông báo chờ cho user
                if (sender_psid) {
                    this.notifyUserWaiting(sender_psid, queuePosition);
                }
                
                this.waitingQueue.push(request);
                this.scheduleProcessing();
            }
        });
    }

    async notifyUserWaiting(sender_psid, queuePosition) {
        try {
            const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
            const message = {
                text: `⏳ Xin chào! Hiện tại hệ thống đang xử lý nhiều yêu cầu. Bạn đang ở vị trí ${queuePosition} trong hàng chờ. Vui lòng đợi khoảng 1-2 phút, mình sẽ phản hồi ngay khi đến lượt! 🙏`
            };
            
            const request_body = {
                "recipient": { "id": sender_psid },
                "message": message
            };

            const fetch = await import('node-fetch');
            await fetch.default(`https://graph.facebook.com/v2.6/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(request_body)
            });
        } catch (error) {
            console.error(`❌ Error sending waiting notification to ${sender_psid}:`, error);
        }
    }

    async processRequest(request) {
        this.activeRequests.add(request.id);
        console.log(`🚀 Bắt đầu xử lý request ${request.id} (${this.activeRequests.size}/${this.maxConcurrent} đang xử lý)`);

        // Set timeout cho request (5 phút)
        const timeoutId = setTimeout(() => {
            if (this.activeRequests.has(request.id)) {
                console.log(`⏰ Request ${request.id} timeout sau 5 phút`);
                this.activeRequests.delete(request.id);
                request.reject(new Error('Request timeout'));
                this.processNextInQueue();
            }
        }, 300000); // 5 phút

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
            console.log(`✅ Hoàn thành request ${request.id} (${this.activeRequests.size}/${this.maxConcurrent} đang xử lý)`);
            
            // Xử lý request tiếp theo trong queue
            this.processNextInQueue();
        }
    }

    processNextInQueue() {
        if (this.waitingQueue.length > 0 && this.activeRequests.size < this.maxConcurrent) {
            const nextRequest = this.waitingQueue.shift();
            this.processRequest(nextRequest);
        }
    }

    scheduleProcessing() {
        if (this.isProcessing) return;
        
        this.isProcessing = true;
        console.log(`⏰ Lên lịch xử lý request tiếp theo sau ${this.delayMs/1000} giây`);
        setTimeout(() => {
            this.isProcessing = false;
            this.processNextInQueue();
        }, this.delayMs);
    }

    getStatus() {
        return {
            active: this.activeRequests.size,
            waiting: this.waitingQueue.length,
            maxConcurrent: this.maxConcurrent
        };
    }
}

// Khởi tạo queue system
const requestQueue = new RequestQueue(5, 60000); // 5 request đồng thời, delay 1 phút

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

// ==== GỌI GROK QUA OPENROUTER ====
async function callGrokAPI(messages, sender_psid = null) {
    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
    const YOUR_SITE_URL = process.env.YOUR_SITE_URL || 'https://example.com';
    const YOUR_SITE_NAME = process.env.YOUR_SITE_NAME || 'PublicServiceBot';

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
            "HTTP-Referer": YOUR_SITE_URL,
            "X-Title": YOUR_SITE_NAME,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model: "openai/gpt-oss-20b:free",
            messages: messages
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Grok API error: ${response.status}`, errorText);
        throw new Error(`Grok API failed: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
}

// ==== WHISPER TRÊN HUGGING FACE ====
async function transcribeAudioWithWhisper(audioBuffer, mimeType) {
    const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY;
    if (!HUGGINGFACE_API_KEY) {
        throw new Error("HUGGINGFACE_API_KEY is required for audio transcription");
    }

    // Chuẩn hóa MIME type sang định dạng Hugging Face chấp nhận
    const supportedTypes = {
        'audio/mp4': 'audio/m4a',
        'audio/mpeg': 'audio/mpeg',
        'audio/wav': 'audio/wav',
        'audio/ogg': 'audio/ogg',
        'audio/webm': 'audio/webm',
        'audio/flac': 'audio/flac',
        'audio/x-m4a': 'audio/m4a'
    };

    const contentType = supportedTypes[mimeType] || 'audio/m4a'; // fallback

    const response = await fetch(
        "https://api-inference.huggingface.co/models/openai/whisper-large-v3",
        {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${HUGGINGFACE_API_KEY}`,
                "Content-Type": contentType
            },
            body: audioBuffer // GỬI RAW BUFFER, KHÔNG DÙNG FORMDATA
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Whisper error: ${response.status}`, errorText);
        throw new Error(`Whisper failed: ${response.status}`);
    }

    const result = await response.json();
    if (typeof result.text === 'string') {
        return result.text.trim();
    } else {
        throw new Error("Unexpected Whisper response format");
    }
}
// ==== XỬ LÝ TIN NHẮN VĂN BẢN ====
async function processNormalMessage(sender_psid, userMessage) {
    const history = await getConversationHistory(sender_psid);
    if (history.length > 0 && history[0].role === 'model') {
        history.shift();
    }

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
            text = "Xin lỗi, hiện mình chưa thể xử lý câu hỏi này. Bạn vui lòng thử lại sau nhé! 🙏";
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
            "text": "Xin lỗi, hiện tại tôi đang gặp sự cố kỹ thuật. Bạn vui lòng thử lại sau ít phút nhé! 🙏"
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
                    { type: "text", text: "Bạn là chuyên gia hỗ trợ người dùng chính phủ Việt Nam. Hãy mô tả nội dung hình ảnh và đưa ra hướng dẫn phù hợp. Nếu có lỗi, hãy chỉ rõ lỗi và cách khắc phục." },
                    { type: "image_url", image_url: { url: dataUrl } }
                ]
            }
        ];

        let text = await callGrokAPI(messages, sender_psid);
        if (!text || text.trim() === '') {
            text = "Xin lỗi, tôi không thể xử lý hình ảnh này. Bạn có thể mô tả lỗi bằng văn bản để tôi hỗ trợ nhé! 📝";
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
            "text": "Xin lỗi, tôi không thể xử lý hình ảnh này. Bạn có thể mô tả lỗi bằng văn bản để tôi hỗ trợ nhé! 📝"
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

        let enhancedSystemPrompt = SYSTEM_PROMPT;
        const recent = history.slice(-3).map(m => m.parts[0].text).join(' ');
        if (recent.includes('VNeID')) {
            enhancedSystemPrompt += "\nCURRENT CONTEXT: User is currently working with VNeID service.";
        } else if (recent.includes('ETAX') || recent.includes('thuế')) {
            enhancedSystemPrompt += "\nCURRENT CONTEXT: User is currently working with ETAX service.";
        } else if (recent.includes('VssID') || recent.includes('bảo hiểm')) {
            enhancedSystemPrompt += "\nCURRENT CONTEXT: User is currently working with VssID service.";
        }

        const messages = [
            { role: "system", content: enhancedSystemPrompt },
            ...history.map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.parts[0].text })),
            { role: "user", content: transcript }
        ];

        let text = await callGrokAPI(messages, sender_psid);
        if (!text || text.trim() === '') {
            text = "Xin lỗi, hiện mình chưa thể xử lý câu hỏi này. Bạn vui lòng thử lại sau nhé! 🙏";
        }

        const extractionResult = extractSuggestions(text);
        const quickReplies = extractionResult.suggestions;
        text = extractionResult.cleanedText;
        const response = { "text": text };
        await callSendAPIWithRating(sender_psid, response, quickReplies);
        await saveConversation(sender_psid, `[Voice: ${transcript}]`, text);
        console.log(`✅ Processed audio question for ${sender_psid}: "${transcript}"`);
    } catch (error) {
        console.error(`❌ Error processing audio for ${sender_psid}:`, error);
        const response = {
            "text": "Xin lỗi, tôi không thể hiểu được nội dung voice message của bạn. Bạn có thể thử lại hoặc gửi câu hỏi bằng văn bản nhé! 🎵"
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
        const msg = rating === 'helpful' 
            ? "Cảm ơn bạn! Rất vui khi có thể giúp đỡ bạn 😊" 
            : "Cảm ơn phản hồi của bạn! Chúng tôi sẽ cố gắng cải thiện hơn nữa 🙏";
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
    // Kiểm tra nếu user đang có request đang xử lý
    if (processingRequests.has(sender_psid)) {
        await processingRequests.get(sender_psid);
    }

    // Tạo request handler function
    const requestHandler = async () => {
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
        try { 
            await processingPromise; 
        } finally { 
            processingRequests.delete(sender_psid); 
        }
    };

    // Thêm request vào queue system
    try {
        await requestQueue.addRequest(requestKey, requestHandler, sender_psid);
    } catch (error) {
        console.error(`❌ Queue error for ${sender_psid}:`, error);
        await callSendAPI(sender_psid, { 
            text: "Xin lỗi, hệ thống đang quá tải. Vui lòng thử lại sau ít phút! 🙏" 
        });
    }
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
    const chunks = [];
    let currentChunk = '';
    const lines = text.split('\n');
    for (const line of lines) {
        if ((currentChunk + line + '\n').length <= maxLength) {
            currentChunk += line + '\n';
        } else {
            if (currentChunk) chunks.push(currentChunk.trim());
            currentChunk = line + '\n';
        }
    }
    if (currentChunk) chunks.push(currentChunk.trim());
    return chunks;
}

// ==== TEST ENDPOINTS ====
app.get('/test', (req, res) => {
    res.json({ status: 'Server is working!', timestamp: new Date().toISOString() });
});
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', uptime: process.uptime() });
});

// ==== QUEUE STATUS ENDPOINT ====
app.get('/queue-status', (req, res) => {
    const status = requestQueue.getStatus();
    res.json({
        queue: status,
        timestamp: new Date().toISOString(),
        message: `Hiện tại có ${status.active} request đang xử lý và ${status.waiting} request đang chờ`
    });
});

// ==== GRACEFUL SHUTDOWN ====
process.on('SIGTERM', async () => {
    console.log('Shutting down...');
    await pool.end();
    process.exit(0);
});

// ==== KHỞI ĐỘNG SERVER ====
app.listen(port, () => {
    console.log(`🚀 Server running on port ${port}`);
});
