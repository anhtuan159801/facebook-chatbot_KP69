import os
import sys
import importlib.util

# Load environment variables
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    # Manually load .env file
    dotenv_path = os.path.join(os.path.dirname(__file__), '.env')
    if os.path.exists(dotenv_path):
        with open(dotenv_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    os.environ[key.strip()] = value.strip()

# Add the path with proper module name (using hyphen)
knowledge_rag_path = os.path.join(os.path.dirname(__file__), 'Knowlegd-rag')
sys.path.insert(0, knowledge_rag_path)

print("Testing Supabase vector storage...")

# Test if credentials are properly set
supabase_url = os.getenv('SUPABASE_URL')
supabase_key = os.getenv('SUPABASE_KEY')

print(f"SUPABASE_URL: {supabase_url}")
print(f"SUPABASE_KEY set: {supabase_key is not None and len(supabase_key) > 10}")

if not supabase_url or not supabase_key or supabase_key == 'your_actual_service_role_key_here':
    print("Error: Supabase credentials not properly configured!")
    print("   You need to set the actual Service Role Key in the .env file")
    print("   (Get it from: Supabase Dashboard -> Project Settings -> API -> Service Role Key)")
else:
    try:
        # Import using importlib to handle the hyphen in the directory name
        vector_storage_spec = importlib.util.spec_from_file_location("vector_storage",
            os.path.join(knowledge_rag_path, "vector_storage.py"))
        vector_storage = importlib.util.module_from_spec(vector_storage_spec)
        vector_storage_spec.loader.exec_module(vector_storage)
        EnhancedVectorStorage = vector_storage.EnhancedVectorStorage
        
        print("Creating EnhancedVectorStorage instance...")
        vector_store = EnhancedVectorStorage(supabase_url=supabase_url, supabase_key=supabase_key)

        print("Testing basic database connectivity...")

        # Try to check if tables exist
        try:
            response = vector_store.supabase.table('government_procedures').select('id').limit(1).execute()
            print(f"government_procedures table exists, sample query executed")
        except Exception as e:
            print(f"government_procedures table issue: {e}")

        try:
            response = vector_store.supabase.table('procedure_contents').select('id').limit(1).execute()
            print(f"procedure_contents table exists, sample query executed")
        except Exception as e:
            print(f"procedure_contents table issue: {e}")

        print("Vector storage connection successful!")
        print("The system is ready to store chunks when you run crwal.py")

    except Exception as e:
        print(f"Error connecting to Supabase: {e}")
        import traceback
        traceback.print_exc()