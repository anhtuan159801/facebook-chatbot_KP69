const { format } = require('date-fns');
const { vi } = require('date-fns/locale');

class ProfessionalResponseFormatter {
  /**
   * Format knowledge for professional administrative procedure response
   */
  static formatKnowledgeForAdministrativeProcedure(knowledgeDocs) {
    if (!knowledgeDocs || knowledgeDocs.length === 0) {
      return '';
    }

    // Process the first relevant document (most relevant one)
    const doc = knowledgeDocs[0]; // Assuming they're already ranked by relevance
    
    // Extract structured information from document content
    const structuredInfo = this.extractStructuredInfo(doc.content);
    
    // Build professional response
    let formattedResponse = '';
    
    // Title and procedure information
    formattedResponse += `HƯỚNG DẪN THỦ TỤC ${structuredInfo.procedureName || doc.procedure_title || 'HÀNH CHÍNH CHI TIẾT'} 📋\n\n`;
    
    // Administrative procedure details section
    formattedResponse += `🔍 TÊN THỦ TỤC: ${structuredInfo.procedureName || doc.procedure_title || 'Thông tin chưa có'}\n`;
    formattedResponse += `🏢 CƠ QUAN: ${doc.ministry_name || 'Cơ quan thực hiện chưa xác định'}\n`;
    formattedResponse += `📋 MÃ THỦ TỤC: ${doc.procedure_code || structuredInfo.procedureCode || 'Chưa có mã thủ tục'}\n`;
    formattedResponse += `⏰ THỜI HẠN: ${structuredInfo.processingTime || 'Chưa xác định'}\n`;
    formattedResponse += `💰 PHÍ/ LỆ PHÍ: ${structuredInfo.fee || 'Chưa có thông tin'}\n`;
    
    // Documents required
    if (structuredInfo.documents) {
      formattedResponse += `📄 THÀNH PHẦN HỒ SƠ:\n${structuredInfo.documents}\n`;
    } else {
      formattedResponse += `📄 THÀNH PHẦN HỒ SƠ: Chưa có thông tin chi tiết\n`;
    }
    
    // Procedure steps
    if (structuredInfo.procedureSteps) {
      formattedResponse += `📝 TRÌNH TỰ THỰC HIỆN:\n${structuredInfo.procedureSteps}\n`;
    } else {
      formattedResponse += `📝 TRÌNH TỰ THỰC HIỆN: Chưa có thông tin chi tiết\n`;
    }
    
    // Legal basis
    if (structuredInfo.legalBasis) {
      formattedResponse += `🌐 CĂN CỨ PHÁP LÝ: ${structuredInfo.legalBasis}\n`;
    }
    
    // Official link details
    const officialLink = this.extractOfficialLink(doc);
    if (officialLink) {
      formattedResponse += `🔗 LINK CHI TIẾT: ${officialLink}\n`;
    } else {
      formattedResponse += `🔗 LINK CHI TIẾT: Vui lòng tra cứu tại Cổng Dịch vụ công Quốc gia: https://dichvucong.gov.vn/\n`;
    }
    
    // Form link if available
    if (structuredInfo.formLink) {
      formattedResponse += `📋 BIỂU MẪU: ${structuredInfo.formLink}\n`;
    }
    
    // Full content preview
    if (doc.content) {
      formattedResponse += `\n📋 NỘI DUNG ĐẦY ĐỦ:\n${doc.content.substring(0, 800)}...\n`;
    }
    
    return formattedResponse;
  }

