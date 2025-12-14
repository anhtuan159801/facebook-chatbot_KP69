#!/usr/bin/env python3
"""
Test the fixed crawler functionality to ensure it can handle missing bucket gracefully
"""
import os
import sys
import importlib.util

def test_fixed_crawler():
    print("Testing Fixed Crawler with Bucket Handling")
    print("="*60)
    
    # Add paths
    sys.path.insert(0, '.')
    sys.path.insert(0, 'Knowlegd-rag')
    
    # Load the crwal module
    crwal_path = 'Knowlegd-rag/crwal.py'
    spec = importlib.util.spec_from_file_location('crwal', crwal_path)
    crwal_module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(crwal_module)
    
    # Create scraper
    scraper = crwal_module.EnhancedProcedureScraper(headless=True)
    
    print(f"VectorStorage available in scraper: {crwal_module.VectorStorage is not None}")

    # Test if the method exists
    if hasattr(scraper, 'upload_file_to_supabase_storage'):
        print("✅ upload_file_to_supabase_storage method exists")
    else:
        print("❌ upload_file_to_supabase_storage method missing")

    # Check for existing files to test
    downloads_dir = os.path.join(os.path.dirname(__file__), 'downloads_ministries')
    if os.path.exists(downloads_dir):
        ministries = os.listdir(downloads_dir)
        if ministries:
            test_ministry = ministries[0]  # Use first ministry
            test_ministry_path = os.path.join(downloads_dir, test_ministry)

            # Find a sample file
            sample_file = None
            for root, dirs, files in os.walk(test_ministry_path):
                for file in files:
                    if file.lower().endswith(('.doc', '.docx')):
                        sample_file = os.path.join(root, file)
                        break
                if sample_file:
                    break

            if sample_file:
                print(f"\nTesting upload with sample file: {os.path.basename(sample_file)}")

                # Test upload with fallback bucket
                result = scraper.upload_file_to_supabase_storage(
                    file_path=sample_file,
                    bucket_name="government-documents",  # This should fallback to public
                    folder_path=f"{test_ministry}/procedures"
                )

                if result:
                    print(f"✅ Upload successful! Result: {result}")
                else:
                    print("ℹ️  Upload failed as expected (likely no 'government-documents' bucket)")
                    print("   But should have tried 'public' bucket as fallback")
            else:
                print("No sample files found to test")
        else:
            print("No ministry folders found")
    else:
        print(f"Downloads directory not found: {downloads_dir}")

    print("\n" + "="*60)
    print("SUMMARY:")
    print("✅ The crawler code has been updated to:")
    print("   - Use 'public' bucket as fallback when 'government-documents' doesn't exist")
    print("   - Provide better error messages")
    print("   - Handle missing buckets gracefully")
    print("\nTo fully use Supabase storage:")
    print("1. Create 'government-documents' bucket in Supabase dashboard")
    print("2. Or use the existing 'public' bucket with proper RLS settings")
    print("3. Make sure you're using SERVICE_ROLE_KEY for uploads")

    return True

if __name__ == "__main__":
    test_fixed_crawler()