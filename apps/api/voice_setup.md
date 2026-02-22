# ElevenLabs + TaxPilot Voice Setup

To integrate the TaxPilot backend with an ElevenLabs Conversational AI agent, follow these steps:

## 1. Create the ElevenLabs Agent

1. Go to the [ElevenLabs Dashboard](https://elevenlabs.io/app/conversational-ai).
2. Create a new "Conversational AI" agent.
3. Choose a voice (Atlas, Nova, or Echo recommended).

## 2. Configure the System Prompt

Use a prompt similar to our chat assistant but optimized for conversation:

```text
You are TaxPilot, a professional flight navigator for tax preparation.
Your goal is to guide the user through their documents over the phone.

DIRECTIVES:
1. Always check the 'search_tax_knowledge' tool if the user asks about their specific tax data.
2. Be concise. People prefer shorter responses on the phone.
3. If information is missing, admit you don't have it in the flight logs.
4. Keep the persona professional and helpful.
```

## 3. Add the Server Tool

1. In the agent settings, go to **Tools** and click **Add Tool**.
2. Select **Server Tool**.
3. **Tool Name**: `search_tax_knowledge`
4. **Description**: `Search the user's uploaded tax documents (W-2s, 1040s, 1098s) for specific values, employers, or tax year data.`
5. **API Endpoint**: `https://<YOUR_TUNNEL_URL>/v1/voice/search`
6. **Method**: `POST`
7. **Request Body Schema**:
   ```json
   {
     "type": "object",
     "properties": {
       "query": {
         "type": "string",
         "description": "The tax-related question or search term."
       }
     },
     "required": ["query"]
   }
   ```
8. **Response Mapping**: Map the `response` field from the JSON output to the agent's knowledge.

## 4. Local Testing

To test from your local machine, use **ngrok** to expose your Flask server:

```bash
ngrok http 8000
```

Then use the ngrok URL in the ElevenLabs tool configuration.
