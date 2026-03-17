import os
import google.generativeai as genai
import json

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

def generate_workflow_from_prompt(prompt: str) -> list:
    """Generates an initial set of nodes based on a natural language prompt."""
    if not GEMINI_API_KEY:
        # Development fallback
        return [
            {
                "id": "ai-node-1", 
                "type": "task", 
                "position": {"x": 100, "y": 100}, 
                "data": {"title": "AI Task Generated", "content": prompt, "color": "#E3F2FD"}
            }
        ]
        
    model = genai.GenerativeModel('gemini-1.5-pro')
    sys_prompt = """
    You are an AI assistant that generates a JSON array of nodes representing a visual workflow or task breakdown based on the user's prompt.
    Each node in the JSON array must follow this structure exactly:
    [
      {
        "id": "unique_string",
        "type": "task",
        "position": {"x": number, "y": number}, // Space them out reasonably
        "data": {
           "title": "Short title",
           "content": "Description",
           "color": "#E3F2FD" // pastel colors like #E3F2FD (blue), #E8F5E9 (green), #F3E5F5 (purple)
        }
      }
    ]
    Return ONLY a valid JSON array.
    """
    
    response = model.generate_content(
        f"{sys_prompt}\nUser Prompt: {prompt}"
    )
    
    text = response.text
    # Safely strip markdown formatting if any
    if text.startswith("```json"):
        text = text[7:-3]
    elif text.startswith("```"):
        text = text[3:-3]
        
    try:
        nodes = json.loads(text)
        return nodes if isinstance(nodes, list) else []
    except json.JSONDecodeError:
        print("Failed to decode JSON from AI response:", text)
        return []
