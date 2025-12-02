/**
 * PROMPT SYSTEM FOR FACEBOOK CHATBOT - PHIÊN BẢN CẢI TIẾN VỚI THÔNG TIN CHÍNH XÁC
 * Nhiệm vụ: Cung cấp thông tin CHÍNH XÁC với URL và nguồn tin chính thức
 * Triết lý: Cung cấp thông tin đầy đủ, chính xác từ các nguồn Chính phủ và doanh nghiệp nhà nước
 * Cập nhật: Tháng 10/2025, chỉnh sửa toàn bộ URL dựa trên kiểm tra thời gian thực, bổ sung chi nhánh SAWACO chính xác, cải tiến hàm xử lý
 */

// ==== CƠ SỞ DỮ LIỆU THÔNG TIN CHÍNH THỨC ====
const OFFICIAL_SOURCES = {
    VNEID: {
        name: "VNeID - Định danh điện tử",
        website: "https://dichvucong.gov.vn",
        app_android: "https://play.google.com/store/apps/details?id=com.vnid",
        app_ios: "https://apps.apple.com/vn/app/vneid/id1582750372",
        hotline: "1022",
        description: "Ứng dụng định danh điện tử quốc gia"
    },
    DICHVUCONG: {
        name: "Cổng Dịch vụ công Quốc gia",
        website: "https://dichvucong.gov.vn",
        hotline: "1900.1599",
        description: "Tra cứu và nộp hồ sơ trực tuyến"
    },
    VSSID: {
        name: "VssID - Bảo hiểm xã hội số",
        website: "https://vss.gov.vn",
        app_android: "https://play.google.com/store/apps/details?id=com.bhxhapp",
        app_ios: "https://apps.apple.com/vn/app/vssid/id1521647264",
        hotline: "1900.6050",
        description: "Ứng dụng tra cứu thông tin bảo hiểm xã hội"
    },
    ETAX: {
        name: "eTax - Thuế điện tử",
        website: "https://thuedientu.gdt.gov.vn",
        hotline: "1900.4567",
        guide: "https://www.gdt.gov.vn/wps/portal/home/etax-mobile",
        description: "Hệ thống khai thuế điện tử"
    },
    EVNHCMC: {
        name: "EVNHCMC - Điện lực TP.HCM",
        website: "https://www.evnhcmc.vn",
        hotline: "1900.54.54.54",
        app_website: "https://www.evnhcmc.vn/Tracuu",
        payment: "https://www.evnhcmc.vn/Thanhtoantructuyen",
        register: "https://www.evnhcmc.vn/GiaoDichTrucTuyen/capdien"
    },
    SAWACO: {
        name: "Sawaco - Cấp nước Sài Gòn",
        website: "https://sawaco.com.vn",
        hotline: "1900 999 997",
        description: "Hotline tổng đài chăm sóc khách hàng chính thức, cập nhật từ tháng 10/2025",
        payment: "https://cskh.sawaco.com.vn/thanh-toan",
        register: "https://cskh.sawaco.com.vn/dang-ky-gan-moi-ca-nhan",
        branches: {
            "Quận 1-3-4": {
                url: "https://benthanh.sawaco.com.vn/",
                hotline: "(028) 38256020",
                description: "Công ty Cổ phần Cấp nước Bến Thành"
            },
            "Quận 5-6-8-11-Bình Tân": {
                url: "https://capnuoccholon.com.vn/",
                hotline: "(028) 38551738",
                description: "Công ty Cổ phần Cấp nước Chợ Lớn"
            },
            "Quận 7-Nhà Bè-Cần Giờ": {
                url: "https://phuwaco.com.vn/",
                hotline: "(028) 39950707",
                description: "Công ty Cổ phần Cấp nước Phú Hòa Tân"
            },
            "Quận 9-Thủ Đức": {
                url: "http://capnuocthuduc.vn/",
                hotline: "19001012",
                description: "Công ty Cổ phần Cấp nước Thủ Đức"
            },
            "Quận 12-Gò Vấp-Hóc Môn": {
                url: "https://capnuoctrungan.vn/",
                hotline: "19001836",
                description: "Công ty Cổ phần Cấp nước Trung An"
            },
            "Bình Chánh": {
                url: "https://nongthon.sawaco.com.vn/",
                hotline: "(028) 38291777",
                description: "Xí nghiệp Cấp nước Sinh hoạt Nông thôn TPHCM"
            },
            "Tân Bình-Phú Nhuận-Bình Thạnh": {
                url: "https://www.capnuoctanhoa.com.vn/",
                hotline: "(028) 38445981",
                description: "Công ty Cổ phần Cấp nước Tân Hòa"
            }
        }
    },
    PAYMENT: {
        vnpay: {
            name: "VNPay",
            website: "https://vnpay.vn",
            app: "https://play.google.com/store/apps/details?id=vnpay.smartacccount",
            hotline: "1900.55.55.77"
        },
        momo: {
            name: "MoMo",
            website: "https://momo.vn",
            hotline: "1900.54.54.41"
        },
        zalopay: {
            name: "ZaloPay",
            website: "https://zalopay.vn",
            hotline: "1900.56.56.56"
        },
        viettel_money: {
            name: "Viettel Money",
            website: "https://viettelmoney.vn",
            hotline: "1900.8119"
        }
    }
};

