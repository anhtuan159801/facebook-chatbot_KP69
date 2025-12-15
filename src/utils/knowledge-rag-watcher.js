const chokidar = require('chokidar');
const path = require('path');
const KnowledgeRAGProcessor = require('./knowledge-rag-processor');
const { createLogger } = require('./logger');

class KnowledgeRAGWatcher {
  constructor(knowledgeBasePath = null) {
    // Use the same robust path resolution as the processor
    if (knowledgeBasePath) {
      this.knowledgeBasePath = path.resolve(knowledgeBasePath);
    } else {
      const currentDir = path.resolve(__dirname);
      const projectRoot = path.join(currentDir, '../..'); // Assuming src/utils is 2 levels deep from root
      this.knowledgeBasePath = path.resolve(projectRoot, 'Knowlegd-rag', 'downloads_ministries');
    }

    this.processor = new KnowledgeRAGProcessor();
    this.logger = createLogger('KnowledgeRAGWatcher');
    this.watcher = null;
    this.isWatching = false;
  }

  /**
   * Start watching for file changes in the knowledge-rag directory
   */
  startWatching() {
    if (this.isWatching) {
      this.logger.info('Knowledge RAG Watcher is already running');
      return;
    }

    this.logger.info(`Starting to watch knowledge directory: ${this.knowledgeBasePath}`);
    
    // Watch all .docx, .doc, and .txt files in the knowledge directory
    this.watcher = chokidar.watch(`${this.knowledgeBasePath}/**/*.{doc,docx,txt}`, {
      persistent: true,
      ignoreInitial: true, // Don't trigger events for existing files
      awaitWriteFinish: {
        stabilityThreshold: 2000, // Wait 2 seconds after file write completes
        pollInterval: 100
      }
    });

    // Add file handler
    this.watcher.on('add', (filePath) => {
      this.handleFileChange('add', filePath);
    });

    // Change handler (for updates)
    this.watcher.on('change', (filePath) => {
      this.handleFileChange('change', filePath);
    });

    // Error handler
    this.watcher.on('error', (error) => {
      this.logger.error(`Watcher error: ${error}`);
    });

    // Ready handler
    this.watcher.on('ready', () => {
      this.logger.info('Knowledge RAG Watcher is ready and listening for changes');
      this.isWatching = true;
    });

    return this.watcher;
  }

  /**
   * Handle file changes (add or change)
   */
  async handleFileChange(eventType, filePath) {
    this.logger.info(`File ${eventType}: ${filePath}`);
    
    try {
      // Determine the ministry from the file path
      const relativePath = path.relative(this.knowledgeBasePath, filePath);
      const ministryName = relativePath.split(path.sep)[0]; // First directory is the ministry name
      
      if (ministryName && ministryName !== '..' && ministryName !== '.') {
        this.logger.info(`Processing ${eventType} for ministry: ${ministryName}`);
        
        // Process the specific ministry that had changes
        await this.processor.processSpecificMinistry(ministryName);
        
        this.logger.info(`Completed processing ${eventType} for ministry: ${ministryName}`);
      } else {
        this.logger.warn(`Could not determine ministry from path: ${filePath}`);
      }
    } catch (error) {
      this.logger.error(`Error processing file ${eventType} for ${filePath}:`, error);
    }
  }

  /**
   * Stop watching
   */
  async stopWatching() {
    if (this.watcher) {
      await this.watcher.close();
      this.isWatching = false;
      this.logger.info('Knowledge RAG Watcher stopped');
    }
  }

  /**
   * Process all knowledge once (for initialization)
   */
  async processAllKnowledge() {
    try {
      this.logger.info('Processing all knowledge files (initialization)...');
      await this.processor.processAllKnowledgeFiles();
      this.logger.info('Completed processing all knowledge files');
    } catch (error) {
      if (error.code === 'ENOENT') {
        this.logger.info('📁 Knowledge directory not found - using Supabase database as primary knowledge source');
      } else {
        this.logger.error('Error processing all knowledge files:', error);
      }
    }
  }

  /**
   * Process specific ministry
   */
  async processSpecificMinistry(ministryName) {
    try {
      this.logger.info(`Processing specific ministry: ${ministryName}`);
      await this.processor.processSpecificMinistry(ministryName);
      this.logger.info(`Completed processing ministry: ${ministryName}`);
    } catch (error) {
      this.logger.error(`Error processing ministry ${ministryName}:`, error);
    }
  }
}

module.exports = KnowledgeRAGWatcher;