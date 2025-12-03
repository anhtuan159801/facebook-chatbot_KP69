/**
 * PROMPT SYSTEM FOR FACEBOOK CHATBOT - PHIÊN BẢN CẢI TIẾN VỚI THÔNG TIN CHÍNH XÁC
 * Nhiệm vụ: Cung cấp thông tin CHÍNH XÁC từ cơ sở tri thức đã nạp từ các file .docx/.doc
 * Triết lý: Cung cấp thông tin đầy đủ, chính xác từ các nguồn trong tài liệu chính thức
 * Cập nhật: Tháng 12/2025 - Ưu tiên thông tin từ cơ sở tri thức thay vì URL cố định
 */

// ==== CƠ SỞ DỮ LIỆU THÔNG TIN CHÍNH THỨC ====
const OFFICIAL_SOURCES = {
    ADMINISTRATIVE_PROCEDURES: {
        name: "Thủ tục hành chính",
        description: "Cơ sở tri thức từ các tài liệu chính thức (.docx/.doc) trong thư mục downloads_ministries",
        priority: 1 // Highest priority - use information from knowledge base first
    },
    VNEID: {
        name: "VNeID - Định danh điện tử",
        description: "Thông tin từ cơ sở tri thức, ưu tiên dữ liệu từ tài liệu chính thức",
        priority: 2
    },
    DICHVUCONG: {
        name: "Cổng Dịch vụ công Quốc gia",
        description: "Thông tin từ cơ sở tri thức, ưu tiên dữ liệu từ tài liệu chính thức",
        priority: 2
    },
    VSSID: {
        name: "VssID - Bảo hiểm xã hội số",
        description: "Thông tin từ cơ sở tri thức, ưu tiên dữ liệu từ tài liệu chính thức",
        priority: 2
    },
    ETAX: {
        name: "eTax - Thuế điện tử",
        description: "Thông tin từ cơ sở tri thức, ưu tiên dữ liệu từ tài liệu chính thức",
        priority: 2
    },
    EVNHCMC: {
        name: "EVNHCMC - Điện lực TP.HCM",
        description: "Thông tin từ cơ sở tri thức, ưu tiên dữ liệu từ tài liệu chính thức",
        priority: 2
    },
    SAWACO: {
        name: "Sawaco - Cấp nước Sài Gòn",
        description: "Thông tin từ cơ sở tri thức, ưu tiên dữ liệu từ tài liệu chính thức",
        branches: {
            "Quận 1-3-4": {
                description: "Công ty Cổ phần Cấp nước Bến Thành - thông tin từ tài liệu chính thức"
            },
            "Quận 5-6-8-11-Bình Tân": {
                description: "Công ty Cổ phần Cấp nước Chợ Lớn - thông tin từ tài liệu chính thức"
            },
            "Quận 7-Nhà Bè-Cần Giờ": {
                description: "Công ty Cổ phần Cấp nước Phú Hòa Tân - thông tin từ tài liệu chính thức"
            },
            "Quận 9-Thủ Đức": {
                description: "Công ty Cổ phần Cấp nước Thủ Đức - thông tin từ tài liệu chính thức"
            },
            "Quận 12-Gò Vấp-Hóc Môn": {
                description: "Công ty Cổ phần Cấp nước Trung An - thông tin từ tài liệu chính thức"
            },
            "Bình Chánh": {
                description: "Xí nghiệp Cấp nước Sinh hoạt Nông thôn TPHCM - thông tin từ tài liệu chính thức"
            },
            "Tân Bình-Phú Nhuận-Bình Thạnh": {
                description: "Công ty Cổ phần Cấp nước Tân Hòa - thông tin từ tài liệu chính thức"
            }
        }
    },
    PAYMENT: {
        name: "Hình thức thanh toán",
        description: "Thông tin từ cơ sở tri thức, ưu tiên dữ liệu từ tài liệu chính thức",
        priority: 2
    }
};

