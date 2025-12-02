const CrawlerManager = require('../src/utils/crawler-manager');

class CrawlScheduler {
  constructor() {
    this.crawler = new CrawlerManager();
  }

  async start() {
    console.log('Starting crawl scheduler...');
    
    try {
      // Run initial crawl
      console.log('Running initial crawl...');
      await this.crawler.crawlGovernmentServices();
      
      // Schedule periodic crawls
      console.log('Setting up periodic crawls...');
      
      // Every 6 hours for priority sources
      setInterval(async () => {
        console.log('Running scheduled crawl for priority sources...');
        await this.crawlPrioritySources();
      }, 6 * 60 * 60 * 1000); // 6 hours
      
      // Every 12 hours for comprehensive crawl
      setInterval(async () => {
        console.log('Running scheduled comprehensive crawl...');
        await this.crawler.crawlGovernmentServices();
      }, 12 * 60 * 60 * 1000); // 12 hours
      
      console.log('Crawl scheduler started successfully!');
      
    } catch (error) {
      console.error('Error starting crawl scheduler:', error);
      throw error;
    }
  }

  async crawlPrioritySources() {
    // Crawl most important sources more frequently
    const priorityCrawlers = [
      this.crawler.crawlDichVuCong.bind(this.crawler),
      this.crawler.crawlVNeID.bind(this.crawler)
    ];

    for (const crawler of priorityCrawlers) {
      try {
        const data = await crawler();
        if (data && data.length > 0) {
          await this.crawler.processAndStore(data);
        }
      } catch (error) {
        console.error('Error in priority crawl:', error);
      }
    }
  }
}

module.exports = CrawlScheduler;

// If this file is run directly, start the scheduler
if (require.main === module) {
  const scheduler = new CrawlScheduler();
  scheduler.start().catch(console.error);
}