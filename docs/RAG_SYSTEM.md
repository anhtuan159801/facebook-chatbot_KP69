# 🤖 RAG System Documentation

## Overview
The Facebook Chatbot includes a Retrieval-Augmented Generation (RAG) system that enhances responses with accurate information from official Vietnamese government documents. The system comes pre-populated with thousands of administrative procedures downloaded from various Vietnamese government ministries.

## Knowledge Sources
The system has automatically downloaded over 3,700 documents from:
- Ministry of Public Security (Bộ Công an)
- Ministry of Industry and Trade (Bộ Công thương)
- Ministry of Education and Training (Bộ Giáo dục và Đào tạo)
- Ministry of Science and Technology (Bộ Khoa học và Công nghệ)
- Ministry of Health (Bộ Y tế)
- And many other Vietnamese government agencies

The documents are stored in the `Knowlegd-rag/downloads_ministries` folder with the following structure:
```
downloads_ministries/
├── Bộ_Công_an/
│   ├── danh_sach_Bộ_Công_an.txt
│   └── huong_dan/
│       ├── 1_000051.doc
│       ├── 1_000051.docx
│       └── ...
├── Bộ_Công_thương/
├── Bộ_Giáo_dục_và_Đào_tạo/
├── Bộ_Khoa_học_và_Công_nghệ/
└── ...
```

## How RAG Works
1. Documents are converted to text and processed through embedding models
2. Vector embeddings are stored in Supabase with document metadata
3. When users ask questions, their queries are converted to embeddings
4. Cosine similarity finds relevant documents in the vector database
5. Relevant document snippets are injected into AI prompts as context
6. AI generates responses with accurate, official information

## Setup Instructions

### 1. Database Configuration
First, set up Supabase and run the schema:
1. Create a free Supabase project
2. Enable the `vector` extension
3. Run the SQL schema in `docs/supabase-knowledge-schema.sql`

### 2. Environment Variables
Make sure to configure these in your `.env` file:
```
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Importing Knowledge Base
Import all pre-downloaded documents to your database:

```bash
# Import all knowledge from downloaded documents
npm run import-knowledge-rag

# Or run the import script directly
node scripts/import-knowledge-rag.js
```

## Using the System

### During Development
The system automatically loads knowledge when starting services:
```bash
npm run start:all
```

### During Production
- The knowledge base is loaded when services start
- The system watches for new documents in the RAG folder
- Knowledge is refreshed automatically when new documents are added

## Management Scripts

- `npm run import-knowledge-rag` - Import knowledge from downloaded documents to Supabase
- `npm run refresh:knowledge` - Clear and reimport all knowledge documents
- `npm run populate:knowledge` - Add sample knowledge to database (for testing)
- `npm run crawl:once` - Crawl and download new documents from government websites
- `npm run upload:doc` - Upload custom documents to knowledge base
- `npm run test:knowledge` - Test the knowledge retrieval functionality

## Troubleshooting

1. **No Knowledge Responses**: Ensure Supabase is configured and knowledge documents are imported
2. **Low Relevance**: Check that you ran the import script to add documents to database
3. **Vector Extension Error**: Ensure the `vector` extension is enabled in Supabase
4. **Similarity Threshold**: Adjust in RAG system code if getting too many/no results

## Deployment Notes

### Koyeb Deployment
When deploying to Koyeb, make sure to:
1. Set up Supabase with vector extension
2. Configure environment variables
3. Run the import script after deployment to load knowledge documents
4. The system will automatically use the knowledge base for responses

### Knowledge Updates
To keep the knowledge base current:
1. Run `npm run crawl:once` to download new documents
2. Run `npm run import-knowledge-rag` to add new documents to the database
3. The system has crawlers for various Vietnamese government ministry websites

## Architecture
- **Document Processor**: Converts DOC/DOCX files to text
- **Local Embeddings**: Generates vector embeddings for semantic search
- **Supabase Vector DB**: Stores embeddings and document metadata
- **Knowledge Manager**: Handles storage and retrieval
- **RAG System**: Integrates knowledge into AI responses
- **Knowledge Watcher**: Monitors for new documents and updates

## Performance Considerations
- Vector similarity search works best with 300-500 character query fragments
- Documents are chunked into appropriate sizes for embedding
- The system caches embeddings to improve response times
- Consider using a paid Supabase plan for production use with heavy traffic

## Security
- Document downloading happens separately from the main application
- Knowledge documents are sanitized before embedding
- No sensitive government credentials are stored in the system
- All API calls use secure protocols