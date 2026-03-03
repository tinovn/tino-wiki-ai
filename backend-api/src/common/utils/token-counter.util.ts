// Simple token estimation: ~4 chars per token for English, ~2 chars for Vietnamese/CJK
export function estimateTokens(text: string): number {
  const cjkPattern = /[\u3000-\u9fff\uac00-\ud7af\u1100-\u11ff]/g;
  const cjkChars = (text.match(cjkPattern) || []).length;
  const otherChars = text.length - cjkChars;
  return Math.ceil(otherChars / 4 + cjkChars / 2);
}
