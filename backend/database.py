import os
import json
from datetime import datetime

# ─── Supabase Client ────────────────────────────────────────────────────────
try:
    from supabase import create_client, Client as SupabaseClient
    _SUPABASE_URL = os.getenv("SUPABASE_URL", "")
    _SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY", "")
    supabase_client: SupabaseClient = create_client(_SUPABASE_URL, _SUPABASE_KEY)
    SUPABASE_AVAILABLE = True
except Exception as e:
    print(f"[WARNING] Supabase bağlantısı kurulamadı: {e}")
    supabase_client = None
    SUPABASE_AVAILABLE = False

# ─── Mock DB (boards için) ───────────────────────────────────────────────────
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


class DateTimeEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)


def save_data(data):
    with open(DB_FILE, "w") as f:
        json.dump(data, f, cls=DateTimeEncoder)


class MockCollection:
    def __init__(self, collection_name: str):
        self.coll = collection_name

    def _match(self, doc, query):
        if not query:
            return True
        for k, v in query.items():
            if k == "$or":
                if not any(self._match(doc, subq) for subq in v):
                    return False
                continue

            check_k = "id" if k == "_id" else k
            doc_val = str(doc.get(check_k)) if k == "_id" else doc.get(check_k)
            query_val = str(v) if k == "_id" else v

            if isinstance(v, dict) and "$in" in v:
                if doc_val not in v["$in"]:
                    return False
            else:
                if doc_val != query_val:
                    return False
        return True

    def find(self, query=None):
        data = get_data()
        items = data.get(self.coll, [])
        return [doc for doc in items if self._match(doc, query or {})]

    def find_one(self, query):
        data = get_data()
        items = data.get(self.coll, [])
        for doc in items:
            if self._match(doc, query):
                return doc
        return None

    def insert_one(self, doc):
        from bson import ObjectId
        if "id" not in doc:
            doc["id"] = str(ObjectId())
        data = get_data()
        if self.coll not in data:
            data[self.coll] = []
        data[self.coll].append(doc)
        save_data(data)
        class Result: inserted_id = doc["id"]
        return Result()

    def update_one(self, query, update):
        data = get_data()
        items = data.get(self.coll, [])
        for i, doc in enumerate(items):
            if self._match(doc, query):
                if "$set" in update:
                    items[i].update(update["$set"])
                if "$push" in update:
                    for pk, pv in update["$push"].items():
                        if pk not in items[i]: items[i][pk] = []
                        if isinstance(items[i][pk], list): items[i][pk].append(pv)
                save_data(data)
                class Result: matched_count = 1
                return Result()
        class Result: matched_count = 0
        return Result()

    def delete_one(self, query):
        data = get_data()
        items = data.get(self.coll, [])
        original_len = len(items)
        data[self.coll] = [doc for doc in items if not self._match(doc, query)]
        if len(data[self.coll]) < original_len:
            save_data(data)
            class Result: deleted_count = 1
            return Result()
        class Result: deleted_count = 0
        return Result()


# ─── Supabase Collection (teams & requests) ──────────────────────────────────

