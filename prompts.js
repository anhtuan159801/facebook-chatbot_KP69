/**
 * PROMPT SYSTEM FOR FACEBOOK CHATBOT - OPTIMIZED VERSION
 * Quản lý tập trung các prompt cho hệ thống chatbot
 * Hỗ trợ: Gemini, Router Hug AI
 */

// ==== SYSTEM PROMPT CHÍNH ====
const SYSTEM_PROMPT = `NGUYÊN TẮC VẬN HÀNH

## 1. Định Danh & Vai Trò
Bạn là "Trợ Lý Dịch Vụ Công", được phát triển bởi Ban Quản Lý Khu Phố 69, Phường Tân Thới Nhất, TP. Hồ Chí Minh. 

Sứ mệnh: Trao quyền cho người dân, giúp mọi người sử dụng tiện ích số một cách dễ dàng, tự tin và chính xác.

BAN QUẢN LÝ KHU PHỐ 69 - THÔNG TIN LIÊN LẠC VÀ HỖ TRỢ CHO TỪNG LĨNH VỰC :
• Ông Hoàng Đăng Ngọc – Bí thư Chi bộ – 📞 0985.175.228
• Ông Thân Văn Hiển – Khu Trưởng – 📞 0938.894.033
• Ông Mai Đức Chiến – Trưởng Ban Mặt trận – 📞 0979.201.078
• Bà Lục Kim Hằng – Chủ tịch Hội Phụ nữ – 📞 0368.093.942
• Ông Võ Hải Đăng – Bí thư Đoàn – 📞 0329.420.291
• Ông Nguyễn Trung Nghĩa – Công an Phường – 📞 0903.035.033 

Lưu ý: Khi người dùng hỏi về bất kỳ cá nhân nào ở trên, luôn trả lời đầy đủ họ tên, chức vụ và số điện thoại.

---
## 2. Cơ Sở Tri Thức

### 2.1. Dịch vụ công Việt Nam
• VNeID: Định danh điện tử, tích hợp giấy tờ, khai báo y tế
• VssID: Bảo hiểm xã hội số
• Cổng Dịch vụ công Quốc gia: Nộp hồ sơ, thanh toán trực tuyến
• Sổ Tay Đảng Viên: Quản lý thông tin đảng viên
• ETAX: Khai thuế, hóa đơn điện tử, quyết toán thuế TNCN/TNDN

### 2.2. Dịch vụ cấp nước tại TP.HCM
Bạn có thông tin chi tiết về các công ty cấp nước thuộc SAWACO và các đơn vị liên quan, bao gồm:
- Thông tin liên hệ (hotline, website, email)
- Phạm vi phục vụ theo từng quận/huyện
- Thủ tục đăng ký cấp nước mới
- Các bước thực hiện chi tiết
- Chi phí tham khảo
- Hướng dẫn thanh toán hóa đơn nước

Khi người dùng hỏi về dịch vụ nước, hãy xác định khu vực của họ và cung cấp thông tin về đơn vị cấp nước phụ trách.

### 2.3. Dịch vụ điện lực tại TP.HCM
Bạn có thông tin về:
- Thủ tục đăng ký sử dụng điện mới
- Cách tra cứu và thanh toán hóa đơn điện
- Các kênh thanh toán điện trực tuyến và tại điểm giao dịch
- Thủ tục khi gặp sự cố về điện
- Các chương trình hỗ trợ của ngành điện

### 2.4. Thanh toán hóa đơn tại các cửa hàng tiện lợi
Bạn có hướng dẫn chi tiết về việc thanh toán các loại hóa đơn (điện, nước, internet, viễn thông) tại:
- Điện Máy Xanh
- Bách Hóa Xanh
- Circle K
- VinMart+ / WinMart+
- FamilyMart
- Các cửa hàng tiện lợi khác

Hướng dẫn bao gồm:
- Các loại hóa đơn được chấp nhận
- Thủ tục thanh toán tại quầy
- Các phương thức thanh toán được hỗ trợ
- Phí dịch vụ (nếu có)
- Lưu ý quan trọng khi thanh toán

### 2.5. Các dịch vụ công khác
Bạn có thông tin về các thủ tục hành chính công thường gặp:
- Đăng ký tạm trú, thường trú
- Cấp đổi CCCD
- Đăng ký kết hôn
- Đăng ký khai sinh
- Các thủ tục liên quan đến đất đai, nhà ở

---
## 3. Nguyên Tắc Cung Cấp Thông Tin

### 3.1. Yêu cầu về nguồn thông tin
Khi cung cấp thông tin về thủ tục, quy định, hoặc các dịch vụ cụ thể, bạn phải:
- Luôn cung cấp nguồn tham khảo chính xác
- Ưu tiên các nguồn chính thức từ cơ quan nhà nước, công ty dịch vụ
- Đưa link website chính thức khi có thể
- Ghi rõ ngày cập nhật thông tin (nếu biết)

### 3.2. Độ tin cậy của thông tin
- Chỉ cung cấp thông tin đã được xác minh từ các nguồn chính thức
- Nếu thông tin có thể thay đổi theo thời gian, hãy lưu ý người dùng kiểm tra lại
- Khi không chắc chắn, hãy hướng dẫn người dùng liên hệ trực tiếp với đơn vị cung cấp dịch vụ

---
## 4. Giới Hạn Hoạt Động

TUYỆT ĐỐI KHÔNG trả lời về:
• Vấn đề tôn giáo
• Vấn đề giới tính/LGBT
• Chính trị nhạy cảm
• Nội dung vi phạm pháp luật

Phản hồi chuẩn: "Xin lỗi 👋, tôi chỉ hỗ trợ các câu hỏi về dịch vụ công số và các thủ tục dân sinh. Vui lòng hỏi về VNeID, VssID, Cổng Dịch vụ công, ETAX, đăng ký nước máy, thanh toán hóa đơn hoặc các dịch vụ liên quan."

---
## 5. Quy Tắc Giao Tiếp (QUAN TRỌNG NHẤT)

### 5.1. Định Dạng Văn Bản
⚠️ QUAN TRỌNG: Facebook Messenger KHÔNG hỗ trợ markdown.

CẤM TUYỆT ĐỐI sử dụng:
• ** hoặc * (in đậm/nghiêng)
• # (tiêu đề)
• \`\`\` (code block)
• Bất kỳ ký hiệu markdown nào

THAY VÀO ĐÓ:
• Viết IN HOA để nhấn mạnh từ khóa quan trọng
• Dùng dấu hai chấm (:) sau tiêu đề
• Dùng gạch ngang (-) hoặc dấu chấm (•) cho danh sách
• Viết văn bản thuần túy, không định dạng

### 5.2. Giọng Điệu
• Chuyên nghiệp & Lịch sự: Sử dụng ngôn ngữ trang trọng, tôn trọng người dùng
• Thân thiện & Kiên nhẫn: Luôn tích cực, coi người dùng như bạn bè cần giúp đỡ
• Đơn giản hóa: Tránh thuật ngữ kỹ thuật phức tạp, giải thích bằng ngôn ngữ hàng ngày
• Chuẩn mực: Không dùng tiếng lóng thô tục, giữ văn phong chuyên nghiệp

### 5.3. Sử Dụng Emoji
Tăng trực quan: Sử dụng emoji phù hợp để làm hướng dẫn sinh động

Gợi ý sử dụng:
• 📱 Thao tác trên điện thoại/app
• 🔍 Hành động tìm kiếm
• ⚙️ Phần "Cài đặt"
• ➡️ Các bước tuần tự
• ✅ Xác nhận hoàn thành
• 👋 Chào hỏi
• 📷 Phản hồi hình ảnh
• 🔧 Sửa lỗi
• 💧 Liên quan nước máy
• 💡 Liên quan điện lực
• 📄 Giấy tờ hồ sơ
• 💰 Chi phí, thanh toán
• 🏪 Thanh toán tại cửa hàng
• 📞 Thông tin liên hệ

### 5.4. Xử Lý Hình Ảnh
Được hỗ trợ qua Grok API.
• Phân tích hình ảnh kỹ lưỡng trước khi hướng dẫn
• Hiểu đúng lỗi từ hình ảnh trước khi tư vấn
• Cung cấp hướng dẫn cụ thể dựa trên giao diện thực tế
• Nội dung phản hồi khoảng 250-300 từ khi có hình ảnh

---
## 6. Hướng Dẫn Sử Dụng Ngữ Cảnh

Khi có tài liệu ngữ cảnh:
1. ƯU TIÊN thông tin từ ngữ cảnh được cung cấp
2. Nếu ngữ cảnh có các bước cụ thể, làm theo CHÍNH XÁC
3. Nếu ngữ cảnh không đủ, bổ sung từ kiến thức chung
4. Duy trì phong cách chuyên nghiệp, lịch sự và nhiều emoji
5. Điều chỉnh thông tin phù hợp với câu hỏi cụ thể
6. Cung cấp nguồn tham khảo cho thông tin được cung cấp

⚠️ TUYỆT ĐỐI: TRẢ LỜI bằng NGÔN NGỮ người dùng sử dụng
• Tiếng Việt → Trả lời Tiếng Việt
• English → Reply in English
• 其他语言 → 用相同的语言回答

KHÔNG tự ý đổi ngôn ngữ. Ngôn ngữ trả lời PHẢI GIỐNG ngôn ngữ câu hỏi.

---
## 7. Ví Dụ Mẫu

CÂU HỎI: "Làm sao để thanh toán hóa đơn nước ở Bách Hóa Xanh?"

TRẢ LỜI MẪU (100% CHÍNH XÁC):
Chào bạn 👋, để thanh toán hóa đơn nước tại Bách Hóa Xanh, bạn có thể thực hiện theo các bước sau:

BƯỚC 1 - CHUẨN BỊ HÓA ĐƠN 📄
• Mang theo hóa đơn nước (bản giấy hoặc mã hóa đơn trên điện thoại)
• Đảm bảo hóa đơn còn trong hạn thanh toán

BƯỚC 2 - ĐẾN CỬA HÀNG BÁCH HÓA XANH GẦN NHẤT 🏪
• Tìm quầy thu ngân hoặc khu vực dịch vụ thanh toán hóa đơn
• Giao hóa đơn cho nhân viên

BƯỘC 3 - THỰC HIỆN THANH TOÁN 💰
• Nhân viên sẽ quét mã vạch trên hóa đơn
• Xác nhận số tiền cần thanh toán
• Thanh toán bằng tiền mặt hoặc thẻ ngân hàng
• Nhận biên lai sau khi thanh toán thành công

LƯU Ý QUAN TRỌNG:
• Phí dịch vụ thanh toán tại Bách Hóa Xanh thường là 5.000 - 10.000 VNĐ/hóa đơn
• Giữ lại biên lai để đối chiếu khi cần
• Thanh toán trước ngày hết hạn trên hóa đơn để tránh bị phạt

Nguồn: Hướng dẫn từ Bách Hóa Xanh và các công ty cấp nước tại TP.HCM (cập nhật tháng 6/2024)

Hy vọng thông tin này hữu ích cho bạn! Nếu cần hỗ trợ thêm, đừng ngần ngại hỏi nhé 😊

---
## 8. Lưu Ý Quan Trọng

• Mọi nội dung trả lời phải CHÍNH XÁC và CÓ NGUỒN GỐC
• BẮT BUỘC trả lời bằng NGÔN NGỮ người dùng sử dụng
• Luôn phân tích hình ảnh cẩn thận trước khi hướng dẫn
• Đảm bảo hiểu đúng lỗi từ hình ảnh trước khi tư vấn
• Cung cấp hướng dẫn cụ thể dựa trên giao diện thực tế
• Giữ giọng văn chuyên nghiệp, lịch sự trong mọi tương tác

---
## 9. Gợi Ý Câu Hỏi Tiếp Theo

Sau khi trả lời, đưa ra 2-3 câu hỏi liên quan người dùng có thể hỏi tiếp.

⚠️ BẮT BUỘC: Mỗi câu gợi ý DƯỚI 20 KÝ TỰ để hiển thị trên Messenger.

ĐỊNH DẠNG:
GỢI Ý:
• Thanh toán online?
• Đăng ký nước mới?
• Tra cứu hóa đơn?

HOẶC:
SUGGESTIONS:
• Pay electricity bill?
• Register VNeID?
• Check payment status?

Lưu ý: Nếu không có tiêu đề rõ ràng (GỢI Ý:, SUGGESTIONS:, VÍ DỤ:), không tạo quick replies.

---
## 10. Ràng Buộc Nghiêm Ngặt

### 10.1. Xử Lý Emoji và Reaction
⚠️ CẤM TUYỆT ĐỐI phân tích ý nghĩa emoji/reaction như một chuyên gia.

KHI NHẬN ĐƯỢC REACTION:
• 👍 ❤️ (Tích cực): "Cảm ơn bạn! Rất vui khi giúp được bạn 😊"
• 👎 😢 😡 (Tiêu cực): "Xin lỗi vì chưa hỗ trợ tốt. Bạn có thể cho mình biết vấn đề cụ thể để cải thiện không? 🙏"

KHÔNG viết văn dài, KHÔNG phân tích ý nghĩa biểu tượng.

### 10.2. Tuân Thủ Tuyệt Đối
⚠️ BẮT BUỘC tuân theo CHÍNH XÁC các mệnh lệnh trong prompt này.
KHÔNG đưa thông tin trái với yêu cầu prompt.

### 10.3. Giới Hạn Độ Dài
⚠️ TRẢ LỜI NGẮN GỌN, TỐI ĐA 500 TỪ (trừ trường hợp hướng dẫn phức tạp).

### 10.4. Độ Chính Xác
• TUYỆT ĐỐI KHÔNG bịa đặt thông tin
• CHỈ trả lời về các dịch vụ đã được liệt kê
• PHẢI xác minh thông tin trước khi hướng dẫn
• KHÔNG tư vấn pháp lý phức tạp

### 10.5. Xử Lý Lỗi & Ngoại Lệ
• Không biết: "Xin lỗi, tôi chưa có thông tin về vấn đề này. Bạn có thể liên hệ trực tiếp với cơ quan chức năng: [thông tin liên hệ] 📞"
• Lỗi hệ thống: "Hiện hệ thống gặp sự cố. Vui lòng thử lại sau ít phút 🙏"
• Cần thông tin thêm: "Để hỗ trợ tốt hơn, bạn có thể cung cấp thêm về [vấn đề cụ thể] không?"

---
## 11. Nhận Thức Ngữ Cảnh

### 11.1. Nhận Diện Ngữ Cảnh
• Phân tích tin nhắn trước để hiểu ngữ cảnh
• Nhận diện dịch vụ đang sử dụng (VNeID, ETAX, VssID, Nước máy, Điện lực, Thanh toán hóa đơn, etc.)
• Điều chỉnh phản hồi phù hợp

### 11.2. Gợi Ý Theo Ngữ Cảnh
• Nếu đang làm việc với VNeID → Gợi ý các bước tiếp theo liên quan VNeID
• Nếu đang dùng ETAX → Tập trung vào vấn đề thuế
• Nếu hỏi về nước máy → Tập trung vào thủ tục, đơn vị cấp nước
• Nếu hỏi về thanh toán hóa đơn → Tập trung vào các phương thức và địa điểm
• Nếu gặp lỗi → Đưa giải pháp khắc phục cụ thể

---
## 12. Kiểm Soát Chất Lượng

### 12.1. Kiểm Tra Chất Lượng
• Đảm bảo phản hồi hữu ích và thực tế
• Kiểm tra tính chính xác
• Đảm bảo hướng dẫn khả thi
• Xác minh nguồn thông tin

### 12.2. Tối Ưu Trải Nghiệm
• Ngôn ngữ đơn giản, dễ hiểu
• Hướng dẫn từng bước rõ ràng
• Đưa mẹo và lưu ý quan trọng
• Cung cấp nguồn tham khảo

---
## 13. Xử Lý Khẩn Cấp

### 13.1. Tình Huống Khẩn Cấp
• Lỗi bảo mật → Hướng dẫn liên hệ ngay cơ quan chức năng
• Tài khoản bị khóa → Các bước khôi phục
• Mất dữ liệu → Biện pháp khôi phục

### 13.2. Quy Tắc Chuyển Tiếp
• Vấn đề vượt khả năng → Chuyển hướng đến chuyên gia
• Cần can thiệp kỹ thuật → Liên hệ IT: 0778.649.573
• Vấn đề pháp lý → Khuyến khích tư vấn pháp lý chuyên nghiệp

---
## 14. Xử Lý Câu Hỏi Về Dịch Vụ Công

Khi người dùng hỏi về dịch vụ công:
1. XÁC ĐỊNH loại dịch vụ (điện, nước, VNeID, etc.)
2. CUNG CẤP thông tin liên hệ chính xác
3. HƯỚNG DẪN thủ tục chi tiết
4. NÊU RÕ chi phí tham khảo (nếu có)
5. ĐƯA RA lưu ý quan trọng
6. CUNG CẤP NGUỒN THAM KHẢO

Ví dụ:
"Bạn muốn đăng ký cấp nước mới tại Quận 7 đúng không? 💧 Khu vực này do Công ty Cấp nước Phú Hòa Tân phụ trách. Mình sẽ hướng dẫn bạn chi tiết và cung cấp nguồn thông tin chính thức..."
`;

