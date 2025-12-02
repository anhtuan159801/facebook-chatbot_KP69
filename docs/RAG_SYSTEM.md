# RAG System with Web Crawling for Facebook Chatbot

## Overview

This system implements a Retrieval-Augmented Generation (RAG) system that:
- Crawls official government websites for accurate information
- Stores knowledge in Supabase with vector embeddings
- Provides context to AI for more accurate responses
- Includes official form links for users

## Components

### 1. Web Crawlers
- `src/utils/crawler-manager.js` - Main crawler system
- Crawls official sources like:
  - dichvucong.gov.vn
  - vneid.gov.vn
  - sawaco.com.vn
  - evnhcmc.vn
  - vss.gov.vn
  - thuedientu.gdt.gov.vn

### 2. Local Embeddings
- `src/ai/local-embeddings.js` - Uses Transformers.js locally
- No external API required
- Supports Vietnamese text

### 3. RAG System
- `src/ai/local-rag-system.js` - Integrates with Supabase
- Performs vector similarity search
- Returns relevant documents

## Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Supabase Setup (Required)
1. Create a free Supabase account at [supabase.com](https://supabase.com)
2. Create a new project
3. Enable the `vector` extension in your database:
   - Go to SQL Editor in Supabase dashboard
   - Run: `CREATE EXTENSION IF NOT EXISTS vector;`

### 3. Environment Variables
1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Add your Supabase credentials to `.env`:
   ```env
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

### 4. Database Schema
Run the SQL schema from `docs/supabase-knowledge-schema.sql` in your Supabase SQL Editor:
- Copy the content of the file
- Paste in Supabase SQL Editor
- Execute to create the required tables and functions

### 5. Local Testing
After setting up Supabase, you can test the system:
```bash
npm run crawl:once
```

## Usage

### Run Crawlers Once
```bash
npm run crawl:once
```

### Upload Documents to Knowledge Base
Upload PDF or DOCX documents to your knowledge base:

```bash
npm run upload:doc /path/to/your/document.pdf
```

Or:

```bash
npm run upload:doc /path/to/your/document.docx
```

For more information about document processing, see `docs/DOCUMENT_PROCESSING.md`.

### Run Crawlers Continuously
```bash
npm run crawl
```

### Start the Chatbot
```bash
npm start
```

## Configuration

### Crawler Configuration
The crawler settings are in `src/utils/crawler-manager.js`:
- Crawls every 12 hours automatically
- Priority sources crawled every 6 hours
- Configurable for different government services

### RAG Settings
- Similarity threshold: 0.6 (adjustable)
- Returns top 5 most relevant documents
- Supports category filtering

## How It Works

1. **Web Crawling**: Automatically gathers information from official government websites
2. **Embedding Generation**: Creates vector embeddings using local models
3. **Storage**: Stores in Supabase with vector indexing
4. **Retrieval**: When user asks a question, finds relevant documents
5. **Generation**: AI uses retrieved information as context for accurate responses

## Benefits

- **Accuracy**: Responses based on official sources
- **Up-to-date**: Regular crawling keeps information current
- **Form Links**: Direct access to official forms
- **No API Costs**: Local embedding generation
- **Vietnamese Support**: Optimized for Vietnamese text