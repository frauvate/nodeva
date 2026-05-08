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

def generate_workflow_from_prompt(prompt: str) -> list:
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

    sys_prompt = """
    Return ONLY a valid JSON object with 'nodes' and 'edges' arrays. 
    Exactly 5 steps.
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