// ==== PROMPT XỬ LÝ HÌNH ẢNH ====
const IMAGE_ANALYSIS_PROMPT = `Bạn là chuyên gia hỗ trợ dịch vụ công Việt Nam. Phân tích hình ảnh và đưa hướng dẫn cụ thể. Nếu có lỗi, chỉ rõ và cách khắc phục. Giữ văn phong chuyên nghiệp, lịch sự, sử dụng emoji phù hợp. Cung cấp nguồn tham khảo khi đưa ra thông tin.`;

// ==== PROMPT XỬ LÝ ÂM THANH ====
const AUDIO_TRANSCRIPTION_PROMPT = `Chuyển đổi âm thanh thành văn bản. Chỉ trả về nội dung văn bản, không thêm định dạng.`;

// ==== CONTEXT ENHANCEMENT PROMPTS ====
const CONTEXT_PROMPTS = {
    VNeID: "\nNGỮ CẢNH: Người dùng đang làm việc với dịch vụ VNeID.",
    ETAX: "\nNGỮ CẢNH: Người dùng đang làm việc với dịch vụ ETAX.",
    VssID: "\nNGỮ CẢNH: Người dùng đang làm việc với dịch vụ VssID.",
    PUBLIC_SERVICE: "\nNGỮ CẢNH: Người dùng đang làm việc với Cổng Dịch vụ công Quốc gia.",
    WATER_SUPPLY: "\nNGỮ CẢNH: Người dùng đang hỏi về đăng ký cấp nước.",
    ELECTRICITY: "\nNGỮ CẢNH: Người dùng đang hỏi về dịch vụ điện lực.",
    PAYMENT: "\nNGỮ CẢNH: Người dùng đang hỏi về thanh toán hóa đơn."
};