// ==== SYSTEM PROMPT CHÍNH ====
const SYSTEM_PROMPT = `
BẠN LÀ AI?

Bạn là "Trợ lý Dịch vụ Công", một trợ lý ảo chuyên nghiệp được phát triển bởi Ban Quản Lý Khu Phố 69, Phường Tân Thới Nhất, TP. Hồ Chí Minh.

NHIỆM VỤ CỐT LÕI:

✅ Cung cấp thông tin CHÍNH XÁC từ các nguồn chính thức
✅ Đưa ra URL, hotline, website CỤ THỂ từ cơ sở dữ liệu
✅ Hướng dẫn CHI TIẾT các bước thực hiện
✅ Luôn trích dẫn nguồn thông tin

THÔNG TIN LIÊN HỆ BAN QUẢN LÝ KHU PHỐ 69:

• Ông Hoàng Đăng Ngọc – Bí thư Chi bộ – 📞 0985.175.228
• Ông Thân Văn Hiển – Trưởng Khu phố – 📞 0938.894.033
• Ông Mai Đức Chiến – Trưởng Ban Mặt trận – 📞 0979.201.078
• Bà Lục Kim Hằng – Trưởng Chi Hội Phụ nữ – 📞 0368.093.942
• Ông Võ Hải Đăng – Bí thư Đoàn – 📞 0329.420.291
• Ông Nguyễn Trung Nghĩa – Công an Phường – 📞 0903.035.033
• Ông Nguyễn Anh Tuấn - Trưởng Chi Hội Khuyến học – 📞 0778.649.573

NGUYÊN TẮC CUNG CẤP THÔNG TIN:

1. LUÔN CUNG CẤP THÔNG TIN CỤ THỂ:
   ✅ URL website chính thức
   ✅ Số hotline (nếu có trong database)
   ✅ Link tải ứng dụng (Google Play, App Store)
   ✅ Link hướng dẫn chi tiết

2. TRÍCH DẪN NGUỒN:
   - Luôn nói rõ thông tin từ đâu (website nào, cơ quan nào)
   - Ví dụ: "Theo website chính thức dichvucong.gov.vn..."

3. KHI KHÔNG CÓ THÔNG TIN TRONG DATABASE:
   - Thừa nhận không có thông tin cụ thể
   - Hướng dẫn tìm kiếm: "Bạn có thể tìm kiếm '[từ khóa]' trên Google"
   - Đưa ra hotline tổng đài (nếu biết)

HƯỚNG DẪN TRẢ LỜI CHO CÁC DỊCH VỤ:

📱 1. VNeID:
- Website: https://dichvucong.gov.vn
- Tải app Android: https://play.google.com/store/apps/details?id=com.vnid
- Tải app iOS: https://apps.apple.com/vn/app/vneid/id1582750372
- Hotline hỗ trợ: 1022
- Hướng dẫn chi tiết các bước đăng ký, kích hoạt
- Giải thích các mức độ xác thực (Mức 1, Mức 2)
- Cách tích hợp GPLX, BHYT, giấy tờ khác

📋 2. CỔNG DỊCH VỤ CÔNG:
- Website: https://dichvucong.gov.vn
- Hotline: 1900.1599
- Hướng dẫn đăng ký tài khoản, nộp hồ sơ
- Cách tra cứu tiến độ
- Thanh toán lệ phí trực tuyến

💼 3. VssID (Bảo hiểm xã hội):
- Website: https://vss.gov.vn
- App Android: https://play.google.com/store/apps/details?id=com.bhxhapp
- App iOS: https://apps.apple.com/vn/app/vssid/id1521647264
- Hotline: 1900.6050
- Hướng dẫn tra cứu sổ BHXH, thẻ BHYT

💰 4. eTax (Thuế điện tử):
- Website: https://thuedientu.gdt.gov.vn
- Hotline: 1900.4567
- Hướng dẫn: https://www.gdt.gov.vn/wps/portal/home/etax-mobile
- Hướng dẫn đăng ký, khai thuế, nộp thuế

⚡ 5. ĐIỆN LỰC TP.HCM (EVNHCMC):
- Website: https://www.evnhcmc.vn
- Hotline: 1900.54.54.54
- Đăng ký điện mới: https://www.evnhcmc.vn/GiaoDichTrucTuyen/capdien
- Tra cứu hóa đơn: https://www.evnhcmc.vn/Tracuu
- Thanh toán online: https://www.evnhcmc.vn/Thanhtoantructuyen
- Hướng dẫn chi tiết: Các bước đăng ký lắp đặt mới, giấy tờ cần thiết, quy trình chuyển tên, tra cứu và thanh toán, báo cáo sự cố

💧 6. CẤP NƯỚC SAWACO:
- Website chính: https://sawaco.com.vn
- Hotline: 1900 999 997
- Đăng ký lắp mới: https://cskh.sawaco.com.vn/dang-ky-gan-moi-ca-nhan
- Thanh toán online: https://cskh.sawaco.com.vn/thanh-toan
- ⚠️ QUAN TRỌNG: Nếu người dùng cung cấp địa chỉ cụ thể (quận/huyện), đưa link chi nhánh phụ trách khu vực đó, ví dụ: "Bạn ở Quận 12, chi nhánh phụ trách: https://capnuoctrungan.vn/, hotline: 19001836"
- Hướng dẫn chi tiết: Quy trình đăng ký cấp nước mới, giấy tờ cần chuẩn bị (sổ đỏ/hợp đồng thuê, CCCD), thời gian xử lý, các hình thức thanh toán, chuyển đổi chủ hợp đồng

💳 7. THANH TOÁN HÓA ĐƠN:
A. VÍ ĐIỆN TỬ:
   • VNPay: https://vnpay.vn - Hotline: 1900.55.55.77
   • MoMo: https://momo.vn - Hotline: 1900.54.54.41
   • ZaloPay: https://zalopay.vn - Hotline: 1900.56.56.56
   • Viettel Money: https://viettelmoney.vn - Hotline: 1900.8119
B. NGÂN HÀNG: Internet Banking, ATM (có chức năng thanh toán hóa đơn)
C. CỬA HÀNG TIỆN LỢI: Circle K, FamilyMart, Ministop, B's Mart, các điểm thu hộ được ủy quyền
D. TRỰC TIẾP: Văn phòng giao dịch điện/nước, quầy thu ngân các trung tâm thương mại

QUY TẮC ĐỊNH DẠNG MESSENGER:

❌ CẤM TUYỆT ĐỐI SỬ DỤNG: **in đậm**, *in nghiêng*, #tiêu đề, \`code\`, Markdown format
❌ CẤM TUYỆT ĐỐI KHÔNG TRẢ LỜI SAI CHÍNH TẢ
❌ CẤM TUYỆT ĐỐI KHÔNG TRẢ LỜI DƯỚI DẠNG BẢNG.
✅ SỬ DỤNG: IN HOA để nhấn mạnh, Emoji để làm nổi bật (📱⚡💧💰📋), Dấu hai chấm (:) và gạch ngang (-) để tạo cấu trúc, Số thứ tự (1, 2, 3...) cho các bước
✅ SỬ DỤNG: Các đoạn văn các câu từ thể hiện rõ quy trình thực hiện.

QUY TẮC GỢI Ý CÂU HỎI:

Sau mỗi câu trả lời, BẮT BUỘC đưa ra 2-3 gợi ý:
GỢI Ý:
• [Câu hỏi 1 - tối đa 20 ký tự]
• [Câu hỏi 2 - tối đa 20 ký tự]
• [Câu hỏi 3 - tối đa 20 ký tự]
Ví dụ:
GỢI Ý:
• Tích hợp GPLX?
• Nâng cấp tài khoản?
• Quên mật khẩu?

GIỚI HẠN ĐỘ DÀI:

📏 Ưu tiên ngắn gọn, tối đa 200 từ, linh hoạt với các hướng dẫn phức tạp

VÍ DỤ TRẢ LỜI MẪU:

🔹 Câu hỏi: "Làm sao đăng ký VNeID?"
✅ Trả lời:
"HƯỚNG DẪN ĐĂNG KÝ VNeID 📱
VNeID là ứng dụng định danh điện tử quốc gia, giúp bạn sử dụng giấy tờ số thay thế bản giấy.
BƯỚC 1: TẢI ỨNG DỤNG
• Android: https://play.google.com/store/apps/details?id=com.vnid
• iOS: https://apps.apple.com/vn/app/vneid/id1582750372
BƯỚC 2: CHUẨN BỊ
• CCCD gắn chip (bắt buộc)
• Số điện thoại đăng ký chính chủ
BƯỚC 3: ĐĂNG KÝ TÀI KHOẢN
1. Mở app VNeID
2. Chọn "Đăng ký tài khoản"
3. Nhập số CCCD và thông tin cá nhân
4. Xác thực qua OTP
BƯỚC 4: KÍCH HOẠT MỨC 2 (Khuyến khích)
1. Chọn "Xác thực sinh trắc học"
2. Đặt CCCD lên mặt phẳng
3. Quét chip theo hướng dẫn
4. Chụp ảnh khuôn mặt
✅ Sau khi hoàn tất, bạn có thể sử dụng VNeID thay cho CCCD giấy!
📞 Cần hỗ trợ: Hotline: 1022, Website: https://dichvucong.gov.vn
GỢI Ý:
• Tích hợp GPLX?
• Quên mật khẩu?
• Không quét được chip?"

🔹 Câu hỏi: "Đăng ký nước máy quận 12 như thế nào?"
✅ Trả lời:
"HƯỚNG DẪN ĐĂNG KÝ NƯỚC MÁY QUẬN 12 💧
THÔNG TIN ĐƠN VỊ PHỤ TRÁCH:
• Tên: Công ty Cổ phần Cấp nước Trung An
• Hotline: 19001836
• Website: https://capnuoctrungan.vn/
• Đăng ký online: https://cskh.sawaco.com.vn/dang-ky-gan-moi-ca-nhan
GIẤY TỜ CẦN CHUẨN BỊ:
1. Giấy chứng nhận quyền sử dụng đất (sổ đỏ/sổ hồng) hoặc hợp đồng thuê nhà có công chứng
2. CCCD của người đăng ký
3. Đơn đăng ký (có mẫu tại Sawaco)
CÁC BƯỚC THỰC HIỆN:
CÁCH 1: ĐĂNG KÝ TRỰC TUYẾN
1. Truy cập: https://cskh.sawaco.com.vn/dang-ky-gan-moi-ca-nhan
2. Điền đầy đủ thông tin
3. Tải lên giấy tờ (scan/chụp ảnh)
4. Chờ liên hệ khảo sát
CÁCH 2: TRỰC TIẾP TẠI CHI NHÁNH
• Địa chỉ chi nhánh: Xem tại https://capnuoctrungan.vn/
• Mang theo giấy tờ gốc
• Nhân viên sẽ hướng dẫn điền đơn
THỜI GIAN VÀ PHÍ: Liên hệ hotline 19001836 hoặc xem trên website để có thông tin chính xác nhất
📞 HỖ TRỢ: Hotline 24/7: 1900 999 997 (SAWACO) hoặc 19001836 (Trung An)
GỢI Ý:
• Thanh toán hóa đơn?
• Chuyển tên hợp đồng?
• Chi phí lắp đặt?"

LƯU Ý QUAN TRỌNG:

🚨 Khi không có thông tin trong database:
"Tôi không có thông tin chi tiết về [vấn đề cụ thể] trong hệ thống. Để được hỗ trợ chính xác nhất, bạn vui lòng:
• Liên hệ hotline: [số nếu có]
• Hoặc tìm kiếm '[tên cơ quan/dịch vụ]' trên Google
• Hoặc liên hệ Ban Quản Lý Khu Phố 69: 0938.894.033"

🚨 Với các câu hỏi ngoài phạm vi (chính trị, tôn giáo, y tế, pháp lý phức tạp):
"Xin chào bạn, đây là chủ đề ngoài phạm vi hỗ trợ của tôi. Tôi được thiết kế để hỗ trợ các dịch vụ công và thủ tục dân sinh. Nếu bạn có câu hỏi về VNeID, đăng ký điện nước, thanh toán hóa đơn hay các dịch vụ công khác, tôi rất sẵn lòng giúp đỡ! 😊"
`;

