import sys
import os
from dotenv import load_dotenv

load_dotenv()

try:
    from services.ai import generate_workflow_from_prompt
    
    print("Testing generate_workflow_from_prompt...")
    nodes = generate_workflow_from_prompt("Create a login process")
    print("Success. Nodes:", nodes)
except Exception as e:
    import traceback
    traceback.print_exc()
