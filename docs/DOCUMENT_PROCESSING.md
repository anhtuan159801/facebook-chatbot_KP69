# Document Processing for Facebook Chatbot

## Overview

This system allows you to upload PDF and DOCX documents to your knowledge base. The documents are processed to extract text content, which is then stored in your Supabase vector database with embeddings for semantic search.

## Dependencies Installation

```bash
npm install pdf-parse mammoth
```

## Setup

Make sure your Supabase is configured with the vector extension and the knowledge_documents table from the main schema.

## Usage

### Upload a Single Document

```bash
npm run upload:doc /path/to/your/document.pdf
```

Or:

```bash
node scripts/upload-document.js /path/to/your/document.docx
```

### Supported File Types

- **PDF** files (.pdf)
- **DOCX** files (.docx)

### File Size Limit

Maximum file size: 10MB

## Examples

```bash
# Upload a PDF document
npm run upload:doc ./docs/huong-dan-vneid.pdf

# Upload a Word document  
npm run upload:doc ./docs/thu-tuc-cap-dien-moi.docx
```

## How It Works

1. **Document Processing**: Extracts text from PDF/DOCX files
2. **Embedding Generation**: Creates vector embeddings using local models
3. **Storage**: Saves to Supabase knowledge_documents table
4. **Integration**: Documents become searchable in the RAG system

## Integration with RAG System

Once uploaded, documents are immediately available in the RAG system:
- Users can ask questions about content in your documents
- AI will retrieve relevant document sections as context
- Responses can reference specific document content