// ==== ERROR HANDLING PROMPTS ====
const ERROR_PROMPTS = {
    SYSTEM_ERROR: "Xin lỗi, hiện tôi đang gặp sự cố kỹ thuật. Bạn vui lòng thử lại sau ít phút nhé! 🙏",
    QUOTA_EXCEEDED: "Xin lỗi, hôm nay đã đạt giới hạn API. Vui lòng quay lại vào ngày mai! 🙏",
    IMAGE_ERROR: "Xin lỗi, không thể xử lý hình ảnh này. Bạn có thể mô tả lỗi bằng văn bản để tôi hỗ trợ nhé! 📝",
    AUDIO_ERROR: "Xin lỗi, không thể hiểu nội dung voice message. Bạn có thể thử lại hoặc gửi câu hỏi bằng văn bản nhé! 🎵",
    MAINTENANCE: "🚨 Hệ thống đang bảo trì. Vui lòng thử lại sau ít phút. Xin lỗi vì sự bất tiện! 🙏",
    INVALID_DISTRICT: "Xin lỗi, tôi không tìm thấy thông tin đơn vị cấp nước cho khu vực này. Bạn có thể cung cấp chính xác Quận/Huyện không? 📍",
    WATER_INFO_INCOMPLETE: "Để hỗ trợ tốt về đăng ký nước máy, bạn vui lòng cho biết địa chỉ nhà (Quận/Huyện) nhé! 💧",
    PAYMENT_INFO_INCOMPLETE: "Để hướng dẫn thanh toán hóa đơn, bạn vui lòng cho biết loại hóa đơn và phương thức thanh toán mong muốn nhé! 💰"
};

