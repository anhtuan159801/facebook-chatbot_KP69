// Using dynamic import for ES modules
let transformersModule = null;
let pipeline = null;
let env = null;

class LocalEmbeddings {
  constructor() {
    this.model = null;
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
      console.log('Loading embedding model...');
      // Using a multilingual model suitable for Vietnamese text
      this.model = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
      console.log('Embedding model loaded successfully');
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

      const embedding = await model(truncatedText, {
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
}

module.exports = LocalEmbeddings;