  /**
   * Extract structured information from document content
   */
  static extractStructuredInfo(content) {
    if (!content) return {};

    const info = {};

    // Extract procedure code with better pattern matching
    const codePatterns = [
      /(?:Mã thủ tục|Mã số|Mã số thủ tục):\s*([A-Z0-9-_.\s]+)/i,
      /(?:Mã:|Code:)\s*([A-Z0-9-_.\s]+)/i,
      /(?:procedure_code|procedure_code["']?\s*[:=]\s*["'])([A-Z0-9-_.\s]+)/i,
      /([A-Z]{2,3}_C\d+)/i,  // Common format like "C04", "C01", etc.
      /([A-Z0-9]+_[A-Z0-9]+)/  // General pattern like "ABC_DEF"
    ];

    for (const pattern of codePatterns) {
      const match = content.match(pattern);
      if (match) {
        info.procedureCode = match[1].trim();
        break;
      }
    }

    // Extract procedure name
    const namePatterns = [
      /(?:Tên thủ tục|Tên đầy đủ|Tên chính thức):\s*([^\n\r]+)/i,
      /(?:Thủ tục|TÊN THỦ TỤC):\s*([^\n\r]+)/i,
      /(?:Title|Tiêu đề):\s*([^\n\r]+)/i,
      /^([^:.]{10,100}):/m  // First long text line that could be a title
    ];

    for (const pattern of namePatterns) {
      const match = content.match(pattern);
      if (match && match[1].length > 3) {
        info.procedureName = match[1].trim();
        break;
      }
    }

    // If no procedure name found, extract a reasonable title from content
    if (!info.procedureName) {
      // Extract first sentence/phrase that looks like a title
      const sentences = content.split(/[.\n\r]/);
      for (const sentence of sentences) {
        const trimmed = sentence.trim();
        if (trimmed.length > 10 && trimmed.length < 200 && !trimmed.toLowerCase().includes('theo')) {
          info.procedureName = trimmed;
          break;
        }
      }
    }

    // Extract processing time
    const timePatterns = [
      /(?:Thời hạn|Thời gian|Thời hạn giải quyết):\s*([^\n\r]+)/i,
      /(?:Time|Thời gian:)\s*([^\n\r]+)/i,
      /(?:(?:trong)?\s*vòng\s*)([0-9]+\s*(?:ngày|tháng|tuần))/i,
      /([0-9]+\s*(?:ngày|tháng|tuần)\s*(?:làm việc)?)/i
    ];

    for (const pattern of timePatterns) {
      const match = content.match(pattern);
      if (match) {
        info.processingTime = match[1].trim();
        break;
      }
    }

    // Extract fee
    const feePatterns = [
      /(?:Phí|Lệ phí|Phí lệ phí):\s*([^\n\r]+)/i,
      /(?:Cost|Chi phí):\s*([^\n\r]+)/i,
      /(miễn phí|[0-9.,]+\s*vnđ|0 vnđ|không thu phí)/i
    ];

    for (const pattern of feePatterns) {
      const match = content.match(pattern);
      if (match) {
        info.fee = match[1].trim();
        break;
      }
    }

    // Extract documents required (more comprehensive)
    const docPatterns = [
      /(?:Thành phần hồ sơ|Các loại giấy tờ|Giấy tờ cần nộp):\s*([^.]*?)(?:\n\n|\n[a-z]|$)/i,
      /(?:Hồ sơ bao gồm|Các giấy tờ cần|Giấy tờ nộp):\s*([^.]*?)(?:\n\n|\n[a-z]|$)/i,
      /(?:Documents|Hồ sơ gồm):\s*([^.]*?)(?:\n\n|\n[a-z]|$)/i
    ];

    for (const pattern of docPatterns) {
      const match = content.match(pattern);
      if (match && match[1].length > 10) {
        info.documents = match[1].trim();
        break;
      }
    }

    // Extract procedure steps (more comprehensive)
    const stepsPatterns = [
      /(?:Trình tự thực hiện|Các bước thực hiện|Cách thực hiện):\s*([\s\S]*?)(?:\n\n|\nMọi|\nCăn|\n$)/i,
      /(?:Steps|Các bước|Quy trình):\s*([\s\S]*?)(?:\n\n|\nMọi|\nCăn|\n$)/i,
      /(?:Bước 1|1\.\s|Bước đầu tiên)[\s\S]*?(?:\n\n|$)/i
    ];

    for (const pattern of stepsPatterns) {
      const match = content.match(pattern);
      if (match && match[1].length > 20) {
        info.procedureSteps = match[1].trim();
        break;
      }
    }

    // Extract legal basis
    const legalPatterns = [
      /(?:Căn cứ pháp lý|Cơ sở pháp lý|Theo luật|Luật áp dụng):\s*([^\n\r]+)/i,
      /(?:Legal basis|Căn cứ:)\s*([^\n\r]+)/i
    ];

    for (const pattern of legalPatterns) {
      const match = content.match(pattern);
      if (match) {
        info.legalBasis = match[1].trim();
        break;
      }
    }

    // Extract form links (biểu mẫu)
    const formPatterns = [
      /(?:Biểu mẫu|Form|Template):\s*(https?:\/\/[^\s<>"'`]+)/i,
      /(?:Mẫu số|Mẫu đơn):\s*([^\n\r]+)/i,
      /(https?:\/\/[^\s<>"'`]*\.(?:docx?|pdf|xlsx?|zip))[^\s<>"'`]*/i
    ];

    for (const pattern of formPatterns) {
      const match = content.match(pattern);
      if (match && match[1].includes('http')) {
        info.formLink = match[1];
        break;
      } else if (match) {
        // If it's not a URL but describes a form, we'll add context
        if (!info.formLink) {
          info.formDescription = match[1].trim();
        }
      }
    }

    return info;
  }

  /**
   * Extract official link from document
   */
  static extractOfficialLink(doc) {
    // Check in metadata first
    if (doc.metadata && doc.metadata.form_link) {
      return doc.metadata.form_link;
    }

    // Check source_url
    if (doc.source_url && doc.source_url.startsWith('http')) {
      return doc.source_url;
    }

    // Check in content for URLs
    const urlPattern = /(https?:\/\/[^\s<>"'`]+)/i;
    const match = doc.content ? doc.content.match(urlPattern) : null;
    if (match) {
      return match[1];
    }

    return null;
  }

  /**
   * Format response with structured information
   */
  static formatStructuredResponse(query, knowledgeDocs) {
    if (!knowledgeDocs || knowledgeDocs.length === 0) {
      return `Hiện tại tôi chưa có thông tin chính thức trong cơ sở tri thức về "${query}".`;
    }

    // Try to identify if this is an administrative procedure query
    const isAdminProcedure = this.isAdministrativeProcedureQuery(query);
    
    if (isAdminProcedure) {
      return this.formatKnowledgeForAdministrativeProcedure(knowledgeDocs);
    }

    // For non-administrative queries, use general formatting
    return knowledgeDocs.map(doc => {
      return `📋 THÔNG TIN LIÊN QUAN:\n${doc.content.substring(0, 600)}...\n\n`;
    }).join('\n');
  }

  /**
   * Determine if query is for administrative procedure
   */
  static isAdministrativeProcedureQuery(query) {
    const adminKeywords = [
      'thủ tục', 'hồ sơ', 'giấy tờ', 'đăng ký', 'cấp', 'hủy', 'đổi', 'chuyển',
      'thành phố', 'tỉnh', 'quận', 'huyện', 'xã', 'phường', 'thị trấn',
      'cư trú', 'tạm trú', 'tạm vắng', 'khai sinh', 'khai tử', 'đăng ký kết hôn',
      'chứng minh', 'căn cước', 'hộ chiếu', 'hộ khẩu', 'giấy phép', 'chứng chỉ'
    ];

    const lowerQuery = query.toLowerCase();
    return adminKeywords.some(keyword => lowerQuery.includes(keyword));
  }

  /**
   * Format response for temporary residence cancellation specifically
   */
  static formatTemporaryResidenceCancellationResponse(knowledgeDocs) {
    if (!knowledgeDocs || knowledgeDocs.length === 0) {
      return 'Hiện tại tôi chưa có thông tin chi tiết trong cơ sở tri thức về thủ tục xóa tạm trú.';
    }

    const doc = knowledgeDocs[0];
    const structuredInfo = this.extractStructuredInfo(doc.content);

    let response = `HƯỚNG DẪN THỦ TỤC XÓA TẠM TRÚ 📋\n\n`;
    
    response += `🔍 TÊN THỦ TỤC: ${structuredInfo.procedureName || 'XÓA TẠM TRÚ (HỦY ĐĂNG KÝ TẠM TRÚ)'}\n`;
    response += `🏢 CƠ QUAN: ${doc.ministry_name || 'Cảnh sát/Đoàn công tác dân cư (Bộ Công an)'}\n`;
    response += `📋 MÃ THỦ TỤC: ${doc.procedure_code || structuredInfo.procedureCode || 'C04 (theo cơ sở tri thức từ Bộ Công an)'}\n`;
    response += `⏰ THỜI HẠN: ${structuredInfo.processingTime || '1-3 ngày làm việc (tùy theo quy định địa phương)'}\n`;
    response += `💰 PHÍ/ LỆ PHÍ: ${structuredInfo.fee || '0 VNĐ (hoặc phí xử lý hồ sơ nếu có)'}\n`;
    
    // More detailed document requirements
    if (structuredInfo.documents) {
      response += `📄 THÀNH PHẦN HỒ SƠ:\n${structuredInfo.documents}\n`;
    } else {
      response += `📄 THÀNH PHẦN HỒ SƠ:\n`;
      response += `- Giấy đề nghị hủy đăng ký tạm trú (được điền tại cơ quan)\n`;
      response += `- CMND/CCCD/Passport (định danh người)\n`;
      response += `- Giấy tạm trú (nếu còn)\n`;
      response += `- Giấy tờ chứng minh chuyển đổi địa chỉ (nếu đã chuyển)\n`;
      response += `- Biên nhận chuyển đổi (nếu đã nộp)\n`;
    }
    
    // Detailed procedure steps
    if (structuredInfo.procedureSteps) {
      response += `📝 TRÌNH TỰ THỰC HIỆN:\n${structuredInfo.procedureSteps}\n`;
    } else {
      response += `📝 TRÌNH TỰ THỰC HIỆN:\n`;
      response += `1. Chuẩn bị hồ sơ đầy đủ theo danh sách trên.\n`;
      response += `2. Nộp hồ sơ tại Cảnh sát hoặc Đoàn công tác dân cư nơi bạn đăng ký tạm trú.\n`;
      response += `3. Nhận biên nhận nộp hồ sơ và mã số hồ sơ (nếu có).\n`;
      response += `4. Đợi thời hạn xử lý (1-3 ngày làm việc).\n`;
      response += `5. Nhận xác nhận xóa tạm trú (thư/biên nhận).\n`;
    }
    
    // Legal basis
    if (structuredInfo.legalBasis) {
      response += `🌐 CĂN CỨ PHÁP LÝ: ${structuredInfo.legalBasis}\n`;
    } else {
      response += `🌐 CĂN CỨ PHÁP LÝ: Luật Dân cư, Luật Thông tin và Truyền thông (định quy về đăng ký và hủy đăng ký tạm trú).\n`;
    }
    
    // Official link
    const officialLink = this.extractOfficialLink(doc);
    if (officialLink) {
      response += `🔗 LINK CHI TIẾT: ${officialLink}\n`;
    } else {
      // Use the form link from metadata if available
      if (doc.metadata && doc.metadata.form_link) {
        response += `🔗 LINK CHI TIẾT: ${doc.metadata.form_link}\n`;
      } else {
        response += `🔗 LINK CHI TIẾT: Để xem chi tiết thủ tục hành chính và tải biểu mẫu, vui lòng truy cập link sau: https://thutuc.dichvucong.gov.vn/p/home/dvc-tthc-thu-tuc-hanh-chinh-chi-tiet.html?ma_thu_tuc=373812\n`;
      }
    }
    
    // Form information
    if (structuredInfo.formLink) {
      response += `📋 BIỂU MẪU: ${structuredInfo.formLink}\n`;
    } else if (structuredInfo.formDescription) {
      response += `📋 BIỂU MẪU: ${structuredInfo.formDescription}\n`;
    }
    
    if (doc.content && doc.content.length > 50) {
      response += `\n📋 NỘI DUNG CHI TIẾT:\n${doc.content.substring(0, 800)}...\n`;
    }
    
    // Add suggestions
    response += `\nGỢI Ý:\n`;
    response += `• Hồ sơ cần chuẩn bị gồm những gì?\n`;
    response += `• Nộp hồ sơ ở đâu?\n`;
    response += `• Thời gian xử lý bao lâu?`;

    return response;
  }
}

module.exports = ProfessionalResponseFormatter;