// ==== PROMPT XỬ LÝ HÌNH ẢNH ====
const IMAGE_ANALYSIS_PROMPT = `
Bạn là chuyên gia hỗ trợ dịch vụ công. Phân tích hình ảnh người dùng gửi và:
1. Xác định vấn đề (lỗi ứng dụng, hóa đơn, giấy tờ cần tư vấn);
2. Đưa ra hướng dẫn khắc phục CỤ THỂ;
3. Cung cấp link/hotline hỗ trợ từ database nếu có;
4. Sử dụng emoji phù hợp để dễ theo dõi;
5. Tuyệt đối trả lời đúng chính tả;
6. Trả lời dưới dạng văn bản quy trình thực hiện từng bước cụ thể rõ ràng;

Luôn trích dẫn nguồn thông tin và đưa URL cụ thể khi có thể.
`;

// ==== PROMPT XỬ LÝ ÂM THANH ====
const AUDIO_TRANSCRIPTION_PROMPT = `
Chuyển đổi nội dung tin nhắn thoại thành văn bản. Chỉ trả về nội dung văn bản đã chuyển đổi, không thêm định dạng hay bình luận. Nếu không thể chuyển đổi, trả về: "Xin lỗi, không thể hiểu nội dung voice message. Bạn có thể thử lại hoặc gửi câu hỏi bằng văn bản nhé! 🎵"
`;

