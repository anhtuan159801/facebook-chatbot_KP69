require('dotenv').config(); // Load environment variables
const puppeteer = require('puppeteer');
const axios = require('axios');
const LocalEmbeddings = require('../ai/local-embeddings');

class CrawlerManager {
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

  async crawlGovernmentServices() {
    console.log('Starting government services crawl...');
    
    const crawlers = [
      this.crawlDichVuCong.bind(this),
      this.crawlVNeID.bind(this),
      this.crawlSAWACO.bind(this),
      this.crawlEVNHCMC.bind(this),
      this.crawlVssID.bind(this),
      this.crawlETax.bind(this)
    ];

    for (const crawler of crawlers) {
      try {
        console.log(`Running crawler: ${crawler.name}...`);
        const data = await crawler();
        if (data && data.length > 0) {
          await this.processAndStore(data);
        }
      } catch (error) {
        console.error(`Error in crawler ${crawler.name}:`, error);
      }
    }
    
    console.log('Government services crawl completed.');
  }

  async crawlDichVuCong() {
    console.log('Crawling Dich Vu Cong...');
    const browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    
    // Set a realistic user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    const urls = [
      'https://dichvucong.gov.vn/p/home/dvc-dich-vu-cong.html',
      'https://dichvucong.gov.vn/p/home/dvc-thu-tuc-hanh-chinh.html',
      'https://dichvucong.gov.vn/p/home/dvc-huong-dan-su-dung-vneid.html',
      'https://dichvucong.gov.vn/p/home/dvc-tin-tuc.html'
    ];

    const documents = [];

    for (const url of urls) {
      try {
        await page.goto(url, { 
          waitUntil: 'networkidle2',
          timeout: 30000 // 30 seconds timeout
        });
        
        // Wait for content to load
        await page.waitForSelector('body', { timeout: 10000 });
        
        // Extract content using evaluate
        const pageContent = await page.evaluate(() => {
          // Remove unnecessary elements
          const elementsToRemove = document.querySelectorAll('header, footer, nav, .advertisement, .social-media, script, style');
          elementsToRemove.forEach(el => {
            if (el && el.parentNode) {
              el.parentNode.removeChild(el);
            }
          });
          
          // Extract main content
          const mainContent = document.querySelector('main') || 
                              document.querySelector('.content') || 
                              document.querySelector('body');
          
          return {
            title: document.title || 'Untitled',
            content: mainContent ? mainContent.innerText : document.body.innerText,
            url: window.location.href,
            lastUpdated: new Date().toISOString()
          };
        });

        // Only process if we have meaningful content
        if (pageContent.content && pageContent.content.length > 100) {
          documents.push({
            title: pageContent.title,
            content: pageContent.content.substring(0, 2000), // Limit content length
            source_url: pageContent.url,
            form_link: this.extractFormLinks(pageContent.content, pageContent.url),
            category: 'dichvucong',
            metadata: {
              last_updated: pageContent.lastUpdated,
              source_domain: new URL(pageContent.url).hostname
            }
          });
        }
      } catch (error) {
        console.error(`Error crawling DichVuCong ${url}:`, error.message);
      }
    }

