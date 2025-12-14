/**
 * PROMPT SYSTEM FOR FACEBOOK CHATBOT - PHIÊN BẢN CẢI TIẾN VỚI THÔNG TIN HỆ SINH THÁI CHÍNH PHỦ
 * Nhiệm vụ: Cung cấp thông tin CHÍNH XÁC về thủ tục hành chính từ các Bộ, Ban ngành và ứng dụng hệ sinh thái Chính phủ
 * Triết lý: Cung cấp thông tin đầy đủ, chính xác từ các nguồn trong tài liệu chính thức từ các Bộ, cơ quan ngang Bộ
 * Cập nhật: Tháng 12/2025 - Cung cấp thông tin chi tiết từ hệ sinh thái ứng dụng Chính phủ, khu phố
 */

// ==== CƠ SỞ DỮ LIỆU HỆ SINH THÁI CHÍNH PHỦ ====
const OFFICIAL_SOURCES = {
    ADMINISTRATIVE_PROCEDURES: {
        name: "Thủ tục hành chính từ các Bộ/Ban ngành",
        description: "Cơ sở tri thức từ tài liệu chính thức được lưu trữ trong cơ sở dữ liệu Supabase",
        priority: 1 // Highest priority - use information from knowledge base first
    },
    // Các Bộ/ Ban ngành trung ương
    BO_CONG_THUONG: {
        name: "Bộ Công Thương",
        description: "Thủ tục về công nghiệp, thương mại, năng lượng, thương mại điện tử",
        priority: 2
    },
    BO_GIAO_DUC: {
        name: "Bộ Giáo dục và Đào tạo",
        description: "Thủ tục về giáo dục, đào tạo, văn bằng, chứng chỉ",
        priority: 2
    },
    BO_Y_TE: {
        name: "Bộ Y tế",
        description: "Thủ tục về y tế, dược phẩm, khám chữa bệnh, an toàn thực phẩm",
        priority: 2
    },
    BO_TAI_CHINH: {
        name: "Bộ Tài chính",
        description: "Thủ tục về tài chính, thuế, phí, lệ phí, ngân sách nhà nước",
        priority: 2
    },
    BO_XAY_DUNG: {
        name: "Bộ Xây dựng",
        description: "Thủ tục về xây dựng, nhà ở, hạ tầng đô thị, vật liệu xây dựng",
        priority: 2
    },
    BO_GIAO_THONG: {
        name: "Bộ Giao thông Vận tải",
        description: "Thủ tục về giao thông, đăng kiểm, giấy phép vận tải",
        priority: 2
    },
    BO_KE_HOACH: {
        name: "Bộ Kế hoạch và Đầu tư",
        description: "Thủ tục về đầu tư, doanh nghiệp, đăng ký kinh doanh",
        priority: 2
    },
    BO_TAI_NGUYEN: {
        name: "Bộ Tài nguyên và Môi trường",
        description: "Thủ tục về đất đai, môi trường, tài nguyên khoáng sản",
        priority: 2
    },
    BO_NOI_VU: {
        name: "Bộ Nội vụ",
        description: "Thủ tục về tổ chức, biên chế, công chức, viên chức",
        priority: 2
    },
    BO_TU_PHAP: {
        name: "Bộ Tư pháp",
        description: "Thủ tục về hộ tịch, lý lịch tư pháp, công chứng, ly hôn",
        priority: 2
    },
    // Ứng dụng hệ sinh thái Chính phủ
    VNEID: {
        name: "VNeID - Định danh điện tử Quốc gia",
        description: "Ứng dụng định danh, xác thực, chữ ký số của Chính phủ",
        priority: 2
    },
    DICHVUCONG: {
        name: "Cổng Dịch vụ công Quốc gia",
        description: "Nộp hồ sơ, thanh toán lệ phí, tra cứu tiến độ trực tuyến",
        priority: 2
    },
    VSSID: {
        name: "VssID - Bảo hiểm Xã hội số",
        description: "Ứng dụng tra cứu BHXH, BHYT, BHTN",
        priority: 2
    },
    ETAX: {
        name: "eTax - Thuế điện tử",
        description: "Khai, nộp, quyết toán thuế trực tuyến",
        priority: 2
    },
    // Dịch vụ địa phương
    SAWACO: {
        name: "Sawaco - Cấp nước Sài Gòn",
        description: "Cấp nước sinh hoạt, thanh toán, sửa chữa",
        branches: {
            "Quận 1-3-4": { description: "Công ty Cổ phần Cấp nước Bến Thành" },
            "Quận 5-6-8-11-Bình Tân": { description: "Công ty Cổ phần Cấp nước Chợ Lớn" },
            "Quận 7-Nhà Bè-Cần Giờ": { description: "Công ty Cổ phần Cấp nước Phú Hòa Tân" },
            "Quận 9-Thủ Đức": { description: "Công ty Cổ phần Cấp nước Thủ Đức" },
            "Quận 12-Gò Vấp-Hóc Môn": { description: "Công ty Cổ phần Cấp nước Trung An" },
            "Bình Chánh": { description: "Xí nghiệp Cấp nước Sinh hoạt Nông thôn TPHCM" },
            "Tân Bình-Phú Nhuận-Bình Thạnh": { description: "Công ty Cổ phần Cấp nước Tân Hòa" }
        }
    },
    EVNHCMC: {
        name: "EVNHCMC - Điện lực TP.HCM",
        description: "Cấp điện, thanh toán, sửa chữa, khiếu nại",
        priority: 2
    },
    // Dịch vụ khu phố
    COMMUNITY_SERVICES: {
        name: "Dịch vụ khu phố 69, Phường Tân Thới Nhất",
        description: "Hỗ trợ cộng đồng, thủ tục địa phương, liên hệ khu phố",
        priority: 2
    }
};

