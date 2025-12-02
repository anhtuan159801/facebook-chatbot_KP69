require('dotenv').config();
const { createLogger } = require('../utils/logger');

class AIProviderManager {
    constructor() {
        this.logger = createLogger('AIProviderManager');
        this.currentProvider = 'gemini';
        this.fallbackProviders = ['openrouter', 'huggingface'];
        this.providerStatus = {
            gemini: { 
                status: 'active', 
                lastError: null, 
                errorCount: 0,
                lastSwitchTime: null,
                cooldownUntil: null
            },
            openrouter: { 
                status: 'standby', 
                lastError: null, 
                errorCount: 0,
                lastSwitchTime: null,
                cooldownUntil: null
            },
            huggingface: { 
                status: 'standby', 
                lastError: null, 
                errorCount: 0,
                lastSwitchTime: null,
                cooldownUntil: null
            }
        };
        
        // Cooldown time: 2 hours = 7200000 ms
        this.cooldownDuration = 2 * 60 * 60 * 1000;
        this.maxErrorsBeforeSwitch = 3;
    }

    // Get current active provider
    getCurrentProvider() {
        return this.currentProvider;
    }

    // Check if provider is in cooldown
    isProviderInCooldown(provider) {
        const status = this.providerStatus[provider];
        if (!status.cooldownUntil) return false;
        return Date.now() < status.cooldownUntil;
    }

    // Check if we should switch back to Gemini
    shouldSwitchBackToGemini() {
        const geminiStatus = this.providerStatus.gemini;
        
        // If Gemini is not in cooldown and current provider is not Gemini
        if (!this.isProviderInCooldown('gemini') && this.currentProvider !== 'gemini') {
            this.logger.info('🔄 Gemini cooldown expired, switching back to Gemini');
            return true;
        }
        
        return false;
    }

    // Handle provider error
    handleProviderError(provider, error) {
        const status = this.providerStatus[provider];
        status.lastError = error;
        status.errorCount++;
        status.lastSwitchTime = Date.now();

        this.logger.error(`❌ ${provider} error (${status.errorCount}/${this.maxErrorsBeforeSwitch}):`, error.message);

        // If error count exceeds threshold, switch provider
        if (status.errorCount >= this.maxErrorsBeforeSwitch) {
            this.switchToNextProvider(provider);
        }
    }

    // Switch to next available provider
    switchToNextProvider(failedProvider) {
        // Set failed provider to cooldown
        this.providerStatus[failedProvider].status = 'cooldown';
        this.providerStatus[failedProvider].cooldownUntil = Date.now() + this.cooldownDuration;
        this.providerStatus[failedProvider].errorCount = 0;

        // Find next available provider
        const availableProviders = this.fallbackProviders.filter(provider => 
            !this.isProviderInCooldown(provider) && 
            this.providerStatus[provider].status !== 'cooldown'
        );

        if (availableProviders.length > 0) {
            const nextProvider = availableProviders[0];
            this.currentProvider = nextProvider;
            this.providerStatus[nextProvider].status = 'active';
            
            this.logger.warn(`🔄 Switched from ${failedProvider} to ${nextProvider} due to errors`);
            this.logger.info(`⏰ ${failedProvider} will be retried in 2 hours`);
        } else {
            this.logger.error('❌ All AI providers are in cooldown or failed');
            // Fallback to error message
            this.currentProvider = 'error';
        }
    }

    // Handle successful request
    handleProviderSuccess(provider) {
        const status = this.providerStatus[provider];
        status.errorCount = 0;
        status.lastError = null;
        
        this.logger.info(`✅ ${provider} request successful`);
    }

    // Get provider status for monitoring
    getProviderStatus() {
        return {
            currentProvider: this.currentProvider,
            providers: this.providerStatus,
            cooldownDuration: this.cooldownDuration,
            maxErrorsBeforeSwitch: this.maxErrorsBeforeSwitch
        };
    }

    // Force switch to specific provider (for testing)
    forceSwitchTo(provider) {
        if (this.providerStatus[provider]) {
            this.currentProvider = provider;
            this.logger.info(`🔄 Force switched to ${provider}`);
        }
    }

    // Reset all providers (for testing)
    resetAllProviders() {
        Object.keys(this.providerStatus).forEach(provider => {
            this.providerStatus[provider] = {
                status: provider === 'gemini' ? 'active' : 'standby',
                lastError: null,
                errorCount: 0,
                lastSwitchTime: null,
                cooldownUntil: null
            };
        });
        this.currentProvider = 'gemini';
        this.logger.info('🔄 All providers reset to initial state');
    }

    // Check if we should switch back to Gemini (called periodically)
    checkForGeminiSwitch() {
        if (this.shouldSwitchBackToGemini()) {
            this.currentProvider = 'gemini';
            this.providerStatus.gemini.status = 'active';
            this.logger.info('🔄 Switched back to Gemini after cooldown');
            return true;
        }
        return false;
    }
}

// Create singleton instance
const aiProviderManager = new AIProviderManager();

module.exports = aiProviderManager;
