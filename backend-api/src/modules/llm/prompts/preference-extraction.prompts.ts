export const PREFERENCE_EXTRACTION_PROMPT = `Analyze the following customer conversation and extract any customer preferences or important information.

Extract these types of information:
- PREFERENCE: Things the customer prefers (e.g., budget, features, communication style)
- PRODUCT_INTEREST: Products or services the customer is interested in
- ISSUE_HISTORY: Problems or issues the customer has mentioned
- CONTEXT: General context about the customer's situation

Respond in JSON format:
{"memories": [{"type": "TYPE", "key": "short_key", "value": "description", "confidence": 0.0-1.0}]}

If no preferences are found, respond with: {"memories": []}

Conversation:
{messages}

Response:`;
