import json

DB_FILE = "mock_db.json"

try:
    with open(DB_FILE, "rb") as f:
        bytes_content = f.read()
    
    # The file is currently UTF-8 encoded, but contains characters that are 
    # the result of reading UTF-8 bytes as Latin-1.
    # To fix: 
    # 1. Decode as UTF-8 to get the "wrong" string.
    # 2. Encode that string as Latin-1 to get the original UTF-8 bytes.
    # 3. Decode those bytes as UTF-8 to get the correct string.
    
    wrong_str = bytes_content.decode("utf-8")
    original_utf8_bytes = wrong_str.encode("latin-1")
    correct_str = original_utf8_bytes.decode("utf-8")
    
    # Try parsing to make sure it's valid JSON
    data = json.loads(correct_str)
    
    with open(DB_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print("Successfully fixed encoding in mock_db.json")
except Exception as e:
    print(f"Error: {e}")
    # If the above fails, it might be already partially correct or have other issues.
    # Let's try a safer approach for each string if needed.
