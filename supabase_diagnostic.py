#!/usr/bin/env python3
"""
Fix the crawler to handle missing buckets gracefully and use existing bucket
"""
import os

def check_and_update_bucket_config():
    print("Checking Supabase Storage Configuration")
    print("="*50)
    
    # Check if we can access Supabase storage and see what buckets exist
    try:
        from supabase import create_client
        import os
        
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_KEY")
        
        if not supabase_url or not supabase_key:
            print("❌ SUPABASE_URL or SUPABASE_KEY not set")
            return False
            
        print("✅ Supabase credentials found")
        
        client = create_client(supabase_url, supabase_key)
        
        # Try to list existing buckets
        try:
            buckets_response = client.storage.list_buckets()
            print("\n📋 Existing buckets in Supabase:")
            if hasattr(buckets_response, 'data') and buckets_response.data:
                for bucket in buckets_response.data:
                    print(f"  - {bucket.name}")
                    print(f"    ID: {bucket.id}")
                    print(f"    Public: {bucket.public}")
            else:
                print("  No buckets found")
        except Exception as e:
            print(f"❌ Could not list buckets: {e}")
            print("This might be due to permissions - make sure you're using the service role key")
        
        print("\n💡 Recommended actions:")
        print("1. Create a bucket named 'government-documents' in your Supabase dashboard")
        print("2. Or use an existing bucket and update the crawler code")
        print("3. Make sure to set proper RLS policies for the bucket")
        
        return True
        
    except ImportError:
        print("❌ Supabase library not installed")
        print("Run: pip install supabase")
        return False
    except Exception as e:
        print(f"❌ Error connecting to Supabase: {e}")
        print("Make sure your SUPABASE_URL and SUPABASE_KEY are correct")
        print("Use the SERVICE_ROLE_KEY (not anon key) for file uploads")
        return False

def fix_crawler_for_existing_bucket():
    """
    Create a patch for the crawler to use an existing bucket
    """
    print("\n🔧 Suggested fix for bucket issue:")
    print("Use an existing bucket or create the required one")
    
    # Show where to update in the code
    print("\nIn the upload_file_to_supabase_storage method, you can:")
    print("1. Use 'public' bucket if it exists")
    print("2. Create 'government-documents' bucket in Supabase dashboard first")
    print("3. Or change the bucket name to an existing one")

def check_vector_storage():
    """
    Check if vector storage is available
    """
    print("\n🔍 Checking VectorStorage availability...")
    
    try:
        import importlib.util
        import sys
        
        # Try to import the vector storage module
        vector_path = os.path.join(os.path.dirname(__file__), 'Knowlegd-rag', 'clean_vector_storage.py')
        if os.path.exists(vector_path):
            spec = importlib.util.spec_from_file_location("clean_vector_storage", vector_path)
            vector_module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(vector_module)
            
            # Check if VectorStorage exists
            if hasattr(vector_module, 'VectorStorage'):
                print("✅ VectorStorage module found in clean_vector_storage.py")
            else:
                print("❌ VectorStorage class not found in clean_vector_storage.py")
                print("   This might be the issue with the crawler")
        else:
            print("❌ clean_vector_storage.py file not found")
            
    except Exception as e:
        print(f"❌ Error checking vector storage: {e}")

if __name__ == "__main__":
    print("Supabase Configuration Diagnostic Tool")
    print("="*60)
    
    success = check_and_update_bucket_config()
    check_vector_storage()
    fix_crawler_for_existing_bucket()
    
    print("\n" + "="*60)
    print("🔧 SOLUTIONS:")
    print("1. Go to your Supabase dashboard -> Storage -> New Bucket")
    print("2. Create bucket named 'government-documents'")
    print("3. Make sure you're using SERVICE_ROLE_KEY for uploads (not anon key)")
    print("4. Then run the crawler again")