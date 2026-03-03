export const INTENT_DETECTION_PROMPT = `You are a document classifier. Analyze the following document and detect its intents/topics.

Choose from these categories (can select multiple):
- pricing: About pricing, plans, costs
- technical: Technical documentation, API, setup
- support: Troubleshooting, bug fixes, FAQ
- onboarding: Getting started, tutorials
- policy: Terms, privacy, compliance
- product: Product features, updates
- comparison: Comparing options, alternatives
- how-to: Step-by-step guides

Respond in JSON format:
{"intents": [{"name": "category", "confidence": 0.0-1.0}]}

Document:
{content}

Response:`;
