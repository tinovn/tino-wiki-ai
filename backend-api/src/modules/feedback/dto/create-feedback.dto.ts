import { IsString, IsOptional, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFeedbackDto {
  @ApiProperty({ description: 'Query log ID this feedback is for' })
  @IsString()
  queryLogId: string;

  @ApiPropertyOptional({ description: 'Document ID if feedback is about a specific document' })
  @IsOptional()
  @IsString()
  documentId?: string;

  @ApiProperty({ enum: ['GOOD', 'BAD', 'PARTIALLY_CORRECT', 'WRONG_SOURCE', 'OUTDATED'] })
  @IsIn(['GOOD', 'BAD', 'PARTIALLY_CORRECT', 'WRONG_SOURCE', 'OUTDATED'])
  type: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comment?: string;
}
