
import os
import sys
from pathlib import Path

# Add the apps/api directory to sys.path
sys.path.insert(0, str(Path("/Users/toan/ToanBuildsStuff/Hacklytics2026/apps/api")))

import actian_rag
from cortex import CortexClient

def check_rag():
    print(f"Connecting to Actian at {actian_rag.ACTIAN_HOST}...")
    try:
        with CortexClient(actian_rag.ACTIAN_HOST) as client:
            if client.has_collection(actian_rag.COLLECTION_NAME):
                print(f"Collection '{actian_rag.COLLECTION_NAME}' exists.")
                # We can't easily count, but we can try to scroll
                page = client.scroll(actian_rag.COLLECTION_NAME, limit=1)
                if page:
                    print(f"Found at least one document in the vector DB.")
                else:
                    print("Collection exists but appears empty.")
            else:
                print(f"Collection '{actian_rag.COLLECTION_NAME}' NOT found.")
    except Exception as e:
        print(f"Error connecting to Actian: {e}")

if __name__ == "__main__":
    check_rag()
