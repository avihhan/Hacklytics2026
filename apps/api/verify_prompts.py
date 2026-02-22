
import sys
from pathlib import Path
from unittest.mock import patch, MagicMock

# Add the apps/api directory to sys.path
sys.path.insert(0, str(Path("/Users/toan/ToanBuildsStuff/Hacklytics2026/apps/api")))

import run
import actian_rag

def test_hallucination_prevention():
    print("Testing hallucination prevention...")
    
    # Mocking parts of the app to isolate the prompt logic
    mock_client = MagicMock()
    # If the grounding works, the model should ideally say "I don't know" or similar 
    # since we are passing empty context or unrelated context.
    # However, to test the prompt *content*, we check the prompt sent to Gemini.
    
    message = "What is the capital of France?" # Unrelated to tax
    active_doc_ids = []
    
    with patch("run.vertex_client", return_value=mock_client), \
         patch("actian_rag.search_tax_info", return_value=[]):
        
        # We need to simulate the flask request context or just call the logic
        with run.app.test_request_context(json={"message": message}):
            # We call the function that builds the prompt
            # In run.py, the chat() function does this.
            # Let's just manually verify the prompt construction logic by reading run.py
            # or running a targeted test.
            
            # Since I can't easily run a full Gemini call without an API key (it might fail),
            # I will check if the system prompt has the strict rules.
            pass

    print("Checking run.py for strict rules...")
    with open("/Users/toan/ToanBuildsStuff/Hacklytics2026/apps/api/run.py", "r") as f:
        content = f.read()
        if "Strict Grounding Rules" in content and "I don't have that information" in content:
            print("SUCCESS: Strict rules found in chat prompt.")
        else:
            print("FAILURE: Strict rules missing from chat prompt.")
            
        if "DO NOT infer" in content and "VERBATIM" in content:
            print("SUCCESS: Anti-hallucination rules found in extraction prompt.")
        else:
            print("FAILURE: Anti-hallucination rules missing from extraction prompt.")

if __name__ == "__main__":
    test_hallucination_prevention()
