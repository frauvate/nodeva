import os
import time
import threading
import json
from google import genai
from dotenv import load_dotenv

# .env dosyasını zorla yükle (sistem değişkenlerini ez)
load_dotenv(override=True)

# ── Rate Limiter ─────────────────────────────────────────────────────
class RateLimiter:
    def __init__(self, max_per_minute: int = 3, max_per_day: int = 15):
        self.max_per_minute = max_per_minute
        self.max_per_day = max_per_day
        self.requests: list[float] = []
        self.lock = threading.Lock()

    def _cleanup(self):
        now = time.time()
        self.requests = [t for t in self.requests if now - t < 86400]

    def check(self) -> tuple[bool, str]:
        with self.lock:
            self._cleanup()
            now = time.time()
            recent_minute = [t for t in self.requests if now - t < 60]
            if len(recent_minute) >= self.max_per_minute:
                wait = int(60 - (now - recent_minute[0]))
                return False, f"Dakikalık limit aşıldı. {wait} saniye sonra tekrar deneyin."
            if len(self.requests) >= self.max_per_day:
                return False, "Günlük AI istek limiti doldu."
            return True, ""

    def record(self):
        with self.lock:
            self.requests.append(time.time())

    def get_usage(self) -> dict:
        with self.lock:
            self._cleanup()
            now = time.time()
            minute_count = len([t for t in self.requests if now - t < 60])
            day_count = len(self.requests)
            return {"minute": f"{minute_count}/{self.max_per_minute}", "day": f"{day_count}/{self.max_per_day}"}

rate_limiter = RateLimiter()

def generate_workflow_from_prompt(prompt: str, template: str = "basic") -> list:
    # Anahtarı her seferinde en güncel haliyle çek ve temizle
    load_dotenv(override=True)
    key = os.getenv("GEMINI_API_KEY", "").replace('"', '').replace("'", "").strip()
    
    if not key:
        return [{"id": "err", "type": "task", "position": {"x": 100, "y": 100}, "data": {"title": "Hata", "content": "API Key bulunamadı!", "color": "#FFCDD2"}}], []

    # Client'ı her istekte taze oluştur
    client = genai.Client(api_key=key)

    allowed, reason = rate_limiter.check()
    if not allowed:
        return [{"id": "rate-limit", "type": "task", "position": {"x": 100, "y": 100}, "data": {"title": "⏳ Limit", "content": reason, "color": "#FFF9C4"}}], []

    if template == "flowchart":
        sys_prompt = """
        You are an expert flowchart generator. Return ONLY a valid JSON object.
        Structure: {"nodes": [...], "edges": [...]}
        Available node types: 
        - 'flow_start': Start point (one per flow)
        - 'flow_process': Standard processing step
        - 'flow_decision': Decision point (Diamond shape)
        - 'flow_data': Data input/output (Parallelogram)
        - 'flow_end': End point
        
        Rules:
        1. Connect nodes with edges using 'id', 'source', and 'target'.
        2. Assign positions (x, y) starting from (100, 100) and moving downwards/right.
        3. Use max 8-10 nodes.
        4. Node data should have 'title', 'content', and 'color'.
        """
    elif template == "mindmap":
        sys_prompt = """
        You are an expert mind map generator. Return ONLY a valid JSON object.
        Structure: {"nodes": [...], "edges": [...]}
        Available node types:
        - 'mindmap_root': Center topic / root concept (exactly one node)
        - 'mindmap_main': Main branches connecting to the root
        - 'mindmap_sub': Subtopics connecting to main branches
        
        Rules:
        1. Build a branching mind map hierarchy. Connect nodes with edges.
        2. Create 1 'mindmap_root' at the center (e.g., x=400, y=300).
        3. Create 3-4 'mindmap_main' nodes surrounding the root and connect them to the root.
        4. Create 1-2 'mindmap_sub' nodes for each main node, connecting them to their respective 'mindmap_main' node.
        5. Position the nodes in a radial branching tree structure.
        6. Node data should have 'title' and 'color'.
        """
    elif template == "kanban":
        sys_prompt = """
        You are an expert Kanban board generator. Return ONLY a valid JSON object with 'nodes' and 'edges' arrays.
        All nodes must be of type 'task'.
        Edges array must be empty [].
        
        Rules:
        1. Generate 4-5 task nodes representing steps of the requested work.
        2. Distribute the tasks across Kanban columns by setting 'status' inside 'data'.
           - 'status' MUST be one of: 'todo', 'in_progress', 'done'.
           - Distribute them logically (most in 'todo' or 'in_progress', maybe one in 'done').
        3. Node data should have 'title', 'content', 'status', 'color', and 'assignee' (empty string).
        4. Set dummy positions (x, y) starting from (50, 50).
        """
    elif template == "timeline":
        sys_prompt = """
        You are an expert project timeline and Gantt chart generator. Return ONLY a valid JSON object with 'nodes' and 'edges' arrays.
        All nodes must be of type 'task'.
        Edges array must be empty [].
        
        Rules:
        1. Generate 4-5 sequential tasks for the project described.
        2. Node data must include:
           - 'title': Task name.
           - 'content': Brief description.
           - 'startDate': Target start date in "YYYY-MM-DD" format. (Use June 2026, e.g. between "2026-06-01" and "2026-06-30").
           - 'endDate': Target end date in "YYYY-MM-DD" format. (Must be equal to or after startDate).
           - 'progress': An integer progress percentage between 0 and 100.
           - 'color': Harmonious color (e.g., "var(--node-blue)", "var(--node-green)", "var(--node-orange)", "var(--node-pink)").
        3. Tasks should follow a logical chronological order.
        4. Set dummy positions (x, y) starting from (50, 50).
        """
    else:
        sys_prompt = """
        Return ONLY a valid JSON object with 'nodes' and 'edges' arrays.
        Types: 'task' (with status: 'todo') or 'note'.
        Max 6-8 items.
        Structure: {"nodes": [...], "edges": [...]}
        """
    
    try:
        response = client.models.generate_content(
            model="gemini-3.1-flash-lite",
            contents=f"{sys_prompt}\nUser Prompt: {prompt}",
        )
        text = response.text
        rate_limiter.record()
    except Exception as e:
        error_msg = str(e)
        print(f"[AI ERROR DEBUG]: Key starts with '{key[:5]}...', Error: {error_msg}")
        if "429" in error_msg or "quota" in error_msg.lower():
             return [{"id": "err", "type": "task", "position": {"x": 100, "y": 100}, "data": {"title": "Quota", "content": "Kota doldu.", "color": "#FFCDD2"}}], []
        return [{"id": "err", "type": "task", "position": {"x": 100, "y": 100}, "data": {"title": "Error", "content": error_msg, "color": "#FFCDD2"}}], []
        
    if text.startswith("```json"): text = text[7:-3]
    elif text.startswith("```"): text = text[3:-3]
        
    try:
        data = json.loads(text)
        return data.get("nodes", []), data.get("edges", [])
    except:
        return [], []
