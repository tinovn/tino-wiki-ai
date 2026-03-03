import { IsString, IsOptional, IsArray, IsInt, IsIn, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateDocumentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tagIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  excerpt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  changeNote?: string;

  @ApiPropertyOptional({ enum: ['OFFICIAL', 'GUIDE', 'FAQ', 'REFERENCE', 'INTERNAL', 'PRICING', 'SERVICE'] })
  @IsOptional()
  @IsIn(['OFFICIAL', 'GUIDE', 'FAQ', 'REFERENCE', 'INTERNAL', 'PRICING', 'SERVICE'])
  type?: string;

  @ApiPropertyOptional({ enum: ['PUBLIC', 'INTERNAL', 'AGENT'] })
  @IsOptional()
  @IsIn(['PUBLIC', 'INTERNAL', 'AGENT'])
  audience?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  priority?: number;
}
