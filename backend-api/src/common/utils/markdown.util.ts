export function stripMarkdown(content: string): string {
  return content
    .replace(/```[\s\S]*?```/g, '') // code blocks
    .replace(/`[^`]*`/g, '') // inline code
    .replace(/!\[.*?\]\(.*?\)/g, '') // images
    .replace(/\[([^\]]*)\]\(.*?\)/g, '$1') // links -> text
    .replace(/#{1,6}\s*/g, '') // headings
    .replace(/[*_~]{1,3}/g, '') // bold/italic/strikethrough
    .replace(/>\s*/gm, '') // blockquotes
    .replace(/[-*+]\s/gm, '') // list markers
    .replace(/\d+\.\s/gm, '') // numbered lists
    .replace(/\|.*\|/g, '') // tables
    .replace(/-{3,}/g, '') // horizontal rules
    .replace(/\n{3,}/g, '\n\n') // multiple newlines
    .trim();
}

export function extractHeadings(content: string): Array<{ level: number; text: string; line: number }> {
  const headings: Array<{ level: number; text: string; line: number }> = [];
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      headings.push({
        level: match[1].length,
        text: match[2].trim(),
        line: index,
      });
    }
  });

  return headings;
}

export function cleanHtml(content: string): string {
  return content
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
}