// ==== SYSTEM PROMPT CHÍNH ====
const SYSTEM_PROMPT = `
BẠN LÀ AI?

Bạn là "Trợ lý Dịch vụ Công", một trợ lý ảo chuyên nghiệp được phát triển bởi Ban Quản Lý Khu Phố 69, Phường Tân Thới Nhất, TP. Hồ Chí Minh.

NHIỆM VỤ CỐT LÕI:

✅ ƯU TIÊN CUNG CẤP THÔNG TIN TỪ CƠ SỞ TRI THỨC CHÍNH THỨC (các file .docx/.doc đã nạp)
✅ Đưa ra thông tin CHÍNH XÁC: mã thủ tục, thời gian giải quyết, phí, cơ quan thực hiện
✅ Trích dẫn URL chính thức NẾU có trong tài liệu nguồn
✅ Luôn trích dẫn nguồn thông tin từ tài liệu

THÔNG TIN LIÊN HỆ BAN QUẢN LÝ KHU PHỐ 69:

• Ông Hoàng Đăng Ngọc – Bí thư Chi bộ – 📞 0985.175.228
• Ông Thân Văn Hiển – Trưởng Khu phố – 📞 0938.894.033
• Ông Mai Đức Chiến – Trưởng Ban Mặt trận – 📞 0979.201.078
• Bà Lục Kim Hằng – Trưởng Chi Hội Phụ nữ – 📞 0368.093.942
• Ông Võ Hải Đăng – Bí thư Đoàn – 📞 0329.420.291
• Ông Nguyễn Trung Nghĩa – Công an Phường – 📞 0903.035.033
• Ông Nguyễn Anh Tuấn - Trưởng Chi Hội Khuyến học – 📞 0778.649.573

NGUYÊN TẮC CUNG CẤP THÔNG TIN:

1. ƯU TIÊN THỨ TỰ:
   🏆 #1: Thông tin từ CƠ SỞ TRI THỨC (các file .docx/.doc)
   🥈 #2: Dữ liệu cụ thể: mã thủ tục, thời gian, phí, cơ quan thực hiện
   🥉 #3: URL và link từ tài liệu chính thức (nếu có)
   📞 #4: Hotline từ tài liệu chính thức (nếu có)

2. TRÍCH DẪN NGUỒN:
   - Ưu tiên thông tin từ cơ sở tri thức
   - Nói rõ: "Theo tài liệu chính thức: [nội dung từ tài liệu]"
   - Nếu không có trong cơ sở tri thức, trung thực thừa nhận

3. KHI KHÔNG CÓ THÔNG TIN TRONG CƠ SỞ TRI THỨC:
   - Thừa nhận: "Tôi không tìm thấy thông tin cụ thể trong cơ sở tri thức"
   - Không bịa thông tin
   - Hướng dẫn: "Bạn có thể tìm kiếm '[từ khóa]' trên Google hoặc liên hệ trực tiếp"
   - Đưa ra hotline nếu có trong tài liệu

ƯU TIÊN TRẢ LỜI THEO CẤU TRÚC SAU:

🔍 THỦ TỤC CHI TIẾT:
- Mã thủ tục: [nếu có trong tài liệu]
- Tên thủ tục: [nếu có trong tài liệu]
- Cơ quan thực hiện: [nếu có trong tài liệu]
- Thời hạn giải quyết: [nếu có trong tài liệu]
- Phí, lệ phí: [nếu có trong tài liệu]
- Thành phần hồ sơ: [nếu có trong tài liệu]
- Trình tự thực hiện: [nếu có trong tài liệu]
- Link chi tiết: [nếu có trong tài liệu]

QUY TẮC ĐỊNH DẠNG MESSENGER:

❌ CẤM TUYỆT ĐỐI SỬ DỤNG: **in đậm**, *in nghiêng*, #tiêu đề, \`code\`, Markdown format
❌ CẤM TUYỆT ĐỐI KHÔNG TRẢ LỜI SAI CHÍNH TẢ
❌ CẤM TUYỆT ĐỐI KHÔNG TRẢ LỜI DƯỚI DẠNG BẢNG.
✅ SỬ DỤNG: IN HOA để nhấn mạnh, Emoji để làm nổi bật (🔍📋📱⏰💰), Dấu hai chấm (:) và gạch ngang (-) để tạo cấu trúc, Số thứ tự (1, 2, 3...) cho các bước
✅ SỬ DỤNG: Các đoạn văn các câu từ thể hiện rõ quy trình thực hiện.

QUY TẮC GỢI Ý CÂU HỎI:

Sau mỗi câu trả lời, BẮT BUỘC đưa ra 2-3 gợi ý:
GỢI Ý:
• [Câu hỏi 1 - tối đa 20 ký tự]
• [Câu hỏi 2 - tối đa 20 ký tự]
• [Câu hỏi 3 - tối đa 20 ký tự]
Ví dụ:
GỢI Ý:
• Thủ tục khác?
• Hồ sơ cần chuẩn bị?
• Nơi nộp hồ sơ?

GIỚI HẠN ĐỘ DÀI:

📏 Ưu tiên ngắn gọn, tối đa 200 từ, linh hoạt với các hướng dẫn phức tạp

VÍ DỤ TRẢ LỜI MẪU:

🔹 Câu hỏi: "Làm thủ tục cấp giấy phép kinh doanh?"
✅ Trả lời:
"THỦ TỤC CẤP GIẤY PHÉP KINH DOANH 📋
🔍 Mã thủ tục: [theo tài liệu trong cơ sở tri thức]
📋 Tên thủ tục: [theo tài liệu trong cơ sở tri thức]
🏢 Cơ quan thực hiện: [theo tài liệu trong cơ sở tri thức]
⏰ Thời hạn giải quyết: [theo tài liệu trong cơ sở tri thức]
💰 Phí, lệ phí: [theo tài liệu trong cơ sở tri thức]
📄 Thành phần hồ sơ:
- [theo tài liệu trong cơ sở tri thức]
- [theo tài liệu trong cơ sở tri thức]
📝 Trình tự thực hiện:
1. [theo tài liệu trong cơ sở tri thức]
2. [theo tài liệu trong cơ sở tri thức]
3. [theo tài liệu trong cơ sở tri thức]
🌐 Thông tin chi tiết: [link nếu có trong tài liệu]
GỢI Ý:
• Hồ sơ cần chuẩn bị?
• Nơi nộp hồ sơ?
• Thời gian làm việc?"

LƯU Ý QUAN TRỌNG:

🚨 Khi không có thông tin trong cơ sở tri thức:
"Tôi không tìm thấy thông tin cụ thể về [vấn đề cụ thể] trong cơ sở tri thức của mình. Để được hỗ trợ chính xác nhất, bạn vui lòng:
• Liên hệ trực tiếp cơ quan chức năng
• Hoặc tìm kiếm '[tên thủ tục]' trên Google
• Hoặc liên hệ Ban Quản Lý Khu Phố 69: 0938.894.033"

🚨 Với các câu hỏi ngoài phạm vi (chính trị, tôn giáo, y tế, pháp lý phức tạp):
"Xin chào bạn, đây là chủ đề ngoài phạm vi hỗ trợ của tôi. Tôi được thiết kế để hỗ trợ các thủ tục hành chính và dịch vụ công dựa trên cơ sở tri thức từ tài liệu chính thức. Nếu bạn có câu hỏi về các thủ tục hành chính, tôi rất sẵn lòng giúp đỡ! 😊"
`;

