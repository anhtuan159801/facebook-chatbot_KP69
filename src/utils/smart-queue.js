/**
 * Smart Request Queue with Dynamic Prioritization
 * 
 * Implements intelligent request queuing with priority levels,
 * dynamic delay calculation, and performance optimization
 */

class SmartQueue {
  constructor(options = {}) {
    this.queues = {
      high: [],    // Priority messages (e.g., first-time users, critical requests)
      normal: [],  // Regular messages
      low: []      // Background tasks
    };
    
    this.activeRequests = new Set();
    this.maxConcurrent = options.maxConcurrent || 5;
    this.defaultDelay = options.defaultDelay || 60000; // 1 minute
    this.monitoringInterval = options.monitoringInterval || 10000; // 10 seconds
    
    // Performance metrics
    this.metrics = {
      processed: 0,
      waiting: 0,
      avgWaitTime: 0,
      avgProcessTime: 0
    };
    
    // Start monitoring
    this.startMonitoring();
  }

  /**
   * Start performance monitoring
   */
  startMonitoring() {
    setInterval(() => {
      this.updateMetrics();
      this.adjustPrioritiesBasedOnLoad();
    }, this.monitoringInterval);
  }

  /**
   * Add request to queue with dynamic priority calculation
   */
  async addRequest(request, userId, context = {}) {
    // Calculate dynamic priority based on context
    const priority = this.calculatePriority(userId, request, context);
    const queueItem = {
      id: `${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      request,
      userId,
      priority,
      timestamp: Date.now(),
      context,
      retries: 0,
      maxRetries: 3
    };

    // Add to appropriate queue
    this.queues[priority].unshift(queueItem); // Add to front of queue for better ordering
    
    // Notify user about queue position if needed
    if (priority === 'low') {
      await this.notifyUserQueueStatus(userId, this.getQueuePosition(queueItem.id));
    }

    return new Promise((resolve, reject) => {
      queueItem.resolve = resolve;
      queueItem.reject = reject;
    });
  }

  /**
   * Calculate dynamic priority based on user and context
   */
  calculatePriority(userId, request, context) {
    // High priority for first-time users or critical messages
    if (context.isFirstTimeUser || this.isCriticalMessage(request)) {
      return 'high';
    }

    // Medium priority for regular messages
    if (this.isRegularMessage(request)) {
      return 'normal';
    }

    // Low priority for background operations
    return 'low';
  }

  /**
   * Check if message is critical
   */
  isCriticalMessage(request) {
    if (!request || !request.text) return false;
    
    const criticalKeywords = [
      'khẩn cấp', 'cấp cứu', 'nộp hồ sơ', 'đăng ký khẩn', 
      'hủy tạm trú', 'xóa tạm trú', 'urgent', 'emergency'
    ];
    
    const lowerText = request.text.toLowerCase();
    return criticalKeywords.some(keyword => lowerText.includes(keyword));
  }

  /**
   * Check if message is regular
   */
  isRegularMessage(request) {
    if (!request || !request.text) return false;
    
    // Regular messages are typical inquiry messages
    return request.text.length > 10 && 
           !request.text.toLowerCase().includes('👍') && 
           !request.text.toLowerCase().includes('👎');
  }

  /**
   * Get current queue position for a request
   */
  getQueuePosition(requestId) {
    for (const priorityLevel of ['high', 'normal', 'low']) {
      const queue = this.queues[priorityLevel];
      const index = queue.findIndex(item => item.id === requestId);
      if (index !== -1) {
        // Count waiting items before this one
        return index + 1;
      }
    }
    return -1; // Not found
  }

  /**
   * Notify user about queue status
   */
  async notifyUserQueueStatus(userId, position) {
    if (position > 1) {
      // In a real implementation, you would send a message to the user
      console.log(`⏳ User ${userId} is in queue at position ${position}`);
    }
  }

  /**
   * Process next request in queue
   */
  async processNext() {
    if (this.activeRequests.size >= this.maxConcurrent) {
      return false; // Max concurrent requests reached
    }

    // Process queues in priority order
    for (const priorityLevel of ['high', 'normal', 'low']) {
      const queue = this.queues[priorityLevel];
      if (queue.length > 0) {
        const requestItem = queue.shift();
        if (requestItem) {
          return await this.processRequest(requestItem);
        }
      }
    }

    return false; // No requests to process
  }

  /**
   * Process a single request with error handling and retries
   */
  async processRequest(requestItem) {
    const startTime = Date.now();
    this.activeRequests.add(requestItem.id);

    try {
      // Execute the request handler
      const result = await requestItem.request.handler();
      
      // Successful completion
      requestItem.resolve(result);
      this.metrics.processed++;
      this.metrics.avgProcessTime = this.calculateMovingAverage(
        this.metrics.avgProcessTime, 
        Date.now() - startTime,
        this.metrics.processed
      );

      console.log(`✅ Processed request ${requestItem.id} for user ${requestItem.userId} (${Date.now() - startTime}ms)`);
      return true;
    } catch (error) {
      // Handle error with retry logic
      if (requestItem.retries < requestItem.maxRetries) {
        requestItem.retries++;
        // Put back in queue with higher priority
        this.queues.high.unshift(requestItem);
        console.log(`🔄 Retrying request ${requestItem.id} (attempt ${requestItem.retries + 1}/${requestItem.maxRetries})`);
      } else {
        requestItem.reject(error);
        console.error(`❌ Failed request ${requestItem.id} after ${requestItem.maxRetries} retries:`, error);
      }
      return false;
    } finally {
      this.activeRequests.delete(requestItem.id);
    }
  }

  /**
   * Calculate optimal delay based on system load
   */
  calculateOptimalDelay() {
    const totalWaiting = this.getTotalWaiting();
    const activeCount = this.activeRequests.size;
    
    // Adjust delay based on load
    if (totalWaiting > 10 || activeCount >= this.maxConcurrent) {
      return this.defaultDelay * 1.5; // Increase delay under high load
    } else if (totalWaiting < 3) {
      return this.defaultDelay * 0.5; // Decrease delay under low load
    }
    
    return this.defaultDelay; // Default delay
  }

  /**
   * Get total number of waiting requests
   */
  getTotalWaiting() {
    return this.queues.high.length + this.queues.normal.length + this.queues.low.length;
  }

  /**
   * Update performance metrics
   */
  updateMetrics() {
    this.metrics.waiting = this.getTotalWaiting();
    console.log(`📊 Queue Metrics - Active: ${this.activeRequests.size}, Waiting: ${this.metrics.waiting}, Processed: ${this.metrics.processed}`);
  }

  /**
   * Adjust priorities based on system load
   */
  adjustPrioritiesBasedOnLoad() {
    const totalWaiting = this.metrics.waiting;
    
    // Under high load, prioritize high-priority items more aggressively
    if (totalWaiting > 15) {
      // Process high-priority items more frequently
      for (let i = 0; i < Math.min(3, this.queues.high.length); i++) {
        this.processNext();
      }
    }
  }

  /**
   * Calculate moving average
   */
  calculateMovingAverage(currentAvg, newValue, count) {
    return (currentAvg * (count - 1) + newValue) / count;
  }

  /**
   * Get queue statistics
   */
  getStats() {
    return {
      active: this.activeRequests.size,
      waiting: this.getTotalWaiting(),
      maxConcurrent: this.maxConcurrent,
      highPriority: this.queues.high.length,
      normalPriority: this.queues.normal.length,
      lowPriority: this.queues.low.length,
      processed: this.metrics.processed,
      avgWaitTime: this.metrics.avgWaitTime,
      avgProcessTime: this.metrics.avgProcessTime
    };
  }

  /**
   * Process available requests continuously
   */
  async processAvailable() {
    let processed = 0;
    const maxPerCycle = Math.min(5, this.maxConcurrent - this.activeRequests.size);
    
    for (let i = 0; i < maxPerCycle; i++) {
      if (await this.processNext()) {
        processed++;
      }
    }
    
    return processed;
  }
}

module.exports = SmartQueue;