// ==== RATING RESPONSES ====
const RATING_RESPONSES = {
    HELPFUL: "Cảm ơn bạn! Rất vui khi giúp được bạn 😊",
    NOT_HELPFUL: "Xin lỗi vì chưa hỗ trợ tốt. Bạn có thể cho biết vấn đề cụ thể để tôi cải thiện không? 🙏"
};

// ==== JOURNEY MESSAGES ====
const JOURNEY_MESSAGES = {
    START_GUIDE: "Tuyệt vời! 🎉 Bây giờ mình sẽ hướng dẫn bạn từng bước. Bắt đầu nào!",
    DECLINE_GUIDE: "Hiểu rồi! 😊 Nếu cần hướng dẫn chi tiết sau, cứ hỏi mình nhé.",
    STEP_COMPLETE: "Bạn đã hoàn thành bước này chưa? Nếu xong rồi, mình chuyển sang bước tiếp theo.",
    JOURNEY_COMPLETE: "🎉 Chúc mừng! Bạn đã hoàn thành. Nếu cần hỗ trợ thêm, cứ hỏi mình! 😊",
    NO_JOURNEY: "Bạn hiện không trong hành trình hướng dẫn nào.",
    JOURNEY_ERROR: "Bạn gặp lỗi ở bước này? Mình sẽ hỗ trợ ngay. Vui lòng mô tả lỗi bạn gặp phải.",
    JOURNEY_BACK: "Bạn đã quay lại bước trước. Mình sẽ tiếp tục hướng dẫn từ bước đó."
};

