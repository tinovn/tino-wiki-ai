import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AiSourceDto {
  @ApiProperty()
  documentId: string;

  @ApiPropertyOptional()
  heading?: string;

  @ApiProperty()
  layer: string;

  @ApiProperty()
  score: number;
}

export class AiQueryResponseDto {
  @ApiProperty()
  answer: string;

  @ApiProperty({ type: [AiSourceDto] })
  sources: AiSourceDto[];

  @ApiProperty()
  confidence: number;

  @ApiProperty()
  latencyMs: number;
}