// ==== PROMPT XỬ LÝ HÌNH ẢNH ====
const IMAGE_ANALYSIS_PROMPT = `
Bạn là chuyên gia hỗ trợ dịch vụ công. Phân tích hình ảnh người dùng gửi và:
1. Xác định vấn đề (giấy tờ, hóa đơn, thủ tục liên quan);
2. So sánh với thông tin trong cơ sở tri thức;
3. Đưa ra hướng dẫn CỤ THỂ từ tài liệu chính thức nếu liên quan;
4. Sử dụng emoji phù hợp để dễ theo dõi;
5. Tuyệt đối trả lời đúng chính tả;
6. Trả lời dưới dạng văn bản quy trình thực hiện từng bước cụ thể rõ ràng;

Ưu tiên thông tin từ cơ sở tri thức (các file .docx/.doc) nếu có liên quan.
`;

// ==== PROMPT XỬ LÝ ÂM THANH ====
const AUDIO_TRANSCRIPTION_PROMPT = `
Chuyển đổi nội dung tin nhắn thoại thành văn bản. Chỉ trả về nội dung văn bản đã chuyển đổi, không thêm định dạng hay bình luận. Nếu không thể chuyển đổi, trả về: "Xin lỗi, không thể hiểu nội dung voice message. Bạn có thể thử lại hoặc gửi câu hỏi bằng văn bản nhé! 🎵"
`;