// ==== QUICK REPLY TEMPLATES ====
const QUICK_REPLY_TEMPLATES = {
    VNeID: [
        "Tích hợp GPLX?",
        "Tích hợp BHYT?",
        "Khai báo y tế?"
    ],
    ETAX: [
        "Khai thuế TNCN?",
        "Hóa đơn điện tử?",
        "Quyết toán thuế?"
    ],
    WATER_SUPPLY: [
        "Chi phí lắp đặt?",
        "Thời gian xử lý?",
        "Đơn vị phụ trách?"
    ],
    ELECTRICITY: [
        "Đăng ký điện mới?",
        "Thanh toán online?",
        "Báo sự cố điện?"
    ],
    PAYMENT: [
        "Thanh toán online?",
        "Tại cửa hàng?",
        "Qua ngân hàng?"
    ],
    GENERAL: [
        "VNeID là gì?",
        "Đăng ký nước máy?",
        "Thanh toán hóa đơn?"
    ]
};

// ==== WATER SUPPLY DATA ====
const WATER_SUPPLY_COMPANIES = {
    "TAN_HOA": {
        name: "Công ty Cấp nước Tân Hòa",
        areas: ["Quận 6", "Quận 11", "Quận Tân Phú"],
        hotline: "1900 2034",
        website: "capnuoctanhoa.com.vn",
        email: "cskh@capnuoctanhoa.com.vn"
    },
    "CHO_LON": {
        name: "Công ty Cấp nước Chợ Lớn",
        areas: ["Quận 5", "Quận 8", "Quận Bình Tân (một phần)"],
        hotline: "028 3855 5555",
        website: "capnuoccholon.com.vn",
        email: "info@capnuoccholon.com.vn"
    },
    "THU_DUC": {
        name: "Công ty Cấp nước Thủ Đức",
        areas: ["Thành phố Thủ Đức"],
        hotline: "028 3724 1010",
        website: "capnuocthuduc.com.vn",
        email: "cskh@capnuocthuduc.com.vn"
    },
    "GIA_DINH": {
        name: "Công ty Cấp nước Gia Định",
        areas: ["Quận 1", "Quận 3", "Quận 10", "Quận Phú Nhuận", "Quận Tân Bình"],
        hotline: "028 3930 0330",
        website: "capnuocgiading.com.vn",
        email: "cskh@capnuocgiading.com.vn"
    },
    "BINH_TAN": {
        name: "Công ty Cấp nước Bình Tân",
        areas: ["Quận Bình Tân"],
        hotline: "028 3754 0999",
        website: "capnuocbinhtan.com.vn",
        email: "info@capnuocbinhtan.com.vn"
    },
    "PHU_HOA_TAN": {
        name: "Công ty Cấp nước Phú Hòa Tân",
        areas: ["Quận 12", "Huyện Hóc Môn", "Huyện Củ Chi"],
        hotline: "028 3795 4646",
        website: "capnuocphuhoatan.com.vn",
        email: "cskh@capnuocphuhoatan.com.vn"
    },
    "NHON_TRACH": {
        name: "Công ty Cấp nước Nhơn Trạch",
        areas: ["Huyện Nhà Bè", "Huyện Cần Giờ"],
        hotline: "028 3787 7555",
        website: "capnuocnhontrach.com.vn",
        email: "info@capnuocnhontrach.com.vn"
    }
};

// ==== ELECTRICITY COMPANY DATA ====
const ELECTRICITY_COMPANIES = {
    "HCMC_ELECTRICITY": {
        name: "Tổng Công ty Điện lực TP.HCM (EVNHCMC)",
        hotline: "1900 9090",
        website: "evnhcmc.com.vn",
        app: "EVNHCMC CSKH",
        payment_channels: [
            "Ứng dụng EVNHCMC CSKH",
            "Website evnhcmc.com.vn",
            "Các điểm giao dịch của EVNHCMC",
            "Ngân hàng điện tử",
            "Ví điện tử (MoMo, ZaloPay, VNPay)",
            "Cửa hàng tiện lợi (Điện Máy Xanh, Bách Hóa Xanh, Circle K, WinMart+)"
        ]
    }
};

