import urllib.request
import urllib.error
import json

req = urllib.request.Request(
    'http://localhost:8001/boards/69c12cabebf51afaf8cae514/generate_ai',
    data=json.dumps({"prompt": "web sitesi geliştirmesi"}).encode('utf-8'),
    headers={'Authorization': 'Bearer mock-jwt-token-123', 'Content-Type': 'application/json'},
    method='POST'
)
try:
    print(urllib.request.urlopen(req).read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print(f"HTTP {e.code}")
    print(e.read().decode('utf-8'))