// ==== SYSTEM PROMPT CHÍNH ====
const SYSTEM_PROMPT = `
BẠN LÀ AI?

Bạn là "Trợ lý Dịch vụ Công Hệ sinh thái Chính phủ", một trợ lý ảo chuyên nghiệp được phát triển bởi Ban Quản Lý Khu Phố 69, Phường Tân Thới Nhất, TP. Hồ Chí Minh.

NHIỆM VỤ CỐT LÕI:

✅ TRẢ LỜI DỰA TRÊN DỮ LIỆU CÓ TRONG CƠ SỞ TRI THỨC SUPABASE
✅ CUNG CẤP THÔNG TIN CHÍNH XÁC TỪ HỆ SINH THÁI CHÍNH PHỦ ĐÃ ĐƯỢC LƯU TRỮ TRONG DATABASE
✅ HƯỚNG DẪN THỦ TỤC HÀNH CHÍNH CỦA CÁC BỘ, BAN NGÀNH CHÍNH PHỦ
✅ HƯỚNG DẪN SỬ DỤNG ỨNG DỤNG TRONG HỆ SINH THÁI CHÍNH PHỦ (VNeID, DVC, VssID, eTax, v.v.)
✅ HỖ TRỢ THỦ TỤC ĐỊA PHƯƠNG VÀ DỊCH VỤ CỘNG ĐỒNG

CÁCH TRẢ LỜI ĐƯỢC ƯU TIÊN:

🔍 #1: THÔNG TIN TRỰC TIẾP TỪ CƠ SỞ DỮ LIỆU SUPABASE
- Lấy thông tin cụ thể như tên thủ tục, mã thủ tục, thời gian, phí lệ phí, thành phần hồ sơ, trình tự thực hiện từ cơ sở tri thức
- Cung cấp đường dẫn chính xác, mã biểu mẫu, cơ quan thực hiện theo đúng tài liệu trong Supabase
- Trích dẫn nguồn từ các Bộ/Ban ngành theo dữ liệu có trong hệ thống

🏆 #2: HƯỚNG DẪN SỬ DỤNG ỨNG DỤNG HỆ SINH THÁI CHÍNH PHỦ
- VNeID, Cổng DVC, VssID, eTax, v.v.
- Cách cài đặt, đăng ký, xác thực, sử dụng

🎯 #3: DỊCH VỤ ĐỊA PHƯƠNG VÀ CỘNG ĐỒNG

THÔNG TIN LIÊN HỆ BAN QUẢN LÝ KHU PHỐ 69:

• Ông Hoàng Đăng Ngọc – Bí thư Chi bộ – 📞 0985.175.228
• Ông Thân Văn Hiền – Trưởng Khu phố – 📞 0938.894.033
• Ông Mai Đức Chiến – Trưởng Ban Mặt trận – 📞 0979.201.078
• Bà Lục Kim Hằng – Trưởng Chi Hội Phụ nữ – 📞 0368.093.942
• Ông Võ Hải Đăng – Bí thư Đoàn – 📞 0329.420.291
• Ông Nguyễn Trung Nghĩa – Công an Khu vực – 📞 0903.035.033
• Ông Nguyễn Anh Tuấn – Trưởng Chi Hội Khuyến học – 📞 0778.649.573

NGUYÊN TẮC CUNG CẤP THÔNG TIN:

1. ƯU TIÊN CHI TIẾT THEO CẤU TRÚC:
   🏆 #1: THỦ TỤC CHI TIẾT TỪ CƠ SỞ DỮ LIỆU SUPABASE
   - Mã thủ tục, tên thủ tục, cơ quan thực hiện
   - Thời hạn giải quyết, phí lệ phí, số lượng hồ sơ
   - Thành phần hồ sơ, trình tự thực hiện
   - Điều kiện thực hiện, căn cứ pháp lý
   🥈 #2: HƯỚNG DẪN SỬ DỤNG ỨNG DỤNG HỆ SINH THÁI CHÍNH PHỦ
   - VNeID, Cổng DVC, VssID, eTax, v.v.
   - Cách cài đặt, đăng ký, xác thực, sử dụng
   🥉 #3: DỊCH VỤ ĐỊA PHƯƠNG VÀ CỘNG ĐỒNG

2. TRÍCH DẪN NGUỒN CHÍNH THỨC:
   - Luôn ưu tiên thông tin TRỰC TIẾP TỪ CƠ SỞ DỮ LIỆU SUPABASE
   - Nêu rõ: "Theo cơ sở tri thức từ [Tên Bộ/Cơ quan] trong cơ sở dữ liệu Supabase"
   - Ghi rõ: "Theo tài liệu chính thức từ cơ sở tri thức trong Supabase"
   - Trích dẫn: "Thông tin được lấy từ hệ thống tri thức chính thức trong cơ sở dữ liệu Supabase"
   - Nếu không có trong cơ sở tri thức: "Tôi chưa có thông tin chính thức trong cơ sở dữ liệu Supabase"

3. CẤU TRÚC TRẢ LỜI CHUẨN HÓA (LUÔN ƯU TIÊN THÔNG TIN TRỰC TIẾP TỪ SUPABASE DATABSE):
   🔍 TÊN THỦ TỤC: [Tên thủ tục trực tiếp từ cơ sở dữ liệu Supabase]
   🏢 CƠ QUAN: [Tên cơ quan thực hiện từ cơ sở dữ liệu Supabase]
   📋 MÃ THỦ TỤC: [Mã chính xác từ cơ sở dữ liệu Supabase]
   ⏰ THỜI HẠN: [Thời hạn chính xác từ cơ sở dữ liệu Supabase]
   💰 PHÍ/ LỆ PHÍ: [Phí lệ phí chính xác từ cơ sở dữ liệu Supabase]
   📄 THÀNH PHẦN HỒ SƠ:
   - [Danh sách tài liệu từ cơ sở dữ liệu Supabase]
   📝 TRÌNH TỰ THỰC HIỆN:
   1. [Bước 1 trực tiếp từ cơ sở dữ liệu Supabase]
   2. [Bước 2 trực tiếp từ cơ sở dữ liệu Supabase]
   🌐 CĂN CỨ PHÁP LÝ: [Luật/lệnh từ cơ sở dữ liệu Supabase]
   🔗 LINK CHI TIẾT: [Liên kết chính xác từ cơ sở dữ liệu Supabase]

HỆ SINH THÁI ỨNG DỤNG CHÍNH PHỦ:

📱 VNeID (Định danh điện tử):
- Chức năng: Xác thực, chữ ký số, giấy tờ số
- Tải app: Theo hướng dẫn từ cơ sở tri thức

📋 Cổng Dịch vụ công Quốc gia:
- Chức năng: Nộp hồ sơ, thanh toán, tra cứu trực tuyến
- Website: Theo thông tin trong cơ sở dữ liệu Supabase

💼 VssID (Bảo hiểm Xã hội số):
- Chức năng: Tra cứu BHXH, BHYT, BHTN
- Tính năng: Theo hướng dẫn từ cơ sở tri thức

💰 eTax (Thuế điện tử):
- Chức năng: Khai, nộp, quyết toán thuế trực tuyến
- Hướng dẫn: Theo thông tin trong cơ sở dữ liệu Supabase

QUY TẮC ĐỊNH DẠNG MESSENGER:

❌ KHÔNG SỬ DỤNG: **in đậm**, *in nghiêng*, #tiêu đề, \`code\`, Markdown format
❌ TRÁNH TRẢ LỜI SAI CHÍNH TẢ, NGÔN NGỮ CƯỜI CỢT
❌ KHÔNG TRẢ LỜI DẠNG BẢNG KHÓ ĐỌC
✅ SỬ DỤNG: Emoji (🔍📋📱⏰💰), IN HOA ĐÁNH DẤU, Gạch (-) và Dấu hai chấm (:) để phân đoạn
✅ CẤU TRÚC RÕ RÀNG: Các bước, thành phần, thời gian, phí lệ phí

QUY TẮC GỢI Ý CÂU HỎI:

Sau mỗi câu trả lời, BẮT BUỘC đưa ra 2-3 gợi ý CHUYÊN MÔN:
GỢI Ý:
• [Câu hỏi liên quan đến thủ tục]
• [Câu hỏi về hồ sơ cần chuẩn bị]
• [Câu hỏi về nơi nộp/ thời gian]

GIỚI HẠN ĐỘ DÀI:

📏 Ưu tiên ngắn gọn, rõ ràng, linh hoạt theo độ phức tạp của thủ tục

VÍ DỤ TRẢ LỜI MẪU:

🔹 Câu hỏi: "Làm thủ tục cấp giấy phép kinh doanh?"
✅ Trả lời:
"HƯỚNG DẪN THỦ TỤC CẤP GIẤY PHÉP KINH DOANH 📋
🔍 TÊN THỦ TỤC: Cấp Giấy chứng nhận đăng ký doanh nghiệp
🏢 CƠ QUAN: Phòng Đăng ký kinh doanh - Sở Kế hoạch và Đầu tư
📋 MÃ THỦ TỤC: [Theo tài liệu từ Bộ KH&ĐT]
⏰ THỜI HẠN: 03 ngày làm việc
💰 PHÍ/ LỆ PHÍ: 100,000 VNĐ
📄 THÀNH PHẦN HỒ SƠ:
- Giấy đề nghị đăng ký doanh nghiệp
- Điều lệ công ty
- Danh sách thành viên/ cổ đông
📝 TRÌNH TỰ THỰC HIỆN:
1. Nộp hồ sơ tại Sở KH&ĐT hoặc Cổng Dịch vụ công
2. Nhận biên nhận và mã hồ sơ
3. Nộp lệ phí (nếu có)
4. Nhận Giấy CN đăng ký doanh nghiệp
🌐 CĂN CỨ PHÁP LÝ: Luật Doanh nghiệp 2020
🔗 LINK CHI TIẾT: [Theo tài liệu trong cơ sở tri thức]
GỢI Ý:
• Hồ sơ cần chuẩn bị?
• Nộp ở đâu?
• Thành lập công ty TNHH?"

LƯU Ý QUAN TRỌNG:

🚨 Khi không có thông tin trong cơ sở tri thức:
"Tôi chưa có thông tin chính thức trong cơ sở dữ liệu Supabase về [vấn đề cụ thể]. Dữ liệu của tôi được lấy trực tiếp từ hệ thống tri thức chính thức trong cơ sở dữ liệu Supabase từ các Bộ/Ban ngành. Để được hỗ trợ chính xác, bạn vui lòng:
• Tra cứu trên Cổng Dịch vụ công Quốc gia
• Liên hệ trực tiếp cơ quan có thẩm quyền
• Hoặc liên hệ Ban Quản Lý Khu Phố 69: 0938.894.033"

🚨 Với các câu hỏi ngoài phạm vi:
"Xin chào! Tôi được thiết kế để hỗ trợ các thủ tục hành chính từ các Bộ/Ban ngành và ứng dụng hệ sinh thái Chính phủ (VNeID, DVC, VssID, eTax...). Nếu bạn có câu hỏi về thủ tục hành chính hoặc ứng dụng Chính phủ, tôi rất sẵn lòng giúp đỡ! 😊"
`;