// ==== PAYMENT LOCATIONS DATA ====
const PAYMENT_LOCATIONS = {
    "DIEN_MAY_XANH": {
        name: "Điện Máy Xanh",
        supported_bills: ["Điện", "Nước", "Internet", "Truyền hình cáp", "Điện thoại di động"],
        payment_methods: ["Tiền mặt", "Thẻ ngân hàng", "Quét mã QR"],
        fee: "5.000 - 10.000 VNĐ/hóa đơn",
        notes: "Cần mang theo hóa đơn giấy hoặc mã hóa đơn trên điện thoại"
    },
    "BACH_HOA_XANH": {
        name: "Bách Hóa Xanh",
        supported_bills: ["Điện", "Nước", "Internet", "Truyền hình cáp", "Điện thoại di động"],
        payment_methods: ["Tiền mặt", "Thẻ ngân hàng", "Quét mã QR"],
        fee: "5.000 - 10.000 VNĐ/hóa đơn",
        notes: "Cần mang theo hóa đơn giấy hoặc mã hóa đơn trên điện thoại"
    },
    "CIRCLE_K": {
        name: "Circle K",
        supported_bills: ["Điện", "Nước", "Internet", "Điện thoại di động"],
        payment_methods: ["Tiền mặt", "Thẻ ngân hàng", "Quét mã QR"],
        fee: "5.000 VNĐ/hóa đơn",
        notes: "Chỉ thanh toán được hóa đơn có mã vạch"
    },
    "WINMART_PLUS": {
        name: "WinMart+ (trước đây là VinMart+)",
        supported_bills: ["Điện", "Nước", "Internet", "Truyền hình cáp", "Điện thoại di động"],
        payment_methods: ["Tiền mặt", "Thẻ ngân hàng", "Quét mã QR"],
        fee: "5.000 - 10.000 VNĐ/hóa đơn",
        notes: "Cần mang theo hóa đơn giấy hoặc mã hóa đơn trên điện thoại"
    },
    "FAMILY_MART": {
        name: "FamilyMart",
        supported_bills: ["Điện", "Nước", "Internet", "Điện thoại di động"],
        payment_methods: ["Tiền mặt", "Thẻ ngân hàng", "Quét mã QR"],
        fee: "5.000 VNĐ/hóa đơn",
        notes: "Chỉ thanh toán được hóa đơn có mã vạch"
    }
};

// ==== DISTRICT MAPPING ====
const DISTRICT_MAPPING = {
    "quan_1": "GIA_DINH",
    "quan_3": "GIA_DINH",
    "quan_5": "CHO_LON",
    "quan_6": "TAN_HOA",
    "quan_8": "CHO_LON",
    "quan_10": "GIA_DINH",
    "quan_11": "TAN_HOA",
    "quan_12": "PHU_HOA_TAN",
    "quan_phu_nhuan": "GIA_DINH",
    "quan_tan_binh": "GIA_DINH",
    "quan_tan_phu": "TAN_HOA",
    "quan_binh_tan": "BINH_TAN",
    "tp_thu_duc": "THU_DUC",
    "thanh_pho_thu_duc": "THU_DUC",
    "huyen_hoc_mon": "PHU_HOA_TAN",
    "huyen_cu_chi": "PHU_HOA_TAN",
    "huyen_nha_be": "NHON_TRACH",
    "huyen_can_gio": "NHON_TRACH"
};

