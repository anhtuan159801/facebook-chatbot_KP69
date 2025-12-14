from crwal import EnhancedProcedureScraper
s = EnhancedProcedureScraper()

# Test various problematic names that might cause WinError 123
test_names = [
    '1.012656',
    '1.012662',
    'TTHC-415300',
    'Some name with <invalid> chars',
    'CON',  # Windows reserved name
    'LPT1',
    'AUX',
    'name with spaces and . dots',
    'very_long_procedure_name_that_might_exceed_windows_limit_considering_file_extensions.doc'
]

for name in test_names:
    sanitized = s._sanitize_filename(name)
    print(f'Original: {name} -> Sanitized: {sanitized}')