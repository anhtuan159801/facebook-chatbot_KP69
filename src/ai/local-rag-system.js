require('dotenv').config(); // Load environment variables
const LocalEmbeddings = require('./local-embeddings');
const { createClient } = require('@supabase/supabase-js');

class LocalRAGSystem {
  constructor() {
    this.embeddings = new LocalEmbeddings();
    this._supabase = null; // Lazy initialization
  }

  get supabase() {
    if (!this._supabase) {
      // Try both formats: with and without NEXT_PUBLIC_ prefix
      const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY) environment variables are required.');
      }
      this._supabase = require('@supabase/supabase-js').createClient(
        supabaseUrl,
        supabaseAnonKey
      );
    }
    return this._supabase;
  }

  async getRelevantKnowledge(userQuery, category = null) {
    try {
      // Return empty results if Supabase is not configured
      const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        return []; // Return empty array when Supabase is not configured
      }

      const queryEmbedding = await this.embeddings.generateEmbedding(userQuery);

      const { data: relevantDocs, error } = await this.supabase
        .rpc('match_documents', {
          query_embedding: queryEmbedding,
          match_count: 5,
          filter_category: category
        });

      if (error) {
        console.error('Error searching knowledge:', error);
        return [];
      }

      // Filter results by similarity threshold (lower = more similar)
      return relevantDocs.filter(doc => doc.similarity < 0.6);
    } catch (error) {
      console.error('Error in RAG system:', error);
      return [];
    }
  }

  formatKnowledgeForPrompt(knowledgeDocs) {
    if (!knowledgeDocs || knowledgeDocs.length === 0) {
      return '';
    }

    return knowledgeDocs.map(doc => {
      // Extract structured information from the document content
      const structuredInfo = this.extractStructuredInfo(doc.content);
      // Extract URLs from the document content
      const urls = this.extractUrlsFromContent(doc.content);

      let formatted = `🔍 THỦ TỤC HÀNH CHÍNH CHI TIẾT:\n`;
      formatted += `📝 Mã thủ tục: ${structuredInfo.procedureCode || 'N/A'}\n`;
      formatted += `📋 Tên thủ tục: ${structuredInfo.procedureName || 'N/A'}\n`;
      formatted += `⏰ Thời hạn giải quyết: ${structuredInfo.processingTime || 'N/A'}\n`;
      formatted += `💰 Phí, lệ phí: ${structuredInfo.fee || 'N/A'}\n`;
      formatted += `🏢 Cơ quan thực hiện: ${structuredInfo.agency || 'N/A'}\n`;
      formatted += `📋 Thành phần hồ sơ: ${structuredInfo.documents ? structuredInfo.documents.substring(0, 200) + '...' : 'N/A'}\n`;
      formatted += `📋 Trình tự thực hiện: ${structuredInfo.procedureSteps ? structuredInfo.procedureSteps.substring(0, 300) + '...' : 'N/A'}\n`;

      // Display form link if available
      if (structuredInfo.formLink) {
        formatted += `📄 Link biểu mẫu: ${structuredInfo.formLink}\n`;
      }

      // Display actual URLs found in the document content
      if (urls.length > 0) {
        // Show the main link that isn't already captured as form link
        const mainLinks = urls.filter(url => url !== structuredInfo.formLink);
        if (mainLinks.length > 0) {
          formatted += `🔗 Link chi tiết: ${mainLinks[0]}\n`; // Show the main link
          if (mainLinks.length > 1) {
            formatted += `🔗 Link liên quan: ${mainLinks.slice(1).join(', ')}\n`;
          }
        }
      } else {
        formatted += `🌐 Thông tin chi tiết: ${doc.source_url || 'N/A'}\n`;
      }

      formatted += `📄 Nội dung đầy đủ: ${doc.content.substring(0, 600)}...\n\n`;

      return formatted;
    }).join('');
  }

  /**
   * Extract structured information from document content
   */
  extractStructuredInfo(content) {
    const info = {};

    // Extract procedure code
    const codeMatch = content.match(/Mã thủ tục:\s*([^\n\r]+)/i);
    if (codeMatch) {
      info.procedureCode = codeMatch[1].trim();
    }

    // Alternative formats for procedure code
    if (!info.procedureCode) {
      const altCodeMatch = content.match(/Mã số thủ tục:\s*([^\n\r]+)/i);
      if (altCodeMatch) {
        info.procedureCode = altCodeMatch[1].trim();
      }
    }

    // Extract procedure name
    const nameMatch = content.match(/Tên thủ tục:\s*([^\n\r]+)/i);
    if (nameMatch) {
      info.procedureName = nameMatch[1].trim();
    }

    // Alternative formats for procedure name
    if (!info.procedureName) {
      const altNameMatch = content.match(/Tên đầy đủ:\s*([^\n\r]+)/i);
      if (altNameMatch) {
        info.procedureName = altNameMatch[1].trim();
      }
    }

    // Extract processing time
    const timeMatch = content.match(/Thời hạn giải quyết:\s*([^\n\r]+)/i);
    if (timeMatch) {
      info.processingTime = timeMatch[1].trim();
    }

    // Alternative formats for processing time
    if (!info.processingTime) {
      const altTimeMatch = content.match(/Thời gian giải quyết:\s*([^\n\r]+)/i);
      if (altTimeMatch) {
        info.processingTime = altTimeMatch[1].trim();
      }
    }

    // Extract fee
    const feeMatch = content.match(/Phí, lệ phí:\s*([^\n\r]+)/i);
    if (feeMatch) {
      info.fee = feeMatch[1].trim();
    }

    // Alternative formats for fee
    if (!info.fee) {
      const altFeeMatch = content.match(/Lệ phí:\s*([^\n\r]+)/i);
      if (altFeeMatch) {
        info.fee = altFeeMatch[1].trim();
      }
    }

    // Extract agency
    const agencyMatch = content.match(/Cơ quan thực hiện:\s*([^\n\r]+)/i);
    if (agencyMatch) {
      info.agency = agencyMatch[1].trim();
    }

    // Alternative format for agency
    if (!info.agency) {
      const altAgencyMatch = content.match(/Cơ quan có thẩm quyền:\s*([^\n\r]+)/i);
      if (altAgencyMatch) {
        info.agency = altAgencyMatch[1].trim();
      }
    }

    // Extract documents required
    const docsMatch = content.match(/Thành phần hồ sơ:[\s\S]*?(?:\n\n|\nBước|\nCách|$)/i);
    if (docsMatch) {
      info.documents = docsMatch[0].replace(/Thành phần hồ sơ:/i, '').trim();
    }

    // Alternative format for documents
    if (!info.documents) {
      const altDocsMatch = content.match(/Hồ sơ bao gồm:[\s\S]*?(?:\n\n|\nBước|\nCách|$)/i);
      if (altDocsMatch) {
        info.documents = altDocsMatch[0].replace(/Hồ sơ bao gồm:/i, '').trim();
      }
    }

    // Extract procedure steps
    const stepsMatch = content.match(/Trình tự thực hiện:[\s\S]*?(?:\n\n|\nCách|$)/i);
    if (stepsMatch) {
      info.procedureSteps = stepsMatch[0].replace(/Trình tự thực hiện:/i, '').trim();
    }

    // Alternative format for procedure steps
    if (!info.procedureSteps) {
      const altStepsMatch = content.match(/Các bước thực hiện:[\s\S]*?(?:\n\n|\nCách|$)/i);
      if (altStepsMatch) {
        info.procedureSteps = altStepsMatch[0].replace(/Các bước thực hiện:/i, '').trim();
      }
    }

    // Extract form links (biểu mẫu)
    const formMatch = content.match(/Biểu mẫu(?:\s+\d+)?:\s*(https?:\/\/[^\s<>"'`]+)/i);
    if (formMatch) {
      info.formLink = formMatch[1];
    } else {
      // Look for common form-related links in the content
      const urls = this.extractUrlsFromContent(content);
      const formUrls = urls.filter(url =>
        url.toLowerCase().includes('bieu-mau') ||
        url.toLowerCase().includes('form') ||
        url.toLowerCase().includes('mau-so')
      );
      if (formUrls.length > 0) {
        info.formLink = formUrls[0];
      }
    }

    return info;
  }

  /**
   * Extract URLs from document content
   */
  extractUrlsFromContent(content) {
    if (!content) return [];

    // Regular expression to match URLs
    const urlRegex = /(https?:\/\/[^\s<>"'`]+|www\.[^\s<>"'`]+|ftp:\/\/[^\s<>"'`]+)/gi;
    const matches = content.match(urlRegex) || [];

    // Remove duplicate URLs and clean them
    const uniqueUrls = [...new Set(matches.map(url => {
      // If it starts with www., add https://
      if (url.startsWith('www.')) {
        return 'https://' + url;
      }
      return url;
    }))];

    return uniqueUrls;
  }
}

module.exports = LocalRAGSystem;