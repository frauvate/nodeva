import json
import os

DB_FILE = "mock_db.json"

def get_data():
    with open(DB_FILE, "r") as f:
        return json.load(f)

def _match(doc, query):
    if not query:
        return True
    for k, v in query.items():
        if k == "$or":
            if not any(_match(doc, subq) for subq in v):
                return False
            continue

        check_k = "id" if k == "_id" else k
        doc_val = doc.get(check_k)
        query_val = v

        if isinstance(v, dict) and "$in" in v:
            if doc_val not in v["$in"]:
                return False
        else:
            if isinstance(doc_val, list):
                if query_val not in doc_val:
                    return False
            elif doc_val != query_val:
                return False
    return True

user_id = "434a8d1c-a4e1-47a8-a8c6-00116166aebb"
user_email = "esmaasyldrm@gmail.com"
my_team_ids = [] # assuming empty for now

query = {
    "$or": [
        {"user_id": user_id},
        {"nodes.data.assignee": user_email}
    ]
}

data = get_data()
boards = data.get("boards", [])
matched = [b for b in boards if _match(b, query)]

print(f"Total boards: {len(boards)}")
print(f"Query: {query}")
print(f"Matched count: {len(matched)}")
for m in matched:
    print(f" - Found board: {m.get('title')} (ID: {m.get('id')})")

# Test without dot notation
query_simple = {"user_id": user_id}
matched_simple = [b for b in boards if _match(b, query_simple)]
print(f"\nSimple Query: {query_simple}")
print(f"Matched count: {len(matched_simple)}")
