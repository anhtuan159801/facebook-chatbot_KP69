/**
 * Model Configurations for Different Services
 * 
 * This file contains specific model configurations for each service
 * to allow easy switching between different AI models.
 */

const { AIFactory } = require('./ai-models');

// ===== SERVICE-SPECIFIC MODEL CONFIGURATIONS =====

const SERVICE_MODELS = {
    // Gemini Bot Service Configuration
    GEMINI_SERVICE: {
        primary: {
            name: 'Gemini Pro',
            provider: 'Google',
            model: 'gemini-2.5-flash',
            maxTokens: 8192,
            temperature: 0.7,
            topP: 0.8,
            topK: 40,
            timeout: 30000,
            retries: 3,
            retryDelay: 1000
        },
        fallback: {
            name: 'OpenRouter GPT',
            provider: 'OpenRouter',
            model: 'openai/gpt-oss-20b:free',
            maxTokens: 4096,
            temperature: 0.7,
            topP: 0.9,
            timeout: 30000,
            retries: 2,
            retryDelay: 1500
        },
        audio: {
            name: 'Whisper',
            provider: 'Hugging Face',
            model: 'openai/whisper-large-v3',
            timeout: 60000,
            retries: 2,
            retryDelay: 2000
        }
    },

    // Router Hug Service Configuration
    ROUTER_HUG_SERVICE: {
        primary: {
            name: 'OpenRouter GPT',
            provider: 'OpenRouter',
            model: 'openai/gpt-oss-20b:free',
            maxTokens: 4096,
            temperature: 0.7,
            topP: 0.9,
            timeout: 30000,
            retries: 3,
            retryDelay: 1000
        },
        fallback: {
            name: 'Gemini Pro',
            provider: 'Google',
            model: 'gemini-2.5-flash',
            maxTokens: 8192,
            temperature: 0.7,
            topP: 0.8,
            topK: 40,
            timeout: 30000,
            retries: 2,
            retryDelay: 1500
        },
        audio: {
            name: 'Whisper',
            provider: 'Hugging Face',
            model: 'openai/whisper-large-v3',
            timeout: 60000,
            retries: 2,
            retryDelay: 2000
        }
    },

    // Load Balancer Service Configuration
    LOAD_BALANCER_SERVICE: {
        healthCheck: {
            timeout: 5000,
            retries: 2,
            retryDelay: 1000
        },
        failover: {
            maxRetries: 3,
            retryDelay: 2000,
            healthCheckInterval: 30000
        }
    }
};

// ===== MODEL SWITCHING UTILITIES =====

class ModelManager {
    constructor(serviceType) {
        this.serviceType = serviceType;
        this.config = SERVICE_MODELS[serviceType];
        this.currentModel = 'primary';
        this.fallbackAttempts = 0;
        this.maxFallbackAttempts = 3;
    }

    getCurrentModelConfig() {
        return this.config[this.currentModel];
    }

    getAudioModelConfig() {
        return this.config.audio;
    }

    async switchToFallback() {
        if (this.currentModel === 'primary' && this.config.fallback) {
            this.currentModel = 'fallback';
            this.fallbackAttempts++;
            console.log(`🔄 Switched to fallback model: ${this.config.fallback.name}`);
            return true;
        }
        return false;
    }

    async switchToPrimary() {
        if (this.currentModel === 'fallback' && this.config.primary) {
            this.currentModel = 'primary';
            this.fallbackAttempts = 0;
            console.log(`🔄 Switched back to primary model: ${this.config.primary.name}`);
            return true;
        }
        return false;
    }

    canUseFallback() {
        return this.fallbackAttempts < this.maxFallbackAttempts && this.config.fallback;
    }

    resetFallbackAttempts() {
        this.fallbackAttempts = 0;
    }

