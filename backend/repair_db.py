import json

DB_FILE = "mock_db.json"

try:
    with open(DB_FILE, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Try to find the first valid JSON end
    # We know it starts with { and ends with }
    # Let's find the last } that allows parsing
    
    for i in range(len(content), 0, -1):
        if content[i-1] == '}':
            candidate = content[:i]
            try:
                json.loads(candidate)
                print(f"Found valid JSON at length {i}")
                with open(DB_FILE, "w", encoding="utf-8") as f:
                    f.write(candidate)
                print("Successfully repaired mock_db.json")
                exit(0)
            except:
                continue
    print("Could not find valid JSON prefix")
    exit(1)
except Exception as e:
    print(f"Error: {e}")
    exit(1)
