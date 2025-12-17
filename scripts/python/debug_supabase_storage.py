#!/usr/bin/env python3
"""
Debug script to test Supabase storage functionality
"""
import os
import sys
import importlib.util
import tempfile
from pathlib import Path

def debug_supabase_storage():
    print("Debugging Supabase Storage Integration")
    print("="*50)

    # Check environment variables
    print("\n1. Checking Environment Variables:")
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_KEY")
    
    print(f"   SUPABASE_URL: {'SET (first 30 chars)' if supabase_url else 'NOT SET'}")
    if supabase_url:
        print(f"     Value: {supabase_url[:30]}...")
    
    print(f"   SUPABASE_KEY: {'SET' if supabase_key else 'NOT SET'}")
    if supabase_key:
        print(f"     Length: {len(supabase_key)} chars")
    
    if not supabase_url or not supabase_key:
        print("\n❌ ERROR: Missing SUPABASE_URL or SUPABASE_KEY environment variables!")
        return False
    
    # Import the crawler
    print("\n2. Loading crawler module...")
    try:
        crwal_path = os.path.join(os.path.dirname(__file__), 'Knowlegd-rag', 'crwal.py')
        spec = importlib.util.spec_from_file_location("crwal", crwal_path)
        crwal_module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(crwal_module)
        EnhancedProcedureScraper = crwal_module.EnhancedProcedureScraper
        
        print("   + Crawler module loaded successfully")
    except Exception as e:
        print(f"   - Failed to load crawler: {e}")
        return False

    # Create a scraper instance with verbose logging
    try:
        print("\n3. Creating scraper instance...")
        scraper = EnhancedProcedureScraper(
            download_dir=os.path.join(tempfile.gettempdir(), "debug_downloads"),
            max_workers=2,
            headless=True
        )
        print("   + Scraper instance created")
    except Exception as e:
        print(f"   - Failed to create scraper instance: {e}")
        return False

    # Test Supabase storage client
    print("\n4. Testing Supabase storage client...")
    try:
        storage_client = scraper._create_supabase_storage_client()
        if storage_client:
            print("   + Supabase storage client created successfully")
        else:
            print("   - Failed to create Supabase storage client")
            return False
    except Exception as e:
        print(f"   - Supabase storage client test failed: {e}")
        return False

    # List downloaded files in a ministry folder if any exist
    print("\n5. Checking for existing downloaded files...")
    downloads_dir = os.path.join(os.path.dirname(__file__), 'downloads_ministries')
    if os.path.exists(downloads_dir):
        ministries = os.listdir(downloads_dir)
        if ministries:
            print(f"   Found {len(ministries)} ministry folders:")
            for ministry in ministries[:5]:  # Show first 5
                ministry_path = os.path.join(downloads_dir, ministry)
                if os.path.isdir(ministry_path):
                    doc_files = []
                    for root, dirs, files in os.walk(ministry_path):
                        for file in files:
                            if file.lower().endswith(('.doc', '.docx')):
                                doc_files.append(os.path.join(root, file))

                    print(f"   - {ministry}: {len(doc_files)} .doc/.docx files")

                    # Show first few files if any
                    for doc_file in doc_files[:2]:
                        print(f"     * {os.path.basename(doc_file)} ({os.path.getsize(doc_file)} bytes)")
        else:
            print("   No ministry folders found in downloads_ministries/")
    else:
        print("   downloads_ministries/ directory not found")

    # Test the store method directly with a sample ministry name
    print("\n6. Testing store_documents_with_embeddings_and_file_storage...")
    print("   (This will fail without actual files, but will test the method call)")

    try:
        # This will test if the method exists and can be called
        method = getattr(scraper, 'store_documents_with_embeddings_and_file_storage', None)
        if method:
            print("   + Method store_documents_with_embeddings_and_file_storage exists")
        else:
            print("   - Method store_documents_with_embeddings_and_file_storage does not exist")
            return False
    except Exception as e:
        print(f"   - Method test failed: {e}")
        return False

    print("\n7. Recommended actions:")
    print("   - Check that your Supabase bucket 'government-documents' exists")
    print("   - Verify your SUPABASE_URL and SUPABASE_KEY are correct")
    print("   - Make sure the 'government_procedures_knowledge' table exists")
    print("   - When running the crawler, use store_to_vector=True")
    print("   - Check the error logs if upload fails")

    print("\n8. Running the crawler with Supabase storage enabled:")
    print("   - The main function already sets store_to_vector=True")
    print("   - Files should be uploaded to: government-documents/[ministry_name]/procedures/")
    print("   - Content should be stored in: government_procedures_knowledge table")

    return True

if __name__ == "__main__":
    success = debug_supabase_storage()
    if success:
        print("\n+ Debug completed successfully")
    else:
        print("\n- Debug failed - please check the issues above")
        sys.exit(1)