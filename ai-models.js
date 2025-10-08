/**
 * AI Models Configuration
 * 
 * This file centralizes all AI model configurations and API calls
 * for easy management and updates.
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

// ===== AI MODELS CONFIGURATION =====

const AI_MODELS = {
    // Gemini Configuration
    GEMINI: {
        name: 'Gemini Pro',
        provider: 'Google',
        apiKey: process.env.GEMINI_API_KEY,
        model: 'gemini-2.5-flash',
        maxTokens: 8192,
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
        timeout: 30000,
        retries: 3,
        retryDelay: 1000
    },
    
    // OpenRouter Configuration  
    OPENROUTER: {
        name: 'GPT-OSS-20B',
        provider: 'OpenRouter',
        apiKey: process.env.OPENROUTER_API_KEY,
        model: 'openai/gpt-oss-20b:free',
        baseURL: 'https://openrouter.ai/api/v1',
        maxTokens: 4096,
        temperature: 0.7,
        topP: 0.9,
        timeout: 30000,
        retries: 3,
        retryDelay: 1000
    },
    
    // Hugging Face Configuration
    HUGGINGFACE: {
        name: 'Whisper',
        provider: 'Hugging Face',
        apiKey: process.env.HUGGINGFACE_API_KEY,
        model: 'openai/whisper-large-v3-turbo',
        baseURL: 'https://api-inference.huggingface.co/models',
        timeout: 60000,
        retries: 2,
        retryDelay: 2000
    }
};

// ===== GEMINI AI INTEGRATION =====

class GeminiAI {
    constructor(config = AI_MODELS.GEMINI) {
        this.config = config;
        this.genAI = new GoogleGenerativeAI(config.apiKey);
        this.model = this.genAI.getGenerativeModel({ model: config.model });
    }

    async generateText(messages, options = {}) {
        const {
            temperature = this.config.temperature,
            topP = this.config.topP,
            topK = this.config.topK,
            maxTokens = this.config.maxTokens
        } = options;

        try {
            const generationConfig = {
                temperature,
                topP,
                topK,
                maxOutputTokens: maxTokens
            };

            // Convert messages to Gemini format
            const geminiMessages = this.convertMessagesToGemini(messages);
            
            const result = await this.model.generateContent({
                contents: geminiMessages,
                generationConfig
            });

            const response = await result.response;
            return response.text();

        } catch (error) {
            console.error('❌ Gemini API Error:', error);
            throw new Error(`Gemini API failed: ${error.message}`);
        }
    }

    async generateTextWithImage(imagePrompt, imageData, options = {}) {
        try {
            const generationConfig = {
                temperature: options.temperature || this.config.temperature,
                topP: options.topP || this.config.topP,
                topK: options.topK || this.config.topK,
                maxOutputTokens: options.maxTokens || this.config.maxTokens
            };

            const result = await this.model.generateContent([
                {
                    text: imagePrompt
                },
                {
                    inlineData: {
                        mimeType: imageData.mimeType,
                        data: imageData.data
                    }
                }
            ]);

            const response = await result.response;
            return response.text();

        } catch (error) {
            console.error('❌ Gemini Image API Error:', error);
            throw new Error(`Gemini Image API failed: ${error.message}`);
        }
    }

    convertMessagesToGemini(messages) {
        const contents = [];
        let currentContent = { parts: [] };

        for (const message of messages) {
            if (message.role === 'system') {
                // System messages are handled differently in Gemini
                if (currentContent.parts.length > 0) {
                    contents.push(currentContent);
                    currentContent = { parts: [] };
                }
                currentContent.parts.push({ text: message.content });
            } else if (message.role === 'user') {
                if (currentContent.parts.length > 0) {
                    contents.push(currentContent);
                }
                currentContent = { 
                    role: 'user',
                    parts: [{ text: message.content }]
                };
            } else if (message.role === 'assistant') {
                currentContent.parts.push({ text: message.content });
                contents.push(currentContent);
                currentContent = { parts: [] };
            }
        }

        if (currentContent.parts.length > 0) {
            contents.push(currentContent);
        }

        return contents;
    }
}

// ===== OPENROUTER AI INTEGRATION =====

class OpenRouterAI {
    constructor(config = AI_MODELS.OPENROUTER) {
        this.config = config;
    }

    async generateText(messages, options = {}) {
        const {
            temperature = this.config.temperature,
            topP = this.config.topP,
            maxTokens = this.config.maxTokens
        } = options;

        try {
            const fetch = (await import('node-fetch')).default;
            
            const response = await fetch(`${this.config.baseURL}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.config.apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': process.env.APP_URL || 'https://facebook-chatbot-a1t6.onrender.com',
                    'X-Title': 'Facebook Chatbot'
                },
                body: JSON.stringify({
                    model: this.config.model,
                    messages: messages,
                    temperature,
                    top_p: topP,
                    max_tokens: maxTokens,
                    stream: false
                }),
                timeout: this.config.timeout
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            
            if (data.choices && data.choices[0] && data.choices[0].message) {
                return data.choices[0].message.content;
            } else {
                throw new Error('Invalid response format from OpenRouter API');
            }

        } catch (error) {
            console.error('❌ OpenRouter API Error:', error);
            throw new Error(`OpenRouter API failed: ${error.message}`);
        }
    }

    async transcribeAudio(audioBuffer, mimeType = 'audio/mp4') {
        try {
            const fetch = (await import('node-fetch')).default;
            
            // Convert audio buffer to base64
            const base64Audio = audioBuffer.toString('base64');
            
            const response = await fetch(this.config.baseURL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.config.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'openai/whisper-1',
                    messages: [{
                        role: 'user',
                        content: [
                            {
                                type: 'input',
                                input: {
                                    data: base64Audio,
                                    mime_type: mimeType
                                }
                            }
                        ]
                    }]
                }),
                timeout: this.config.timeout
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            
            if (data.choices && data.choices[0] && data.choices[0].message) {
                return data.choices[0].message.content;
            } else {
                throw new Error('No transcription result from OpenRouter API');
            }

        } catch (error) {
            console.error('❌ OpenRouter Audio API Error:', error);
            throw new Error(`OpenRouter Audio API failed: ${error.message}`);
        }
    }
}

// ===== HUGGING FACE AI INTEGRATION =====

class HuggingFaceAI {
    constructor(config = AI_MODELS.HUGGINGFACE) {
        this.config = config;
    }

    async transcribeAudio(audioBuffer, mimeType = 'audio/wav') {
        try {
            const fetch = (await import('node-fetch')).default;
            
            // Determine supported content type for Hugging Face
            let supportedMimeType = mimeType;
            if (mimeType === 'audio/mp4' || mimeType === 'audio/mpeg') {
                supportedMimeType = 'audio/wav'; // Hugging Face prefers WAV
            } else if (mimeType === 'audio/mp3') {
                supportedMimeType = 'audio/wav';
            }
            
            console.log(`🎵 Sending audio to Hugging Face: ${supportedMimeType}, size: ${audioBuffer.length} bytes`);
            
            const response = await fetch(`${this.config.baseURL}/${this.config.model}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.config.apiKey}`,
                    'Content-Type': supportedMimeType
                },
                body: audioBuffer,
                timeout: this.config.timeout
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Hugging Face API error: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            
            if (data.text) {
                return data.text;
            } else {
                throw new Error('No transcription result from Hugging Face API');
            }

        } catch (error) {
            console.error('❌ Hugging Face API Error:', error);
            throw new Error(`Hugging Face API failed: ${error.message}`);
        }
    }

    async generateText(messages, options = {}) {
        try {
            const fetch = (await import('node-fetch')).default;
            
            // Convert messages to single prompt
            const prompt = messages.map(msg => `${msg.role}: ${msg.content}`).join('\n');
            
            const response = await fetch(`${this.config.baseURL}/microsoft/DialoGPT-medium`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.config.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    inputs: prompt,
                    parameters: {
                        max_length: 200,
                        temperature: 0.7
                    }
                }),
                timeout: this.config.timeout
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Hugging Face API error: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            
            if (data.generated_text) {
                return data.generated_text;
            } else {
                throw new Error('No text generated from Hugging Face API');
            }

        } catch (error) {
            console.error('❌ Hugging Face Text API Error:', error);
            throw new Error(`Hugging Face Text API failed: ${error.message}`);
        }
    }
}

// ===== AI FACTORY =====

class AIFactory {
    static createGeminiAI(config = AI_MODELS.GEMINI) {
        return new GeminiAI(config);
    }

    static createOpenRouterAI(config = AI_MODELS.OPENROUTER) {
        return new OpenRouterAI(config);
    }

    static createHuggingFaceAI(config = AI_MODELS.HUGGINGFACE) {
        return new HuggingFaceAI(config);
    }

    static getModelConfig(modelName) {
        return AI_MODELS[modelName] || null;
    }

    static getAllModels() {
        return Object.keys(AI_MODELS);
    }

    static validateConfig(config) {
        const required = ['apiKey', 'model'];
        return required.every(key => config[key]);
    }
}

// ===== UTILITY FUNCTIONS =====

function createRetryWrapper(aiFunction, maxRetries = 3, delay = 1000) {
    return async (...args) => {
        let lastError;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await aiFunction(...args);
            } catch (error) {
                lastError = error;
                console.warn(`⚠️ AI API attempt ${attempt}/${maxRetries} failed:`, error.message);
                
                if (attempt < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, delay * attempt));
                }
            }
        }
        
        throw lastError;
    };
}

function createTimeoutWrapper(aiFunction, timeout = 30000) {
    return async (...args) => {
        return Promise.race([
            aiFunction(...args),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('AI API timeout')), timeout)
            )
        ]);
    };
}

// ===== EXPORTS =====

module.exports = {
    AI_MODELS,
    GeminiAI,
    OpenRouterAI,
    HuggingFaceAI,
    AIFactory,
    createRetryWrapper,
    createTimeoutWrapper
};