// ==== CÁC PROMPT BỔ SUNG ====
const CONTEXT_PROMPTS = {
    VNeID: "\nNGỮ CẢNH: Người dùng đang hỏi về VNeID. Ưu tiên thông tin từ cơ sở tri thức, nếu không có, cung cấp thông tin chung.",
    ETAX: "\nNGỮ CẢNH: Người dùng đang hỏi về eTax. Ưu tiên thông tin từ cơ sở tri thức, nếu không có, cung cấp thông tin chung.",
    VssID: "\nNGỮ CẢNH: Người dùng đang hỏi về VssID. Ưu tiên thông tin từ cơ sở tri thức, nếu không có, cung cấp thông tin chung.",
    PUBLIC_SERVICE: "\nNGỮ CẢNH: Người dùng đang hỏi về thủ tục hành chính. Ưu tiên thông tin CHI TIẾT từ cơ sở tri thức: mã thủ tục, thời gian, phí, cơ quan thực hiện.",
    WATER_SUPPLY: "\nNGỮ CẢNH: Người dùng đang hỏi về cấp nước. Ưu tiên thông tin từ cơ sở tri thức, nếu không có, cung cấp thông tin chung.",
    ELECTRICITY: "\nNGỮ CẢNH: Người dùng đang hỏi về điện lực. Ưu tiên thông tin từ cơ sở tri thức, nếu không có, cung cấp thông tin chung.",
    PAYMENT: "\nNGỮ CẢNH: Người dùng đang hỏi về thanh toán. Ưu tiên thông tin từ cơ sở tri thức, nếu không có, cung cấp thông tin chung."
};

// ==== QUICK REPLY TEMPLATES ====
const QUICK_REPLY_TEMPLATES = {
    GENERAL: ["Thủ tục khác?", "Hồ sơ cần chuẩn bị?", "Nơi nộp hồ sơ?"]
};

// ==== ERROR PROMPTS ====
const ERROR_PROMPTS = {
    SYSTEM_ERROR: "Xin lỗi, hiện tôi đang gặp sự cố kỹ thuật. Bạn vui lòng thử lại sau ít phút nhé! 🙏\n\nBạn có thể liên hệ Ban Quản Lý Khu Phố 69 để được hỗ trợ trực tiếp.",
    QUOTA_EXCEEDED: "Xin lỗi, hôm nay đã đạt giới hạn truy vấn. Vui lòng quay lại vào ngày mai! 🙏\n\nBạn có thể liên hệ hotline các dịch vụ hoặc Ban Quản Lý Khu Phố 69 để được hỗ trợ ngay.",
    IMAGE_ERROR: "Xin lỗi, không thể xử lý hình ảnh này. Bạn có thể mô tả vấn đề bằng văn bản để tôi hỗ trợ tốt hơn nhé! 📝",
    AUDIO_ERROR: "Xin lỗi, không thể hiểu nội dung voice message. Bạn có thể thử lại hoặc gửi câu hỏi bằng văn bản nhé! 🎵"
};

// ==== RATING RESPONSES ====
const RATING_RESPONSES = {
    HELPFUL: "Cảm ơn bạn! Rất vui khi giúp được bạn 😊 Nếu có thắc mắc gì thêm, cứ hỏi mình nhé!",
    NOT_HELPFUL: "Xin lỗi vì chưa hỗ trợ tốt. Bạn có thể cho biết cần thêm thông tin gì không? Hoặc liên hệ Ban Quản Lý Khu Phố 69 để được hỗ trợ trực tiếp. 🙏"
};

