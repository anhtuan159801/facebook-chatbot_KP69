/**
 * System Health Monitoring
 * 
 * Provides comprehensive health checks and performance monitoring for the chatbot system
 */

class SystemHealthMonitor {
  constructor() {
    this.healthChecks = new Map(); // Store health check functions
    this.metrics = new Map(); // Store system metrics
    this.alerts = []; // Store active alerts
    this.checkInterval = null;
    
    // Initialize default metrics
    this.initializeDefaultMetrics();
  }

  initializeDefaultMetrics() {
    // Performance metrics
    this.metrics.set('request_count', 0);
    this.metrics.set('error_count', 0);
    this.metrics.set('avg_response_time', 0);
    this.metrics.set('active_connections', 0);
    
    // Initialize response time tracking
    this.responseTimes = [];
    this.maxResponseTimes = 100; // Keep last 100 response times
  }

  /**
   * Register a health check function
   */
  registerHealthCheck(name, checkFunction, interval = 30000) { // Default to 30s
    this.healthChecks.set(name, {
      function: checkFunction,
      interval: interval,
      lastRun: null,
      status: 'unknown',
      lastResult: null
    });
  }

  /**
   * Start health monitoring
   */
  startMonitoring() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    // Run all registered health checks periodically
    this.checkInterval = setInterval(async () => {
      await this.runHealthChecks();
    }, 30000); // Check every 30 seconds

    console.log('🏥 System Health Monitoring started');
  }

  /**
   * Run all registered health checks
   */
  async runHealthChecks() {
    const results = {};
    
    for (const [name, check] of this.healthChecks) {
      try {
        const result = await check.function();
        check.status = result.status || 'unknown';
        check.lastResult = result;
        check.lastRun = new Date();
        
        results[name] = {
          status: check.status,
          lastRun: check.lastRun,
          details: result
        };
        
        // Generate alerts for failed checks
        if (check.status === 'error' || check.status === 'unhealthy') {
          this.generateAlert(name, result);
        }
      } catch (error) {
        check.status = 'error';
        check.lastResult = { error: error.message };
        check.lastRun = new Date();
        
        results[name] = {
          status: 'error',
          lastRun: check.lastRun,
          details: { error: error.message }
        };
        
        this.generateAlert(name, { error: error.message });
      }
    }
    
    return results;
  }

  /**
   * Generate alert for failed health checks
   */
  generateAlert(checkName, details) {
    const alert = {
      id: `${checkName}-${Date.now()}`,
      timestamp: new Date(),
      checkName,
      details,
      resolved: false
    };
    
    this.alerts.push(alert);
    
    // Keep only recent alerts (last 100)
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }
    
    console.log(`🚨 Health Alert: ${checkName} failed -`, details);
  }

  /**
   * Update performance metrics
   */
  updateMetrics(operation, duration, success = true) {
    // Update request count
    const reqCount = this.metrics.get('request_count') || 0;
    this.metrics.set('request_count', reqCount + 1);
    
    // Update error count
    if (!success) {
      const errorCount = this.metrics.get('error_count') || 0;
      this.metrics.set('error_count', errorCount + 1);
    }
    
    // Update response time metrics
    if (typeof duration === 'number' && duration >= 0) {
      this.responseTimes.push(duration);
      if (this.responseTimes.length > this.maxResponseTimes) {
        this.responseTimes.shift();
      }
      
      // Calculate average response time
      if (this.responseTimes.length > 0) {
        const avg = this.responseTimes.reduce((sum, val) => sum + val, 0) / this.responseTimes.length;
        this.metrics.set('avg_response_time', Math.round(avg));
      }
    }
    
    // Update active connections (example)
    const activeConnections = this.metrics.get('active_connections') || 0;
    this.metrics.set('active_connections', activeConnections);
  }

  /**
   * Get system health status
   */
  getHealthStatus() {
    const healthCheckResults = {};
    let overallStatus = 'healthy';
    
    for (const [name, check] of this.healthChecks) {
      healthCheckResults[name] = {
        status: check.status,
        lastRun: check.lastRun,
        details: check.lastResult
      };
      
      if (check.status === 'error' || check.status === 'unhealthy') {
        overallStatus = 'unhealthy';
      }
    }
    
    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      healthChecks: healthCheckResults,
      metrics: Object.fromEntries(this.metrics),
      alerts: this.alerts.filter(alert => !alert.resolved).length
    };
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    return {
      requestCount: this.metrics.get('request_count') || 0,
      errorCount: this.metrics.get('error_count') || 0,
      avgResponseTime: this.metrics.get('avg_response_time') || 0,
      activeConnections: this.metrics.get('active_connections') || 0,
      errorRate: this.metrics.get('request_count') > 0 ? 
        ((this.metrics.get('error_count') || 0) / (this.metrics.get('request_count') || 1)) * 100 : 0,
      responseTime95th: this.calculatePercentile(95),
      responseTime99th: this.calculatePercentile(99),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Calculate response time percentiles
   */
  calculatePercentile(percentage) {
    if (this.responseTimes.length === 0) return 0;
    
    const sorted = [...this.responseTimes].sort((a, b) => a - b);
    const index = Math.floor((percentage / 100) * sorted.length);
    
    return sorted[Math.min(index, sorted.length - 1)] || 0;
  }

  /**
   * Add custom metric
   */
  setMetric(key, value) {
    this.metrics.set(key, value);
  }

  /**
   * Get custom metric
   */
  getMetric(key) {
    return this.metrics.get(key);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('🏥 System Health Monitoring stopped');
    }
  }

  /**
   * Resolve alert
   */
  resolveAlert(alertId) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      alert.resolvedAt = new Date();
      console.log(`✅ Alert resolved: ${alertId}`);
    }
  }

  /**
   * Clear resolved alerts
   */
  clearResolvedAlerts() {
    this.alerts = this.alerts.filter(alert => !alert.resolved);
  }
}

// Create and configure singleton instance
const healthMonitor = new SystemHealthMonitor();

// Register default health checks
healthMonitor.registerHealthCheck('memory', async () => {
  const usage = process.memoryUsage();
  const rssMb = Math.round(usage.rss / 1024 / 1024);
  const heapUsedMb = Math.round(usage.heapUsed / 1024 / 1024);
  
  // Consider unhealthy if memory usage is too high
  const status = heapUsedMb > 1000 ? 'warning' : rssMb > 1500 ? 'unhealthy' : 'healthy';
  
  return {
    status,
    details: {
      rss: `${rssMb}MB`,
      heapUsed: `${heapUsedMb}MB`,
      heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)}MB`
    }
  };
}, 60000); // Check memory every minute

healthMonitor.registerHealthCheck('cpu', async () => {
  // Simple CPU check - in a real system, you'd use more sophisticated methods
  const start = Date.now();
  let i = 0;
  while (Date.now() - start < 100) { // Busy wait for 100ms
    i++;
  }
  const busyTime = Date.now() - start;
  
  // If it took close to 100ms, CPU might be overutilized
  const utilization = busyTime > 80 ? 'high' : busyTime > 50 ? 'medium' : 'normal';
  const status = busyTime > 90 ? 'warning' : 'healthy';
  
  return {
    status,
    details: {
      utilization,
      checkDuration: `${busyTime}ms`
    }
  };
}, 30000); // Check CPU every 30 seconds

module.exports = healthMonitor;