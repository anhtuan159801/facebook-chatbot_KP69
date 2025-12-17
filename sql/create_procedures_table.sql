-- SQL to create the government procedures knowledge table in Supabase
-- This matches the exact structure from the CSV file being generated

CREATE TABLE IF NOT EXISTS government_procedures_knowledge (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    procedure_code TEXT UNIQUE NOT NULL,
    procedure_title TEXT,
    original_filename TEXT,
    content_length INTEGER,
    full_content TEXT,
    full_content_preview TEXT, -- Contains the first part of the content (structured with special format)
    metadata JSONB, -- Contains extracted structured information like: title, processing_time, fee, agency, documents, steps, field, contact, etc.
    ministry_name TEXT, -- Ministry name extracted from the file path
    source_url TEXT, -- Original URL or file path
    doc_hash TEXT UNIQUE, -- Hash of document to prevent duplicates
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    file_size INTEGER
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_procedure_code ON government_procedures_knowledge(procedure_code);
CREATE INDEX IF NOT EXISTS idx_ministry_name ON government_procedures_knowledge(ministry_name);
CREATE INDEX IF NOT EXISTS idx_procedure_title ON government_procedures_knowledge(procedure_title);
CREATE INDEX IF NOT EXISTS idx_content_length ON government_procedures_knowledge(content_length);

-- Enable full-text search on the structured content
CREATE INDEX IF NOT EXISTS idx_full_content_gin ON government_procedures_knowledge USING gin(full_content gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_full_content_preview_gin ON government_procedures_knowledge USING gin(full_content_preview gin_trgm_ops);

-- Enable Row Level Security (RLS) if needed
ALTER TABLE government_procedures_knowledge ENABLE ROW LEVEL SECURITY;

-- Example RLS policy (adjust according to your needs)
-- This allows all operations for authenticated users
-- CREATE POLICY "Allow all operations for authenticated users" ON government_procedures_knowledge
--     FOR ALL USING (auth.role() = 'authenticated');

-- To import data from CSV:
-- 1. Go to Supabase dashboard -> Database -> Tables -> government_procedures_knowledge
-- 2. Click "Import/Export" tab
-- 3. Upload your CSV file and map columns accordingly
--
-- Or use the SQL import command:
-- COPY government_procedures_knowledge(procedure_code, procedure_title, original_filename, content_length, full_content_preview, metadata)
-- FROM 'path_to_your_csv_file.csv'
-- DELIMITER ','
-- CSV HEADER;