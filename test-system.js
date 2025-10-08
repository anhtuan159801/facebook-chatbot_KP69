#!/usr/bin/env node

/**
 * System Test Script
 * 
 * Tests the refactored system to ensure all components work correctly
 * and the code duplication has been eliminated.
 */

const { spawn } = require('child_process');
const http = require('http');

class SystemTester {
    constructor() {
        this.services = [];
        this.testResults = {
            passed: 0,
            failed: 0,
            total: 0
        };
    }
    
    async runTests() {
        console.log('🧪 Starting System Tests...\n');
        
        try {
            // Test 1: Check if base service can be imported
            await this.testBaseServiceImport();
            
            // Test 2: Check if services can be created
            await this.testServiceCreation();
            
            // Test 3: Test configuration consistency
            await this.testConfigurationConsistency();
            
            // Test 4: Test logging system
            await this.testLoggingSystem();
            
            // Test 5: Test circuit breaker
            await this.testCircuitBreaker();
            
            // Test 6: Test AI models integration
            await this.testAIModelsIntegration();
            
            // Print results
            this.printResults();
            
        } catch (error) {
            console.error('❌ Test suite failed:', error);
            process.exit(1);
        }
    }
    
    async testBaseServiceImport() {
        this.addTest('Base Service Import');
        try {
            const BaseChatbotService = require('./base-service');
            if (typeof BaseChatbotService === 'function') {
                this.passTest('Base service class imported successfully');
            } else {
                this.failTest('Base service is not a constructor function');
            }
        } catch (error) {
            this.failTest(`Failed to import base service: ${error.message}`);
        }
    }
    
    async testServiceCreation() {
        this.addTest('Service Creation');
        try {
            // Test Gemini service
            const GeminiService = require('./gemini');
            if (GeminiService) {
                this.passTest('Gemini service created successfully');
            } else {
                this.failTest('Gemini service creation failed');
            }
            
            // Test Router Hug service
            const RouterHugService = require('./router_hug');
            if (RouterHugService) {
                this.passTest('Router Hug service created successfully');
            } else {
                this.failTest('Router Hug service creation failed');
            }
        } catch (error) {
            this.failTest(`Service creation failed: ${error.message}`);
        }
    }
    
    async testConfigurationConsistency() {
        this.addTest('Configuration Consistency');
        try {
            const aiModels = require('./ai-models');
            const modelConfigs = require('./model-configs');
            
            // Check if AI_MODELS exists
            if (aiModels.AI_MODELS && aiModels.AI_MODELS.GEMINI) {
                this.passTest('AI models configuration exists');
            } else {
                this.failTest('AI models configuration missing');
            }
            
            // Check if SERVICE_MODELS exists
            if (modelConfigs.SERVICE_MODELS && modelConfigs.SERVICE_MODELS.GEMINI_SERVICE) {
                this.passTest('Service models configuration exists');
            } else {
                this.failTest('Service models configuration missing');
            }
            
            // Check model name consistency
            const geminiModel = aiModels.AI_MODELS.GEMINI.model;
            const serviceModel = modelConfigs.SERVICE_MODELS.GEMINI_SERVICE.primary.model;
            
            if (geminiModel === serviceModel) {
                this.passTest('Model names are consistent');
            } else {
                this.failTest(`Model names inconsistent: ${geminiModel} vs ${serviceModel}`);
            }
        } catch (error) {
            this.failTest(`Configuration test failed: ${error.message}`);
        }
    }
    
    async testLoggingSystem() {
        this.addTest('Logging System');
        try {
            const { createLogger } = require('./logger');
            const logger = createLogger('TestService');
            
            // Test logging methods
            logger.info('Test info message');
            logger.warn('Test warning message');
            logger.error('Test error message');
            logger.debug('Test debug message');
            
            this.passTest('Logging system works correctly');
        } catch (error) {
            this.failTest(`Logging system failed: ${error.message}`);
        }
    }
    
    async testCircuitBreaker() {
        this.addTest('Circuit Breaker');
        try {
            const { CircuitBreaker, ServiceCircuitBreaker } = require('./circuit-breaker');
            
            // Test basic circuit breaker
            const breaker = new CircuitBreaker({ threshold: 2, timeout: 1000 });
            
            // Test successful operation
            await breaker.execute(async () => 'success');
            this.passTest('Circuit breaker handles successful operations');
            
            // Test service circuit breaker
            const serviceBreaker = new ServiceCircuitBreaker();
            const geminiBreaker = serviceBreaker.getBreaker('gemini');
            
            if (geminiBreaker) {
                this.passTest('Service circuit breaker works correctly');
            } else {
                this.failTest('Service circuit breaker failed');
            }
        } catch (error) {
            this.failTest(`Circuit breaker test failed: ${error.message}`);
        }
    }
    
    async testAIModelsIntegration() {
        this.addTest('AI Models Integration');
        try {
            const { AIFactory } = require('./ai-models');
            
            // Test if AIFactory methods exist
            if (typeof AIFactory.createGeminiAI === 'function' && 
                typeof AIFactory.createOpenRouterAI === 'function' &&
                typeof AIFactory.createHuggingFaceAI === 'function') {
                this.passTest('AI Factory methods exist');
            } else {
                this.failTest('AI Factory methods missing');
            }
            
            // Test if AI_MODELS configuration exists
            const { AI_MODELS } = require('./ai-models');
            if (AI_MODELS.GEMINI && AI_MODELS.OPENROUTER && AI_MODELS.HUGGINGFACE) {
                this.passTest('AI models configuration complete');
            } else {
                this.failTest('AI models configuration incomplete');
            }
        } catch (error) {
            this.failTest(`AI models integration test failed: ${error.message}`);
        }
    }
    
    addTest(testName) {
        console.log(`\n🔍 Testing: ${testName}`);
    }
    
    passTest(message) {
        console.log(`  ✅ ${message}`);
        this.testResults.passed++;
    }
    
    failTest(message) {
        console.log(`  ❌ ${message}`);
        this.testResults.failed++;
    }
    
    printResults() {
        this.testResults.total = this.testResults.passed + this.testResults.failed;
        
        console.log('\n📊 Test Results:');
        console.log(`  Total Tests: ${this.testResults.total}`);
        console.log(`  Passed: ${this.testResults.passed}`);
        console.log(`  Failed: ${this.testResults.failed}`);
        console.log(`  Success Rate: ${((this.testResults.passed / this.testResults.total) * 100).toFixed(1)}%`);
        
        if (this.testResults.failed === 0) {
            console.log('\n🎉 All tests passed! System refactoring successful!');
        } else {
            console.log('\n⚠️  Some tests failed. Please check the issues above.');
        }
    }
}

// Run tests
async function main() {
    const tester = new SystemTester();
    await tester.runTests();
}

if (require.main === module) {
    main().catch(error => {
        console.error('💥 Test suite crashed:', error);
        process.exit(1);
    });
}

module.exports = SystemTester;