class SupabaseCollection:
    """
    teams ve team_requests tabloları için Supabase adaptörü.
    Supabase erişilemezse MockCollection'a düşer (fallback).
    """

    def __init__(self, table_name: str, fallback_name: str):
        self.table = table_name
        self._fallback = MockCollection(fallback_name)

    def _sb(self):
        return supabase_client.table(self.table) if SUPABASE_AVAILABLE and supabase_client else None

    # ── helpers ──────────────────────────────────────────────────────────────
    def _normalize(self, row: dict) -> dict:
        """Supabase satırını backend'in beklediği formata dönüştür."""
        if not row:
            return row
        row = dict(row)
        # id zaten uuid string
        # members: Supabase text[] → Python list
        if "members" in row and isinstance(row["members"], list):
            pass  # zaten liste
        elif "members" in row and row["members"] is None:
            row["members"] = []
        return row

    # ── find ─────────────────────────────────────────────────────────────────
    def find(self, query=None):
        sb = self._sb()
        if not sb:
            return self._fallback.find(query)
        try:
            req = supabase_client.table(self.table).select("*")
            if query:
                for k, v in query.items():
                    req = req.eq(k, v)
            res = req.execute()
            return [self._normalize(r) for r in (res.data or [])]
        except Exception as e:
            print(f"[Supabase find error on {self.table}]: {e}")
            return self._fallback.find(query)

    # ── find_one ─────────────────────────────────────────────────────────────
    def find_one(self, query: dict):
        sb = self._sb()
        if not sb:
            return self._fallback.find_one(query)
        try:
            req = supabase_client.table(self.table).select("*")
            for k, v in query.items():
                if k == "_id":
                    req = req.eq("id", str(v))
                else:
                    req = req.eq(k, v)
            res = req.limit(1).execute()
            if res.data:
                return self._normalize(res.data[0])
            return None
        except Exception as e:
            print(f"[Supabase find_one error on {self.table}]: {e}")
            return self._fallback.find_one(query)

    # ── insert_one ───────────────────────────────────────────────────────────
    def insert_one(self, doc: dict):
        sb = self._sb()
        if not sb:
            return self._fallback.insert_one(doc)
        try:
            # datetime nesnelerini string'e çevir
            clean = {}
            for k, v in doc.items():
                if k in ("_id", "id") and str(v) == "":
                    continue  # Supabase kendi id'sini üretir
                if isinstance(v, datetime):
                    clean[k] = v.isoformat()
                else:
                    clean[k] = v
            clean.pop("id", None)  # uuid üretimi Supabase'e bırak

            res = supabase_client.table(self.table).insert(clean).execute()
            if res.data:
                row = self._normalize(res.data[0])
                doc["id"] = row["id"]
                class Result:
                    inserted_id = row["id"]
                return Result()
            raise Exception("Insert returned no data")
        except Exception as e:
            print(f"[Supabase insert_one error on {self.table}]: {e}")
            return self._fallback.insert_one(doc)

    # ── update_one ───────────────────────────────────────────────────────────
    def update_one(self, query: dict, update: dict):
        sb = self._sb()
        if not sb:
            return self._fallback.update_one(query, update)
        try:
            patch = {}
            if "$set" in update:
                patch.update(update["$set"])
            if "$push" in update:
                # Önce mevcut satırı al, listeye ekle
                row = self.find_one(query)
                if row:
                    for pk, pv in update["$push"].items():
                        current = row.get(pk, []) or []
                        patch[pk] = current + [pv]

            req = supabase_client.table(self.table).update(patch)
            for k, v in query.items():
                if k == "_id":
                    req = req.eq("id", str(v))
                else:
                    req = req.eq(k, v)
            req.execute()
            class Result: matched_count = 1
            return Result()
        except Exception as e:
            print(f"[Supabase update_one error on {self.table}]: {e}")
            return self._fallback.update_one(query, update)

    # ── delete_one ───────────────────────────────────────────────────────────
    def delete_one(self, query: dict):
        sb = self._sb()
        if not sb:
            return self._fallback.delete_one(query)
        try:
            req = supabase_client.table(self.table).delete()
            for k, v in query.items():
                if k == "_id":
                    req = req.eq("id", str(v))
                else:
                    req = req.eq(k, v)
            res = req.execute()
            class Result: deleted_count = len(res.data or [])
            return Result()
        except Exception as e:
            print(f"[Supabase delete_one error on {self.table}]: {e}")
            return self._fallback.delete_one(query)


# ─── Collection instances ────────────────────────────────────────────────────
boards_collection   = MockCollection("boards")
teams_collection    = SupabaseCollection("teams", "teams")
requests_collection = SupabaseCollection("team_requests", "requests")
