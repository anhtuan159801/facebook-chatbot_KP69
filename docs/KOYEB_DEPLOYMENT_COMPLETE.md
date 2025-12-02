# Facebook Chatbot with RAG System - Complete Setup Guide

## Summary

This document provides a complete overview of the Facebook Chatbot system with integrated RAG (Retrieval-Augmented Generation) functionality that utilizes official Vietnamese government documents to provide accurate responses.

## System Features

### Core Functionality
- Load Balancer system with automatic failover between Gemini and Hugging Face services
- Voice message processing with Whisper integration
- Image analysis capabilities
- Conversation history management
- Queue management for handling concurrent requests
- Automatic system recovery

### RAG System Capabilities
- Over 3,700 official Vietnamese government documents pre-downloaded
- Knowledge from various ministries including:
  - Ministry of Public Security (Bộ Công an)
  - Ministry of Industry and Trade (Bộ Công thương)
  - Ministry of Education and Training (Bộ Giáo dục và Đào tạo)
  - Ministry of Science and Technology (Bộ Khoa học và Công nghệ)
  - Ministry of Health (Bộ Y tế)
  - And others
- Semantic search for retrieving relevant information
- Automatic document processing and embedding generation
- Real-time knowledge integration with AI responses

## Repository Contents

The repository includes:

1. **Main Application**: Load balancer and service implementations
2. **Knowledge Base**: `Knowlegd-rag` folder with pre-downloaded government documents
3. **Scripts**: Deployment and management utilities
4. **Documentation**: Complete guides and setup instructions
5. **Configuration**: Environment setup and deployment templates

## Deployment to Koyeb

### Pre-deployment Steps
1. Ensure you have a Koyeb account
2. Set up Supabase with vector extension enabled
3. Prepare your Facebook Messenger webhook configuration

### Deployment Process
1. Fork this repository to your GitHub account
2. Connect Koyeb to your GitHub repository
3. Configure the following environment variables:
   - SUPABASE_URL: Your Supabase project URL
   - SUPABASE_ANON_KEY: Your Supabase anon key
   - DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME: PostgreSQL credentials
   - VERIFY_TOKEN: Your Facebook webhook verification token
   - PAGE_ACCESS_TOKEN: Your Facebook page access token
   - GEMINI_API_KEY: Google Gemini API key
   - OPENROUTER_API_KEY: OpenRouter API key
   - HUGGINGFACE_API_KEY: Hugging Face API key
   - ADMIN_KEY: Admin access key
   - YOUR_SITE_URL: Your deployed application URL

4. Set build command: `npm install`
5. Set run command: `npm run start:all`

### Post-deployment Steps
1. Run the database schema in your Supabase SQL editor
2. Import the knowledge base:
   ```bash
   npm run import-knowledge-rag
   ```
3. Verify that the system is functioning by testing the webhook
4. Configure the Facebook page to point to your Koyeb URL

## Knowledge Management

### Automatic Loading
The system automatically loads knowledge from the `Knowlegd-rag/downloads_ministries` folder when starting up and makes it available for AI responses.

### Adding New Documents
You can periodically update the knowledge base by running:
```bash
npm run crawl:once  # Download new documents from government websites
npm run import-knowledge-rag  # Import new documents to the knowledge base
```

### Monitoring
The system includes a knowledge watcher that monitors for new documents and updates the knowledge base automatically.

## Customization

### Response Templates
Modify the prompts in `src/utils/prompts.js` to customize response templates.

### AI Models
Configure different AI providers in `src/ai/ai-models.js` and `src/ai/ai-provider-manager.js`.

### RAG Behavior
Adjust the RAG system in `src/ai/local-rag-system.js` to change how knowledge is retrieved and integrated.

## Support

- Email: anhtuan15082001@gmail.com
- Zalo: 0778649573 - Mr. Tuan
- GitHub Issues: For technical problems and feature requests

## Performance Tips

- Use a paid Supabase plan for production to handle vector similarity searches efficiently
- Enable autoscaling on Koyeb to handle varying traffic loads
- Monitor API usage for your AI providers to stay within rate limits
- Regularly update the knowledge base to keep government procedure information current

## Troubleshooting

Common issues and solutions:

1. **API Errors**: Check that all API keys are correctly configured
2. **Database Connection Issues**: Verify PostgreSQL and Supabase credentials
3. **Knowledge Not Working**: Ensure you ran `npm run import-knowledge-rag` after deployment
4. **Webhook Issues**: Confirm your Facebook webhook URL and verification token
5. **Slow Responses**: Check AI provider rate limits and consider upgrading plans

## Roadmap

Future enhancements for the system:
- Multi-language support
- Additional AI model integrations
- Dashboard for monitoring and analytics
- Enhanced caching mechanisms
- Improved document processing algorithms