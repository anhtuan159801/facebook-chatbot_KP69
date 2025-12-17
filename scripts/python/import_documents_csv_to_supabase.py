#!/usr/bin/env python3
"""
Script to import ONLY the documents_verification CSV data to Supabase table
This script specifically processes the documents verification CSV which contains 
unique procedure records (not chunks) to avoid duplicate key conflicts
"""
import csv
import os
import sys
import json
from pathlib import Path

def import_documents_csv_to_supabase():
    print("Importing Documents CSV Data to Supabase Table")
    print("="*60)
    
    # Check for required environment variables
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_KEY")
    
    if not supabase_url or not supabase_key:
        print("❌ Error: SUPABASE_URL and SUPABASE_KEY environment variables are required")
        print("Please set them in your .env file")
        return False
    
    # Find CSV files in downloads_ministries directory
    downloads_dir = Path("downloads_ministries")
    if not downloads_dir.exists():
        print(f"❌ Directory {downloads_dir} does not exist")
        return False
    
    # Only import the documents_verification.csv files (not chunks), which have unique procedure codes
    csv_files = list(downloads_dir.rglob("*_documents_verification.csv"))
    if not csv_files:
        print("❌ No documents verification CSV files found")
        print("Run the crawler first to generate verification CSV files")
        print("Looking for files ending with '_documents_verification.csv'")
        return False
    
    print(f"📁 Found {len(csv_files)} documents verification file(s):")
    for csv_file in csv_files:
        print(f"   - {csv_file.name}")
    
    # Try to import the CSV files to Supabase
    try:
        import supabase
        from supabase import create_client
        client = create_client(supabase_url, supabase_key)
        
        print("\n✅ Connected to Supabase successfully")
        
        # Process each CSV file
        total_imported = 0
        for csv_file in csv_files:
            print(f"\n📊 Processing: {csv_file.name}")
            
            with open(csv_file, 'r', encoding='utf-8-sig') as f:  # Use utf-8-sig for better encoding
                reader = csv.DictReader(f)
                rows = list(reader)
                
            print(f"   Found {len(rows)} rows to import")
            
            # Import rows one by one to avoid duplicates issue in batch
            successful_imports = 0
            for i, row in enumerate(rows):
                try:
                    # Parse metadata from string to JSON if needed
                    metadata_str = row.get('metadata', '{}')
                    if isinstance(metadata_str, str) and metadata_str.strip():
                        try:
                            # Clean up the metadata string to make it valid JSON
                            # Replace problematic characters
                            metadata_clean = metadata_str.strip().replace('\n', '\\n').replace('\r', '\\r').replace('\t', '\\t').replace('"', "'")
                            metadata_json = json.loads(metadata_clean)
                        except json.JSONDecodeError:
                            # If JSON parsing fails, store it as a raw string in json object
                            metadata_json = {"raw": metadata_str}
                    else:
                        metadata_json = {}
                    
                    # Convert content_length to integer
                    content_length_str = row.get('content_length', '0')
                    try:
                        content_length = int(content_length_str) if content_length_str.strip() else 0
                    except ValueError:
                        content_length = 0
                    
                    # Get ministry name from the CSV filename
                    ministry_name = csv_file.name.replace('_documents_verification.csv', '').replace('_', ' ')
                    
                    # Get content
                    full_content = row.get('full_content_preview', '')
                    
                    record = {
                        'procedure_code': row.get('procedure_code', ''),
                        'procedure_title': row.get('procedure_title', ''),
                        'original_filename': row.get('original_filename', ''),
                        'content_length': content_length,
                        'full_content': full_content,
                        'full_content_preview': full_content[:10000] if full_content else '',  # First 10k chars for preview
                        'metadata': metadata_json,
                        'ministry_name': ministry_name,
                        'source_url': f"file:///{row.get('original_filename', '')}",
                    }
                    
                    # Calculate document hash to avoid duplicates
                    import hashlib
                    content_bytes = full_content.encode('utf-8') if full_content else b''
                    doc_hash = hashlib.sha256(content_bytes).hexdigest() if content_bytes else ''
                    record['doc_hash'] = doc_hash
                    record['file_size'] = content_length
                    
                    # Try to insert the record (use upsert/insert to handle duplicates)
                    try:
                        response = client.table('government_procedures_knowledge').insert(record).execute()
                        successful_imports += 1
                        if successful_imports % 20 == 0:  # Print progress every 20 records
                            print(f"   ✅ {successful_imports} records imported from {csv_file.name}")
                    except Exception as insert_error:
                        error_msg = str(insert_error).lower()
                        # Handle specific errors
                        if "duplicate key value violates unique constraint" in error_msg:
                            # Skip duplicate entries based on doc_hash or procedure_code
                            continue
                        elif "invalid input syntax for type json" in error_msg:
                            # Handle JSON parsing errors by storing raw metadata
                            record['metadata'] = {"raw": metadata_str}
                            # Retry insert with raw metadata
                            response = client.table('government_procedures_knowledge').insert(record).execute()
                            successful_imports += 1
                        elif "on conflict do update command cannot affect row a second time" in error_msg:
                            # This shouldn't happen when inserting one by one, but just in case
                            continue
                        else:
                            print(f"   ⚠️  Error importing record {i+1}: {insert_error}")
                            continue
                        
                except Exception as e:
                    print(f"   ⚠️  Error processing row {i+1}: {e}")
                    continue
            
            total_imported += successful_imports
            print(f"   ✅ Successfully imported {successful_imports} records from {csv_file.name}")
        
        print(f"\n🎉 Successfully imported {total_imported} total records to Supabase!")
        print("💡 Note: Duplicates were automatically handled and skipped")
        return True
        
    except ImportError:
        print("❌ Supabase library not installed")
        print("Run: pip install supabase")
        return False
    except Exception as e:
        print(f"❌ Error importing data to Supabase: {e}")
        import traceback
        traceback.print_exc()
        return False

def manual_import_instructions():
    """
    Provide instructions for manual CSV import via Supabase dashboard
    """
    print("\n" + "="*60)
    print("MANUAL IMPORT INSTRUCTIONS")
    print("="*60)
    print("\nIf the automatic import doesn't work, you can manually import via Supabase dashboard:")
    print("1. Go to your Supabase dashboard -> Database -> Tables")
    print("2. Find the 'government_procedures_knowledge' table")
    print("3. Click 'Import/Export' tab")
    print("4. Upload your CSV file (e.g., Bộ Dân tộc và Tôn giáo_documents_verification.csv)")
    print("5. Make sure column mapping is correct:")
    print("   - procedure_code → procedure_code")
    print("   - procedure_title → procedure_title")
    print("   - original_filename → original_filename")
    print("   - content_length → content_length")
    print("   - full_content_preview → full_content_preview")
    print("   - metadata → metadata (as JSON)")
    print("\n💡 Pro tip: Clean the metadata column in your CSV to make it valid JSON if needed")

if __name__ == "__main__":
    success = import_documents_csv_to_supabase()
    manual_import_instructions()
    
    if success:
        print("\n✅ Import process completed successfully!")
        print("✅ Your procedure data is now available in Supabase for RAG applications!")
    else:
        print("\n⚠️  Import process completed with some issues.")
        print("⚠️  Check the manual import instructions above to complete the process.")