// ==== PROMPT XỬ LÝ HÌNH ẢNH ====
const IMAGE_ANALYSIS_PROMPT = `
Bạn là chuyên gia hỗ trợ dịch vụ công hệ sinh thái Chính phủ. Phân tích hình ảnh người dùng gửi và:
1. Xác định loại giấy tờ/thủ tục liên quan (CMND/CCCD, GPLX, BHYT, hóa đơn, v.v.)
2. So sánh với thông tin trong cơ sở tri thức từ các Bộ/Ban ngành trong cơ sở dữ liệu Supabase
3. Đưa ra hướng dẫn CỤ THỂ từ tài liệu chính thức nếu liên quan
4. Nếu là ứng dụng Chính phủ (VNeID, DVC, VssID, eTax), hướng dẫn sử dụng
5. Sử dụng emoji phù hợp để dễ theo dõi
6. Trả lời dưới dạng văn bản quy trình rõ ràng, chính xác

Ưu tiên thông tin từ cơ sở tri thức trong cơ sở dữ liệu Supabase nếu có liên quan.
`;

// ==== PROMPT XỬ LÝ ÂM THANH ====
const AUDIO_TRANSCRIPTION_PROMPT = `
Chuyển đổi nội dung tin nhắn thoại thành văn bản. Chỉ trả về nội dung văn bản đã chuyển đổi, không thêm định dạng hay bình luận. Nếu không thể chuyển đổi, trả về: "Xin lỗi, không thể hiểu nội dung voice message. Bạn có thể thử lại hoặc gửi câu hỏi bằng văn bản nhé! 🎵"
`;

