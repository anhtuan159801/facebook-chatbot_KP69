# Supabase Database Setup Guide

## Database Connection

To connect to your Supabase database using the transaction pooler:

### Connection String Format (URI)
```
postgresql://[username]:[password]@[pooler_host]:[port]/[database_name]?pgbouncer=true
```

### Environment Variables
Update your `.env` file with the following:

```
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_service_role_key
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# For direct database connection (if needed)
DIRECT_DATABASE_URL=your_direct_database_url
POOLER_DATABASE_URL=your_pooler_connection_string
```

## Table Structure

The following table has been created to store the crawled procedure data:

### government_procedures_knowledge table
- **id**: UUID (Primary Key, auto-generated)
- **procedure_code**: TEXT (Unique identifier for each procedure, required)
- **procedure_title**: TEXT (Title of the procedure)
- **original_filename**: TEXT (Original name of the document file)
- **content_length**: INTEGER (Length of the full content)
- **full_content**: TEXT (Full content of the procedure document)
- **full_content_preview**: TEXT (Preview/first part of the content)
- **metadata**: JSONB (Structured metadata about the procedure)
- **ministry_name**: TEXT (Name of the ministry that owns the procedure)
- **source_url**: TEXT (URL where the document was sourced from)
- **doc_hash**: TEXT (Unique hash of the document content)
- **created_at**: TIMESTAMP (Record creation time)
- **updated_at**: TIMESTAMP (Last update time)
- **file_size**: INTEGER (Size of the original file in bytes)

## Required Supabase Setup

1. Create a new table using the SQL in create_procedures_table.sql
2. Enable the `pgvector` extension if you plan to use vector embeddings:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

3. Create the government_procedures_knowledge table with the provided SQL

## Supabase Storage Setup

1. Create a storage bucket named `government-documents`
2. Set up RLS policies as needed for the bucket
3. Ensure your service role key has the necessary permissions

## Troubleshooting

If you're having connection issues:
- Make sure you're using the SERVICE_ROLE_KEY for administrative operations
- For storage operations, you might need to adjust bucket permissions
- Verify your connection string format for the transaction pooler