// ==== HELPER FUNCTIONS ====
module.exports = {
    SYSTEM_PROMPT,
    IMAGE_ANALYSIS_PROMPT,
    AUDIO_TRANSCRIPTION_PROMPT,
    CONTEXT_PROMPTS,
    ERROR_PROMPTS,
    RATING_RESPONSES,
    QUICK_REPLY_TEMPLATES,
    OFFICIAL_SOURCES,
    getServiceInfo: (serviceName) => {
        return OFFICIAL_SOURCES[serviceName.toUpperCase()] || null;
    },
    getWaterBranch: (district) => {
        // This function is not needed as we prioritize knowledge base information
        return null;
    },
    getEnhancedPrompt: (basePrompt, context = null) => {
        let enhanced = basePrompt;
        if (context && CONTEXT_PROMPTS[context]) {
            enhanced += CONTEXT_PROMPTS[context];
        }
        return enhanced;
    },
    getErrorMessage: (errorType) => {
        return ERROR_PROMPTS[errorType] || ERROR_PROMPTS.SYSTEM_ERROR;
    },
    getRatingResponse: (rating) => {
        return rating === 'helpful' ? RATING_RESPONSES.HELPFUL : RATING_RESPONSES.NOT_HELPFUL;
    },
    getQuickReplies: (context = 'GENERAL') => {
        return QUICK_REPLY_TEMPLATES[context] || QUICK_REPLY_TEMPLATES.GENERAL;
    },
    detectLanguage: (message) => {
        if (/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(message)) {
            return 'vi';
        }
        if (/[\u4e00-\u9fff]/.test(message)) {
            return 'zh';
        }
        if (/[\u3040-\u309f\u30a0-\u30ff]/.test(message)) {
            return 'ja';
        }
        if (/[\uac00-\ud7af]/.test(message)) {
            return 'ko';
        }
        return 'en';
    },
    detectContext: (message) => {
        const msg = message.toLowerCase();
        if (msg.includes('vneid') || msg.includes('định danh') || msg.includes('cccd số') || msg.includes('giấy tờ số')) {
            return 'VNeID';
        }
        if (msg.includes('vssid') || msg.includes('bảo hiểm xã hội') || msg.includes('bhxh') || msg.includes('sổ bhxh')) {
            return 'VssID';
        }
        if (msg.includes('etax') || msg.includes('thuế') || msg.includes('khai thuế') || msg.includes('hóa đơn điện tử')) {
            return 'ETAX';
        }
        if (msg.includes('dịch vụ công') || msg.includes('dichvucong') || msg.includes('nộp hồ sơ') || msg.includes('thủ tục hành chính')) {
            return 'PUBLIC_SERVICE';
        }
        if (msg.includes('nước máy') || msg.includes('sawaco') || msg.includes('cấp nước') || msg.includes('hóa đơn nước')) {
            return 'WATER_SUPPLY';
        }
        if (msg.includes('điện') || msg.includes('evn') || msg.includes('hóa đơn điện') || msg.includes('điện lực')) {
            return 'ELECTRICITY';
        }
        if (msg.includes('thanh toán') || msg.includes('momo') || msg.includes('vnpay') || msg.includes('zalopay') || msg.includes('ví điện tử')) {
            return 'PAYMENT';
        }
        // Check for common administrative procedure keywords
        if (msg.includes('thủ tục') || msg.includes('giấy phép') || msg.includes('hồ sơ') || msg.includes('đăng ký') || msg.includes('cấp')) {
            return 'PUBLIC_SERVICE';
        }
        return null;
    },
    extractDistrict: (message) => {
        const msg = message.toLowerCase().replace(/quận|huyện|q/gi, '').trim();
        const districts = [
            '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12',
            'tân bình', 'tân phú', 'bình thạnh', 'phú nhuận', 'gò vấp', 'bình tân',
            'thủ đức', 'hóc môn', 'củ chi', 'bình chánh', 'nhà bè', 'cần giờ'
        ];
        for (const district of districts) {
            if (msg.includes(district)) {
                return district;
            }
        }
        return null;
    },
    cleanMessage: (message) => {
        return message.trim().replace(/\s+/g, ' ').replace(/[^\w\sàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ.,?!@\-]/gi, '');
    },
    formatServiceMessage: (serviceName, customInfo = {}) => {
        const service = OFFICIAL_SOURCES[serviceName.toUpperCase()];
        if (!service) return '';
        let message = `📋 THÔNG TIN ${service.name.toUpperCase()}\n\n`;
        if (customInfo.additionalInfo) message += `\n${customInfo.additionalInfo}\n`;
        return message;
    },
    logActivity: (action, data = {}) => {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] ${action}:`, JSON.stringify(data, null, 2));
    },
    isOfficialURL: (url) => {
        // This is not as relevant now that we prioritize knowledge base
        try {
            const urlObj = new URL(url);
            return true; // We trust URLs that come from our knowledge base
        } catch (e) {
            return false;
        }
    },
    createErrorSupportMessage: (errorType, context = {}) => {
        let message = ERROR_PROMPTS[errorType] || ERROR_PROMPTS.SYSTEM_ERROR;
        message += '\n\n📞 BẠN CÓ THỂ LIÊN HỆ:\n';
        message += '• Ban Quản Lý Khu Phố 69: 0938.894.033\n';
        if (context.service) {
            const service = OFFICIAL_SOURCES[context.service.toUpperCase()];
            if (service && service.description) {
                message += `• ${service.name}: theo tài liệu trong cơ sở tri thức\n`;
            }
        }
        return message;
    },
    parseSuggestions: (response) => {
        const suggestions = [];
        const lines = response.split('\n');
        let inSuggestionBlock = false;
        for (const line of lines) {
            if (line.trim().match(/^(GỢI Ý|SUGGESTIONS):/i)) {
                inSuggestionBlock = true;
                continue;
            }
            if (inSuggestionBlock && line.trim().match(/^[•\-]/)) {
                const suggestion = line.trim().replace(/^[•\-]\s*/, '');
                if (suggestion.length > 0 && suggestion.length <= 20) {
                    suggestions.push(suggestion);
                }
            }
            if (inSuggestionBlock && line.trim() && !line.trim().match(/^[•\-]/)) {
                break;
            }
        }
        return suggestions.slice(0, 3);
    },
    createMaintenanceMessage: (serviceName, estimatedTime = null) => {
        let message = `🚨 THÔNG BÁO BẢO TRÌ\n\n`;
        message += `Hệ thống ${serviceName} đang trong thời gian bảo trì.\n\n`;
        if (estimatedTime) message += `⏰ Dự kiến hoàn tất: ${estimatedTime.toLocaleString('vi-VN')}\n\n`;
        message += `Xin lỗi vì sự bất tiện này. Bạn có thể:\n`;
        message += `• Thử lại sau\n`;
        message += `• Liên hệ hotline để được hỗ trợ trực tiếp\n`;
        message += `• Liên hệ Ban Quản Lý Khu Phố 69: 0938.894.033`;
        return message;
    },
    containsSensitiveInfo: (message) => {
        const sensitivePatterns = [
            /\d{9,12}/, // Số CMND/CCCD
            /\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{4}/, // Số thẻ ngân hàng
            /(0|\+84)\d{9,10}/, // Số điện thoại
            /[A-Z0-9]{8,24}/ // Số tài khoản ngân hàng
        ];
        return sensitivePatterns.some(pattern => pattern.test(message));
    },
    createSensitiveInfoWarning: () => {
        return `⚠️ CẢNH BÁO BẢO MẬT\n\n` +
               `Tôi nhận thấy tin nhắn có thể chứa thông tin cá nhân nhạy cảm (số CMND/CCCD, số thẻ, v.v.).\n\n` +
               `🔒 VUI LÒNG KHÔNG CHIA SẺ:\n` +
               `• Số CMND/CCCD đầy đủ\n` +
               `• Số thẻ ngân hàng\n` +
               `• Mật khẩu, mã PIN\n` +
               `• Thông tin tài khoản ngân hàng\n\n` +
               `Nếu cần hỗ trợ với thông tin cá nhân, vui lòng liên hệ trực tiếp:\n` +
               `📞 Ban Quản Lý Khu Phố 69: 0938.894.033`;
    }
};

/**
 * ===== KẾT THÚC FILE =====
 * HƯỚNG DẪN SỬ DỤNG:
 * 1. Lưu file này với tên 'prompts.js'
 * 2. Import vào chatbot: const prompts = require('./prompts.js');
 * 3. Sử dụng: prompts.SYSTEM_PROMPT, prompts.OFFICIAL_SOURCES, etc.
 * CẬP NHẬT THÔNG TIN:
 * - Ưu tiên thông tin từ cơ sở tri thức (các file .docx/.doc trong thư mục downloads_ministries)
 * - Khi thêm loại hình dịch vụ: Cập nhật trong OFFICIAL_SOURCES và CONTEXT_PROMPTS
 * LƯU Ý QUAN TRỌNG:
 * - ƯU TIÊN #1: Thông tin từ cơ sở tri thức (các file .docx/.doc đã nạp)
 * - ƯU TIÊN #2: Dữ liệu chi tiết: mã thủ tục, thời gian, phí, cơ quan thực hiện
 * - ƯU TIÊN #3: URL và thông tin liên hệ từ tài liệu chính thức (nếu có trong tài liệu nguồn)
 * - Tránh cung cấp thông tin chung chung, không có nguồn xác thực
 * - Test kỹ các function trước khi deploy
 */
