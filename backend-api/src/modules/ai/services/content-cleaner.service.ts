import { Injectable } from '@nestjs/common';
import { cleanHtml, extractHeadings } from '@common/utils';

@Injectable()
export class ContentCleanerService {
  clean(content: string): { cleanedContent: string; headings: Array<{ level: number; text: string; line: number }> } {
    // Step 1: Clean HTML artifacts
    let cleaned = cleanHtml(content);

    // Step 2: Normalize whitespace
    cleaned = cleaned
      .replace(/\t/g, '  ')
      .replace(/ {3,}/g, '  ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    // Step 3: Normalize unicode
    cleaned = cleaned.normalize('NFC');

    // Step 4: Extract headings from original markdown (before stripping)
    const headings = extractHeadings(content);

    return { cleanedContent: cleaned, headings };
  }
}
