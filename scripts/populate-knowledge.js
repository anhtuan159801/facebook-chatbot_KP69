#!/usr/bin/env node

require('dotenv').config();
const KnowledgeManager = require('../src/utils/knowledge-manager');

async function populateSampleKnowledge() {
  console.log('Populating sample knowledge to the system...');

  const knowledgeManager = new KnowledgeManager();

  // Sample FAQ data
  const vneidFAQ = [
    {
      question: "Làm thế nào để đăng ký tài khoản VNeID?",
      answer: "Để đăng ký tài khoản VNeID, bạn cần: 1. Tải ứng dụng VNeID từ App Store hoặc CH Play, 2. Chuẩn bị CCCD gắn chip, 3. Mở ứng dụng và chọn 'Đăng ký tài khoản', 4. Nhập thông tin theo hướng dẫn, 5. Xác thực qua OTP, 6. Kích hoạt tài khoản ở mức 2 nếu cần. Bạn có thể tìm hiểu thêm tại: https://dichvucong.gov.vn",
      source: "https://dichvucong.gov.vn"
    },
    {
      question: "Có thể tích hợp giấy tờ nào với VNeID?",
      answer: "Với tài khoản VNeID, bạn có thể tích hợp: - Chứng minh nhân dân/CCCD, - Bằng lái xe (GPLX), - Bảo hiểm y tế (BHYT), - Giấy khai sinh, - Và nhiều loại giấy tờ khác. Việc tích hợp giúp bạn sử dụng giấy tờ số thay thế bản giấy khi giao dịch.",
      source: "https://dichvucong.gov.vn"
    }
  ];

  // Sample procedure data
  const procedures = [
    {
      title: "Thủ tục cấp nước mới cho hộ gia đình",
      description: "Hướng dẫn các bước để đăng ký cấp nước sinh hoạt mới cho hộ gia đình",
      steps: [
        "Chuẩn bị giấy tờ: Hộ khẩu/KT3, CMND/CCCD, Giấy chứng nhận quyền sử dụng đất",
        "Đến chi nhánh Sawaco phụ trách khu vực hoặc truy cập: https://cskh.sawaco.com.vn/dang-ky-gan-moi-ca-nhan",
        "Điền đầy đủ thông tin theo mẫu quy định",
        "Nộp hồ sơ và chờ xác nhận",
        "Theo dõi tiến độ qua số điện thoại đăng ký"
      ],
      notes: "Thời gian xử lý: 5-7 ngày làm việc. Hotline hỗ trợ: 1900 999 997",
      source: "https://sawaco.com.vn",
      form_link: "https://cskh.sawaco.com.vn/dang-ky-gan-moi-ca-nhan"
    },
    {
      title: "Cách đăng ký điện mới cho hộ kinh doanh",
      description: "Hướng dẫn đăng ký điện mới phục vụ hoạt động kinh doanh",
      steps: [
        "Chuẩn bị giấy tờ: Giấy phép kinh doanh, CMND/CCCD, Giấy tờ nhà đất",
        "Truy cập website: https://www.evnhcmc.vn/GiaoDichTrucTuyen/capdien hoặc đến các điểm giao dịch",
        "Chọn loại hình sử dụng điện: Kinh doanh",
        "Điền thông tin yêu cầu cấp điện",
        "Chờ kiểm tra thực tế và lắp đặt"
      ],
      notes: "Miễn phí khảo sát và lắp đặt trong bán kính 10m từ trụ điện. Thời gian: 3-5 ngày làm việc.",
      source: "https://www.evnhcmc.vn",
      form_link: "https://www.evnhcmc.vn/GiaoDichTrucTuyen/capdien"
    }
  ];

  try {
    // Generate knowledge from FAQs
    console.log('Adding FAQ knowledge...');
    await knowledgeManager.generateKnowledgeFromFAQ(vneidFAQ, 'vneid');

    // Generate knowledge from procedures
    console.log('Adding procedure knowledge...');
    await knowledgeManager.generateKnowledgeFromProcedures([procedures[0]], 'sawaco');
    await knowledgeManager.generateKnowledgeFromProcedures([procedures[1]], 'evnhcmc');

    // Add some general knowledge
    console.log('Adding general knowledge...');
    const generalKnowledge = [
      {
        title: "Giới thiệu Dịch vụ công Quốc gia",
        content: "Cổng Dịch vụ công Quốc gia là hệ thống cho phép người dân và doanh nghiệp thực hiện các thủ tục hành chính, thanh toán trực tuyến, và tra cứu tiến độ giải quyết hồ sơ. Website: https://dichvucong.gov.vn, Hotline: 1900.1599",
        source_url: "https://dichvucong.gov.vn",
        category: "dichvucong",
        form_link: "https://dichvucong.gov.vn"
      },
      {
        title: "Hướng dẫn sử dụng biểu mẫu điện tử",
        content: "Để sử dụng biểu mẫu điện tử hiệu quả: 1. Truy cập đúng cổng thông tin, 2. Chuẩn bị thông tin trước khi điền, 3. Kiểm tra kỹ trước khi gửi, 4. Lưu mã số hồ sơ để tra cứu",
        source_url: "system-generated",
        category: "guidance",
        form_link: null
      }
    ];

    await knowledgeManager.bulkGenerateKnowledge(generalKnowledge);

    console.log('✅ Sample knowledge has been populated successfully!');
    console.log('📊 The knowledge base is now ready to assist users with accurate information!');

  } catch (error) {
    console.error('❌ Error populating knowledge:', error);
  }
}

// Run the population if called directly
if (require.main === module) {
  populateSampleKnowledge().catch(console.error);
}

module.exports = { populateSampleKnowledge };