    await browser.close();
    console.log(`Crawled ${documents.length} documents from DichVuCong`);
    return documents;
  }

  async crawlVNeID() {
    console.log('Crawling VNeID...');
    try {
      const response = await axios.get('https://dichvucong.gov.vn/p/home/dvc-huong-dan-su-dung-vneid.html', {
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      // Use cheerio to parse HTML content
      const cheerio = require('cheerio');
      const $ = cheerio.load(response.data);
      
      const documents = [];
      
      // Find content sections
      $('.guide-section, .content-section, [class*="guide"], [class*="content"]').each((i, elem) => {
        const title = $(elem).find('h1, h2, h3').first().text().trim() || 'VNeID Guide';
        const content = $(elem).text().trim();
        
        if (content.length > 100) {
          documents.push({
            title: title,
            content: content.substring(0, 2000),
            source_url: 'https://dichvucong.gov.vn/p/home/dvc-huong-dan-su-dung-vneid.html',
            form_link: 'https://dichvucong.gov.vn/p/home/dvc-app-vneid.html',
            category: 'vneid',
            metadata: {
              last_updated: new Date().toISOString()
            }
          });
        }
      });
      
      console.log(`Crawled ${documents.length} documents from VNeID`);
      return documents;
    } catch (error) {
      console.error('Error crawling VNeID:', error.message);
      return [];
    }
  }

  async crawlSAWACO() {
    console.log('Crawling SAWACO...');
    const browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    const sawacoUrls = [
      'https://sawaco.com.vn/',
      'https://sawaco.com.vn/dang-ky-cap-nuoc-moi',
      'https://sawaco.com.vn/thanh-toan-hoa-don',
      'https://sawaco.com.vn/dich-vu-khach-hang',
      'https://cskh.sawaco.com.vn/dang-ky-gan-moi-ca-nhan'
    ];

    const documents = [];

    for (const url of sawacoUrls) {
      try {
        await page.goto(url, { 
          waitUntil: 'networkidle2',
          timeout: 30000
        });
        
        const pageContent = await page.evaluate(() => {
          const elementsToRemove = document.querySelectorAll('header, footer, nav, .advertisement, script, style');
          elementsToRemove.forEach(el => {
            if (el && el.parentNode) {
              el.parentNode.removeChild(el);
            }
          });
          
          const mainContent = document.querySelector('main') || 
                              document.querySelector('.content') || 
                              document.querySelector('.container') ||
                              document.querySelector('body');
          
          // Extract form links
          const formLinks = Array.from(document.querySelectorAll('a[href*="dang-ky"], a[href*="form"], a[href*="dich-vu"], a[href*="dangky"]'))
            .map(a => a.href)
            .filter(href => href && !href.includes('#') && href.startsWith('http'));
          
          return {
            title: document.title,
            content: mainContent ? mainContent.innerText : document.body.innerText,
            url: window.location.href,
            formLinks: formLinks
          };
        });

        if (pageContent.content && pageContent.content.length > 100) {
          documents.push({
            title: pageContent.title || 'SAWACO Information',
            content: pageContent.content.substring(0, 2000),
            source_url: pageContent.url,
            form_link: pageContent.formLinks[0] || null,
            category: 'sawaco',
            metadata: {
              last_updated: new Date().toISOString(),
              related_forms: pageContent.formLinks,
              source_domain: new URL(pageContent.url).hostname
            }
          });
        }
      } catch (error) {
        console.error(`Error crawling SAWACO ${url}:`, error.message);
      }
    }

    await browser.close();
    console.log(`Crawled ${documents.length} documents from SAWACO`);
    return documents;
  }

  async crawlEVNHCMC() {
    console.log('Crawling EVNHCMC...');
    const browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    const evnhcmcUrls = [
      'https://www.evnhcmc.vn/',
      'https://www.evnhcmc.vn/Tracuu',
      'https://www.evnhcmc.vn/Thanhtoantructuyen',
      'https://www.evnhcmc.vn/GiaoDichTrucTuyen/capdien'
    ];

    const documents = [];

    for (const url of evnhcmcUrls) {
      try {
        await page.goto(url, { 
          waitUntil: 'networkidle2',
          timeout: 30000
        });
        
        const pageContent = await page.evaluate(() => {
          const elementsToRemove = document.querySelectorAll('header, footer, nav, .advertisement, script, style');
          elementsToRemove.forEach(el => {
            if (el && el.parentNode) {
              el.parentNode.removeChild(el);
            }
          });
          
          const mainContent = document.querySelector('main') || 
                              document.querySelector('.content') || 
                              document.querySelector('.container') ||
                              document.querySelector('body');
          
          // Extract service links
          const serviceLinks = Array.from(document.querySelectorAll('a[href*="dich-vu"], a[href*="dang-ky"], a[href*="thu-tuc"]'))
            .map(a => a.href)
            .filter(href => href && !href.includes('#') && href.startsWith('http'));
          
          return {
            title: document.title,
            content: mainContent ? mainContent.innerText : document.body.innerText,
            url: window.location.href,
            serviceLinks: serviceLinks
          };
        });

        if (pageContent.content && pageContent.content.length > 100) {
          documents.push({
            title: pageContent.title || 'EVNHCMC Information',
            content: pageContent.content.substring(0, 2000),
            source_url: pageContent.url,
            form_link: pageContent.serviceLinks[0] || 'https://www.evnhcmc.vn/GiaoDichTrucTuyen/capdien',
            category: 'evnhcmc',
            metadata: {
              last_updated: new Date().toISOString(),
              related_services: pageContent.serviceLinks,
              source_domain: new URL(pageContent.url).hostname
            }
          });
        }
      } catch (error) {
        console.error(`Error crawling EVNHCMC ${url}:`, error.message);
      }
    }

    await browser.close();
    console.log(`Crawled ${documents.length} documents from EVNHCMC`);
    return documents;
  }

  async crawlVssID() {
    console.log('Crawling VssID...');
    try {
      const response = await axios.get('https://vss.gov.vn/', {
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      const cheerio = require('cheerio');
      const $ = cheerio.load(response.data);
      
      const documents = [];
      
      // Find main content areas
      $('#content, .content, .main-content, [id*="content"], [class*="content"]').each((i, elem) => {
        const title = $(elem).find('h1, h2, h3').first().text().trim() || 'VssID Information';
        const content = $(elem).text().trim();
        
        if (content.length > 100) {
          documents.push({
            title: title,
            content: content.substring(0, 2000),
            source_url: 'https://vss.gov.vn/',
            form_link: 'https://vss.gov.vn/',
            category: 'vssid',
            metadata: {
              last_updated: new Date().toISOString()
            }
          });
        }
      });
      
      console.log(`Crawled ${documents.length} documents from VssID`);
      return documents;
    } catch (error) {
      console.error('Error crawling VssID:', error.message);
      return [];
    }
  }

  async crawlETax() {
    console.log('Crawling eTax...');
    try {
      const response = await axios.get('https://thuedientu.gdt.gov.vn/', {
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      const cheerio = require('cheerio');
      const $ = cheerio.load(response.data);
      
      const documents = [];
      
      $('.service-section, .content-section, .guide-section').each((i, elem) => {
        const title = $(elem).find('h1, h2, h3').first().text().trim() || 'eTax Information';
        const content = $(elem).text().trim();
        
        if (content.length > 100) {
          documents.push({
            title: title,
            content: content.substring(0, 2000),
            source_url: 'https://thuedientu.gdt.gov.vn/',
            form_link: 'https://thuedientu.gdt.gov.vn/',
            category: 'etax',
            metadata: {
              last_updated: new Date().toISOString()
            }
          });
        }
      });
      
      console.log(`Crawled ${documents.length} documents from eTax`);
      return documents;
    } catch (error) {
      console.error('Error crawling eTax:', error.message);
      return [];
    }
  }

  extractFormLinks(content, baseUrl) {
    // Extract URLs that might be forms
    const formKeywords = ['dang-ky', 'dangky', 'form', 'thu-tuc', 'ho-so', 'dich-vu', 'dang-ky-cap', 'dang-ky-dien'];
    const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/g;
    const urls = content.match(urlRegex) || [];
    
    return urls.filter(url => 
      formKeywords.some(keyword => 
        url.toLowerCase().includes(keyword) && 
        !url.includes('#') &&
        url.startsWith('http')
      )
    );
  }

  async processAndStore(documents) {
    console.log(`Processing and storing ${documents.length} documents...`);

    // Check if Supabase is properly configured before attempting to store
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('⚠️  Supabase is not configured. Skipping storage of crawled documents.');
      console.warn('📋 To store documents, please set SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY) in your .env file.');
      console.log(`📝 Crawled ${documents.length} documents that would have been stored.`);
      return;
    }

    for (const doc of documents) {
      try {
        // Generate embedding using local model
        const embedding = await this.embeddings.generateEmbedding(doc.content);

        // First, create or find the government procedure record
        const procedure_code = this.generateProcedureCode(doc.title);
        const ministry_name = this.extractMinistryName(doc.title);

        // Check if procedure already exists
        const { data: existingKnowledge, error: selectError } = await this.supabase
          .from('government_procedures_knowledge')
          .select('id')
          .eq('procedure_code', procedure_code)
          .single();

        if (existingKnowledge) {
          // Knowledge already exists, update it
          const { error: updateError } = await this.supabase
            .from('government_procedures_knowledge')
            .update({
              full_procedure_content: doc.content,
              procedure_title: doc.title,
              ministry_name: ministry_name,
              source_url: doc.source_url,
              doc_hash: this.generateDocHash(doc.content),
              file_size: doc.content.length,
              metadata: doc.metadata,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingKnowledge.id);

          if (updateError) {
            console.error('Error updating procedure knowledge:', updateError);
          } else {
            console.log(`Updated procedure knowledge: ${doc.title}`);
          }
        } else {
          // Insert new knowledge entry with full content
          const { data, error } = await this.supabase
            .from('government_procedures_knowledge')
            .insert({
              procedure_code: procedure_code,
              full_procedure_content: doc.content,  // Store the full content as requested
              procedure_title: doc.title,
              ministry_name: ministry_name,
              source_url: doc.source_url,
              doc_hash: this.generateDocHash(doc.content),
              file_size: doc.content.length,
              metadata: doc.metadata
            });

          if (error) {
            console.error('Error storing procedure knowledge:', error);
          } else {
            console.log(`Stored new procedure knowledge: ${doc.title}`);
          }
        }
      } catch (error) {
        console.error(`Error processing document "${doc.title}":`, error);
      }
    }

    console.log(`Completed processing ${documents.length} documents`);
  }

  // Helper method to generate procedure code from title
  generateProcedureCode(title) {
    // Generate a unique procedure code from title
    const cleanTitle = title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
    return `PROC_${Date.now()}_${cleanTitle}`;
  }

  // Helper method to extract ministry name from title
  extractMinistryName(title) {
    // Extract ministry name from title if available
    const ministryMatch = title.match(/Bộ_\w+|Sở_\w+|Phòng_\w+/);
    return ministryMatch ? ministryMatch[0].replace(/_/g, ' ') : 'Unknown Ministry';
  }

  // Helper method to generate document hash
  generateDocHash(content) {
    // Simple hash function using content
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  async crawlPeriodically() {
    console.log('Setting up periodic crawling...');
    // Run crawlers every 12 hours
    setInterval(async () => {
      console.log('Starting periodic crawl...');
      await this.crawlGovernmentServices();
    }, 12 * 60 * 60 * 1000); // 12 hours
  }
}

module.exports = CrawlerManager;