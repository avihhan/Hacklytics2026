import os
import json
import sys
from pathlib import Path
from typing import Dict, Any, List, Optional
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

# --- Type Definitions (Rule: Type-Driven Documentation) ---

"""
TaxpayerProfile represents the personal identification data extracted from tax forms.
We use descriptive field names to ensure the logic is self-documenting.
"""
TaxpayerProfile = Dict[str, Any] 

"""
TaxRecord represents a collection of tax documents for a specific year.
"""
TaxRecord = Dict[str, Any]

"""
ExtractedTaxData is the root structure for all parsed tax information.
"""
ExtractedTaxData = Dict[str, Any]

# --- Configuration ---

PROJECT = os.getenv("GOOGLE_CLOUD_PROJECT")
LOCATION = os.getenv("GOOGLE_CLOUD_LOCATION", "us-central1")
MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

def get_vertex_client() -> genai.Client:
    """
    Business Logic: Initializes the Vertex AI client using project credentials.
    Engineering Principle: Centralized client creation ensures consistent configuration 
    across different execution environments (local vs. cloud).
    """
    if not PROJECT:
        raise RuntimeError("Missing GOOGLE_CLOUD_PROJECT in environment variables.")
    return genai.Client(vertexai=True, project=PROJECT, location=LOCATION)

def extract_tax_data(pdf_path: str) -> ExtractedTaxData:
    """
    Business Logic:
    Sends a PDF document to Gemini 2.5 Flash to perform OCR and structured data extraction.
    The prompt is designed to be exhaustive, capturing every field verbatim to avoid 
    any loss of context for downstream tax analysis.

    Engineering Principles:
    1. Grounding: Strict guardrails are provided in the prompt to prevent hallucination.
    2. Precision: We request verbatim extraction to maintain the audit trail of the document.
    3. Failure Isolation: We use a structured JSON schema but allow the model to expand it, 
       ensuring we don't miss form-specific fields.
    """
    client = get_vertex_client()

    # Read PDF bytes for submission to the multimodal model
    with open(pdf_path, "rb") as f:
        pdf_bytes = f.read()

    # Define the base schema guidelines for the LLM
    tax_json_schema = {
        "taxpayer_profile": {
            "first_name": "string",
            "last_name": "string",
            "ssn": "string",
            "address": "string",
            "state_of_residence": "string",
            "occupation": "string"
        },
        "tax_records": [
            {
                "tax_year": "integer",
                "documents": {
                    "Form_Name": {
                        "field_label_or_box_number": "value"
                    }
                }
            }
        ]
    }

    prompt = f"""You are a professional tax data extraction specialist. Your goal is to capture EVERY SINGLE piece of information from the provided tax document PDF with 100% accuracy.

Strict Guardrails to Prevent Hallucination:
1. ONLY extract information that is explicitly visible in the document.
2. DO NOT infer, calculate, or guess any values (e.g., don't calculate total wages if not explicitly listed).
3. If a box or field is empty or unreadable, OMIT it from the JSON. Do not use placeholders like "N/A" or "None" unless written in the text.
4. Extract text and numbers VERBATIM. Do not normalize names or addresses if they appear differently in the document.
5. If you are unsure about a value due to OCR quality, OMIT it rather than guessing.

Instructions:
1. Extract ALL key-value pairs, box numbers, labels, and values exactly as they appear.
2. Organise the output into a structured JSON format.
3. Use the following categories as a base, but ADD any additional fields or forms you encounter:
   - "taxpayer_profile": All personal info (Full names, SSNs, addresses, filing status, exemptions, spouse info if any).
   - "tax_records": An array of years found. Each item has a "documents" object.
   - Inside "documents", create keys for EVERY form found (e.g. "Form 1040", "Form W-2", "Form 1099-DIV").
4. For each form, include EVERY box found by its number and name (e.g., "Box 1 - Wages, tips, other compensation").
5. Return ONLY valid JSON, no markdown fences, no explanation.

Base schema for reference:
{json.dumps(tax_json_schema, indent=2)}
"""

    # Engineering Note: We use types.Part.from_bytes to handle the binary PDF data
    resp = client.models.generate_content(
        model=MODEL,
        contents=[
            types.Content(
                role="user",
                parts=[
                    types.Part.from_bytes(data=pdf_bytes, mime_type="application/pdf"),
                    types.Part(text=prompt),
                ],
            )
        ],
    )

    raw = (resp.text or "").strip()
    
    # Strip markdown fences if Gemini wraps the JSON in its response
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1] if "\n" in raw else raw[3:]
    if raw.endswith("```"):
        raw = raw[:-3].strip()
    if raw.startswith("json"):
        raw = raw[4:].strip()

    # Parse the raw text into a dictionary // Complex interaction with LLM output
    return json.loads(raw)

def main():
    """
    Engineering entry point for CLI testing of the extraction logic.
    """
    if len(sys.argv) < 2:
        print(f"Usage: python {sys.argv[0]} <path_to_pdf>")
        sys.exit(1)

    pdf_path = sys.argv[1]
    if not os.path.exists(pdf_path):
        print(f"Error: File not found at {pdf_path}")
        sys.exit(1)

    print(f"--- Starting extraction for: {pdf_path} ---")
    try:
        extracted_data = extract_tax_data(pdf_path)
        print(json.dumps(extracted_data, indent=2))
        
        # Save to a local test file for verification
        output_file = Path(pdf_path).with_suffix(".json")
        with open(output_file, "w") as f:
            json.dump(extracted_data, f, indent=2)
        print(f"\n--- Success! Data saved to {output_file} ---")
        
    except Exception as e:
        print(f"--- Extraction Failed ---\nError: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()