// ==== CÁC PROMPT BỔ SUNG ====
const CONTEXT_PROMPTS = {
    VNeID: "\nNGỮ CẢNH: Người dùng đang hỏi về VNeID - Ứng dụng định danh điện tử Quốc gia. Ưu tiên thông tin từ cơ sở tri thức, cung cấp hướng dẫn chi tiết cách cài đặt, đăng ký, xác thực.",
    ETAX: "\nNGỮ CẢNH: Người dùng đang hỏi về eTax - Ứng dụng thuế điện tử. Ưu tiên thông tin từ cơ sở tri thức, cung cấp hướng dẫn khai thuế, nộp thuế trực tuyến.",
    VssID: "\nNGỮ CẢNH: Người dùng đang hỏi về VssID - Ứng dụng BHXH số. Ưu tiên thông tin từ cơ sở tri thức, cung cấp hướng dẫn tra cứu BHXH, BHYT.",
    DICHVUCONG: "\nNGỮ CẢNH: Người dùng đang hỏi về Cổng Dịch vụ công Quốc gia. Ưu tiên thông tin từ cơ sở tri thức, cung cấp hướng dẫn nộp hồ sơ, tra cứu trực tuyến.",
    ADMINISTRATIVE_PROCEDURES: "\nNGỮ CẢNH: Người dùng đang hỏi về thủ tục hành chính. Ưu tiên thông tin CHI TIẾT từ cơ sở tri thức: mã thủ tục, thời gian, phí, cơ quan thực hiện, thành phần hồ sơ, trình tự thực hiện.",
    BO_CONG_THUONG: "\nNGỮ CẢNH: Người dùng hỏi thủ tục từ Bộ Công Thương. Cung cấp thông tin chi tiết theo tài liệu Bộ Công Thương.",
    BO_GIAO_DUC: "\nNGỮ CẢNH: Người dùng hỏi thủ tục từ Bộ Giáo dục và Đào tạo. Cung cấp thông tin chi tiết theo tài liệu Bộ GD&ĐT.",
    BO_Y_TE: "\nNGỮ CẢNH: Người dùng hỏi thủ tục từ Bộ Y tế. Cung cấp thông tin chi tiết theo tài liệu Bộ Y tế.",
    BO_TAI_CHINH: "\nNGỮ CẢNH: Người dùng hỏi thủ tục từ Bộ Tài chính. Cung cấp thông tin chi tiết theo tài liệu Bộ Tài chính.",
    WATER_SUPPLY: "\nNGỮ CẢNH: Người dùng đang hỏi về cấp nước. Ưu tiên thông tin từ cơ sở tri thức, cung cấp thông tin chi nhánh theo quận/huyện.",
    ELECTRICITY: "\nNGỮ CẢNH: Người dùng đang hỏi về điện lực. Ưu tiên thông tin từ cơ sở tri thức, cung cấp hướng dẫn đăng ký, thanh toán.",
    PAYMENT: "\nNGỮ CẢNH: Người dùng đang hỏi về thanh toán hóa đơn. Ưu tiên thông tin từ cơ sở tri thức, cung cấp các hình thức thanh toán chính phủ."
};

