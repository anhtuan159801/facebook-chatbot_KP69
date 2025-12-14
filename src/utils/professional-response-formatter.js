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

    // If no procedure name found, extract from the specific format in your dataset
    if (!info.procedureName) {
      // Look for the format like "Hướng Dẫn Thủ Tục: [Tên thủ tục]"
      const headerPattern = /(?:Hướng Dẫn Thủ Tục|Thủ Tục|Tên Thủ Tục):\s*([^\n\r]+)/i;
      const headerMatch = content.match(headerPattern);
      if (headerMatch) {
        info.procedureName = headerMatch[1].trim();
      } else {
        // Extract first substantial text that looks like a procedure name
        const lines = content.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          // Skip lines that are field labels like "Cách thức thực hiện", "Thành phần hồ sơ", etc.
          if (trimmed && !trimmed.match(/^(Cách thức thực hiện|Hình thức nộp|Thời hạn giải quyết|Phí, lệ phí|Thành phần hồ sơ|Trình tự thực hiện|Cơ quan thực hiện|Yêu cầu, điều kiện|Thủ tục hành chính liên quan)/i)) {
            // If it looks like a title (doesn't contain typical field markers and is substantial)
            if (trimmed.length > 10 && trimmed.length < 200) {
              info.procedureName = trimmed;
              break;
            }
          }
        }
      }
    }

    // Extract processing time - look specifically for "Thời hạn giải quyết" section
    const timeSectionPattern = /Thời hạn giải quyết[^\n]*\n+([^\n]+)/i;
    const timeSectionMatch = content.match(timeSectionPattern);
    if (timeSectionMatch) {
      info.processingTime = timeSectionMatch[1].trim();
    } else {
      // Fallback to general time patterns
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
    }

    // Extract fee information - look for the fee section
    const feeSectionPattern = /Phí, lệ phí[^\n]*\n+((?:.|\n)*?)(?:\n[A-Z][a-z]+|$)/i;
    const feeSectionMatch = content.match(feeSectionPattern);
    if (feeSectionMatch) {
      info.fee = feeSectionMatch[1].trim();
    } else {
      // Fallback to general fee patterns
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
    }

    // Extract documents required - look for "Thành phần hồ sơ" section
    const docsSectionPattern = /Thành phần hồ sơ[^\n\r]*\n+((?:.|\n)*?)(?:\n[A-Z][a-z]+|$)/i;
    const docsSectionMatch = content.match(docsSectionPattern);
    if (docsSectionMatch) {
      info.documents = docsSectionMatch[1].trim();
    } else {
      // Fallback to general patterns
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
    }

    // Extract procedure steps - look for "Trình tự thực hiện" section
    const stepsSectionPattern = /Trình tự thực hiện[^\n\r]*\n+((?:.|\n)*?)(?:\n[A-Z][a-z]+|$)/i;
    const stepsSectionMatch = content.match(stepsSectionPattern);
    if (stepsSectionMatch) {
      info.procedureSteps = stepsSectionMatch[1].trim();
    } else {
      // Fallback to general patterns
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
    }

    // Extract agency - look for "Cơ quan thực hiện" section
    const agencySectionPattern = /Cơ quan thực hiện[^\n\r]*\n+((?:.|\n)*?)(?:\n[A-Z][a-z]+|$)/i;
    const agencySectionMatch = content.match(agencySectionPattern);
    if (agencySectionMatch) {
      info.agency = agencySectionMatch[1].trim();
    } else {
      // Fallback to general pattern
      const agencyPattern = /(?:Cơ quan thực hiện|Cơ quan có thẩm quyền):\s*([^\n\r]+)/i;
      const agencyMatch = content.match(agencyPattern);
      if (agencyMatch) {
        info.agency = agencyMatch[1].trim();
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

    response += `🔍 TÊN THỦ TỤC: ${structuredInfo.procedureName || doc.procedure_title || 'XÓA TẠM TRÚ (HỦY ĐĂNG KÝ TẠM TRÚ)'}\n`;
    response += `🏢 CƠ QUAN: ${doc.ministry_name || structuredInfo.agency || 'Cục Quản lý Hộ chiếu & Định danh / Công an Xã'}\n`;
    response += `📋 MÃ THỦ TỤC: ${doc.procedure_code || structuredInfo.procedureCode || 'Thông tin chưa có trong cơ sở tri thức'}\n`;
    response += `⏰ THỜI HẠN: ${structuredInfo.processingTime || '2–3 ngày làm việc (theo quy định địa phương)'}\n`;
    response += `💰 PHÍ/ LỆ PHÍ: ${structuredInfo.fee || 'Thông tin chưa có trong cơ sở tri thức'}\n`;

    // Document requirements based on actual content
    if (structuredInfo.documents) {
      response += `📄 THÀNH PHẦN HỒ SƠ:\n${structuredInfo.documents}\n`;
    } else {
      // Extract from specific content structure if available
      const documentsMatch = doc.content.match(/Thành phần hồ sơ[^\n\r]*\n+((?:.|\n)*?)(?:\n[A-Z][a-z]+|$)/i);
      if (documentsMatch) {
        response += `📄 THÀNH PHẦN HỒ SƠ:\n${documentsMatch[1].trim()}\n`;
      } else {
        response += `📄 THÀNH PHẦN HỒ SƠ: Thông tin chưa có trong cơ sở tri thức\n`;
      }
    }

    // Detailed procedure steps based on actual content
    if (structuredInfo.procedureSteps) {
      response += `📝 TRÌNH TỰ THỰC HIỆN:\n${structuredInfo.procedureSteps}\n`;
    } else {
      // Extract from specific content structure if available
      const stepsMatch = doc.content.match(/Trình tự thực hiện[^\n\r]*\n+((?:.|\n)*?)(?:\n[A-Z][a-z]+|$)/i);
      if (stepsMatch) {
        response += `📝 TRÌNH TỰ THỰC HIỆN:\n${stepsMatch[1].trim()}\n`;
      } else {
        response += `📝 TRÌNH TỰ THỰC HIỆN: Thông tin chưa có trong cơ sở tri thức\n`;
      }
    }

    // Legal basis
    if (structuredInfo.legalBasis) {
      response += `🌐 CĂN CỨ PHÁP LÝ: ${structuredInfo.legalBasis}\n`;
    } else {
      // Look for legal basis in content
      const legalMatch = doc.content.match(/(?:Căn cứ pháp lý|Cơ sở pháp lý|Theo luật|Luật áp dụng)[^\n\r]*\n+([^\n\r]+)/i);
      if (legalMatch) {
        response += `🌐 CĂN CỨ PHÁP LÝ: ${legalMatch[1].trim()}\n`;
      } else {
        response += `🌐 CĂN CỨ PHÁP LÝ: Luật Cư trú, Nghị định 20/2019/NĐ-CP (đối với người nước ngoài), Luật Quản lý Định danh 2021\n`;
      }
    }

    // Official link - try to extract from content or metadata
    const officialLink = this.extractOfficialLink(doc);
    if (officialLink) {
      response += `🔗 LINK CHI TIẾT: ${officialLink}\n`;
    } else {
      // Look for links in the content for "LINK CHI TIẾT" or similar
      const linkPattern = /(?:LINK CHI TIẾT|Link chi tiết|https?:\/\/[^\s<>"'`]+)/i;
      const linkMatch = doc.content.match(/(https?:\/\/[^\s<>"'`]+)/i);
      if (linkMatch) {
        response += `🔗 LINK CHI TIẾT: ${linkMatch[1]}\n`;
      } else if (doc.metadata && doc.metadata.form_link) {
        response += `🔗 LINK CHI TIẾT: ${doc.metadata.form_link}\n`;
      } else {
        response += `🔗 LINK CHI TIẾT: Vui lòng tra cứu trên Cổng Dịch vụ công Quốc gia để có thông tin chính xác nhất\n`;
      }
    }

    // Form information
    if (structuredInfo.formLink) {
      response += `📋 BIỂU MẪU: ${structuredInfo.formLink}\n`;
    } else if (structuredInfo.formDescription) {
      response += `📋 BIỂU MẪU: ${structuredInfo.formDescription}\n`;
    } else {
      // Look for form information in content
      const formMatch = doc.content.match(/Biểu mẫu[^\n\r]*\n+([^\n\r]+)/i);
      if (formMatch) {
        response += `📋 BIỂU MẪU: ${formMatch[1].trim()}\n`;
      }
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