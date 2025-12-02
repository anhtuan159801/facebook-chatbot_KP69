-- Supabase Vector Database Schema for Knowledge Base
-- This schema supports the RAG (Retrieval-Augmented Generation) system

-- Enable the vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create the knowledge documents table
CREATE TABLE knowledge_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  source_url TEXT,
  form_link TEXT,
  category TEXT,
  embedding vector(384), -- Using 384 dimensions for the MiniLM model
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_crawled TIMESTAMP DEFAULT NOW(),
  crawl_source TEXT, -- Which crawler generated this
  relevance_score FLOAT DEFAULT 1.0
);

-- Create indexes for better performance
CREATE INDEX idx_knowledge_category ON knowledge_documents(category);
CREATE INDEX idx_knowledge_crawled ON knowledge_documents(last_crawled);
CREATE INDEX idx_knowledge_created ON knowledge_documents(created_at);

-- Create the vector index for similarity search
-- Using HNSW index which is efficient for vector similarity search
CREATE INDEX idx_knowledge_documents_embedding 
  ON knowledge_documents 
  USING hnsw (embedding vector_cosine_ops);

-- Create a function for vector similarity search
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(384),
  match_count INT DEFAULT 5,
  filter_category TEXT DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  title TEXT,
  content TEXT,
  source_url TEXT,
  form_link TEXT,
  category TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    knowledge_documents.id,
    knowledge_documents.title,
    knowledge_documents.content,
    knowledge_documents.source_url,
    knowledge_documents.form_link,
    knowledge_documents.category,
    knowledge_documents.metadata,
    (1 - (knowledge_documents.embedding <=> query_embedding)) AS similarity
  FROM knowledge_documents
  WHERE (filter_category IS NULL OR category = filter_category)
  ORDER BY knowledge_documents.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Optional: Create a function to update the last_crawled timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update the updated_at column
CREATE TRIGGER update_knowledge_documents_updated_at 
    BEFORE UPDATE ON knowledge_documents 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();