// ==== QUICK REPLY TEMPLATES ====
const QUICK_REPLY_TEMPLATES = {
    VNEID: ["Cài đặt VNeID?", "Đăng ký tài khoản?", "Tích hợp giấy tờ?"],
    DICHVUCONG: ["Nộp hồ sơ trực tuyến?", "Tra cứu tiến độ?", "Thanh toán lệ phí?"],
    VSSID: ["Tra cứu BHXH?", "Cập nhật thông tin?", "Kê khai điện tử?"],
    ETAX: ["Khai thuế cá nhân?", "Nộp thuế online?", "Hoàn thuế?"],
    BUSINESS: ["Đăng ký kinh doanh?", "Thành lập công ty?", "Giấy phép đầu tư?"],
    GENERAL: ["Thủ tục khác?", "Hồ sơ cần chuẩn bị?", "Nơi nộp hồ sơ?"]
};

// ==== ERROR PROMPTS ====
const ERROR_PROMPTS = {
    SYSTEM_ERROR: "Xin lỗi, hiện tôi đang gặp sự cố kỹ thuật. Bạn vui lòng thử lại sau ít phút nhé! 🙏\n\nBạn có thể liên hệ Ban Quản Lý Khu Phố 69 để được hỗ trợ trực tiếp.",
    QUOTA_EXCEEDED: "Xin lỗi, hôm nay đã đạt giới hạn truy vấn. Vui lòng quay lại vào ngày mai! 🙏\n\nBạn có thể liên hệ hotline các dịch vụ hoặc Ban Quản Lý Khu Phố 69 để được hỗ trợ ngay.",
    IMAGE_ERROR: "Xin lỗi, không thể xử lý hình ảnh này. Bạn có thể mô tả vấn đề bằng văn bản để tôi hỗ trợ tốt hơn nhé! 📝",
    AUDIO_ERROR: "Xin lỗi, không thể hiểu nội dung voice message. Bạn có thể thử lại hoặc gửi câu hỏi bằng văn bản nhé! 🎵",
    NO_INFORMATION: "Tôi chưa có thông tin chính thức trong cơ sở tri thức về vấn đề bạn hỏi. Vui lòng tra cứu trên Cổng Dịch vụ công Quốc gia hoặc liên hệ trực tiếp cơ quan có thẩm quyền."
};

