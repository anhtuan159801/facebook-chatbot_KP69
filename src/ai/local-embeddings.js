// Using dynamic import for ES modules
let transformersModule = null;
let pipeline = null;
let env = null;

class LocalEmbeddings {
  constructor() {
    this.model = null;
    // Use a more appropriate model for Vietnamese/multilingual text
    this.modelName = process.env.EMBEDDING_MODEL || 'Xenova/all-MiniLM-L6-v2';
  }

  async loadTransformers() {
    if (!transformersModule) {
      const module = await import('@xenova/transformers');
      transformersModule = module;
      pipeline = module.pipeline;
      env = module.env;

      // Set environment to not download ONNX models
      if (env) {
        env.allowLocalModels = true;
      }
    }
    return transformersModule;
  }

  async loadModel() {
    await this.loadTransformers();

    if (!this.model) {
      console.log(`Loading embedding model: ${this.modelName}...`);
      try {
        // Using a multilingual model suitable for Vietnamese text
        this.model = await pipeline('feature-extraction', this.modelName);
        console.log('Embedding model loaded successfully');
      } catch (error) {
        console.error(`Failed to load ${this.modelName}, falling back to default:`, error.message);
        // Fallback to the original model
        this.model = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
        console.log('Default embedding model loaded successfully');
      }
    }
    return this.model;
  }

  async generateEmbedding(text) {
    try {
      const model = await this.loadModel();

      // Limit text length to prevent memory issues
      const truncatedText = text.substring(0, 512);

      if (!truncatedText.trim()) {
        // Return a default embedding for empty text
        return new Array(384).fill(0);
      }

      // Improved preprocessing for Vietnamese text to handle special characters
      const processedText = this.preprocessText(truncatedText);

      const embedding = await model(processedText, {
        pooling: 'mean',
        normalize: true
      });

      // Convert tensor to array and ensure it's properly formatted
      const result = Array.from(embedding.data);

      // Verify the embedding has the right length (should be 384 for all-MiniLM-L6-v2)
      if (result.length !== 384) {
        console.warn(`Embedding length is ${result.length}, expected 384`);
      }

      return result;
    } catch (error) {
      console.error('Error generating embedding:', error);
      // Return a default embedding in case of error
      return new Array(384).fill(0);
    }
  }

  /**
   * Preprocess text to improve embedding quality for Vietnamese
   */
  preprocessText(text) {
    // Normalize Vietnamese characters and remove excessive whitespace
    return text
      .replace(/\s+/g, ' ')  // Normalize whitespace
      .trim();
  }
}

module.exports = LocalEmbeddings;