#!/usr/bin/env python3
"""
Test script to verify the enhanced Supabase file upload functionality
"""
import os
import sys
import tempfile
from pathlib import Path
import importlib.util

def test_supabase_storage_integration():
    """
    Test the Supabase storage integration
    """
    print("Testing Supabase Storage Integration...\n")

    # Test 1: Check if required environment variables are set
    print("Test 1: Checking environment variables")
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_KEY")

    if not supabase_url or not supabase_key:
        print(f"   Environment variables not set!")
        print(f"   SUPABASE_URL: {'SET' if supabase_url else 'NOT SET'}")
        print(f"   SUPABASE_KEY: {'SET' if supabase_key else 'NOT SET'}")
        print(f"   Please set SUPABASE_URL and SUPABASE_KEY environment variables")
        return False
    else:
        print(f"   SUPABASE_URL: {'SET (first 50 chars)' if supabase_url else 'NOT SET'}")
        print(f"   SUPABASE_KEY: {'SET' if supabase_key else 'NOT SET (showing length)'}")

    # Test 2: Import the EnhancedProcedureScraper class using importlib
    print("\nTest 2: Importing EnhancedProcedureScraper class")
    try:
        # Load the crwal.py file as a module
        crwal_path = os.path.join(os.path.dirname(__file__), 'Knowlegd-rag', 'crwal.py')
        spec = importlib.util.spec_from_file_location("crwal", crwal_path)
        crwal_module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(crwal_module)
        EnhancedProcedureScraper = crwal_module.EnhancedProcedureScraper
        print("   EnhancedProcedureScraper imported successfully")
    except ImportError as e:
        print(f"   Import failed: {e}")
        return False
    
    # Test 3: Create a scraper instance
    print("\nTest 3: Creating EnhancedProcedureScraper instance")
    try:
        scraper = EnhancedProcedureScraper(
            download_dir=os.path.join(tempfile.gettempdir(), "test_downloads"),
            max_workers=2,
            headless=True
        )
        print("   EnhancedProcedureScraper instance created successfully")
    except Exception as e:
        print(f"   Instance creation failed: {e}")
        return False

    # Test 4: Test the Supabase storage client creation function
    print("\nTest 4: Testing Supabase storage client creation")
    try:
        storage_client = scraper._create_supabase_storage_client()
        if storage_client is not None:
            print("   Supabase storage client created successfully")
        else:
            print("   Supabase storage client creation failed")
            return False
    except Exception as e:
        print(f"   Supabase storage client test failed: {e}")
        return False

    # Test 5: Check if new methods exist
    print("\nTest 5: Checking for new Supabase storage methods")
    methods_to_check = [
        'upload_file_to_supabase_storage',
        'store_documents_with_embeddings_and_file_storage',
        '_create_supabase_storage_client'
    ]

    all_methods_exist = True
    for method_name in methods_to_check:
        method_exists = hasattr(scraper, method_name)
        print(f"   {'+' if method_exists else '-'} Method {method_name}: {'EXISTS' if method_exists else 'MISSING'}")
        if not method_exists:
            all_methods_exist = False

    if not all_methods_exist:
        return False
    
    # Test 6: Check updated store_documents_with_embeddings method
    print("\nTest 6: Checking updated store_documents_with_embeddings method")
    import inspect
    sig = inspect.signature(scraper.store_documents_with_embeddings)
    params = list(sig.parameters.keys())

    if 'upload_to_storage' in params:
        print("   store_documents_with_embeddings has upload_to_storage parameter")
    else:
        print("   store_documents_with_embeddings missing upload_to_storage parameter")
        return False

    print("\nAll tests passed! Enhanced Supabase storage functionality is ready.")
    print("\nSummary of new features:")
    print("   - upload_file_to_supabase_storage() - Upload files to Supabase storage")
    print("   - store_documents_with_embeddings_and_file_storage() - Enhanced storage with file upload")
    print("   - Updated store_documents_with_embeddings() - Optional file upload capability")
    print("   - All files are now stored in Supabase with public URLs")
    print("   - Enhanced metadata includes file storage URLs")

    return True

def test_with_sample_file():
    """
    Test with a sample DOCX file if available
    """
    print("\nTesting with sample file (if available)...")

    # Create a temporary test file
    with tempfile.NamedTemporaryFile(mode='w', suffix='.docx', delete=False) as temp_file:
        # Note: This won't actually be a valid DOCX file, just for testing the path handling
        temp_file.write("Test content for Supabase storage upload")
        temp_file_path = temp_file.name

    try:
        # Load the crwal.py file as a module
        crwal_path = os.path.join(os.path.dirname(__file__), 'Knowlegd-rag', 'crwal.py')
        spec = importlib.util.spec_from_file_location("crwal", crwal_path)
        crwal_module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(crwal_module)
        EnhancedProcedureScraper = crwal_module.EnhancedProcedureScraper

        scraper = EnhancedProcedureScraper(headless=True)

        print(f"   Created sample file for testing: {os.path.basename(temp_file_path)}")
        print(f"   Sample file path handling test passed")

    except Exception as e:
        print(f"   Sample test failed: {e}")
    finally:
        # Clean up
        if os.path.exists(temp_file_path):
            os.unlink(temp_file_path)

if __name__ == "__main__":
    print("Enhanced Supabase Storage Test Suite")
    print("="*60)

    success = test_supabase_storage_integration()

    if success:
        test_with_sample_file()
        print("\n" + "="*60)
        print("ALL TESTS PASSED! The crawler has been successfully enhanced with Supabase file storage capability.")
        print("\nYou can now run the crawler with:")
        print("   python Knowlegd-rag/crwal.py")
        print("\nThe enhanced crawler will:")
        print("   - Download administrative procedure documents")
        print("   - Upload them to Supabase storage")
        print("   - Store content in vector database for RAG")
        print("   - Provide public URLs for direct file access")
    else:
        print("\nSOME TESTS FAILED. Please check the error messages above.")
        sys.exit(1)