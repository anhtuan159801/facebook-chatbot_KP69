-- Clean Supabase Schema for Government Procedure RAG System
-- Two main tables as requested:
-- 1. Chat history: Facebook User ID | User Request | Chatbot Response
-- 2. Knowledge base: Procedure Code | Full Procedure Content (from DOCX)

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm; -- For text similarity searches
CREATE EXTENSION IF NOT EXISTS btree_gin; -- For better GIN index performance

-- TABLE 1: User Chat History
-- Structure: Facebook User ID | User Request | Chatbot Response
CREATE TABLE user_chat_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    facebook_user_id TEXT NOT NULL,
    user_request TEXT NOT NULL,
    chatbot_response TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    session_id TEXT,
    message_sequence INTEGER DEFAULT 1
);

-- Indexes for chat history table
CREATE INDEX idx_user_chat_history_facebook_user_id ON user_chat_history(facebook_user_id);
CREATE INDEX idx_user_chat_history_created_at ON user_chat_history(created_at);
CREATE INDEX idx_user_chat_history_session_id ON user_chat_history(session_id);

-- TABLE 2: Knowledge Base (Government Procedures)
-- Structure: Procedure Code | Full Procedure Content (from DOCX files)
CREATE TABLE government_procedures_knowledge (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    procedure_code TEXT UNIQUE NOT NULL,
    full_procedure_content TEXT NOT NULL,  -- Full content from DOCX file
    procedure_title TEXT,
    ministry_name TEXT,
    source_url TEXT,
    doc_hash TEXT UNIQUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    file_size INTEGER,
    metadata JSONB
);

-- Indexes for knowledge base table
CREATE INDEX idx_government_procedures_code ON government_procedures_knowledge(procedure_code);
CREATE INDEX idx_government_procedures_content_gin ON government_procedures_knowledge USING gin(full_procedure_content gin_trgm_ops);
CREATE INDEX idx_government_procedures_ministry ON government_procedures_knowledge(ministry_name);

-- Optional: Function to add chat interaction
CREATE OR REPLACE FUNCTION add_chat_interaction(
    p_facebook_user_id TEXT,
    p_user_request TEXT,
    p_chatbot_response TEXT,
    p_session_id TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    new_id UUID;
    max_seq INTEGER;
BEGIN
    -- Get the next sequence number for this session
    SELECT COALESCE(MAX(message_sequence), 0) + 1
    INTO max_seq
    FROM user_chat_history
    WHERE (p_session_id IS NOT NULL AND session_id = p_session_id)
       OR (p_session_id IS NULL AND session_id IS NULL AND facebook_user_id = p_facebook_user_id);

    -- Insert the new chat interaction
    INSERT INTO user_chat_history (
        facebook_user_id,
        user_request,
        chatbot_response,
        session_id,
        message_sequence
    ) VALUES (
        p_facebook_user_id,
        p_user_request,
        p_chatbot_response,
        p_session_id,
        max_seq
    )
    RETURNING id INTO new_id;

    RETURN new_id;
END;
$$;

-- Optional: Function to get recent chat history for a user
CREATE OR REPLACE FUNCTION get_user_chat_history(
    p_facebook_user_id TEXT,
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE(
    user_request TEXT,
    chatbot_response TEXT,
    created_at TIMESTAMP,
    message_sequence INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT uch.user_request, uch.chatbot_response, uch.created_at, uch.message_sequence
    FROM user_chat_history uch
    WHERE uch.facebook_user_id = p_facebook_user_id
    ORDER BY uch.created_at DESC
    LIMIT p_limit;
END;
$$;