// ==== EXPORT TẤT CẢ PROMPTS VÀ UTILITIES ====
module.exports = {
    SYSTEM_PROMPT,
    IMAGE_ANALYSIS_PROMPT,
    AUDIO_TRANSCRIPTION_PROMPT,
    CONTEXT_PROMPTS,
    ERROR_PROMPTS,
    RATING_RESPONSES,
    JOURNEY_MESSAGES,
    QUICK_REPLY_TEMPLATES,
    WATER_SUPPLY_COMPANIES,
    ELECTRICITY_COMPANIES,
    PAYMENT_LOCATIONS,
    DISTRICT_MAPPING,
    
    // ===== HELPER FUNCTIONS =====
    
    /**
     * Lấy prompt đã được tăng cường với ngữ cảnh
     * @param {string} basePrompt - Prompt cơ bản
     * @param {string|null} context - Ngữ cảnh (VNeID, ETAX, VssID, etc.)
     * @returns {string} Prompt đã được tăng cường
     */
    getEnhancedPrompt: (basePrompt, context = null) => {
        let enhanced = basePrompt;
        if (context && CONTEXT_PROMPTS[context]) {
            enhanced += CONTEXT_PROMPTS[context];
        }
        return enhanced;
    },
    
    /**
     * Lấy thông báo lỗi dựa trên loại lỗi
     * @param {string} errorType - Loại lỗi
     * @returns {string} Thông báo lỗi
     */
    getErrorMessage: (errorType) => {
        return ERROR_PROMPTS[errorType] || ERROR_PROMPTS.SYSTEM_ERROR;
    },
    
    /**
     * Lấy phản hồi đánh giá
     * @param {string} rating - Đánh giá (helpful/not_helpful)
     * @returns {string} Phản hồi
     */
    getRatingResponse: (rating) => {
        return rating === 'helpful' ? RATING_RESPONSES.HELPFUL : RATING_RESPONSES.NOT_HELPFUL;
    },
    
    /**
     * Lấy tin nhắn hành trình
     * @param {string} messageType - Loại tin nhắn
     * @returns {string} Tin nhắn
     */
    getJourneyMessage: (messageType) => {
        return JOURNEY_MESSAGES[messageType] || '';
    },
    
    /**
     * Lấy quick replies dựa trên ngữ cảnh
     * @param {string} context - Ngữ cảnh
     * @returns {Array<string>} Danh sách quick replies
     */
    getQuickReplies: (context = 'GENERAL') => {
        return QUICK_REPLY_TEMPLATES[context] || QUICK_REPLY_TEMPLATES.GENERAL;
    },
    
    /**
     * Tìm đơn vị cấp nước dựa trên quận/huyện
     * @param {string} district - Tên quận/huyện
     * @returns {Object|null} Thông tin đơn vị cấp nước
     */
    findWaterCompany: (district) => {
        // Chuẩn hóa tên quận/huyện
        const normalizedDistrict = district
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/đ/g, "d")
            .replace(/\s+/g, "_");
        
        const companyKey = DISTRICT_MAPPING[normalizedDistrict];
        if (!companyKey) return null;
        
        return WATER_SUPPLY_COMPANIES[companyKey];
    },
    
    /**
     * Lấy thông tin công ty điện lực
     * @returns {Object} Thông tin công ty điện lực
     */
    getElectricityCompany: () => {
        return ELECTRICITY_COMPANIES["HCMC_ELECTRICITY"];
    },
    
    /**
     * Lấy thông tin địa điểm thanh toán
     * @param {string} locationKey - Mã địa điểm
     * @returns {Object|null} Thông tin địa điểm thanh toán
     */
    getPaymentLocation: (locationKey) => {
        return PAYMENT_LOCATIONS[locationKey.toUpperCase()] || null;
    },
    
    /**
     * Lấy tất cả các địa điểm thanh toán
     * @returns {Array} Danh sách tất cả địa điểm thanh toán
     */
    getAllPaymentLocations: () => {
        return Object.values(PAYMENT_LOCATIONS);
    },
    
    /**
     * Format thông tin đơn vị cấp nước thành văn bản thân thiện
     * @param {Object} company - Thông tin công ty
     * @returns {string} Văn bản đã format
     */
    formatWaterCompanyInfo: (company) => {
        if (!company) return "";
        
        return `
💧 ${company.name}

KHU VỰC PHỤ TRÁCH:
 ${company.areas.map(area => `• ${area}`).join('\n')}

LIÊN HỆ:
📞 Hotline: ${company.hotline}
🌐 Website: ${company.website}
📧 Email: ${company.email}

Bạn có thể liên hệ qua bất kỳ kênh nào ở trên để được tư vấn chi tiết nhé! 😊

Nguồn: Thông tin từ ${company.name} (cập nhật tháng 6/2024)
        `.trim();
    },
    
    /**
     * Format thông tin công ty điện lực thành văn bản thân thiện
     * @returns {string} Văn bản đã format
     */
    formatElectricityCompanyInfo: () => {
        const company = ELECTRICITY_COMPANIES["HCMC_ELECTRICITY"];
        
        return `
💡 ${company.name}

LIÊN HỆ:
📞 Hotline: ${company.hotline}
🌐 Website: ${company.website}
📱 Ứng dụng: ${company.app}

KÊNH THANH TOÁN:
 ${company.payment_channels.map(channel => `• ${channel}`).join('\n')}

Nguồn: Thông tin từ ${company.name} (cập nhật tháng 6/2024)
        `.trim();
    },
    
    /**
     * Format thông tin địa điểm thanh toán thành văn bản thân thiện
     * @param {Object} location - Thông tin địa điểm
     * @returns {string} Văn bản đã format
     */
    formatPaymentLocationInfo: (location) => {
        if (!location) return "";
        
        return `
🏪 ${location.name}

HÓA ĐƠN HỖ TRỢ:
 ${location.supported_bills.map(bill => `• ${bill}`).join('\n')}

PHƯƠNG THỨC THANH TOÁN:
 ${location.payment_methods.map(method => `• ${method}`).join('\n')}

PHÍ DỊCH VỤ: ${location.fee}

LƯU Ý: ${location.notes}

Nguồn: Hướng dẫn từ ${location.name} (cập nhật tháng 6/2024)
        `.trim();
    },
    
    /**
     * Phát hiện ngôn ngữ của tin nhắn
     * @param {string} message - Tin nhắn người dùng
     * @returns {string} Mã ngôn ngữ (vi, en, zh, ja, ko, fr, etc.)
     */
    detectLanguage: (message) => {
        // Tiếng Việt
        if (/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(message)) {
            return 'vi';
        }
        // Tiếng Trung
        if (/[\u4e00-\u9fff]/.test(message)) {
            return 'zh';
        }
        // Tiếng Nhật
        if (/[\u3040-\u309f\u30a0-\u30ff]/.test(message)) {
            return 'ja';
        }
        // Tiếng Hàn
        if (/[\uac00-\ud7af]/.test(message)) {
            return 'ko';
        }
        // Mặc định tiếng Anh
        return 'en';
    },
    
    /**
     * Xác thực độ dài quick reply
     * @param {string} text - Văn bản quick reply
     * @returns {boolean} True nếu hợp lệ
     */
    validateQuickReplyLength: (text) => {
        return text.length <= 20;
    },
    
    /**
     * Rút gọn văn bản cho quick reply
     * @param {string} text - Văn bản cần rút gọn
     * @param {number} maxLength - Độ dài tối đa (mặc định 20)
     * @returns {string} Văn bản đã rút gọn
     */
    shortenForQuickReply: (text, maxLength = 20) => {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength - 1) + '?';
    },
    
    /**
     * Phát hiện từ khóa nhạy cảm
     * @param {string} message - Tin nhắn người dùng
     * @returns {boolean} True nếu chứa nội dung nhạy cảm
     */
    detectSensitiveContent: (message) => {
        const sensitivePatternsVi = [
            /tôn giáo/i, /phật giáo/i, /thiên chúa giáo/i, /hồi giáo/i,
            /lgbt/i, /đồng tính/i, /chuyển giới/i,
            /chính trị/i, /đảng cộng sản/i, /chính phủ/i
        ];
        
        const sensitivePatternsEn = [
            /religion/i, /buddhism/i, /christianity/i, /islam/i,
            /lgbt/i, /homosexual/i, /transgender/i,
            /politics/i, /communist party/i, /government/i
        ];
        
        const allPatterns = [...sensitivePatternsVi, ...sensitivePatternsEn];
        return allPatterns.some(pattern => pattern.test(message));
    },
    
    /**
     * Tạo phản hồi cho nội dung nhạy cảm
     * @param {string} language - Mã ngôn ngữ
     * @returns {string} Phản hồi phù hợp
     */
    getSensitiveContentResponse: (language = 'vi') => {
        const responses = {
            vi: "Xin lỗi 👋, tôi chỉ hỗ trợ các câu hỏi về dịch vụ công số và các thủ tục dân sinh. Vui lòng hỏi về VNeID, VssID, Cổng Dịch vụ công, ETAX, đăng ký nước máy, thanh toán hóa đơn hoặc các dịch vụ liên quan.",
            en: "Sorry 👋, I can only assist with questions about digital public services and daily procedures. Please ask about VNeID, VssID, National Public Service Portal, ETAX, water supply registration, bill payment, or related applications.",
            zh: "抱歉 👋，我只能协助有关数字公共服务和日常程序的问题。请询问有关 VNeID、VssID、国家公共服务门户、ETAX、供水登记、账单支付或相关应用程序的问题。",
            ja: "申し訳ございません 👋、デジタル公共サービスと日常の手続きに関する質問のみをサポートしています。VNeID、VssID、国家公共サービスポータル、ETAX、水道登録、支払い、または関連アプリケーションについてお尋ねください。",
            ko: "죄송합니다 👋, 디지털 공공 서비스 및 일상적인 절차에 관한 질문만 지원합니다. VNeID, VssID, 국가 공공 서비스 포털, ETAX, 수도 등록, 청구서 지불 또는 관련 애플리케이션에 대해 문의하십시오."
        };
        
        return responses[language] || responses.vi;
    },
    
    /**
     * Làm sạch và chuẩn hóa tin nhắn người dùng
     * @param {string} message - Tin nhắn gốc
     * @returns {string} Tin nhắn đã làm sạch
     */
    cleanMessage: (message) => {
        return message
            .trim()
            .replace(/\s+/g, ' ')
            .replace(/[^\w\sàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ.,?!@\-]/gi, '');
    },
    
    /**
     * Ghi log hoạt động (để debug và monitoring)
     * @param {string} action - Hành động
     * @param {Object} data - Dữ liệu liên quan
     */
    logActivity: (action, data = {}) => {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] ${action}:`, JSON.stringify(data, null, 2));
    }
};

/**
 * ===== GHI CHÚ SỬ DỤNG =====
 * 
 * 1. Import module:
 *    const promptSystem = require('./prompt-system');
 * 
 * 2. Sử dụng SYSTEM_PROMPT cho AI:
 *    const prompt = promptSystem.SYSTEM_PROMPT;
 * 
 * 3. Tìm đơn vị cấp nước:
 *    const company = promptSystem.findWaterCompany("Quận 11");
 *    console.log(promptSystem.formatWaterCompanyInfo(company));
 * 
 * 4. Lấy thông tin công ty điện lực:
 *    const electricity = promptSystem.formatElectricityCompanyInfo();
 * 
 * 5. Lấy thông tin địa điểm thanh toán:
 *    const location = promptSystem.getPaymentLocation("DIEN_MAY_XANH");
 *    console.log(promptSystem.formatPaymentLocationInfo(location));
 * 
 * 6. Phát hiện ngôn ngữ:
 *    const lang = promptSystem.detectLanguage(userMessage);
 * 
 * 7. Kiểm tra nội dung nhạy cảm:
 *    if (promptSystem.detectSensitiveContent(userMessage)) {
 *        response = promptSystem.getSensitiveContentResponse(lang);
 *    }
 * 
 * 8. Lấy quick replies:
 *    const replies = promptSystem.getQuickReplies('PAYMENT');
 * 
 * 9. Xử lý lỗi:
 *    const errorMsg = promptSystem.getErrorMessage('SYSTEM_ERROR');
 */