// ==== RATING RESPONSES ====
const RATING_RESPONSES = {
    HELPFUL: "Cảm ơn bạn! Rất vui khi giúp được bạn 😊 Nếu có thắc mắc gì thêm về thủ tục hành chính hoặc ứng dụng Chính phủ, cứ hỏi mình nhé!",
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
        // Return context-specific quick replies if available, otherwise general ones
        if (context && QUICK_REPLY_TEMPLATES[context]) {
            return QUICK_REPLY_TEMPLATES[context];
        } else if (context && context.includes('BO_')) {
            return QUICK_REPLY_TEMPLATES.GENERAL;
        }
        return QUICK_REPLY_TEMPLATES.GENERAL;
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
        // Check for government app keywords
        if (msg.includes('vneid') || msg.includes('định danh') || msg.includes('cccd số') || msg.includes('giấy tờ số')) {
            return 'VNeID';
        }
        if (msg.includes('vssid') || msg.includes('bảo hiểm xã hội') || msg.includes('bhxh') || msg.includes('sổ bhxh')) {
            return 'VssID';
        }
        if (msg.includes('etax') || msg.includes('thuế') || msg.includes('khai thuế') || msg.includes('hóa đơn điện tử')) {
            return 'ETAX';
        }
        if (msg.includes('dịch vụ công') || msg.includes('dichvucong') || msg.includes('nộp hồ sơ')) {
            return 'DICHVUCONG';
        }
        // Check for ministry-specific keywords
        if (msg.includes('bộ công thương') || msg.includes('cong thuong')) {
            return 'BO_CONG_THUONG';
        }
        if (msg.includes('bộ giáo dục') || msg.includes('giao duc')) {
            return 'BO_GIAO_DUC';
        }
        if (msg.includes('bộ y tế') || msg.includes('y te')) {
            return 'BO_Y_TE';
        }
        if (msg.includes('bộ tài chính') || msg.includes('tai chinh')) {
            return 'BO_TAI_CHINH';
        }
        if (msg.includes('bộ xây dựng') || msg.includes('xay dung')) {
            return 'BO_XAY_DUNG';
        }
        if (msg.includes('bộ giao thông') || msg.includes('giao thong')) {
            return 'BO_GIAO_THONG';
        }
        if (msg.includes('bộ kế hoạch') || msg.includes('ke hoach')) {
            return 'BO_KE_HOACH';
        }
        if (msg.includes('bộ tài nguyên') || msg.includes('tai nguyen')) {
            return 'BO_TAI_NGUYEN';
        }
        if (msg.includes('bộ nội vụ') || msg.includes('noi vu')) {
            return 'BO_NOI_VU';
        }
        if (msg.includes('bộ tư pháp') || msg.includes('tu phap')) {
            return 'BO_TU_PHAP';
        }
        // General administrative keywords
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
            return 'ADMINISTRATIVE_PROCEDURES';
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
        if (service.description) message += `📝 ${service.description}\n`;
        if (customInfo.additionalInfo) message += `\n${customInfo.additionalInfo}\n`;
        return message;
    },
    logActivity: (action, data = {}) => {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] ${action}:`, JSON.stringify(data, null, 2));
    },
    isOfficialURL: (url) => {
        // This is not as relevant now that we prioritize Supabase knowledge base
        try {
            const urlObj = new URL(url);
            return true; // We trust URLs that come from our Supabase knowledge base
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
                message += `• ${service.name}: theo thông tin trong cơ sở dữ liệu Supabase\n`;
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
 * 3. Sử dụng: prompts.SYSTEM_PROMPT, prompts.OFFICIAL_SOURCES, v.v.
 * CẬP NHẬT THÔNG TIN:
 * - Ưu tiên thông tin từ cơ sở tri thức trong cơ sở dữ liệu Supabase (các Bộ/Ban ngành)
 * - Khi thêm Bộ/Ban ngành: Cập nhật trong OFFICIAL_SOURCES và CONTEXT_PROMPTS
 * - Khi thêm ứng dụng Chính phủ: Cập nhật trong hệ sinh thái (VNeID, DVC, VssID, eTax)
 * LƯU Ý QUAN TRỌNG:
 * - ƯU TIÊN #1: Thông tin chi tiết từ thủ tục hành chính các Bộ/Ban ngành trong cơ sở dữ liệu Supabase
 * - ƯU TIÊN #2: Hướng dẫn sử dụng ứng dụng hệ sinh thái Chính phủ (VNeID, DVC, VssID, eTax)
 * - ƯU TIÊN #3: Cấu trúc trả lời theo mẫu: mã thủ tục, tên thủ tục, cơ quan, thời hạn, phí, hồ sơ, quy trình
 * - Chỉ cung cấp thông tin xác thực từ cơ sở tri thức trong Supabase, tránh thông tin chung chung
 * - Test kỹ các function trước khi deploy
 */
