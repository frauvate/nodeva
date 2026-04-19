import os
import json

# Minimal mock for boards_collection using a local JSON file
DB_FILE = "mock_db.json"

def get_data():
    if not os.path.exists(DB_FILE):
        return {"boards": []}
    try:
        with open(DB_FILE, "r") as f:
            content = f.read().strip()
            if not content:
                return {"boards": []}
            return json.loads(content)
    except (json.JSONDecodeError, IOError):
        return {"boards": []}

from datetime import datetime

class DateTimeEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)

def save_data(data):
    with open(DB_FILE, "w") as f:
        json.dump(data, f, cls=DateTimeEncoder)

class MockCollection:
    def find(self, query):
        data = get_data()
        user_id = query.get("user_id")
        return [b for b in data["boards"] if b.get("user_id") == user_id]

    def find_one(self, query):
        data = get_data()
        board_id = str(query.get("_id") or query.get("id"))
        user_id = query.get("user_id")
        
        for b in data["boards"]:
            if (b.get("id") == board_id or b.get("_id") == board_id) and b.get("user_id") == user_id:
                return b
        return None

    def insert_one(self, doc):
        from bson import ObjectId
        # Ensure it has an id if not present
        if "id" not in doc:
            doc["id"] = str(ObjectId())
        data = get_data()
        data["boards"].append(doc)
        save_data(data)
        class Result: inserted_id = doc["id"]
        return Result()

    def update_one(self, query, update):
        data = get_data()
        board_id = str(query.get("_id") or query.get("id"))
        user_id = query.get("user_id")
        
        for i, b in enumerate(data["boards"]):
            if (b.get("id") == board_id or b.get("_id") == board_id) and b.get("user_id") == user_id:
                if "$set" in update:
                    data["boards"][i].update(update["$set"])
                save_data(data)
                class Result: matched_count = 1
                return Result()
        class Result: matched_count = 0
        return Result()

    def delete_one(self, query):
        data = get_data()
        board_id = str(query.get("_id") or query.get("id"))
        user_id = query.get("user_id")
        
        original_len = len(data["boards"])
        data["boards"] = [b for b in data["boards"] if not ((b.get("id") == board_id or b.get("_id") == board_id) and b.get("user_id") == user_id)]
        
        if len(data["boards"]) < original_len:
            save_data(data)
            class Result: deleted_count = 1
            return Result()
        class Result: deleted_count = 0
        return Result()

boards_collection = MockCollection()
