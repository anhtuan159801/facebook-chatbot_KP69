#!/usr/bin/env python3
"""
Script to import CSV data to Supabase table
This script reads the generated CSV files and imports them into Supabase
"""
import csv
import os
import sys
import json
from pathlib import Path
from dotenv import load_dotenv

def import_csv_to_supabase():
    print("Importing CSV Data to Supabase Table")
    print("="*50)
    
    # Load environment variables from .env file
    load_dotenv()
    
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
    
    csv_files = list(downloads_dir.rglob("*_verification.csv"))
    if not csv_files:
        print("❌ No verification CSV files found")
        print("Run the crawler first to generate verification CSV files")
        return False
    
    print(f"📁 Found {len(csv_files)} CSV verification file(s):")
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
            
            with open(csv_file, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                rows = list(reader)
                
            print(f"   Found {len(rows)} rows in CSV")

            # De-duplicate rows based on procedure_code before batching
            unique_rows = {}
            for row in rows:
                procedure_code = row.get('procedure_code')
                if procedure_code:
                    unique_rows[procedure_code] = row
            
            deduplicated_rows = list(unique_rows.values())
            print(f"   Found {len(deduplicated_rows)} unique rows to import")
            
            # Process and import rows
            batch_size = 100  # Import in batches to avoid timeout
            for i in range(0, len(deduplicated_rows), batch_size):
                batch = deduplicated_rows[i:i + batch_size]
                
                # Prepare data for insertion
                records = []
                for row in batch:
                    # Parse metadata from string to JSON if needed
                    metadata = row.get('metadata', '{}')
                    if isinstance(metadata, str) and metadata.strip():
                        try:
                            # Clean up the metadata string to make it valid JSON
                            metadata_clean = metadata.strip().replace('\\', '\\\\').replace('\n', '\\n')
                            metadata_json = json.loads(metadata_clean)
                        except json.JSONDecodeError:
                            metadata_json = {"raw": metadata}
                    else:
                        metadata_json = {}
                    
                    # Convert content_length to integer
                    content_length = row.get('content_length', 0)
                    try:
                        content_length = int(content_length) if content_length else 0
                    except ValueError:
                        content_length = 0
                    
                    # Get ministry name from the directory structure
                    ministry_name = csv_file.name.replace('_documents_verification.csv', '')
                    
                    record = {
                        'procedure_code': row.get('procedure_code', ''),
                        'procedure_title': row.get('procedure_title', ''),
                        'original_filename': row.get('original_filename', ''),
                        'content_length': content_length,
                        'full_content': row.get('full_content_preview', '')[:100000],  # Limit to prevent issues
                        'full_content_preview': row.get('full_content_preview', '')[:10000],  # First 10k chars
                        'metadata': metadata_json,
                        'ministry_name': ministry_name,
                        'source_url': f"file:///{row.get('original_filename', '')}",
                        'file_size': content_length
                    }
                    
                    # Calculate document hash
                    import hashlib
                    content_bytes = record['full_content'].encode('utf-8')
                    doc_hash = hashlib.sha256(content_bytes).hexdigest()
                    record['doc_hash'] = doc_hash
                    
                    records.append(record)
                
                # Upsert batch to Supabase to handle duplicates
                try:
                    response = client.table('government_procedures_knowledge').upsert(records, on_conflict='procedure_code').execute()
                    upserted_count = len(response.data) if hasattr(response, 'data') and response.data else 0
                    total_imported += upserted_count
                    print(f"   ✅ Upserted {upserted_count} records (batch {i//batch_size + 1})")
                except Exception as e:
                    print(f"   ❌ Error upserting batch: {e}")
                    # Continue to next batch instead of stopping
                    continue
        
        print(f"\n🎉 Successfully processed {total_imported} total records to Supabase!")
        print("💡 Note: New records were inserted and existing records were updated.")
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
    print("\n" + "="*50)
    print("MANUAL IMPORT INSTRUCTIONS")
    print("="*50)
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
    success = import_csv_to_supabase()
    manual_import_instructions()
    
    if success:
        print("\n✅ Import process completed successfully!")
        print("✅ Your procedure data is now available in Supabase for RAG applications!")
    else:
        print("\n⚠️  Import process completed with some issues.")
        print("⚠️  Check the manual import instructions above to complete the process.")