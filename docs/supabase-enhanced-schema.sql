-- Enhanced Supabase Schema with Chat History
-- This extends the existing knowledge base with chat history functionality

-- Make sure the vector extension is enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- If you don't have the knowledge_documents table yet, create it (or skip if it exists)
CREATE TABLE IF NOT EXISTS knowledge_documents (
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

-- Create indexes for knowledge documents
CREATE INDEX IF NOT EXISTS idx_knowledge_category ON knowledge_documents(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_crawled ON knowledge_documents(last_crawled);
CREATE INDEX IF NOT EXISTS idx_knowledge_created ON knowledge_documents(created_at);
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_embedding 
  ON knowledge_documents 
  USING hnsw (embedding vector_cosine_ops);

-- Create the chat history table
CREATE TABLE chat_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  session_id TEXT DEFAULT gen_random_uuid(),
  message_type TEXT CHECK (message_type IN ('user', 'assistant', 'system')), -- user message, bot response, or system message
  message_content TEXT NOT NULL,
  message_embedding vector(384), -- Embedding of the message for semantic search
  intent TEXT, -- Detected intent or topic of the conversation
  metadata JSONB DEFAULT '{}', -- Additional metadata (timestamps, attachments, etc.)
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  response_time_ms INTEGER, -- How long the bot took to respond
  is_resolved BOOLEAN DEFAULT FALSE, -- Whether this conversation thread was resolved
  conversation_score INTEGER CHECK (conversation_score BETWEEN 1 AND 5), -- User rating
  tags TEXT[] DEFAULT '{}', -- Tags for categorizing conversation
  external_links TEXT[], -- Links sent in the conversation
  file_attachments JSONB[] DEFAULT '{}' -- Any file attachments metadata
);

-- Create indexes for chat history table
CREATE INDEX IF NOT EXISTS idx_chat_history_user_id ON chat_history(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_session_id ON chat_history(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_created_at ON chat_history(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_history_message_type ON chat_history(message_type);
CREATE INDEX IF NOT EXISTS idx_chat_history_intent ON chat_history(intent);
CREATE INDEX IF NOT EXISTS idx_chat_history_resolved ON chat_history(is_resolved);
CREATE INDEX IF NOT EXISTS idx_chat_history_embedding 
  ON chat_history 
  USING hnsw (message_embedding vector_cosine_ops);

-- Create a table for conversation sessions (to track full conversations)
CREATE TABLE conversation_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT UNIQUE NOT NULL,
  user_id TEXT NOT NULL,
  started_at TIMESTAMP DEFAULT NOW(),
  last_activity TIMESTAMP DEFAULT NOW(),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'ended', 'archived')),
  topic TEXT, -- Main topic of the conversation
  summary TEXT, -- Summary of the conversation
  resolution_status TEXT DEFAULT 'pending' CHECK (resolution_status IN ('pending', 'resolved', 'escalated')),
  metadata JSONB DEFAULT '{}',
  ended_at TIMESTAMP
);

-- Create indexes for conversation sessions
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_user_id ON conversation_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_started_at ON conversation_sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_status ON conversation_sessions(status);

-- Create a table for conversation analytics
CREATE TABLE conversation_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT REFERENCES conversation_sessions(session_id),
  user_id TEXT NOT NULL,
  message_count INTEGER DEFAULT 0,
  avg_response_time_ms FLOAT DEFAULT 0,
  resolution_time_ms INTEGER, -- Time to resolve the conversation
  user_satisfaction INTEGER CHECK (user_satisfaction BETWEEN 1 AND 5),
  intent_distribution JSONB DEFAULT '{}', -- Distribution of intents in the conversation
  tags_used TEXT[] DEFAULT '{}',
  conversation_quality_score FLOAT CHECK (conversation_quality_score BETWEEN 0 AND 1),
  feedback TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for analytics
CREATE INDEX IF NOT EXISTS idx_conversation_analytics_session_id ON conversation_analytics(session_id);
CREATE INDEX IF NOT EXISTS idx_conversation_analytics_user_id ON conversation_analytics(user_id);

-- Function to update last activity in conversation sessions
CREATE OR REPLACE FUNCTION update_conversation_last_activity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversation_sessions 
  SET last_activity = NOW()
  WHERE session_id = NEW.session_id;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update last activity when new messages are added
CREATE TRIGGER trigger_update_conversation_last_activity
  AFTER INSERT ON chat_history
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_last_activity();

-- Function to calculate conversation statistics
CREATE OR REPLACE FUNCTION calculate_conversation_stats(p_session_id TEXT)
RETURNS TABLE(
  message_count BIGINT,
  avg_response_time FLOAT,
  total_resolution_time BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as message_count,
    AVG(response_time_ms)::FLOAT as avg_response_time,
    EXTRACT(EPOCH FROM (MAX(ch.created_at) - MIN(ch.created_at)))::BIGINT * 1000 as total_resolution_time
  FROM chat_history ch
  WHERE ch.session_id = p_session_id;
END;
$$;

-- Create a function for semantic search in chat history (for context retrieval)
CREATE OR REPLACE FUNCTION search_chat_history(
  query_embedding vector(384),
  user_id TEXT DEFAULT NULL,
  session_id TEXT DEFAULT NULL,
  days_back INTEGER DEFAULT 30,
  match_count INT DEFAULT 5
)
RETURNS TABLE(
  id UUID,
  user_id TEXT,
  session_id TEXT,
  message_type TEXT,
  message_content TEXT,
  intent TEXT,
  created_at TIMESTAMP,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ch.id,
    ch.user_id,
    ch.session_id,
    ch.message_type,
    ch.message_content,
    ch.intent,
    ch.created_at,
    (1 - (ch.message_embedding <=> query_embedding)) AS similarity
  FROM chat_history ch
  WHERE 
    (user_id IS NULL OR ch.user_id = user_id)
    AND (session_id IS NULL OR ch.session_id = session_id)
    AND ch.created_at >= NOW() - (days_back || ' days')::INTERVAL
    AND ch.message_embedding IS NOT NULL
  ORDER BY ch.message_embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Create a function for vector similarity search in knowledge base (improved version)
CREATE OR REPLACE FUNCTION match_knowledge_documents(
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
    AND knowledge_documents.embedding IS NOT NULL
  ORDER BY knowledge_documents.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Optional: Create a function to update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update the updated_at column
CREATE TRIGGER update_chat_history_updated_at 
    BEFORE UPDATE ON chat_history 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversation_sessions_updated_at 
    BEFORE UPDATE ON conversation_sessions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();