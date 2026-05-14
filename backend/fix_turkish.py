import json

DB_FILE = "mock_db.json"

def fix_string(s):
    if not isinstance(s, str):
        return s
    # Common double-encoding patterns for Turkish in UTF-8 -> Latin-1 -> UTF-8
    replacements = {
        "Ã§": "ç", "Ã‡": "Ç",
        "ÄŸ": "ğ", "Äž": "Ğ",
        "Ä±": "ı", "Ä°": "İ",
        "Ã¶": "ö", "Ã–": "Ö",
        "ÅŸ": "ş", "Åž": "Ş",
        "Ã¼": "ü", "Ãœ": "Ü"
    }
    for wrong, right in replacements.items():
        s = s.replace(wrong, right)
    return s

def fix_data(data):
    if isinstance(data, dict):
        return {k: fix_data(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [fix_data(i) for i in data]
    else:
        return fix_string(data)

try:
    with open(DB_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    fixed_data = fix_data(data)
    
    with open(DB_FILE, "w", encoding="utf-8") as f:
        json.dump(fixed_data, f, ensure_ascii=False, indent=2)
    
    print("Successfully fixed Turkish encoding patterns in mock_db.json")
except Exception as e:
    print(f"Error: {e}")
