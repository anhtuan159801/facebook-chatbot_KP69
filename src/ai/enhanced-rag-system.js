/**
 * Enhanced RAG System with Semantic Search
 *
 * Implements proper semantic search using embeddings for better relevance
 * and accuracy in knowledge retrieval for the Vietnamese government services chatbot
 */

require('dotenv').config(); // Load environment variables
const LocalEmbeddings = require('./local-embeddings');
const { createClient } = require('@supabase/supabase-js');
const ProfessionalResponseFormatter = require('../utils/professional-response-formatter');
const { createLogger } = require('../utils/enhanced-logger');

class EnhancedRAGSystem {
  constructor() {
    this.embeddings = new LocalEmbeddings();
    this._supabase = null; // Lazy initialization
    this.logger = createLogger('EnhancedRAGSystem');
    this.improvedCache = require('../utils/improved-cache'); // Use improved cache system
  }

  get supabase() {
    if (!this._supabase) {
      // Try both formats: with and without NEXT_PUBLIC_ prefix
      const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY) environment variables are required.');
      }
      this._supabase = require('@supabase/supabase-js').createClient(
        supabaseUrl,
        supabaseAnonKey
      );
    }
    return this._supabase;
  }

  /**
   * Generate embedding with improved caching
   */
  async generateEmbeddingWithCache(text) {
    const cached = await this.improvedCache.getCachedEmbedding(text);
    if (cached) {
      return cached;
    }

    const embedding = await this.embeddings.generateEmbedding(text);
    await this.improvedCache.cacheEmbedding(text, embedding);

    return embedding;
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) {
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Enhanced method to get relevant knowledge using semantic search with better error handling
   */
  async getRelevantKnowledge(userQuery, category = null) {
    try {
      // Validate input
      if (!userQuery || typeof userQuery !== 'string' || userQuery.trim().length === 0) {
        this.logger.warn('Empty or invalid query provided to getRelevantKnowledge');
        return [];
      }

      // Return empty results if Supabase is not configured
      const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        this.logger.warn('Supabase not configured, using fallback search');
        // Fallback to using your existing knowledge directory structure
        return await this.getRelevantKnowledgeFromFileSystem(userQuery, category);
      }

      console.log(`🔍 [Supabase] Starting knowledge retrieval for query: "${userQuery.substring(0, 30)}..."`);

      // First, try to use vector similarity search if available
      let relevantDocs = [];

      try {
        // Generate embedding for the user query
        console.log(`📊 [Supabase] Generating embedding for query: "${userQuery.substring(0, 30)}..."`);
        const queryEmbedding = await this.generateEmbeddingWithCache(userQuery);

        console.log(`🔍 [Supabase] Performing vector similarity search...`);
        // Perform vector similarity search
        relevantDocs = await this.performVectorSearch(queryEmbedding, category);

        console.log(`📊 [Supabase] Vector search completed, found ${relevantDocs.length} results`);

        // If vector search didn't return enough results, supplement with text search
        if (relevantDocs.length < 3) {
          console.log(`🔍 [Supabase] Insufficient vector results, supplementing with text search...`);
          const textSearchResults = await this.performTextSearch(userQuery, category, 5 - relevantDocs.length);
          // Combine and deduplicate results
          const combinedResults = [...relevantDocs, ...textSearchResults];
          // Remove duplicates based on doc id
          const uniqueResults = combinedResults.filter((doc, index, self) =>
            index === self.findIndex(d => d.id === doc.id)
          );
          relevantDocs = uniqueResults;
          console.log(`📊 [Supabase] Combined search completed, total results: ${relevantDocs.length}`);
        }
      } catch (vectorError) {
        // If vector search fails (e.g., no vector column), fallback to text search
        this.logger.warn(`Vector search failed, falling back to text search: ${vectorError.message}`);
        try {
          console.log(`🔍 [Supabase] Performing text search...`);
          relevantDocs = await this.performTextSearch(userQuery, category, 5);
          console.log(`📊 [Supabase] Text search completed, found ${relevantDocs.length} results`);
        } catch (textSearchError) {
          this.logger.error(`Both vector and text search failed: ${textSearchError.message}`);
          return []; // Return empty array if both searches fail
        }
      }

      // Validate and clean results
      const validResults = relevantDocs.filter(doc =>
        doc && doc.full_content && doc.full_content.trim().length > 0
      );

      // Format results to match the expected structure
      const formattedResults = validResults.map(doc => ({
        id: doc.id,
        content: doc.full_content,
        similarity: doc.similarity !== undefined ? doc.similarity : (doc.rerankedScore || 0.5),
        doc_id: doc.id,
        source_url: doc.source_url,
        ministry_name: doc.ministry_name,
        procedure_code: doc.procedure_code,
        procedure_title: doc.procedure_title,
        metadata: doc.metadata  // Include metadata for additional info
      }));

      // Log the quality of results
      console.log(`✅ [Supabase] Completed knowledge retrieval: ${formattedResults.length} relevant documents for query: "${userQuery.substring(0, 30)}..."`);
      this.logger.info(`Retrieved ${formattedResults.length} relevant documents for query: "${userQuery.substring(0, 50)}..."`);

      return formattedResults;
    } catch (error) {
      this.logger.error('Critical error in Enhanced RAG system:', {
        error: error.message,
        stack: error.stack,
        userQuery: userQuery.substring(0, 50) + '...'
      });

      // Fallback to filesystem search
      try {
        return await this.getRelevantKnowledgeFromFileSystem(userQuery, category);
      } catch (fallbackError) {
        this.logger.error('Fallback search also failed:', fallbackError.message);
        return []; // Return empty array as ultimate fallback
      }
    }
  }

  /**
   * Perform vector similarity search using Supabase with improved relevance
   */
  async performVectorSearch(queryEmbedding, category = null, limit = 5) {
    try {
      console.log(`🔍 [Vector Search] Starting vector search with category: ${category || 'all'}`);

      let queryBuilder = this.supabase
        .from('government_procedures_knowledge')
        .select(`
          id,
          procedure_code,
          full_content,
          procedure_title,
          ministry_name,
          source_url,
          metadata
        `)
        .limit(limit * 3); // Get more results for better selection

      // Add category filter if provided and it's a specific ministry name (not a general category)
      const generalCategories = ['dichvucong', 'administrative_procedures', 'temporary_residence', 'payment', 'sawaco', 'evnhcmc', 'vneid', 'vssid', 'etax'];
      if (category && !generalCategories.includes(category)) {
        console.log(`🏷️ [Vector Search] Filtering by ministry: ${category}`);
        queryBuilder = queryBuilder.ilike('ministry_name', `%${category}%`);  // Use ilike for partial matches
      } else if (category) {
        console.log(`🏷️ [Vector Search] General category detected: ${category}, not applying ministry filter`);
      }

      // Execute the query
      console.log(`📡 [Vector Search] Executing Supabase query...`);
      const { data: allDocs, error } = await queryBuilder;

      if (error) {
        console.error(`❌ [Vector Search] Query failed: ${error.message}`);
        throw new Error(`Vector search query failed: ${error.message}`);
      }

      console.log(`📊 [Vector Search] Retrieved ${allDocs.length} documents, calculating similarity scores...`);

      // Calculate similarity scores for each document
      const similarityResults = [];

      for (const doc of allDocs) {
        try {
          // Use smaller chunk for faster embedding and better relevance
          const docContent = doc.full_content ? doc.full_content.substring(0, 2000) : '';

          // If the document has a precomputed embedding in the database, use it directly
          let similarity = 0;
          if (doc.embedding && Array.isArray(doc.embedding) && doc.embedding.length > 0) {
            // Use the stored embedding from the database
            similarity = this.cosineSimilarity(queryEmbedding, doc.embedding);
          } else {
            // Generate embedding on the fly if not available in database
            const docEmbedding = await this.generateEmbeddingWithCache(docContent);
            similarity = this.cosineSimilarity(queryEmbedding, docEmbedding);
          }

          // Raise the threshold for better relevance (was 0.05, now 0.15)
          if (similarity > 0.15) {
            similarityResults.push({
              ...doc,
              similarity: similarity
            });
          }
        } catch (embeddingError) {
          // If embedding generation fails for a document, skip it to ensure quality
          this.logger.warn(`Failed to process embedding for document ${doc.id}: ${embeddingError.message}`);
          continue;
        }
      }

      // Sort by similarity score (highest first)
      similarityResults.sort((a, b) => b.similarity - a.similarity);

      // Re-rank using keyword matching as well for better relevance
      const rerankedResults = this.rerankResults(similarityResults);

      // Return top results after re-ranking, with quality validation
      const finalResults = rerankedResults.slice(0, limit);

      // Log quality metrics
      if (finalResults.length > 0) {
        const avgSimilarity = finalResults.reduce((sum, doc) => sum + (doc.similarity || 0), 0) / finalResults.length;
        console.log(`✅ [Vector Search] Completed: ${finalResults.length} results, avg similarity: ${avgSimilarity.toFixed(3)}`);
        this.logger.info(`Vector search quality: ${finalResults.length} results, avg similarity: ${avgSimilarity.toFixed(3)}`);
      } else {
        console.log(`⚠️ [Vector Search] No results above similarity threshold`);
      }

      return finalResults;
    } catch (error) {
      console.error(`❌ [Vector Search] Error: ${error.message}`);
      this.logger.warn(`Vector search error, falling back to text search: ${error.message}`);
      // In a real implementation with proper vector database, this would work
      // For now, we'll return text search results
      return await this.performTextSearch('', category, limit, true);
    }
  }

  /**
   * Re-rank results using keyword matching in addition to semantic similarity
   */
  rerankResults(results) {
    return results.map(result => {
      // Add a composite score that combines semantic similarity with keyword relevance
      const contentLower = result.full_content.toLowerCase();

      // Calculate keyword relevance score based on common administrative terms
      const adminKeywords = [
        'thủ tục', 'hồ sơ', 'giấy tờ', 'cơ quan', 'thời gian', 'phí', 'lệ phí', 'địa chỉ', 'điện thoại'
      ];

      let keywordScore = 0;
      for (const keyword of adminKeywords) {
        if (contentLower.includes(keyword)) {
          keywordScore += 0.1; // Boost for relevant keywords
        }
      }

      // Combine scores (semantic similarity and keyword relevance)
      const compositeScore = (result.similarity || 0) * 0.7 + keywordScore * 0.3;

      return {
        ...result,
        compositeScore: compositeScore,
        similarity: result.similarity || 0
      };
    })
    .sort((a, b) => b.compositeScore - a.compositeScore);
  }

  /**
   * Perform traditional text search as fallback
   */
  async performTextSearch(userQuery, category = null, limit = 5, skipCategory = false) {
    try {
      console.log(`🔍 [Text Search] Starting text search for query: "${userQuery.substring(0, 30)}..."`);

      let query = this.supabase
        .from('government_procedures_knowledge')
        .select(`
          id,
          procedure_code,
          full_content,
          procedure_title,
          ministry_name,
          source_url,
          metadata
        `)
        .textSearch('full_content', userQuery, {
          type: 'websearch'
        })
        .order('created_at', { ascending: false })
        .limit(limit);

      if (category && !skipCategory) {
        // Only filter by ministry name if it's a specific ministry (not a general category)
        const generalCategories = ['dichvucong', 'administrative_procedures', 'temporary_residence', 'payment', 'sawaco', 'evnhcmc', 'vneid', 'vssid', 'etax'];
        if (!generalCategories.includes(category)) {
          console.log(`🏷️ [Text Search] Filtering by ministry: ${category}`);
          query = query.eq('ministry_name', category);
        } else {
          console.log(`🏷️ [Text Search] General category detected: ${category}, not applying ministry filter`);
        }
      }

      console.log(`📡 [Text Search] Executing text search query...`);
      const { data: relevantDocs, error } = await query;

      if (error) {
        console.error(`❌ [Text Search] Query failed: ${error.message}`);
        return [];
      }

      console.log(`📊 [Text Search] Retrieved ${relevantDocs.length} documents, calculating keyword scores...`);

      // Add similarity scores based on keyword matching
      const resultsWithScores = relevantDocs.map(doc => {
        // Simple keyword relevance scoring
        const contentLower = doc.full_content.toLowerCase();
        const queryLower = userQuery.toLowerCase();
        const queryWords = queryLower.split(/\s+/);

        let score = 0;
        for (const word of queryWords) {
          if (contentLower.includes(word)) {
            score += 1;
          }
        }

        // Normalize the score
        const normalizedScore = Math.min(1.0, score / queryWords.length);

        return {
          ...doc,
          similarity: normalizedScore
        };
      });

      console.log(`✅ [Text Search] Completed: ${resultsWithScores.length} results`);
      return resultsWithScores;
    } catch (error) {
      console.error(`❌ [Text Search] Error: ${error.message}`);
      return [];
    }
  }

  /**
   * Updated to use Supabase as the primary knowledge source
   */
  async getRelevantKnowledgeFromFileSystem(userQuery, category = null) {
    try {
      // This method is now deprecated since we use Supabase as primary source
      // However, we keep it for backward compatibility if needed
      this.logger.warn('File system fallback is being used - this should not happen in production');
      return [];
    } catch (error) {
      this.logger.error('Error in filesystem RAG fallback:', { error: error.message });
      return [];
    }
  }

  /**
   * Format knowledge for prompt with improved structure and validation
   */
  formatKnowledgeForPrompt(knowledgeDocs, userQuery = '') {
    if (!knowledgeDocs || knowledgeDocs.length === 0) {
      return '';
    }

    // Validate and filter out low-quality results
    const validDocs = knowledgeDocs.filter(doc =>
      doc &&
      doc.full_content &&
      doc.full_content.trim().length > 10 && // At least 10 characters of meaningful content (more lenient)
      (doc.similarity === undefined || doc.similarity > 0.02) // Lower similarity threshold to allow more documents
    );

    // If no valid docs after filtering, try with even more lenient criteria
    if (validDocs.length === 0) {
      const moreLenientValidDocs = knowledgeDocs.filter(doc =>
        doc && doc.full_content && doc.full_content.trim().length > 5 // Very minimal content
      );

      if (moreLenientValidDocs.length > 0) {
        // Use the more lenient set - continue with the same formatting logic
        this.logger.info(`Using ${moreLenientValidDocs.length} documents with lenient filtering`);
        const sortedDocs = [...moreLenientValidDocs].sort((a, b) => (b.similarity || 0) - (a.similarity || 0));

        // Special handling for temporary residence cancellation
        if (userQuery.toLowerCase().includes('xóa tạm trú') || userQuery.toLowerCase().includes('hủy đăng ký tạm trú')) {
          return ProfessionalResponseFormatter.formatTemporaryResidenceCancellationResponse(sortedDocs);
        }

        // Use the professional formatter for administrative procedures
        if (ProfessionalResponseFormatter.isAdministrativeProcedureQuery(userQuery)) {
          return ProfessionalResponseFormatter.formatStructuredResponse(userQuery, sortedDocs);
        }

        // Format with relevance scoring
        return sortedDocs.map((doc, index) => {
          // Extract structured information from the document content
          const structuredInfo = this.extractStructuredInfo(doc.full_content);
          // Extract URLs from the document content
          const urls = this.extractUrlsFromContent(doc.full_content);

          let formatted = `🔍 THỦ TỤC HÀNH CHÍNH CHI TIẾT (Độ phù hợp: ${(doc.similarity || 0).toFixed(2)}):\n`;
          formatted += `📝 Mã thủ tục: ${doc.procedure_code || structuredInfo.procedureCode || 'N/A'}\n`;
          formatted += `📋 Tên thủ tục: ${doc.procedure_title || structuredInfo.procedureName || 'N/A'}\n`;
          formatted += `🏢 Bộ/Ngành: ${doc.ministry_name || 'N/A'}\n`;

          // Add processing time if available
          if (structuredInfo.processingTime) {
            formatted += `⏰ Thời hạn giải quyết: ${structuredInfo.processingTime}\n`;
          }

          // Add fee information if available
          if (structuredInfo.fee) {
            formatted += `💰 Phí, lệ phí: ${structuredInfo.fee}\n`;
          }

          // Add documents required if available
          if (structuredInfo.documents) {
            formatted += `📋 Thành phần hồ sơ: ${typeof structuredInfo.documents === 'string' ?
              structuredInfo.documents.substring(0, 300) + '...' : 'N/A'}\n`;
          }

          // Add procedure steps if available
          if (structuredInfo.procedureSteps) {
            formatted += `📋 Trình tự thực hiện: ${typeof structuredInfo.procedureSteps === 'string' ?
              structuredInfo.procedureSteps.substring(0, 400) + '...' : 'N/A'}\n`;
          }

          // Display form link if available
          if (structuredInfo.formLink) {
            formatted += `📄 Link biểu mẫu: ${structuredInfo.formLink}\n`;
          }

          // Display actual URLs found in the document content
          if (urls.length > 0) {
            // Show the main link that isn't already captured as form link
            const mainLinks = urls.filter(url => !structuredInfo.formLink || !url.includes(structuredInfo.formLink));
            if (mainLinks.length > 0) {
              formatted += `🔗 Link chi tiết: ${mainLinks[0]}\n`; // Show the main link
              if (mainLinks.length > 1) {
                formatted += `🔗 Link liên quan: ${mainLinks.slice(1).join(', ')}\n`;
              }
            }
          } else if (doc.source_url) {
            // Use the source_url from the doc if available
            formatted += `🌐 Thông tin chi tiết: ${doc.source_url}\n`;
          }

          // Include metadata form link if available
          if (doc.metadata && doc.metadata.form_link) {
            formatted += `📋 Form link: ${doc.metadata.form_link}\n`;
          }

          // Include a more comprehensive content snippet
          const contentSnippet = doc.full_content ?
            doc.full_content.substring(0, 800) + (doc.full_content.length > 800 ? '...' : '') : 'N/A';
          formatted += `📄 Nội dung đầy đủ: ${contentSnippet}\n\n`;

          return formatted;
        }).join('');
      } else {
        this.logger.warn('No valid knowledge documents found after filtering');
        return '';
      }
    }

    // Sort docs by similarity if available (for better context relevance)
    const sortedDocs = [...validDocs].sort((a, b) => (b.similarity || 0) - (a.similarity || 0));

    // Special handling for temporary residence cancellation
    if (userQuery.toLowerCase().includes('xóa tạm trú') || userQuery.toLowerCase().includes('hủy đăng ký tạm trú')) {
      return ProfessionalResponseFormatter.formatTemporaryResidenceCancellationResponse(sortedDocs);
    }

    // Use the professional formatter for administrative procedures
    if (ProfessionalResponseFormatter.isAdministrativeProcedureQuery(userQuery)) {
      return ProfessionalResponseFormatter.formatStructuredResponse(userQuery, sortedDocs);
    }

    // Format with relevance scoring
    return sortedDocs.map((doc, index) => {
      // Extract structured information from the document content
      const structuredInfo = this.extractStructuredInfo(doc.full_content);
      // Extract URLs from the document content
      const urls = this.extractUrlsFromContent(doc.full_content);

      let formatted = `🔍 THỦ TỤC HÀNH CHÍNH CHI TIẾT (Độ phù hợp: ${(doc.similarity || 0).toFixed(2)}):\n`;
      formatted += `📝 Mã thủ tục: ${doc.procedure_code || structuredInfo.procedureCode || 'N/A'}\n`;
      formatted += `📋 Tên thủ tục: ${doc.procedure_title || structuredInfo.procedureName || 'N/A'}\n`;
      formatted += `🏢 Bộ/Ngành: ${doc.ministry_name || 'N/A'}\n`;

      // Add processing time if available
      if (structuredInfo.processingTime) {
        formatted += `⏰ Thời hạn giải quyết: ${structuredInfo.processingTime}\n`;
      }

      // Add fee information if available
      if (structuredInfo.fee) {
        formatted += `💰 Phí, lệ phí: ${structuredInfo.fee}\n`;
      }

      // Add documents required if available
      if (structuredInfo.documents) {
        formatted += `📋 Thành phần hồ sơ: ${typeof structuredInfo.documents === 'string' ?
          structuredInfo.documents.substring(0, 300) + '...' : 'N/A'}\n`;
      }

      // Add procedure steps if available
      if (structuredInfo.procedureSteps) {
        formatted += `📋 Trình tự thực hiện: ${typeof structuredInfo.procedureSteps === 'string' ?
          structuredInfo.procedureSteps.substring(0, 400) + '...' : 'N/A'}\n`;
      }

      // Display form link if available
      if (structuredInfo.formLink) {
        formatted += `📄 Link biểu mẫu: ${structuredInfo.formLink}\n`;
      }

      // Display actual URLs found in the document content
      if (urls.length > 0) {
        // Show the main link that isn't already captured as form link
        const mainLinks = urls.filter(url => !structuredInfo.formLink || !url.includes(structuredInfo.formLink));
        if (mainLinks.length > 0) {
          formatted += `🔗 Link chi tiết: ${mainLinks[0]}\n`; // Show the main link
          if (mainLinks.length > 1) {
            formatted += `🔗 Link liên quan: ${mainLinks.slice(1).join(', ')}\n`;
          }
        }
      } else if (doc.source_url) {
        // Use the source_url from the doc if available
        formatted += `🌐 Thông tin chi tiết: ${doc.source_url}\n`;
      }

      // Include metadata form link if available
      if (doc.metadata && doc.metadata.form_link) {
        formatted += `📋 Form link: ${doc.metadata.form_link}\n`;
      }

      // Include a more comprehensive content snippet
      const contentSnippet = doc.full_content ?
        doc.full_content.substring(0, 800) + (doc.full_content.length > 800 ? '...' : '') : 'N/A';
      formatted += `📄 Nội dung đầy đủ: ${contentSnippet}\n\n`;

      return formatted;
    }).join('');
  }

  /**
   * Validate the quality of retrieved knowledge
   */
  validateKnowledgeQuality(knowledgeDocs, userQuery) {
    if (!knowledgeDocs || knowledgeDocs.length === 0) {
      return {
        isValid: false,
        score: 0,
        message: 'No knowledge documents retrieved'
      };
    }

    // Calculate overall quality score
    const qualityMetrics = {
      avgSimilarity: 0,
      validContentCount: 0,
      totalDocs: knowledgeDocs.length,
      relevanceKeywordsMatched: 0
    };

    // Calculate average similarity and count valid docs
    let totalSimilarity = 0;
    for (const doc of knowledgeDocs) {
      if (doc && doc.full_content && doc.full_content.trim().length > 20) {
        qualityMetrics.validContentCount++;
        if (doc.similarity !== undefined) {
          totalSimilarity += doc.similarity;
        }
      }
    }

    qualityMetrics.avgSimilarity = qualityMetrics.totalDocs > 0
      ? totalSimilarity / knowledgeDocs.length
      : 0;

    // Initialize queryWords outside the conditional block
    const queryWords = userQuery ? userQuery.toLowerCase().split(/\s+/).filter(w => w.length > 2) : [];

    // Check if documents contain relevant keywords from the query
    if (userQuery) {
      for (const doc of knowledgeDocs) {
        if (doc && doc.full_content) {
          const contentLower = doc.full_content.toLowerCase();
          for (const word of queryWords) {
            if (contentLower.includes(word)) {
              qualityMetrics.relevanceKeywordsMatched++;
              break; // Count doc once per query
            }
          }
        }
      }
    }

    // Calculate quality score
    const contentQualityScore = qualityMetrics.validContentCount / knowledgeDocs.length;
    const relevanceScore = qualityMetrics.relevanceKeywordsMatched / Math.max(1, queryWords ? queryWords.length : 1);
    const overallScore = (contentQualityScore * 0.6 + relevanceScore * 0.4);

    const isValid = overallScore > 0.3 && qualityMetrics.validContentCount > 0;

    return {
      isValid,
      score: overallScore,
      message: isValid
        ? `Quality score: ${overallScore.toFixed(2)} (${qualityMetrics.validContentCount}/${knowledgeDocs.length} valid docs)`
        : `Low quality: ${overallScore.toFixed(2)}`,
      metrics: qualityMetrics
    };
  }

  /**
   * Helper method to extract URL from document content (for filesystem fallback)
   */
  extractUrlFromContent(content) {
    if (!content) return null;

    // Look for URL patterns in the content
    const urlRegex = /(https?:\/\/[^\s<>"'`]+)/i;
    const match = content.match(urlRegex);
    return match ? match[1] : null;
  }

  /**
   * Extract structured information from document content
   */
  extractStructuredInfo(content) {
    // Handle case where content is null or undefined
    if (!content) {
      return {};
    }

    const info = {};

    // Extract procedure code (multiple patterns)
    const codePatterns = [
      /Mã thủ tục:\s*([^\n\r]+)/i,
      /Mã số thủ tục:\s*([^\n\r]+)/i,
      /Mã:\s*([^\n\r]+)/i,
      /(?:Mã\s+)thủ\s+tục[:\s]+([^\n\r]+)/i
    ];

    for (const pattern of codePatterns) {
      const match = content.match(pattern);
      if (match) {
        info.procedureCode = match[1].trim();
        break;
      }
    }

    // Extract procedure name (multiple patterns)
    const namePatterns = [
      /Tên thủ tục:\s*([^\n\r]+)/i,
      /Tên đầy đủ:\s*([^\n\r]+)/i,
      /Tên:\s*([^\n\r]+)/i,
      /(?:Tên\s+)thủ\s+tục[:\s]+([^\n\r]+)/i
    ];

    for (const pattern of namePatterns) {
      const match = content.match(pattern);
      if (match) {
        info.procedureName = match[1].trim();
        break;
      }
    }

    // Extract processing time (multiple patterns)
    const timePatterns = [
      /Thời hạn giải quyết:\s*([^\n\r]+)/i,
      /Thời gian giải quyết:\s*([^\n\r]+)/i,
      /Thời gian xử lý:\s*([^\n\r]+)/i,
      /Thời hạn[:\s]+([^\n\r]+)/i
    ];

    for (const pattern of timePatterns) {
      const match = content.match(pattern);
      if (match) {
        info.processingTime = match[1].trim();
        break;
      }
    }

    // Extract fee (multiple patterns)
    const feePatterns = [
      /Phí,\s*lệ\s*phí:\s*([^\n\r]+)/i,
      /Lệ\s*phí:\s*([^\n\r]+)/i,
      /Phí[:\s]+([^\n\r]+)/i,
      /(?:Phí|Lệ\s*phí)\s+([^\n\r]+)/i
    ];

    for (const pattern of feePatterns) {
      const match = content.match(pattern);
      if (match) {
        info.fee = match[1].trim();
        break;
      }
    }

    // Extract agency (multiple patterns)
    const agencyPatterns = [
      /Cơ\s+quan\s+thực\s+hiện:\s*([^\n\r]+)/i,
      /Cơ\s+quan\s+có\s+thẩm\s+quyền:\s*([^\n\r]+)/i,
      /Đơn\s+vị\s+giải\s+quyết:\s*([^\n\r]+)/i
    ];

    for (const pattern of agencyPatterns) {
      const match = content.match(pattern);
      if (match) {
        info.agency = match[1].trim();
        break;
      }
    }

    // Extract documents required (multiple patterns)
    const docsPatterns = [
      /Thành\s+phần\s+hồ\s+sơ:[\s\S]*?(?:\n\n|\nBước|\nCách|$)/i,
      /Hồ\s+sơ\s+bao\s+gồm:[\s\S]*?(?:\n\n|\nBước|\nCách|$)/i,
      /Giấy\s+tờ\s+cần\s+có:[\s\S]*?(?:\n\n|\nBước|\nCách|$)/i
    ];

    for (const pattern of docsPatterns) {
      const match = content.match(pattern);
      if (match) {
        info.documents = match[0].replace(/Thành\s+phần\s+hồ\s+sơ:|Hồ\s+sơ\s+bao\s+gồm:|Giấy\s+tờ\s+cần\s+có:/i, '').trim();
        break;
      }
    }

    // Extract procedure steps (multiple patterns)
    const stepsPatterns = [
      /Trình\s+tự\s+thực\s+hiện:[\s\S]*?(?:\n\n|\nCách|$)/i,
      /Các\s+bước\s+thực\s+hiện:[\s\S]*?(?:\n\n|\nCách|$)/i,
      /Quy\s+trình\s+thực\s+hiện:[\s\S]*?(?:\n\n|\nCách|$)/i
    ];

    for (const pattern of stepsPatterns) {
      const match = content.match(pattern);
      if (match) {
        info.procedureSteps = match[0].replace(/Trình\s+tự\s+thực\s+hiện:|Các\s+bước\s+thực\s+hiện:|Quy\s+trình\s+thực\s+hiện:/i, '').trim();
        break;
      }
    }

    // Extract form links (biểu mẫu) - multiple patterns
    const formPatterns = [
      /Biểu\s+mẫu(?:\s+\d+)?:\s*(https?:\/\/[^\s<>"'`]+)/i,
      /Mẫu\s+số.*?:\s*(https?:\/\/[^\s<>"'`]+)/i,
      /(https?:\/\/[^\s<>"'`]*\.(?:form|bieu-mau|mau|download))[^\s<>"'`]*/i
    ];

    for (const pattern of formPatterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        info.formLink = match[1];
        break;
      }
    }

    // Look for form links in URLs if pattern matching failed
    if (!info.formLink) {
      const urls = this.extractUrlsFromContent(content);
      const formUrls = urls.filter(url =>
        url.toLowerCase().includes('bieu-mau') ||
        url.toLowerCase().includes('form') ||
        url.toLowerCase().includes('mau-so') ||
        url.toLowerCase().includes('download') ||
        url.toLowerCase().includes('mau')
      );
      if (formUrls.length > 0) {
        info.formLink = formUrls[0];
      }
    }

    // Extract legal basis (multiple patterns)
    const legalBasisPatterns = [
      /(?:Căn\s+cứ\s+pháp\s+lý|Theo\s+quy định|Theo\s+luật|Cơ\s+sở\s+pháp\s+lý)[\s\S]*?(?:\n\n|\n[^A-Z]|$)/i,
      /(?:Luật|Nghị\s+định|Thông\s+tư)[\s\S]*?(?:\n\n|\n[^A-Z]|$)/i
    ];

    for (const pattern of legalBasisPatterns) {
      const match = content.match(pattern);
      if (match) {
        info.legalBasis = match[0].trim();
        break;
      }
    }

    return info;
  }

  /**
   * Extract URLs from document content with improved pattern matching
   */
  extractUrlsFromContent(content) {
    if (!content) return [];

    // More comprehensive URL regex pattern
    const urlRegex = /(https?:\/\/[^\s<>"'`]+|www\.[^\s<>"'`]+|ftp:\/\/[^\s<>"'`]+)/gi;
    const matches = content.match(urlRegex) || [];

    // Remove duplicate URLs and clean them
    const uniqueUrls = [...new Set(matches.map(url => {
      // If it starts with www., add https://
      if (url.startsWith('www.')) {
        return 'https://' + url;
      }
      // Remove trailing punctuation that might have been caught
      return url.replace(/[.,;:!?)\]]+$/, '');
    }))];

    return uniqueUrls;
  }

  /**
   * Get top-k most relevant documents based on semantic similarity
   */
  async getTopKRelevantDocs(userQuery, category = null, k = 5) {
    const allRelevantDocs = await this.getRelevantKnowledge(userQuery, category);

    // Sort by similarity score and return top K
    return allRelevantDocs
      .sort((a, b) => (b.similarity || 0) - (a.similarity || 0))
      .slice(0, k);
  }

  /**
   * Validate AI response against source documents for factuality
   */
  validateResponseAgainstDocuments(aiResponse, sourceDocuments) {
    if (!sourceDocuments || sourceDocuments.length === 0) {
      return {
        isValid: false,
        confidence: 0,
        message: "No source documents provided for validation",
        validatedResponse: aiResponse
      };
    }

    // Convert response to lowercase for comparison
    const responseLower = aiResponse.toLowerCase();

    // Extract key information from source documents
    const sourceText = sourceDocuments
      .map(doc => doc.full_content ? doc.full_content.toLowerCase() : '')
      .join(' ')
      .substring(0, 5000); // Limit to first 5000 chars to prevent memory issues

    // Check if the response contains information that exists in the sources
    const responseSentences = aiResponse.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const validatedSentences = [];
    let totalConfidence = 0;

    for (const sentence of responseSentences) {
      const sentenceLower = sentence.toLowerCase().trim();

      // Skip very short sentences that might be greetings or connectors
      if (sentenceLower.length < 10) {
        validatedSentences.push(sentence);
        continue;
      }

      // Check if this sentence content exists in the source documents
      let sentenceConfidence = 0;

      // Check for direct content matches
      if (sourceText.includes(sentenceLower)) {
        sentenceConfidence = 1.0; // High confidence for direct matches
      } else {
        // Check for related content using keyword matching
        const words = sentenceLower.split(/\s+/).filter(w => w.length > 3); // Only consider words > 3 chars
        let matchedKeywords = 0;

        for (const word of words) {
          if (sourceText.includes(word)) {
            matchedKeywords++;
          }
        }

        if (words.length > 0) {
          sentenceConfidence = matchedKeywords / words.length;
        }
      }

      // If confidence is too low, this sentence might be hallucinated
      if (sentenceConfidence < 0.3) {
        // Instead of removing, we can flag this sentence
        validatedSentences.push(`${sentence.trim()} [⚠️ cần kiểm tra thông tin]`);
      } else {
        validatedSentences.push(sentence.trim());
      }

      totalConfidence += sentenceConfidence;
    }

    const overallConfidence = responseSentences.length > 0
      ? totalConfidence / responseSentences.length
      : 0;

    const isValid = overallConfidence > 0.5; // Consider valid if more than 50% confidence

    return {
      isValid,
      confidence: overallConfidence,
      message: isValid
        ? `Response validated with ${Math.round(overallConfidence * 100)}% confidence`
        : `Low confidence (${Math.round(overallConfidence * 100)}%) - possible hallucinations detected`,
      validatedResponse: validatedSentences.join('. ') + '.'
    };
  }

  /**
   * Check if response is likely to be hallucinated based on query and documents
   */
  isResponseHallucinated(aiResponse, userQuery, retrievedDocs) {
    if (!retrievedDocs || retrievedDocs.length === 0) {
      return {
        isHallucinated: true,
        confidence: 1.0,
        flaggedContent: ["No supporting documents found for response"]
      };
    }

    // Extract key terms from user query
    const queryTerms = userQuery.toLowerCase().split(/\s+/).filter(term => term.length > 2);

    // Extract key terms from AI response
    const responseTerms = aiResponse.toLowerCase().split(/\s+/).filter(term => term.length > 2);

    // Check if key terms from query appear in documents
    const docText = retrievedDocs.map(doc =>
      (doc.full_content ? doc.full_content.toLowerCase() : '')
    ).join(' ');

    // Count how many query terms appear in retrieved documents
    const queryTermsInDocs = queryTerms.filter(term => docText.includes(term)).length;
    const queryCoverage = queryTerms.length > 0 ? queryTermsInDocs / queryTerms.length : 0;

    // Check if response contains specific terms from documents
    const responseTermsFromDocs = responseTerms.filter(term => docText.includes(term)).length;
    const documentSupport = responseTerms.length > 0 ? responseTermsFromDocs / responseTerms.length : 0;

    // Determine hallucination likelihood
    const hallucinationScore = 1 - (queryCoverage * 0.5 + documentSupport * 0.5);

    // Identify potentially hallucinated content
    const flaggedContent = [];
    if (queryCoverage < 0.3) {
      flaggedContent.push("Response may not fully address user query");
    }
    if (documentSupport < 0.3) {
      flaggedContent.push("Response contains content not supported by retrieved documents");
    }

    return {
      isHallucinated: hallucinationScore > 0.6,
      confidence: hallucinationScore,
      flaggedContent: flaggedContent
    };
  }

  /**
   * Enhanced document reranking to improve relevance
   */
  async rerankDocuments(userQuery, documents) {
    if (!documents || documents.length <= 1) {
      return documents;
    }

    // Calculate a comprehensive relevance score combining multiple factors
    const rerankedDocs = documents.map(doc => {
      let relevanceScore = doc.similarity || 0;

      // Boost score for documents with structured information
      if (doc.procedure_code || doc.procedure_title) {
        relevanceScore += 0.1;
      }

      // Boost score for documents with source URLs (more trustworthy)
      if (doc.source_url) {
        relevanceScore += 0.05;
      }

      // Adjust based on document length (not too short, not too long)
      if (doc.full_content && doc.full_content.length > 100 && doc.full_content.length < 5000) {
        relevanceScore += 0.05;
      }

      // Prefer more recent documents if date info is available
      if (doc.metadata && doc.metadata.created_at) {
        const docDate = new Date(doc.metadata.created_at);
        const now = new Date();
        const daysOld = (now - docDate) / (1000 * 60 * 60 * 24);
        if (daysOld < 365) { // Less than 1 year old
          relevanceScore += 0.1;
        }
      }

      return {
        ...doc,
        rerankedScore: Math.min(1.0, relevanceScore)
      };
    });

    // Sort by the new comprehensive score
    return rerankedDocs.sort((a, b) => (b.rerankedScore || 0) - (a.rerankedScore || 0));
  }

  /**
   * Perform hybrid search combining both semantic and keyword-based approaches
   */
  async hybridSearch(userQuery, category = null, limit = 5) {
    try {
      // Get results from both approaches
      const vectorResults = await this.performVectorSearch(
        await this.generateEmbeddingWithCache(userQuery),
        category,
        Math.ceil(limit * 0.7) // 70% from vector search
      );

      const textResults = await this.performTextSearch(userQuery, category, Math.ceil(limit * 0.3)); // 30% from text search

      // Combine and deduplicate
      const combinedResults = [...vectorResults, ...textResults];
      const uniqueResults = combinedResults.filter((doc, index, self) =>
        index === self.findIndex(d => d.id === doc.id)
      );

      // Re-rank by similarity score
      return uniqueResults
        .sort((a, b) => (b.similarity || 0) - (a.similarity || 0))
        .slice(0, limit);
    } catch (error) {
      this.logger.error('Hybrid search error, falling back to regular search:', { error: error.message });
      return await this.getRelevantKnowledge(userQuery, category);
    }
  }
}

module.exports = EnhancedRAGSystem;