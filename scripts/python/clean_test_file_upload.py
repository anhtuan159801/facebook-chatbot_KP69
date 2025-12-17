#!/usr/bin/env python3
"""
Test script to specifically check Supabase file upload functionality
"""
import os
import sys
import importlib.util
import tempfile
from pathlib import Path

def test_actual_file_upload():
    print("Testing Supabase File Upload with Existing Files")
    print("="*60)
    
    # Import the crawler
    crwal_path = os.path.join(os.path.dirname(__file__), 'Knowlegd-rag', 'crwal.py')
    spec = importlib.util.spec_from_file_location("crwal", crwal_path)
    crwal_module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(crwal_module)
    EnhancedProcedureScraper = crwal_module.EnhancedProcedureScraper
    
    # Create scraper instance
    scraper = EnhancedProcedureScraper(headless=True)
    
    # Look for downloaded ministry folders
    downloads_dir = os.path.join(os.path.dirname(__file__), 'downloads_ministries')
    
    if not os.path.exists(downloads_dir):
        print("No directory found: {downloads_dir}")
        return False
    
    # Find a ministry folder with files
    ministries = os.listdir(downloads_dir)
    ministry_with_files = None
    sample_file = None
    
    for ministry in ministries:
        ministry_path = os.path.join(downloads_dir, ministry)
        if os.path.isdir(ministry_path):
            # Look for .doc or .docx files
            for root, dirs, files in os.walk(ministry_path):
                for file in files:
                    if file.lower().endswith(('.doc', '.docx')):
                        ministry_with_files = ministry
                        sample_file = os.path.join(root, file)
                        break
                if sample_file:
                    break
        if sample_file:
            break
    
    if not sample_file:
        print("No .doc/.docx files found to test upload")
        return False
    
    print(f"Found ministry: {ministry_with_files}")
    print(f"Sample file: {sample_file}")
    print(f"File size: {os.path.getsize(sample_file)} bytes")
    
    # Test direct file upload
    print("\nTesting direct file upload to Supabase storage...")
    try:
        public_url = scraper.upload_file_to_supabase_storage(
            file_path=sample_file,
            bucket_name="government-documents",
            folder_path=f"{ministry_with_files}/procedures"
        )
        
        if public_url:
            print(f"Upload successful!")
            print(f"Public URL: {public_url}")
            return True
        else:
            print("Upload failed or returned no URL")
            return False
            
    except Exception as e:
        print(f"Upload test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_storage_functionality():
    print("\n" + "="*60)
    print("Testing Full Storage Functionality")
    print("="*60)
    
    # Import the crawler
    crwal_path = os.path.join(os.path.dirname(__file__), 'Knowlegd-rag', 'crwal.py')
    spec = importlib.util.spec_from_file_location("crwal", crwal_path)
    crwal_module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(crwal_module)
    EnhancedProcedureScraper = crwal_module.EnhancedProcedureScraper
    
    # Create scraper instance
    scraper = EnhancedProcedureScraper(headless=True)
    
    # Find ministry directory
    downloads_dir = os.path.join(os.path.dirname(__file__), 'downloads_ministries')
    ministries = os.listdir(downloads_dir)
    
    if not ministries:
        print("No ministry folders found")
        return False
    
    # Use the first ministry for testing
    test_ministry = ministries[0]
    print(f"Testing with ministry: {test_ministry}")
    
    # Count files
    test_ministry_path = os.path.join(downloads_dir, test_ministry)
    doc_files = []
    for root, dirs, files in os.walk(test_ministry_path):
        for file in files:
            if file.lower().endswith(('.doc', '.docx')):
                doc_files.append(os.path.join(root, file))
    
    print(f"Found {len(doc_files)} files to process")
    
    if len(doc_files) == 0:
        print("No files to process")
        return False
    
    # Test the storage method (this will attempt to upload files)
    print(f"\nTesting store_documents_with_embeddings_and_file_storage...")
    try:
        result = scraper.store_documents_with_embeddings_and_file_storage(
            ministry_name=test_ministry,
            source_url="https://test.example.com"
        )
        
        print(f"Storage operation result: {result}")
        if result:
            print("Storage operation completed successfully")
            return True
        else:
            print("Storage operation failed")
            return False
            
    except Exception as e:
        print(f"Storage operation failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    print("Supabase File Upload Test")
    print("="*60)
    
    # Set environment for UTF-8
    os.environ['PYTHONIOENCODING'] = 'utf-8'
    
    # Test 1: Direct file upload
    success1 = test_actual_file_upload()
    
    # Test 2: Full storage functionality
    success2 = test_storage_functionality()
    
    print("\n" + "="*60)
    print("SUMMARY")
    print("="*60)
    print(f"Direct upload test: {'PASSED' if success1 else 'FAILED'}")
    print(f"Full storage test:  {'PASSED' if success2 else 'FAILED'}")
    
    if success1 and success2:
        print("\nAll tests passed! Files should be uploading to Supabase.")
        print("\nCheck your Supabase dashboard:")
        print("- Storage: Check the 'government-documents' bucket")
        print("- Database: Check the 'government_procedures_knowledge' table")
        return True
    else:
        print("\nSome tests failed. Please check the error messages above.")
        return False

if __name__ == "__main__":
    success = main()
    if not success:
        sys.exit(1)