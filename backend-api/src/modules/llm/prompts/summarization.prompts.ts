export const SUMMARIZATION_PROMPTS = {
  SHORT: `You are a document summarizer. Create a concise 1-2 sentence summary of the following document.
Focus on the main topic and key takeaway. Respond in the same language as the document.

Document:
{content}

Summary:`,

  MEDIUM: `You are a document summarizer. Create a detailed paragraph summary (3-5 sentences) of the following document.
Cover the main points, key details, and conclusions. Respond in the same language as the document.

Document:
{content}

Summary:`,

  KEY_POINTS: `You are a document analyzer. Extract 3-7 key points from the following document.
Format each point as a bullet starting with "- ". Respond in the same language as the document.

Document:
{content}

Key Points:`,
};