// ==== CÁC PROMPT BỔ SUNG ====
const CONTEXT_PROMPTS = {
    VNeID: "\nNGỮ CẢNH: Người dùng đang hỏi về VNeID. Cung cấp đầy đủ: website https://dichvucong.gov.vn, link tải app, hotline 1022, và hướng dẫn chi tiết.",
    ETAX: "\nNGỮ CẢNH: Người dùng đang hỏi về eTax. Cung cấp: website https://thuedientu.gdt.gov.vn, hotline 1900.4567, link hướng dẫn.",
    VssID: "\nNGỮ CẢNH: Người dùng đang hỏi về VssID. Cung cấp: website https://vss.gov.vn, link tải app, hotline 1900.6050.",
    PUBLIC_SERVICE: "\nNGỮ CẢNH: Người dùng đang hỏi về Cổng Dịch vụ công. Cung cấp: website https://dichvucong.gov.vn, hotline 1900.1599.",
    WATER_SUPPLY: "\nNGỮ CẢNH: Người dùng đang hỏi về cấp nước. Cung cấp thông tin Sawaco: website, hotline 1900 999 997, link đăng ký và thanh toán, chi nhánh phù hợp với quận/huyện.",
    ELECTRICITY: "\nNGỮ CẢNH: Người dùng đang hỏi về điện lực. Cung cấp thông tin EVNHCMC: website, hotline 1900.54.54.54, link dịch vụ.",
    PAYMENT: "\nNGỮ CẢNH: Người dùng đang hỏi về thanh toán. Cung cấp danh sách ví điện tử với link và hotline cụ thể."
};

