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
        
    model = genai.GenerativeModel('gemini-2.5-flash')
    sys_prompt = """
    You are an AI assistant that generates a JSON object representing a visual workflow or task breakdown based on the user's prompt.
    The user wants exactly 5 steps, formatted as task nodes, connected in order.
    Return ONLY a valid JSON object with 'nodes' and 'edges' arrays.
    Structure:
    {
      "nodes": [
        {
          "id": "unique_string",
          "type": "task",
          "position": {"x": number, "y": number}, // Space them out reasonably, e.g., x increasing by 300
          "data": {
             "title": "Short title",
             "content": "Description",
             "color": "#E3F2FD" // pastel colors like #E3F2FD (blue), #E8F5E9 (green), #F3E5F5 (purple)
          }
        }
      ],
      "edges": [
        {
          "id": "unique_edge_id",
          "source": "source_node_id",
          "target": "target_node_id"
        }
      ]
    }
    """
    
    try:
        response = model.generate_content(
            f"{sys_prompt}\nUser Prompt: {prompt}"
        )
        text = response.text
    except Exception as e:
        return [{"id": "error-1", "type": "task", "position": {"x": 100, "y": 100}, "data": {"title": "Error", "content": str(e), "color": "#FFCDD2"}}], []
        
    # Safely strip markdown formatting if any
    if text.startswith("```json"):
        text = text[7:-3]
    elif text.startswith("```"):
        text = text[3:-3]
        
    try:
        data = json.loads(text)
        if isinstance(data, dict):
            return data.get("nodes", []), data.get("edges", [])
        elif isinstance(data, list):
            # Fallback if AI still returns just a list of nodes
            return data, []
        return [], []
    except json.JSONDecodeError:
        print("Failed to decode JSON from AI response:", text)
        return [], []
