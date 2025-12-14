-- SQL script to drop all clean schema tables and functions in correct order

-- Drop functions first
DROP FUNCTION IF EXISTS add_chat_interaction(TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS get_user_chat_history(TEXT, INTEGER);

-- Drop tables
DROP TABLE IF EXISTS user_chat_history;
DROP TABLE IF EXISTS government_procedures_knowledge;

-- Drop extensions if needed (be careful with this in production)
-- DROP EXTENSION IF EXISTS "uuid-ossp";
-- DROP EXTENSION IF EXISTS pg_trgm;
-- DROP EXTENSION IF EXISTS btree_gin;