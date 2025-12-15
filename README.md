# Government Services Chatbot (Router Hug Bot)

A comprehensive chatbot system for Vietnamese government services and administrative procedures.

## 🚀 Features

### Knowledge Management
- **Government Procedures Database**: Store detailed administrative procedures with ministry information
- **RAG System**: Retrieval-Augmented Generation for accurate responses to citizen questions  
- **Document Processing**: Support for PDF, DOCX document intake and processing
- **Crawlers**: Automated collection of government service information

### Conversation Management
- **Chat History**: Complete conversation tracking with user sessions
- **Memory Management**: Context preservation across conversations
- **Intent Detection**: Smart categorization of user queries
- **Analytics**: Detailed metrics on conversation quality and user satisfaction

### Technical Features
- **Supabase Integration**: Scalable backend with vector search capabilities
- **Local AI Models**: Ollama integration for offline processing capabilities
- **Facebook Messenger Integration**: Full-featured chatbot functionality

## 🏗️ Database Schema

### Core Tables
- `users`: User accounts and profiles
- `government_procedures`: Administrative procedures by ministry
- `procedure_contents`: Detailed content with vector embeddings for search
- `chat_sessions`: Conversation tracking
- `chat_messages`: Individual messages with metadata
- `conversation_sessions`: Enhanced session management
- `chat_history`: Complete message history with memory
- `feedback`: User satisfaction ratings

### Enhanced Features
- Vector search capability for semantic similarity
- Conversation memory for contextual responses
- Ministry categorization for government services
- Document upload and processing

## 🛠️ Setup

### Prerequisites
- Node.js 16+
- PostgreSQL with pgvector extension (for local)
- Supabase account (for cloud)
- Ollama (for local AI models)

### Environment Variables
```bash
# Supabase configuration
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_service_role_key

# Facebook Messenger
FB_PAGE_ACCESS_TOKEN=your_page_token
FB_VERIFY_TOKEN=your_verify_token

# Ollama (local AI)
OLLAMA_MODEL=your_model_name

# Google Gemini (alternative)
GEMINI_API_KEY=your_gemini_key
```

### Database Setup
Run the SQL from `sql/supabase_tables.sql` in your Supabase SQL Editor to create all necessary tables.

## 🤖 Usage

### Starting the Server
```bash
npm start
```

### Processing Documents
```bash
node src/utils/knowledge-rag-processor.js
```

### Crawling Government Services
```bash
node src/utils/crawler-manager.js
```

## 📊 RAG System Improvements

### Enhanced Knowledge Storage
- Migrated from `knowledge_documents` to structured `government_procedures` + `procedure_contents` tables
- Better categorization and metadata storage
- Ministry-specific organization

### Conversation Memory
- Implemented session-based conversation history
- Context preservation across interactions
- User-specific interaction tracking
- Complete message history storage

### Document Processing
- Smart chunking for large documents
- Vector embedding generation
- Duplicate detection and handling
- Ministry classification

## 🚀 Performance Optimizations

### Supabase Integration
- Vector search for semantic similarity
- Proper indexing for fast retrieval
- Efficient storage patterns

### Memory Management
- Conversation session tracking
- Automatic cleanup of old sessions
- Efficient context window management

### Caching
- Response caching for common queries
- Embedding caching for repeated content
- Session state optimization

## 🔧 Troubleshooting

### Common Issues
1. **Table not found**: Ensure all tables from `sql/supabase_tables.sql` are created
2. **Vector extension**: Make sure pgvector is enabled in Supabase
3. **Memory issues**: Clear old conversations with the cleanup script

### Health Checks
Run `verify_setup.js` to check system configuration.

## 📈 Analytics & Monitoring

- Conversation quality metrics
- Response time tracking
- User satisfaction ratings
- Popular query tracking
- System performance monitoring

## 🌐 Deployment

Ready for deployment on Render, Koyeb, or other cloud platforms with the included `render.yaml`.

## 🔒 Compliance

The system follows Vietnamese data protection regulations and government service standards.