    getModelInfo() {
        return {
            serviceType: this.serviceType,
            currentModel: this.currentModel,
            fallbackAttempts: this.fallbackAttempts,
            canUseFallback: this.canUseFallback(),
            primaryModel: this.config.primary?.name,
            fallbackModel: this.config.fallback?.name,
            audioModel: this.config.audio?.name
        };
    }
}

// ===== SERVICE-SPECIFIC AI INSTANCES =====

class ServiceAI {
    constructor(serviceType) {
        this.modelManager = new ModelManager(serviceType);
        this.primaryAI = null;
        this.fallbackAI = null;
        this.audioAI = null;
        this.initializeAIs();
    }

    initializeAIs() {
        const config = this.modelManager.config;
        
        // Initialize primary AI
        if (config.primary) {
            this.primaryAI = AIFactory.createOpenRouterAI(config.primary);
        }
        
        // Initialize fallback AI
        if (config.fallback) {
            if (config.fallback.provider === 'Google') {
                this.fallbackAI = AIFactory.createGeminiAI(config.fallback);
            } else {
                this.fallbackAI = AIFactory.createOpenRouterAI(config.fallback);
            }
        }
        
        // Initialize audio AI
        if (config.audio) {
            this.audioAI = AIFactory.createHuggingFaceAI(config.audio);
        }
    }

    async generateText(messages, options = {}) {
        const currentConfig = this.modelManager.getCurrentModelConfig();
        let aiInstance = this.modelManager.currentModel === 'primary' ? this.primaryAI : this.fallbackAI;
        
        try {
            const result = await aiInstance.generateText(messages, {
                ...currentConfig,
                ...options
            });
            
            // Reset fallback attempts on success
            this.modelManager.resetFallbackAttempts();
            return result;
            
        } catch (error) {
            console.error(`❌ ${currentConfig.name} failed:`, error.message);
            
            // Try fallback if available
            if (this.modelManager.canUseFallback()) {
                console.log('🔄 Attempting fallback model...');
                await this.modelManager.switchToFallback();
                return this.generateText(messages, options);
            }
            
            throw error;
        }
    }

    async transcribeAudio(audioBuffer, mimeType) {
        const audioConfig = this.modelManager.getAudioModelConfig();
        
        try {
            return await this.audioAI.transcribeAudio(audioBuffer, mimeType);
        } catch (error) {
            console.error(`❌ Audio transcription failed:`, error.message);
            throw error;
        }
    }

    getServiceInfo() {
        return {
            ...this.modelManager.getModelInfo(),
            hasPrimary: !!this.primaryAI,
            hasFallback: !!this.fallbackAI,
            hasAudio: !!this.audioAI
        };
    }
}

// ===== FACTORY FUNCTIONS =====

function createGeminiServiceAI() {
    return new ServiceAI('GEMINI_SERVICE');
}

function createRouterHugServiceAI() {
    return new ServiceAI('ROUTER_HUG_SERVICE');
}

function createLoadBalancerServiceAI() {
    return new ServiceAI('LOAD_BALANCER_SERVICE');
}

// ===== MODEL VALIDATION =====

function validateModelConfig(config) {
    const required = ['name', 'provider', 'model'];
    const missing = required.filter(key => !config[key]);
    
    if (missing.length > 0) {
        throw new Error(`Missing required config keys: ${missing.join(', ')}`);
    }
    
    return true;
}

function validateServiceConfig(serviceConfig) {
    if (!serviceConfig.primary) {
        throw new Error('Service must have a primary model configuration');
    }
    
    validateModelConfig(serviceConfig.primary);
    
    if (serviceConfig.fallback) {
        validateModelConfig(serviceConfig.fallback);
    }
    
    if (serviceConfig.audio) {
        validateModelConfig(serviceConfig.audio);
    }
    
    return true;
}

// ===== EXPORTS =====

module.exports = {
    SERVICE_MODELS,
    ModelManager,
    ServiceAI,
    createGeminiServiceAI,
    createRouterHugServiceAI,
    createLoadBalancerServiceAI,
    validateModelConfig,
    validateServiceConfig
};
