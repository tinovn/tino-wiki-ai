import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { estimateTokens } from '@common/utils';
import { ChunkData } from '../interfaces/chunk.interface';

@Injectable()
export class ChunkerService {
  private readonly logger = new Logger(ChunkerService.name);
  private readonly minTokens: number;
  private readonly maxTokens: number;
  private readonly overlapTokens: number;

  constructor(private readonly configService: ConfigService) {
    this.minTokens = this.configService.get<number>('ai.chunkMinTokens', 300);
    this.maxTokens = this.configService.get<number>('ai.chunkMaxTokens', 800);
    this.overlapTokens = this.configService.get<number>('ai.chunkOverlapTokens', 50);
  }

  chunk(content: string, headings: Array<{ level: number; text: string; line: number }>): ChunkData[] {
    // Split by headings first
    const sections = this.splitByHeadings(content, headings);

    // Process each section
    const chunks: ChunkData[] = [];
    let chunkIndex = 0;

    for (const section of sections) {
      const sectionTokens = estimateTokens(section.content);

      if (sectionTokens <= this.maxTokens && sectionTokens >= this.minTokens) {
        // Section fits as a single chunk
        chunks.push({
          index: chunkIndex++,
          content: section.content,
          heading: section.heading,
          tokenCount: sectionTokens,
        });
      } else if (sectionTokens > this.maxTokens) {
        // Section too large, split by paragraphs
        const subChunks = this.splitLargeSection(section.content, section.heading);
        for (const sub of subChunks) {
          chunks.push({ ...sub, index: chunkIndex++ });
        }
      } else if (sectionTokens < this.minTokens) {
        // Section too small, try merging with next
        if (chunks.length > 0) {
          const prev = chunks[chunks.length - 1];
          const mergedTokens = prev.tokenCount + sectionTokens;
          if (mergedTokens <= this.maxTokens) {
            prev.content += '\n\n' + section.content;
            prev.tokenCount = mergedTokens;
            continue;
          }
        }
        chunks.push({
          index: chunkIndex++,
          content: section.content,
          heading: section.heading,
          tokenCount: sectionTokens,
        });
      }
    }

    // Add overlap between chunks
    return this.addOverlap(chunks);
  }

  private splitByHeadings(
    content: string,
    headings: Array<{ level: number; text: string; line: number }>,
  ): Array<{ heading?: string; content: string }> {
    if (headings.length === 0) {
      return [{ content }];
    }

    const lines = content.split('\n');
    const sections: Array<{ heading?: string; content: string }> = [];

    let currentHeading: string | undefined;
    let currentLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const heading = headings.find((h) => h.line === i);
      if (heading) {
        if (currentLines.length > 0) {
          sections.push({
            heading: currentHeading,
            content: currentLines.join('\n').trim(),
          });
        }
        currentHeading = heading.text;
        currentLines = [lines[i]];
      } else {
        currentLines.push(lines[i]);
      }
    }

    if (currentLines.length > 0) {
      sections.push({
        heading: currentHeading,
        content: currentLines.join('\n').trim(),
      });
    }

    return sections.filter((s) => s.content.length > 0);
  }

  private splitLargeSection(content: string, heading?: string): ChunkData[] {
    const paragraphs = content.split(/\n\n+/);
    const chunks: ChunkData[] = [];
    let current = '';
    let currentTokens = 0;

    for (const para of paragraphs) {
      const paraTokens = estimateTokens(para);

      if (currentTokens + paraTokens > this.maxTokens && current.length > 0) {
        chunks.push({
          index: 0,
          content: current.trim(),
          heading,
          tokenCount: currentTokens,
        });
        current = '';
        currentTokens = 0;
      }

      // If single paragraph exceeds max, split by sentences
      if (paraTokens > this.maxTokens) {
        if (current.length > 0) {
          chunks.push({
            index: 0,
            content: current.trim(),
            heading,
            tokenCount: currentTokens,
          });
          current = '';
          currentTokens = 0;
        }

        const sentenceChunks = this.splitBySentences(para, heading);
        chunks.push(...sentenceChunks);
        continue;
      }

      current += (current ? '\n\n' : '') + para;
      currentTokens += paraTokens;
    }

    if (current.trim().length > 0) {
      chunks.push({
        index: 0,
        content: current.trim(),
        heading,
        tokenCount: currentTokens,
      });
    }

    return chunks;
  }

  private splitBySentences(text: string, heading?: string): ChunkData[] {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    const chunks: ChunkData[] = [];
    let current = '';
    let currentTokens = 0;

    for (const sentence of sentences) {
      const sentenceTokens = estimateTokens(sentence);
      if (currentTokens + sentenceTokens > this.maxTokens && current.length > 0) {
        chunks.push({
          index: 0,
          content: current.trim(),
          heading,
          tokenCount: currentTokens,
        });
        current = '';
        currentTokens = 0;
      }
      current += sentence;
      currentTokens += sentenceTokens;
    }

    if (current.trim().length > 0) {
      chunks.push({
        index: 0,
        content: current.trim(),
        heading,
        tokenCount: currentTokens,
      });
    }

    return chunks;
  }

  private addOverlap(chunks: ChunkData[]): ChunkData[] {
    if (chunks.length <= 1) return chunks;

    for (let i = 1; i < chunks.length; i++) {
      const prevContent = chunks[i - 1].content;
      const words = prevContent.split(/\s+/);
      const overlapWordCount = Math.min(
        Math.ceil(this.overlapTokens * 1.3),
        Math.floor(words.length * 0.2),
      );

      if (overlapWordCount > 0) {
        const overlapText = words.slice(-overlapWordCount).join(' ');
        chunks[i].content = overlapText + ' ' + chunks[i].content;
        chunks[i].tokenCount = estimateTokens(chunks[i].content);
      }
    }

    return chunks;
  }
}
