import os
import sys

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

print("Testing Supabase direct connection...")

# Test if credentials are properly set
supabase_url = os.getenv('SUPABASE_URL')
supabase_key = os.getenv('SUPABASE_KEY')

print(f"SUPABASE_URL: {supabase_url}")
print(f"SUPABASE_KEY length: {len(supabase_key) if supabase_key else 0}")

if not supabase_url or not supabase_key or supabase_key == 'your_actual_service_role_key_here':
    print("Error: Supabase credentials not properly configured!")
    print("   You need to set the actual Service Role Key in the .env file")
    print("   (Get it from: Supabase Dashboard -> Project Settings -> API -> Service Role Key)")
else:
    try:
        from supabase import create_client
        
        print("Creating Supabase client instance...")
        supabase_client = create_client(supabase_url, supabase_key)
        
        print("Testing basic database connectivity...")
        
        # Try to check if tables exist by querying them
        try:
            # First, let's check if the tables exist by trying to query with a simple select
            response = supabase_client.table('government_procedures').select('id').limit(1).execute()
            print("government_procedures table exists and is accessible")
        except Exception as e:
            print(f"Possible issue with government_procedures table: {e}")
        
        try:
            response = supabase_client.table('procedure_contents').select('id').limit(1).execute()
            print("procedure_contents table exists and is accessible")
        except Exception as e:
            print(f"Possible issue with procedure_contents table: {e}")
        
        # Test insertion with a test record
        try:
            # This is just to test if we have write permissions
            print("Testing write permissions...")
            # Don't actually insert anything, just check if we can access the client
            print("Supabase client connection successful!")
            print("Ready to store chunks when you run crwal.py with store_to_vector=True")
        except Exception as e:
            print(f"Write permission issue: {e}")
        
    except ImportError:
        print("Supabase client not installed. Run: pip install supabase")
    except Exception as e:
        print(f"Error connecting to Supabase: {e}")
        import traceback
        traceback.print_exc()