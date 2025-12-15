const path = require('path');
const fs = require('fs').promises;
const KnowledgeManager = require('./knowledge-manager');
const LocalEmbeddings = require('../ai/local-embeddings');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

class KnowledgeRAGProcessor {
  constructor() {
    this.knowledgeManager = new KnowledgeManager();
    this.embeddings = new LocalEmbeddings();
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY
    );
  }

  /**
   * Process all knowledge files from the knowledge-rag folder
   */
  async processAllKnowledgeFiles(knowledgeBasePath = null) {
    try {
      console.log('🔄 Starting to process knowledge files from knowledge-rag folder...');

      // Use a more robust path resolution - try to detect project root
      let absolutePath;

      if (knowledgeBasePath) {
        absolutePath = path.resolve(knowledgeBasePath);
      } else {
        // Try to find the project root by looking for package.json or a known directory
        const currentDir = path.resolve(__dirname);
        const projectRoot = path.join(currentDir, '../..'); // Assuming src/utils is 2 levels deep from root
        absolutePath = path.resolve(projectRoot, 'Knowlegd-rag', 'downloads_ministries');
      }

      console.log(`📁 Processing knowledge files from: ${absolutePath}`);

      // Check if the directory exists before trying to read it
      try {
        await fs.access(absolutePath);
      } catch (error) {
        console.log(`⚠️ Knowledge directory does not exist: ${absolutePath}`);
        console.log(`📁 Knowledge files will be loaded from Supabase database instead`);
        return; // Exit early if directory doesn't exist
      }

      const allMinistries = await fs.readdir(absolutePath);

      for (const ministry of allMinistries) {
        const ministryPath = path.join(absolutePath, ministry);
        const stats = await fs.stat(ministryPath);

        if (stats.isDirectory()) {
          console.log(`🏢 Processing ministry: ${ministry}`);
          await this.processMinistryFiles(ministryPath, ministry);
        }
      }

      console.log('✅ Completed processing all knowledge files from knowledge-rag folder');
    } catch (error) {
      console.error('❌ Error processing knowledge files:', error);
      throw error;
    }
  }

  /**
   * Process files for a specific ministry
   */
  async processMinistryFiles(ministryPath, ministryName) {
    try {
      const ministryFilesPath = path.join(ministryPath, 'huong_dan');

      // Check if huong_dan directory exists
      let filesPath = ministryFilesPath;
      try {
        await fs.access(filesPath);
      } catch {
        // If huong_dan doesn't exist, use the ministry directory directly
        filesPath = ministryPath;
      }

      const files = await fs.readdir(filesPath);
      console.log(`📄 Found ${files.length} files for ${ministryName}`);

      for (const file of files) {
        if (file.endsWith('.docx') || file.endsWith('.doc')) {
          const filePath = path.join(filesPath, file);
          await this.processKnowledgeFile(filePath, ministryName);
        }
      }

      // Also process any text files with list information
      const textFiles = files.filter(f => f.endsWith('.txt'));
      for (const textFile of textFiles) {
        const filePath = path.join(ministryPath, textFile);
        await this.processListFile(filePath, ministryName);
      }
    } catch (error) {
      console.error(`❌ Error processing ministry ${ministryName}:`, error);
    }
  }

  /**
   * Process a single knowledge file (docx/doc)
   */
  async processKnowledgeFile(filePath, ministryName) {
    try {
      const fileName = path.basename(filePath);
      console.log(`   📄 Processing file: ${fileName}`);

      // Extract procedure information from the file name
      const fileNameWithoutExt = path.parse(fileName).name;
      const procedureCode = fileNameWithoutExt.replace(/_/g, '.');

      // For docx files, we need to extract the content
      // We'll use a simple approach by storing the file path and using it as content reference
      const content = `Thông tin thủ tục hành chính - ${ministryName}\nMã thủ tục: ${procedureCode}\nĐường dẫn file: ${filePath}\n\nNội dung chi tiết vui lòng xem trong file đính kèm.`;

      const title = `Thủ tục hành chính - ${ministryName} - ${fileNameWithoutExt}`;
      const sourceUrl = `file://${filePath}`;
      const category = 'administrative_procedures';

      // Store in knowledge base
      const result = await this.knowledgeManager.generateKnowledgeFromInfo(
        title,
        content,
        sourceUrl,
        category,
        null
      );

      if (result.success) {
        console.log(`   ✅ Successfully stored: ${title}`);
      } else {
        console.error(`   ❌ Failed to store: ${title}`, result.error);
      }
    } catch (error) {
      console.error(`   ❌ Error processing file ${filePath}:`, error);
    }
  }

  /**
   * Process a list file (like danh_sach_*.txt)
   */
  async processListFile(filePath, ministryName) {
    try {
      const fileName = path.basename(filePath);
      console.log(`   📋 Processing list file: ${fileName}`);

      const content = await fs.readFile(filePath, 'utf8');

      // Extract procedures from the list file
      const procedures = this.extractProceduresFromList(content);

      for (const procedure of procedures) {
        const title = `Thủ tục: ${procedure.code} - ${procedure.title}`;
        const sourceUrl = `file://${filePath}`;
        const category = 'administrative_procedures_list';
        const fullContent = `Mã thủ tục: ${procedure.code}\nTên thủ tục: ${procedure.title}\nURL: ${procedure.url}\n\nNội dung chi tiết: ${procedure.description || 'Thông tin chi tiết vui lòng xem trong danh sách đầy đủ.'}`;

        // Store in knowledge base
        const result = await this.knowledgeManager.generateKnowledgeFromInfo(
          title,
          fullContent,
          sourceUrl,
          category,
          procedure.url || null
        );

        if (result.success) {
          console.log(`   ✅ Successfully stored procedure: ${procedure.code}`);
        } else {
          console.error(`   ❌ Failed to store procedure: ${procedure.code}`, result.error);
        }
      }
    } catch (error) {
      console.error(`   ❌ Error processing list file ${filePath}:`, error);
    }
  }

  /**
   * Extract procedures from a list file
   */
  extractProceduresFromList(content) {
    const procedures = [];

    // Extract procedures using regex patterns
    const procedurePattern = /(\d+\..*?)\s*\n\s*URL:\s*(https?:\/\/[^\s\n]+)/g;
    let match;

    while ((match = procedurePattern.exec(content)) !== null) {
      procedures.push({
        code: match[1].trim(),
        title: match[1].trim(),
        url: match[2].trim(),
        description: 'Thông tin chi tiết về thủ tục hành chính'
      });
    }

    // Alternative pattern for different formats
    const altPattern = /(\d+\..*?)\s*\n\s*\[(.*?)\]\s*(.*?)\n/g;
    while ((match = altPattern.exec(content)) !== null) {
      procedures.push({
        code: match[2] ? match[2].trim() : match[1].trim(),
        title: match[3] ? match[3].trim() : match[1].trim(),
        url: null,
        description: match[1].trim()
      });
    }

    return procedures;
  }

  /**
   * Process a specific ministry's files
   */
  async processSpecificMinistry(ministryName, knowledgeBasePath = '../../../Knowlegd-rag/downloads_ministries') {
    try {
      const absolutePath = path.resolve(__dirname, knowledgeBasePath);
      const ministryPath = path.join(absolutePath, ministryName);

      const stats = await fs.stat(ministryPath);
      if (stats.isDirectory()) {
        console.log(`🏢 Processing specific ministry: ${ministryName}`);
        await this.processMinistryFiles(ministryPath, ministryName);
      } else {
        console.error(`❌ Ministry folder not found: ${ministryPath}`);
      }
    } catch (error) {
      console.error(`❌ Error processing specific ministry ${ministryName}:`, error);
      throw error;
    }
  }

  /**
   * Refresh/reprocess all knowledge
   */
  async refreshAllKnowledge(knowledgeBasePath = '../../../Knowlegd-rag/downloads_ministries') {
    try {
      console.log('🔄 Refreshing all knowledge from knowledge-rag folder...');

      // Clear existing knowledge if needed (optional)
      // await this.clearKnowledgeByCategory('administrative_procedures');

      await this.processAllKnowledgeFiles(knowledgeBasePath);

      console.log('✅ Knowledge refresh completed');
    } catch (error) {
      console.error('❌ Error refreshing knowledge:', error);
      throw error;
    }
  }

  /**
   * Clear knowledge by category
   */
  async clearKnowledgeByCategory(category) {
    try {
      // Find knowledge entries that match the category
      const { data: knowledgeEntries, error: knowledgeError } = await this.supabase
        .from('government_procedures_knowledge')
        .select('id')
        .ilike('procedure_title', `%${category}%`)
        .or(`ministry_name.ilike.%${category}%,full_procedure_content.ilike.%${category}%`);

      if (knowledgeError) {
        console.error('❌ Error finding knowledge entries to clear:', knowledgeError);
        return { success: false, error: knowledgeError };
      }

      if (knowledgeEntries && knowledgeEntries.length > 0) {
        const knowledgeIds = knowledgeEntries.map(k => k.id);

        // Delete the knowledge entries
        const { error: deleteError } = await this.supabase
          .from('government_procedures_knowledge')
          .delete()
          .in('id', knowledgeIds);

        if (deleteError) {
          console.error('❌ Error clearing knowledge entries:', deleteError);
          return { success: false, error: deleteError };
        }

        console.log(`🗑️ Cleared ${knowledgeEntries.length} knowledge entries with category containing: ${category}`);
      }

      return { success: true };
    } catch (error) {
      console.error('❌ Error clearing knowledge by category:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Count total knowledge documents
   */
  async countKnowledgeDocuments() {
    try {
      const { count, error } = await this.supabase
        .from('government_procedures_knowledge')
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.error('❌ Error counting knowledge documents:', error);
        return 0;
      }

      console.log(`📊 Total knowledge documents: ${count}`);
      return count;
    } catch (error) {
      console.error('❌ Error counting knowledge documents:', error);
      return 0;
    }
  }
}

module.exports = KnowledgeRAGProcessor;