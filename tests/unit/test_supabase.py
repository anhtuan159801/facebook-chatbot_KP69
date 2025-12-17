import os
import sys

# Load environment variables from .env file
try:
    from dotenv import load_dotenv
    load_dotenv()
    print("Loaded .env file successfully")
except ImportError:
    print("python-dotenv not installed, trying alternative method")
    # Try loading .env file manually
    dotenv_path = os.path.join(os.path.dirname(__file__), '.env')
    if os.path.exists(dotenv_path):
        with open(dotenv_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    os.environ[key.strip()] = value.strip()
        print("Manually loaded .env file")

sys.path.append(os.path.join(os.path.dirname(__file__), 'Knowlegd-rag'))

print('Checking environment variables...')
supabase_url = os.getenv('SUPABASE_URL')
supabase_key = os.getenv('SUPABASE_KEY')

print(f'SUPABASE_URL: {supabase_url}')
print(f'SUPABASE_KEY: {supabase_key}')
print(f'SUPABASE_KEY exists and is not placeholder: {supabase_key is not None and supabase_key != "your_actual_service_role_key_here"}')

if supabase_url and supabase_key and supabase_key != 'your_actual_service_role_key_here':
    try:
        from Knowlegd_rag.vector_storage import EnhancedVectorStorage
        print('Testing Supabase connection...')
        vector_store = EnhancedVectorStorage(supabase_url=supabase_url, supabase_key=supabase_key)
        print('Connection successful! Vector storage initialized.')
    except Exception as e:
        print(f'Connection failed: {e}')
        import traceback
        traceback.print_exc()
else:
    print('Environment variables not properly set - you need to replace the placeholder key with your actual service role key')
    print('Current SUPABASE_KEY value:', repr(supabase_key))