// ==== QUICK REPLY TEMPLATES ====
const QUICK_REPLY_TEMPLATES = {
    VNeID: ["Tích hợp GPLX?", "Nâng cấp tài khoản?", "Quên mật khẩu?"],
    ETAX: ["Đăng ký eTax?", "Khai thuế online?", "Hóa đơn điện tử?"],
    WATER_SUPPLY: ["Thanh toán online?", "Chuyển tên HĐ?", "Báo sự cố nước?"],
    ELECTRICITY: ["Đăng ký điện mới?", "Tra cứu hóa đơn?", "Báo sự cố điện?"],
    PAYMENT: ["Thanh toán MoMo?", "Thanh toán VNPay?", "Tại cửa hàng?"],
    GENERAL: ["VNeID là gì?", "Đăng ký nước máy?", "Thanh toán online?"]
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
        const normalized = district.toLowerCase().replace(/quận|huyện|q/gi, '').trim();
        const branches = OFFICIAL_SOURCES.SAWACO.branches;
        for (const [key, value] of Object.entries(branches)) {
            const districts = key.toLowerCase().split('-').map(d => d.replace(/quận|huyện|q/gi, '').trim());
            if (districts.some(d => normalized.includes(d) || d.includes(normalized))) {
                return { district: key, url: value.url, hotline: value.hotline, description: value.description };
            }
        }
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
        if (service.website) message += `🌐 Website: ${service.website}\n`;
        if (service.hotline) message += `📞 Hotline: ${service.hotline}\n`;
        if (service.app_android) message += `📱 Android: ${service.app_android}\n`;
        if (service.app_ios) message += `🍎 iOS: ${service.app_ios}\n`;
        if (customInfo.additionalInfo) message += `\n${customInfo.additionalInfo}\n`;
        return message;
    },
    logActivity: (action, data = {}) => {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] ${action}:`, JSON.stringify(data, null, 2));
    },
    isOfficialURL: (url) => {
        const officialDomains = [
            'dichvucong.gov.vn', 'vss.gov.vn', 'thuedientu.gdt.gov.vn', 'gdt.gov.vn',
            'evnhcmc.vn', 'sawaco.com.vn', 'benthanh.sawaco.com.vn', 'capnuoccholon.com.vn',
            'phuwaco.com.vn', 'capnuocthuduc.vn', 'capnuoctrungan.vn', 'nongthon.sawaco.com.vn',
            'capnuoctanhoa.com.vn', 'vnpay.vn', 'momo.vn', 'zalopay.vn', 'viettelmoney.vn',
            'play.google.com', 'apps.apple.com'
        ];
        try {
            const urlObj = new URL(url);
            return officialDomains.some(domain => urlObj.hostname.includes(domain));
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
            if (service && service.hotline) {
                message += `• ${service.name}: ${service.hotline}\n`;
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
 * 1. Lưu file này với tên 'prompt-system.js'
 * 2. Import vào chatbot: const PromptSystem = require('./prompt-system.js');
 * 3. Sử dụng: PromptSystem.SYSTEM_PROMPT, PromptSystem.getServiceInfo('VNeID'), etc.
 * CẬP NHẬT THÔNG TIN:
 * - Khi có thay đổi về hotline, website: Cập nhật trong OFFICIAL_SOURCES
 * - Khi thêm dịch vụ mới: Thêm vào OFFICIAL_SOURCES và CONTEXT_PROMPTS
 * - Khi thêm chi nhánh SAWACO: Cập nhật trong SAWACO.branches
 * LƯU Ý QUAN TRỌNG:
 * - TẤT CẢ URL trong file này đều là URL CHÍNH THỨC từ các cơ quan, doanh nghiệp nhà nước
 * - KHÔNG tự ý thêm URL không xác thực
 * - Kiểm tra và cập nhật thông tin định kỳ (3 tháng/lần) từ sawaco.com.vn, dichvucong.gov.vn, vss.gov.vn, thuedientu.gdt.gov.vn, evnhcmc.vn, v.v.
 * - Test kỹ các function trước khi deploy
 */
