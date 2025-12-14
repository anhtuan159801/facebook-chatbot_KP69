import importlib.util
import sys
import os

try:
    # Add the current directory and Knowlegd-rag to path
    sys.path.insert(0, '.')
    sys.path.insert(0, 'Knowlegd-rag')

    # Load the crwal module
    crwal_path = 'Knowlegd-rag/crwal.py'
    spec = importlib.util.spec_from_file_location('crwal', crwal_path)
    crwal_module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(crwal_module)

    # Check if VectorStorage is available
    print(f'VectorStorage available: {crwal_module.VectorStorage is not None}')
    if crwal_module.VectorStorage is not None:
        print('VectorStorage imported successfully')
    else:
        print('VectorStorage is None - may not be found')

    # Check clean_vector_storage.py path
    vector_path = os.path.join('Knowlegd-rag', 'clean_vector_storage.py')
    print(f'clean_vector_storage.py exists: {os.path.exists(vector_path)}')
    
    # Also try to import the vector storage directly
    try:
        vector_spec = importlib.util.spec_from_file_location("clean_vector_storage", vector_path)
        vector_module = importlib.util.module_from_spec(vector_spec)
        vector_spec.loader.exec_module(vector_module)
        has_vector_storage = hasattr(vector_module, "VectorStorage")
        print(f'VectorStorage in vector module: {has_vector_storage}')
    except Exception as e:
        print(f'Error importing vector storage directly: {e}')

except Exception as e:
    print(f'Error in script: {e}')
    import traceback
    traceback.print_exc()